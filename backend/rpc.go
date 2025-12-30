package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// NimiqRPC is a client for Nimiq JSON-RPC endpoints
type NimiqRPC struct {
	url    string
	client *http.Client
}

func NewNimiqRPC(url string) *NimiqRPC {
	return &NimiqRPC{
		url: url,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type JSONRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params"` // Can be array []interface{} or object map[string]interface{}
}

type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      int             `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *JSONRPCError   `json:"error,omitempty"`
}

type JSONRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type Block struct {
	Hash             string                 `json:"hash"`
	Size             int64                  `json:"size"`
	Batch            int64                  `json:"batch"`
	Epoch            int64                  `json:"epoch"`
	Network          string                 `json:"network"`
	Version          int64                  `json:"version"`
	Number           int64                  `json:"number"`
	Timestamp        int64                  `json:"timestamp"`
	ParentHash       string                 `json:"parentHash"`
	Seed             string                 `json:"seed"`
	ExtraData        []int                  `json:"extraData"`
	StateHash        string                 `json:"stateHash"`
	BodyHash         string                 `json:"bodyHash"`
	HistoryHash      string                 `json:"historyHash"`
	Transactions     []Transaction          `json:"transactions,omitempty"`
	AdditionalFields map[string]interface{} `json:"additionalFields"`
}

type Transaction struct {
	Hash          string `json:"hash"`
	From          string `json:"from"`
	To            string `json:"to,omitempty"`
	Data          string `json:"data"` // hex-encoded (legacy field)
	RecipientData string `json:"recipientData"` // hex-encoded (Nimiq format)
	Height        int64  `json:"height,omitempty"`
	BlockNumber   int64  `json:"blockNumber,omitempty"`
}

// Call performs a JSON-RPC call
func (rpc *NimiqRPC) Call(method string, params []interface{}) (json.RawMessage, error) {
	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params,
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", rpc.url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := rpc.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var jsonResp JSONRPCResponse
	if err := json.Unmarshal(respBody, &jsonResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if jsonResp.Error != nil {
		return nil, fmt.Errorf("RPC error: %s (code %d)", jsonResp.Error.Message, jsonResp.Error.Code)
	}

	return jsonResp.Result, nil
}

// GetHeadHeight returns the latest block height
// Uses getBlockNumber RPC method with empty params object
func (rpc *NimiqRPC) GetHeadHeight() (int64, error) {
	// Use empty object params to match Nimiq RPC format
	result, err := rpc.CallWithObjectParams("getBlockNumber", map[string]interface{}{})
	if err != nil {
		return 0, fmt.Errorf("failed to get block number: %w", err)
	}

	// Try parsing as int64 first
	var height int64
	if err := json.Unmarshal(result, &height); err == nil {
		return height, nil
	}

	// Try parsing as string (some RPCs return hex strings)
	var heightStr string
	if err := json.Unmarshal(result, &heightStr); err == nil {
		// Try parsing hex
		if parsed, err2 := parseHexInt64(heightStr); err2 == nil {
			return parsed, nil
		}
	}

	// Try parsing as object with various field names
	var blockObj map[string]interface{}
	if err := json.Unmarshal(result, &blockObj); err == nil {
		// Try "data" field (Nimiq RPC format)
		if num, ok := blockObj["data"].(float64); ok {
			return int64(num), nil
		}
		if numStr, ok := blockObj["data"].(string); ok {
			if parsed, err2 := parseHexInt64(numStr); err2 == nil {
				return parsed, nil
			}
		}
		// Try "number" field
		if num, ok := blockObj["number"].(float64); ok {
			return int64(num), nil
		}
		// Try "height" field
		if num, ok := blockObj["height"].(float64); ok {
			return int64(num), nil
		}
		// Try "blockNumber" field
		if num, ok := blockObj["blockNumber"].(float64); ok {
			return int64(num), nil
		}
		// Try as string fields
		if numStr, ok := blockObj["number"].(string); ok {
			if parsed, err2 := parseHexInt64(numStr); err2 == nil {
				return parsed, nil
			}
		}
		if numStr, ok := blockObj["height"].(string); ok {
			if parsed, err2 := parseHexInt64(numStr); err2 == nil {
				return parsed, nil
			}
		}
	}

	return 0, fmt.Errorf("failed to parse block number: unexpected format: %s", string(result))
}

// GetBlockByHeight fetches a block by height
// Uses getBlockByNumber RPC method
// Tries both array params [blockNumber, includeBody] and object params
func (rpc *NimiqRPC) GetBlockByHeight(height int64, includeTransactions bool) (*Block, error) {
	// Try array format first (common JSON-RPC pattern)
	result, err := rpc.Call("getBlockByNumber", []interface{}{height, includeTransactions})
	if err == nil {
		var block Block
		if err := json.Unmarshal(result, &block); err == nil {
			return &block, nil
		}
	}

	// Try object format with different field names
	paramFormats := []map[string]interface{}{
		{"blockNumber": height, "includeBody": includeTransactions},
		{"number": height, "includeBody": includeTransactions},
		{"blockNumber": height},
		{"number": height},
	}

	var lastErr error
	for _, params := range paramFormats {
		result, err := rpc.CallWithObjectParams("getBlockByNumber", params)
		if err != nil {
			lastErr = err
			continue
		}

		var block Block
		if err := json.Unmarshal(result, &block); err != nil {
			lastErr = fmt.Errorf("failed to parse block: %w", err)
			continue
		}

		return &block, nil
	}

	return nil, fmt.Errorf("failed to get block %d: %w", height, lastErr)
}

// GetTransactionsByAddress returns transactions for a given address
// Uses getTransactionsByAddress RPC method
// Params format: {"address": "...", "max": 500, "beforeHash": "..."}
func (rpc *NimiqRPC) GetTransactionsByAddress(address string, max int, beforeHash *string) ([]Transaction, error) {
	params := map[string]interface{}{
		"address": address,
	}
	if max > 0 {
		params["max"] = max
	}
	if beforeHash != nil && *beforeHash != "" {
		params["beforeHash"] = *beforeHash
	}

	// JSON-RPC 2.0: params can be an object or array
	// For getTransactionsByAddress, pass params as object directly
	result, err := rpc.CallWithObjectParams("getTransactionsByAddress", params)
	if err != nil {
		return nil, fmt.Errorf("failed to get transactions by address: %w", err)
	}

	// Parse nested structure: {"data": [{"hash": "...", "recipientData": "...", ...}, ...]}
	var responseObj map[string]interface{}
	if err := json.Unmarshal(result, &responseObj); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract data array
	var txArray []interface{}
	if data, ok := responseObj["data"].([]interface{}); ok {
		txArray = data
	} else if arr, ok := responseObj["transactions"].([]interface{}); ok {
		txArray = arr
	} else {
		// Try direct array
		var directArray []interface{}
		if err := json.Unmarshal(result, &directArray); err == nil {
			txArray = directArray
		}
	}

	if txArray == nil {
		return nil, fmt.Errorf("no transaction array found in response")
	}

	// Convert each transaction object to Transaction struct
	var transactions []Transaction
	for _, txObj := range txArray {
		txBytes, err := json.Marshal(txObj)
		if err != nil {
			continue
		}

		var tx Transaction
		if err := json.Unmarshal(txBytes, &tx); err != nil {
			continue
		}

		// Use BlockNumber as Height if Height is not set
		if tx.Height == 0 && tx.BlockNumber > 0 {
			tx.Height = tx.BlockNumber
		}

		transactions = append(transactions, tx)
	}

	return transactions, nil
}

// GetTransactionByHash fetches a transaction by its hash
// Uses getTransactionByHash RPC method (if available) or searches by hash
func (rpc *NimiqRPC) GetTransactionByHash(txHash string) (*Transaction, error) {
	// Try getTransactionByHash method first
	result, err := rpc.CallWithObjectParams("getTransactionByHash", map[string]interface{}{
		"hash": txHash,
	})
	if err == nil {
		var tx Transaction
		if err := json.Unmarshal(result, &tx); err == nil {
			return &tx, nil
		}
		// Try nested data structure
		var responseObj map[string]interface{}
		if err := json.Unmarshal(result, &responseObj); err == nil {
			if data, ok := responseObj["data"].(map[string]interface{}); ok {
				txBytes, _ := json.Marshal(data)
				if err := json.Unmarshal(txBytes, &tx); err == nil {
					return &tx, nil
				}
			}
		}
	}

	// Fallback: search by address and find matching hash
	// This is less efficient but works if getTransactionByHash is not available
	// We'll need to know the sender address, so this is a limitation
	// For now, return error and let caller handle it
	return nil, fmt.Errorf("transaction not found by hash: %s (getTransactionByHash may not be available)", txHash)
}

// CallWithObjectParams performs a JSON-RPC call with object params (not array)
func (rpc *NimiqRPC) CallWithObjectParams(method string, params map[string]interface{}) (json.RawMessage, error) {
	req := JSONRPCRequest{
		JSONRPC: "2.0",
		ID:      1,
		Method:  method,
		Params:  params, // Pass as object directly
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", rpc.url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := rpc.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var jsonResp JSONRPCResponse
	if err := json.Unmarshal(respBody, &jsonResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if jsonResp.Error != nil {
		return nil, fmt.Errorf("RPC error: %s (code %d)", jsonResp.Error.Message, jsonResp.Error.Code)
	}

	return jsonResp.Result, nil
}

// parseHexInt64 parses a hex string to int64
func parseHexInt64(hexStr string) (int64, error) {
	// Remove 0x prefix if present
	if len(hexStr) > 2 && hexStr[0:2] == "0x" {
		hexStr = hexStr[2:]
	}

	var result int64
	_, err := fmt.Sscanf(hexStr, "%x", &result)
	return result, err
}
