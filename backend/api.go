package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
)

type API struct {
	db          *DB
	manifestPath string
}

func NewAPI(db *DB, manifestPath string) *API {
	return &API{
		db:          db,
		manifestPath: manifestPath,
	}
}

type Manifest struct {
	GameID       uint32 `json:"game_id"`
	Filename     string `json:"filename"`
	TotalSize    uint64 `json:"total_size"`
	ChunkSize    int    `json:"chunk_size"`
	SHA256       string `json:"sha256"`
	SenderAddress string `json:"sender_address"`
	Network      string `json:"network"`
	StartHeight  *int64 `json:"start_height,omitempty"`
	EndHeight    *int64 `json:"end_height,omitempty"`
	ExpectedTxHashes []string `json:"expected_tx_hashes,omitempty"` // Transaction hashes that should contain chunks
}

type StatusResponse struct {
	LatestIndexedHeight int64    `json:"latestIndexedHeight"`
	ChunksStored        int      `json:"chunksStored"`
	MissingRanges       []Range  `json:"missingRanges,omitempty"`
	MissingTxHashes     []string `json:"missingTxHashes,omitempty"` // Transaction hashes from manifest that haven't been indexed yet
}

type Range struct {
	From int `json:"from"`
	To   int `json:"to"`
}

type ChunksResponse struct {
	GameID   uint32        `json:"game_id"`
	ChunkSize int          `json:"chunk_size"`
	Items    []ChunkItem   `json:"items"`
}

type ChunkItem struct {
	Index uint32 `json:"idx"`
	Length uint8 `json:"len"`
	Data   string `json:"data_base64"`
}

type VerifyResponse struct {
	SHA256      string `json:"sha256"`
	Matches     bool   `json:"matches"`
	ExpectedSHA string `json:"expected_sha,omitempty"`
}

func (api *API) GetManifest(w http.ResponseWriter, r *http.Request) {
	data, err := os.ReadFile(api.manifestPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read manifest: %v", err), http.StatusInternalServerError)
		return
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse manifest: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(manifest)
}

func (api *API) GetStatus(w http.ResponseWriter, r *http.Request) {
	// Get max height from chunks (since we're no longer doing block polling)
	height, err := api.db.GetMaxChunkHeight()
	if err != nil {
		// If no chunks exist, default to 0
		height = 0
	}

	// Get manifest to determine game_id
	data, err := os.ReadFile(api.manifestPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read manifest: %v", err), http.StatusInternalServerError)
		return
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse manifest: %v", err), http.StatusInternalServerError)
		return
	}

	chunkCount, err := api.db.GetChunkCount(manifest.GameID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get chunk count: %v", err), http.StatusInternalServerError)
		return
	}

	// TODO: Calculate missing ranges by comparing expected chunks vs stored chunks
	response := StatusResponse{
		LatestIndexedHeight: height,
		ChunksStored:        chunkCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (api *API) GetChunks(w http.ResponseWriter, r *http.Request) {
	// Get manifest
	data, err := os.ReadFile(api.manifestPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read manifest: %v", err), http.StatusInternalServerError)
		return
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse manifest: %v", err), http.StatusInternalServerError)
		return
	}

	gameID := manifest.GameID
	fromStr := r.URL.Query().Get("from")
	limitStr := r.URL.Query().Get("limit")

	from := 0
	if fromStr != "" {
		if parsed, err := strconv.Atoi(fromStr); err == nil {
			from = parsed
		}
	}

	limit := 1000 // default
	if limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}

	chunks, err := api.db.GetChunks(gameID, from, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get chunks: %v", err), http.StatusInternalServerError)
		return
	}

	items := make([]ChunkItem, len(chunks))
	for i, c := range chunks {
		items[i] = ChunkItem{
			Index:  c.Index,
			Length: c.Length,
			Data:   base64.StdEncoding.EncodeToString(c.Data),
		}
	}

	response := ChunksResponse{
		GameID:   gameID,
		ChunkSize: ChunkSize,
		Items:    items,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (api *API) GetChunksRaw(w http.ResponseWriter, r *http.Request) {
	// Get manifest
	data, err := os.ReadFile(api.manifestPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read manifest: %v", err), http.StatusInternalServerError)
		return
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse manifest: %v", err), http.StatusInternalServerError)
		return
	}

	chunks, err := api.db.GetAllChunks(manifest.GameID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get chunks: %v", err), http.StatusInternalServerError)
		return
	}

	// Reconstruct file
	reconstructed := reconstructFile(chunks, manifest.TotalSize)

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", manifest.Filename))
	w.Write(reconstructed)
}

func (api *API) Verify(w http.ResponseWriter, r *http.Request) {
	// Get manifest
	data, err := os.ReadFile(api.manifestPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read manifest: %v", err), http.StatusInternalServerError)
		return
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse manifest: %v", err), http.StatusInternalServerError)
		return
	}

	chunks, err := api.db.GetAllChunks(manifest.GameID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get chunks: %v", err), http.StatusInternalServerError)
		return
	}

	// Reconstruct file
	reconstructed := reconstructFile(chunks, manifest.TotalSize)

	// Calculate SHA256
	hash := sha256.Sum256(reconstructed)
	calculatedSHA := fmt.Sprintf("%x", hash)

	matches := calculatedSHA == manifest.SHA256

	response := VerifyResponse{
		SHA256:      calculatedSHA,
		Matches:     matches,
		ExpectedSHA: manifest.SHA256,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func reconstructFile(chunks []Chunk, totalSize uint64) []byte {
	if len(chunks) == 0 {
		return nil
	}

	// Determine size from chunks or use totalSize
	var size uint64
	if totalSize > 0 {
		size = totalSize
	} else {
		// Calculate from chunks
		for _, c := range chunks {
			size += uint64(c.Length)
		}
	}

	result := make([]byte, 0, size)
	for _, c := range chunks {
		result = append(result, c.Data[:c.Length]...)
	}

	return result
}
