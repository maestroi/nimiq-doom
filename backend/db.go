package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

func NewDB(path string) (*DB, error) {
	// Create directory if it doesn't exist
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := &DB{conn: conn}
	if err := db.init(); err != nil {
		conn.Close()
		return nil, err
	}

	return db, nil
}

func (db *DB) init() error {
	// Create chunks table
	_, err := db.conn.Exec(`
		CREATE TABLE IF NOT EXISTS chunks (
			game_id INTEGER NOT NULL,
			idx INTEGER NOT NULL,
			len INTEGER NOT NULL,
			data BLOB NOT NULL,
			tx_hash TEXT NOT NULL,
			height INTEGER NOT NULL,
			PRIMARY KEY(game_id, idx)
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create chunks table: %w", err)
	}

	return nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) GetLastIndexedHeight() (int64, error) {
	var height int64
	err := db.conn.QueryRow("SELECT value FROM meta WHERE key = 'last_indexed_height'").Scan(&height)
	if err != nil {
		return 0, err
	}
	return height, nil
}

// GetMaxChunkHeight returns the maximum height from all chunks (for status endpoint)
func (db *DB) GetMaxChunkHeight() (int64, error) {
	var height sql.NullInt64
	err := db.conn.QueryRow("SELECT MAX(height) FROM chunks").Scan(&height)
	if err != nil {
		return 0, err
	}
	if !height.Valid {
		return 0, nil
	}
	return height.Int64, nil
}

func (db *DB) InsertChunk(gameID uint32, idx uint32, length uint8, data []byte, txHash string, height int64) error {
	_, err := db.conn.Exec(
		"INSERT OR REPLACE INTO chunks (game_id, idx, len, data, tx_hash, height) VALUES (?, ?, ?, ?, ?, ?)",
		gameID, idx, length, data, txHash, height,
	)
	return err
}

func (db *DB) GetChunks(gameID uint32, fromIdx int, limit int) ([]Chunk, error) {
	query := "SELECT idx, len, data FROM chunks WHERE game_id = ? AND idx >= ? ORDER BY idx LIMIT ?"
	rows, err := db.conn.Query(query, gameID, fromIdx, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chunks []Chunk
	for rows.Next() {
		var c Chunk
		var data []byte
		if err := rows.Scan(&c.Index, &c.Length, &data); err != nil {
			return nil, err
		}
		c.Data = data
		chunks = append(chunks, c)
	}
	return chunks, rows.Err()
}

func (db *DB) GetAllChunks(gameID uint32) ([]Chunk, error) {
	query := "SELECT idx, len, data FROM chunks WHERE game_id = ? ORDER BY idx"
	rows, err := db.conn.Query(query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var chunks []Chunk
	for rows.Next() {
		var c Chunk
		var data []byte
		if err := rows.Scan(&c.Index, &c.Length, &data); err != nil {
			return nil, err
		}
		c.Data = data
		chunks = append(chunks, c)
	}
	return chunks, rows.Err()
}

func (db *DB) GetChunkCount(gameID uint32) (int, error) {
	var count int
	err := db.conn.QueryRow("SELECT COUNT(*) FROM chunks WHERE game_id = ?", gameID).Scan(&count)
	return count, err
}

// GetIndexedTxHashes returns all transaction hashes that have been indexed for a game
func (db *DB) GetIndexedTxHashes(gameID uint32) ([]string, error) {
	query := "SELECT DISTINCT tx_hash FROM chunks WHERE game_id = ? ORDER BY tx_hash"
	rows, err := db.conn.Query(query, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hashes []string
	for rows.Next() {
		var hash string
		if err := rows.Scan(&hash); err != nil {
			return nil, err
		}
		hashes = append(hashes, hash)
	}
	return hashes, rows.Err()
}

// HasTxHash checks if a transaction hash has been indexed for a game
func (db *DB) HasTxHash(gameID uint32, txHash string) (bool, error) {
	var count int
	err := db.conn.QueryRow("SELECT COUNT(*) FROM chunks WHERE game_id = ? AND tx_hash = ?", gameID, txHash).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

type Chunk struct {
	Index  uint32
	Length uint8
	Data   []byte
}
