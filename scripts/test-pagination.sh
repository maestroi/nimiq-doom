#!/bin/bash

# Test Nimiq RPC pagination
# Usage: ./test-pagination.sh <address> [rpc_url] [max_per_page]

ADDRESS="${1:-NQ14UG6NG4HC6S18EXYXHCTECM7C0KDCVG6N}"
RPC_URL="${2:-http://192.168.50.99:8648}"
MAX="${3:-10}"

echo "Testing pagination for address: $ADDRESS"
echo "RPC URL: $RPC_URL"
echo "Max per page: $MAX"
echo "---"

# Function to call RPC
call_rpc() {
    local method="$1"
    local params="$2"
    
    curl -s -X POST "$RPC_URL" \
        -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}"
}

# Page 1 - no startAt
echo ""
echo "=== PAGE 1 (no startAt) ==="
RESULT1=$(call_rpc "getTransactionsByAddress" "{\"address\":\"$ADDRESS\",\"max\":$MAX}")

# Check if result has data wrapper
if echo "$RESULT1" | jq -e '.result.data' > /dev/null 2>&1; then
    TXS1=$(echo "$RESULT1" | jq '.result.data')
else
    TXS1=$(echo "$RESULT1" | jq '.result')
fi

COUNT1=$(echo "$TXS1" | jq 'length')
echo "Received: $COUNT1 transactions"

if [ "$COUNT1" -gt 0 ]; then
    FIRST_HASH1=$(echo "$TXS1" | jq -r '.[0].hash')
    LAST_HASH1=$(echo "$TXS1" | jq -r '.[-1].hash')
    FIRST_HEIGHT1=$(echo "$TXS1" | jq -r '.[0].blockNumber // .[0].height // "?"')
    LAST_HEIGHT1=$(echo "$TXS1" | jq -r '.[-1].blockNumber // .[-1].height // "?"')
    
    echo "First: hash=${FIRST_HASH1:0:16}... height=$FIRST_HEIGHT1"
    echo "Last:  hash=${LAST_HASH1:0:16}... height=$LAST_HEIGHT1"
    
    # Show all hashes for small sets
    if [ "$COUNT1" -le 20 ]; then
        echo ""
        echo "All hashes:"
        echo "$TXS1" | jq -r '.[] | "  \(.hash[0:16])... height=\(.blockNumber // .height // "?")"'
    fi
fi

# Page 2 - with startAt = last hash from page 1
if [ "$COUNT1" -ge "$MAX" ] && [ -n "$LAST_HASH1" ] && [ "$LAST_HASH1" != "null" ]; then
    echo ""
    echo "=== PAGE 2 (startAt=$LAST_HASH1) ==="
    RESULT2=$(call_rpc "getTransactionsByAddress" "{\"address\":\"$ADDRESS\",\"max\":$MAX,\"startAt\":\"$LAST_HASH1\"}")
    
    if echo "$RESULT2" | jq -e '.result.data' > /dev/null 2>&1; then
        TXS2=$(echo "$RESULT2" | jq '.result.data')
    else
        TXS2=$(echo "$RESULT2" | jq '.result')
    fi
    
    COUNT2=$(echo "$TXS2" | jq 'length')
    echo "Received: $COUNT2 transactions"
    
    if [ "$COUNT2" -gt 0 ]; then
        FIRST_HASH2=$(echo "$TXS2" | jq -r '.[0].hash')
        LAST_HASH2=$(echo "$TXS2" | jq -r '.[-1].hash')
        FIRST_HEIGHT2=$(echo "$TXS2" | jq -r '.[0].blockNumber // .[0].height // "?"')
        LAST_HEIGHT2=$(echo "$TXS2" | jq -r '.[-1].blockNumber // .[-1].height // "?"')
        
        echo "First: hash=${FIRST_HASH2:0:16}... height=$FIRST_HEIGHT2"
        echo "Last:  hash=${LAST_HASH2:0:16}... height=$LAST_HEIGHT2"
        
        # Check for duplicates with page 1
        if [ "$FIRST_HASH2" = "$FIRST_HASH1" ]; then
            echo ""
            echo "⚠️  WARNING: First hash of page 2 is same as page 1 - pagination may not be working!"
        fi
        
        if [ "$FIRST_HASH2" = "$LAST_HASH1" ]; then
            echo ""
            echo "⚠️  WARNING: First hash of page 2 is the startAt hash - RPC includes startAt in results!"
        fi
        
        # Show all hashes for small sets
        if [ "$COUNT2" -le 20 ]; then
            echo ""
            echo "All hashes:"
            echo "$TXS2" | jq -r '.[] | "  \(.hash[0:16])... height=\(.blockNumber // .height // "?")"'
        fi
        
        # Page 3
        if [ "$COUNT2" -ge "$MAX" ] && [ -n "$LAST_HASH2" ] && [ "$LAST_HASH2" != "null" ]; then
            echo ""
            echo "=== PAGE 3 (startAt=$LAST_HASH2) ==="
            RESULT3=$(call_rpc "getTransactionsByAddress" "{\"address\":\"$ADDRESS\",\"max\":$MAX,\"startAt\":\"$LAST_HASH2\"}")
            
            if echo "$RESULT3" | jq -e '.result.data' > /dev/null 2>&1; then
                TXS3=$(echo "$RESULT3" | jq '.result.data')
            else
                TXS3=$(echo "$RESULT3" | jq '.result')
            fi
            
            COUNT3=$(echo "$TXS3" | jq 'length')
            echo "Received: $COUNT3 transactions"
            
            if [ "$COUNT3" -gt 0 ]; then
                FIRST_HASH3=$(echo "$TXS3" | jq -r '.[0].hash')
                LAST_HASH3=$(echo "$TXS3" | jq -r '.[-1].hash')
                FIRST_HEIGHT3=$(echo "$TXS3" | jq -r '.[0].blockNumber // .[0].height // "?"')
                LAST_HEIGHT3=$(echo "$TXS3" | jq -r '.[-1].blockNumber // .[-1].height // "?"')
                
                echo "First: hash=${FIRST_HASH3:0:16}... height=$FIRST_HEIGHT3"
                echo "Last:  hash=${LAST_HASH3:0:16}... height=$LAST_HEIGHT3"
            fi
        fi
    else
        echo "Empty result - no more transactions or pagination issue"
        echo "Raw result: $RESULT2"
    fi
else
    echo ""
    echo "Not enough transactions for pagination test (got $COUNT1, need at least $MAX)"
fi

echo ""
echo "=== SUMMARY ==="
TOTAL=$((COUNT1 + ${COUNT2:-0} + ${COUNT3:-0}))
echo "Total unique transactions fetched: ~$TOTAL (may include duplicates)"

