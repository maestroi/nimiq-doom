package main

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type API struct {
	db            *DB
	manifestsDir  string
}

func NewAPI(db *DB, manifestsDir string) *API {
	return &API{
		db:           db,
		manifestsDir: manifestsDir,
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

// GetManifestsList returns a list of all available manifests
func (api *API) GetManifestsList(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(api.manifestsDir)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to read manifests directory: %v", err), http.StatusInternalServerError)
		return
	}

	var manifests []map[string]interface{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}

		manifestPath := filepath.Join(api.manifestsDir, entry.Name())
		data, err := os.ReadFile(manifestPath)
		if err != nil {
			continue // Skip files we can't read
		}

		var manifest Manifest
		if err := json.Unmarshal(data, &manifest); err != nil {
			continue // Skip invalid JSON
		}

		manifests = append(manifests, map[string]interface{}{
			"name":         strings.TrimSuffix(entry.Name(), ".json"),
			"game_id":      manifest.GameID,
			"filename":     manifest.Filename,
			"total_size":   manifest.TotalSize,
			"chunk_size":   manifest.ChunkSize,
			"network":      manifest.Network,
			"sender_address": manifest.SenderAddress,
			"tx_count":     len(manifest.ExpectedTxHashes),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"manifests": manifests,
	})
}

// getManifestByName is a helper to load a manifest by name
func (api *API) getManifestByName(name string) (*Manifest, error) {
	if name == "" {
		// Default to first manifest
		entries, err := os.ReadDir(api.manifestsDir)
		if err != nil {
			return nil, err
		}
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
				name = strings.TrimSuffix(entry.Name(), ".json")
				break
			}
		}
		if name == "" {
			return nil, fmt.Errorf("no manifests found")
		}
	}

	// Sanitize manifest name
	name = strings.ReplaceAll(name, "/", "")
	name = strings.ReplaceAll(name, "..", "")
	
	manifestPath := filepath.Join(api.manifestsDir, name+".json")
	data, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, err
	}

	var manifest Manifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		return nil, err
	}

	return &manifest, nil
}

func (api *API) GetManifest(w http.ResponseWriter, r *http.Request) {
	manifestName := r.URL.Query().Get("name")
	manifest, err := api.getManifestByName(manifestName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load manifest: %v", err), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(manifest)
}

func (api *API) GetStatus(w http.ResponseWriter, r *http.Request) {
	manifestName := r.URL.Query().Get("manifest")
	if manifestName == "" {
		http.Error(w, "manifest parameter is required", http.StatusBadRequest)
		return
	}
	manifest, err := api.getManifestByName(manifestName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load manifest: %v", err), http.StatusNotFound)
		return
	}

	// Get max height from chunks (since we're no longer doing block polling)
	height, err := api.db.GetMaxChunkHeight()
	if err != nil {
		// If no chunks exist, default to 0
		height = 0
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
	manifestName := r.URL.Query().Get("manifest")
	if manifestName == "" {
		http.Error(w, "manifest parameter is required", http.StatusBadRequest)
		return
	}
	manifest, err := api.getManifestByName(manifestName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load manifest: %v", err), http.StatusNotFound)
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
	manifestName := r.URL.Query().Get("manifest")
	manifest, err := api.getManifestByName(manifestName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load manifest: %v", err), http.StatusNotFound)
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
	manifestName := r.URL.Query().Get("manifest")
	manifest, err := api.getManifestByName(manifestName)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load manifest: %v", err), http.StatusNotFound)
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
