package main

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	MagicDOOM = "DOOM" // Magic bytes for game chunks (kept for compatibility)
	ChunkSize = 51
)

type Indexer struct {
	db           *DB
	rpc          *NimiqRPC
	pollInterval time.Duration
	manifestsDir string // Path to manifests directory
}

func NewIndexer(db *DB, rpc *NimiqRPC, pollInterval time.Duration, manifestsDir string) *Indexer {
	return &Indexer{
		db:           db,
		rpc:          rpc,
		pollInterval: pollInterval,
		manifestsDir: manifestsDir,
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

// fetchExpectedTransactions fetches transactions for all manifests in the directory
func (idx *Indexer) fetchExpectedTransactions(ctx context.Context) error {
	if idx.manifestsDir == "" {
		return nil // No manifests directory provided
	}

	// Read all manifest files from directory
	entries, err := os.ReadDir(idx.manifestsDir)
	if err != nil {
		return fmt.Errorf("failed to read manifests directory: %w", err)
	}

	var allProcessed int
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}

		manifestPath := filepath.Join(idx.manifestsDir, entry.Name())
		if err := idx.fetchManifestTransactions(ctx, manifestPath); err != nil {
			log.Printf("Warning: failed to fetch transactions for manifest %s: %v", entry.Name(), err)
			continue
		}
		allProcessed++
	}

	if allProcessed > 0 {
		log.Printf("Processed transactions for %d manifest(s)", allProcessed)
	}

	return nil
}

// fetchManifestTransactions fetches transactions for a single manifest file
func (idx *Indexer) fetchManifestTransactions(ctx context.Context, manifestPath string) error {
	// Read manifest
	data, err := os.ReadFile(manifestPath)
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
	log.Printf("Fetching %d expected transactions by hash for game_id=%d", len(manifest.ExpectedTxHashes), manifest.GameID)
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
		log.Printf("Processed %d expected transactions for game_id=%d", processedCount, manifest.GameID)
	}

	return nil
}
