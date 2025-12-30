package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"
)

const (
	MagicDOOM      = "DOOM"
	ChunkSize      = 51
	MaxBlocksPerPoll = 100 // Maximum blocks to fetch per poll cycle to avoid huge catch-ups
)

type Indexer struct {
	db            *DB
	rpc           *NimiqRPC
	startHeight   int64
	pollInterval  time.Duration
	manifestPath  string // Path to manifest file for expected tx hashes
}

func NewIndexer(db *DB, rpc *NimiqRPC, startHeight int64, pollInterval time.Duration, manifestPath string) *Indexer {
	return &Indexer{
		db:           db,
		rpc:          rpc,
		startHeight:  startHeight,
		pollInterval: pollInterval,
		manifestPath: manifestPath,
	}
}

func (idx *Indexer) Start(ctx context.Context) error {
	lastHeight, err := idx.db.GetLastIndexedHeight()
	if err != nil {
		return fmt.Errorf("failed to get last indexed height: %w", err)
	}

	// Use startHeight if it's greater than lastHeight
	if idx.startHeight > lastHeight {
		lastHeight = idx.startHeight - 1
	}

	// First, try to fetch expected transactions by hash if manifest has them
	if err := idx.fetchExpectedTransactions(ctx); err != nil {
		log.Printf("Warning: failed to fetch expected transactions: %v", err)
		// Continue with normal polling
	}

	ticker := time.NewTicker(idx.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			// Try fetching expected transactions first
			if err := idx.fetchExpectedTransactions(ctx); err != nil {
				log.Printf("Warning: failed to fetch expected transactions: %v", err)
			}
			
			// Then do normal block polling
			if err := idx.poll(ctx, lastHeight); err != nil {
				log.Printf("Poll error: %v", err)
				// Continue polling despite errors
			} else {
				// Update lastHeight after successful poll
				newHeight, err := idx.db.GetLastIndexedHeight()
				if err == nil {
					lastHeight = newHeight
				}
			}
		}
	}
}

func (idx *Indexer) poll(ctx context.Context, fromHeight int64) error {
	headHeight, err := idx.rpc.GetHeadHeight()
	if err != nil {
		return fmt.Errorf("failed to get head height: %w", err)
	}

	if headHeight <= fromHeight {
		return nil // No new blocks
	}

	// Limit the number of blocks to fetch per poll to avoid huge catch-ups
	toHeight := headHeight
	if headHeight-fromHeight > MaxBlocksPerPoll {
		toHeight = fromHeight + MaxBlocksPerPoll
		log.Printf("Limiting catch-up: indexing blocks %d to %d (head is %d, will continue next poll)", 
			fromHeight+1, toHeight, headHeight)
	} else {
		log.Printf("Indexing blocks %d to %d", fromHeight+1, toHeight)
	}

	for height := fromHeight + 1; height <= toHeight; height++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		block, err := idx.rpc.GetBlockByHeight(height, true)
		if err != nil {
			log.Printf("Failed to fetch block %d: %v", height, err)
			continue
		}

		if err := idx.processBlock(block); err != nil {
			log.Printf("Failed to process block %d: %v", height, err)
			continue
		}

		if err := idx.db.SetLastIndexedHeight(height); err != nil {
			log.Printf("Failed to update last indexed height: %v", err)
		}
	}

	return nil
}

func (idx *Indexer) processBlock(block *Block) error {
	for _, tx := range block.Transactions {
		if err := idx.processTransaction(tx, block.Number); err != nil {
			// Log but continue processing other transactions
			log.Printf("Failed to process transaction %s: %v", tx.Hash, err)
		}
	}
	return nil
}

