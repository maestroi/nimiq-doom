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
	MagicDOOM = "DOOM"
	ChunkSize = 51
)

type Indexer struct {
	db           *DB
	rpc          *NimiqRPC
	pollInterval time.Duration
	manifestPath string // Path to manifest file for expected tx hashes
}

func NewIndexer(db *DB, rpc *NimiqRPC, pollInterval time.Duration, manifestPath string) *Indexer {
	return &Indexer{
		db:           db,
		rpc:          rpc,
		pollInterval: pollInterval,
		manifestPath: manifestPath,
	}
}

func (idx *Indexer) Start(ctx context.Context) error {
	// Fetch expected transactions by hash on startup
	if err := idx.fetchExpectedTransactions(ctx); err != nil {
		log.Printf("Warning: failed to fetch expected transactions: %v", err)
	}

	ticker := time.NewTicker(idx.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			// Only fetch expected transactions by hash - no block scanning needed
			// We know exactly which transactions contain the chunks from the manifest
			if err := idx.fetchExpectedTransactions(ctx); err != nil {
				log.Printf("Warning: failed to fetch expected transactions: %v", err)
			}
		}
	}
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