func (idx *Indexer) processTransaction(tx Transaction, height int64) error {
	// Use recipientData if available (Nimiq format), otherwise fall back to data
	txData := tx.RecipientData
	if txData == "" {
		txData = tx.Data
	}
	if txData == "" {
		return nil // No data field
	}

	// Decode hex data
	data, err := hex.DecodeString(txData)
	if err != nil {
		return fmt.Errorf("failed to decode hex data: %w", err)
	}

	// Check minimum length
	if len(data) < 13 {
		return nil // Too short to be a DOOM chunk
	}

	// Check magic
	if string(data[0:4]) != MagicDOOM {
		return nil // Not a DOOM chunk
	}

	// Parse chunk header
	gameID := uint32(data[4]) | uint32(data[5])<<8 | uint32(data[6])<<16 | uint32(data[7])<<24
	chunkIdx := uint32(data[8]) | uint32(data[9])<<8 | uint32(data[10])<<16 | uint32(data[11])<<24
	length := uint8(data[12])

	// Validate length
	if length > ChunkSize {
		return fmt.Errorf("invalid chunk length %d (max %d)", length, ChunkSize)
	}

	// Extract chunk data (bytes 13 to 13+length-1)
	if len(data) < 13+int(length) {
		return fmt.Errorf("data too short for length %d", length)
	}

	chunkData := make([]byte, length)
	copy(chunkData, data[13:13+int(length)])

	// Store chunk
	if err := idx.db.InsertChunk(gameID, chunkIdx, length, chunkData, tx.Hash, height); err != nil {
		return fmt.Errorf("failed to insert chunk: %w", err)
	}

	log.Printf("Indexed chunk: game_id=%d, idx=%d, len=%d, tx=%s", gameID, chunkIdx, length, tx.Hash)
	return nil
}

// fetchExpectedTransactions fetches transactions by address and filters by known hashes
func (idx *Indexer) fetchExpectedTransactions(ctx context.Context) error {
	if idx.manifestPath == "" {
		return nil // No manifest path provided
	}

	// Read manifest
	data, err := os.ReadFile(idx.manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest struct {
		GameID          uint32   `json:"game_id"`
		SenderAddress   string   `json:"sender_address"`
		ExpectedTxHashes []string `json:"expected_tx_hashes,omitempty"`
	}
	if err := json.Unmarshal(data, &manifest); err != nil {
		return fmt.Errorf("failed to parse manifest: %w", err)
	}

	if len(manifest.ExpectedTxHashes) == 0 {
		return nil // No expected tx hashes
	}

	// Check which transactions are already indexed
	indexedHashes, err := idx.db.GetIndexedTxHashes(manifest.GameID)
	if err != nil {
		return fmt.Errorf("failed to get indexed hashes: %w", err)
	}

	indexedMap := make(map[string]bool)
	for _, h := range indexedHashes {
		indexedMap[h] = true
	}

	// Check if all transactions are already indexed
	allIndexed := true
	for _, txHash := range manifest.ExpectedTxHashes {
		if !indexedMap[txHash] {
			allIndexed = false
			break
		}
	}

	if allIndexed {
		return nil // All transactions already indexed
	}

	// Fetch each expected transaction directly by hash (more reliable)
	log.Printf("Fetching %d expected transactions by hash", len(manifest.ExpectedTxHashes))
	processedCount := 0
	for _, txHash := range manifest.ExpectedTxHashes {
		if indexedMap[txHash] {
			continue // Already indexed
		}

		// Fetch transaction by hash
		tx, err := idx.rpc.GetTransactionByHash(txHash)
		if err != nil {
			log.Printf("Failed to fetch transaction %s: %v (may not be confirmed yet)", txHash, err)
			continue
		}

		// Get block height
		height := tx.Height
		if height == 0 {
			height = tx.BlockNumber
		}

		// Process the transaction
		if err := idx.processTransaction(*tx, height); err != nil {
			log.Printf("Failed to process expected transaction %s: %v", txHash, err)
		} else {
			log.Printf("Indexed expected transaction %s (chunk from tx)", txHash)
			processedCount++
		}
	}

	if processedCount > 0 {
		log.Printf("Processed %d expected transactions from sender address", processedCount)
	}

	// Check what's still missing
	missingCount := 0
	for _, txHash := range manifest.ExpectedTxHashes {
		if !indexedMap[txHash] {
			missingCount++
		}
	}

	if missingCount > 0 {
		log.Printf("Still missing %d expected transactions (may not be confirmed yet)", missingCount)
	}

	return nil
}
