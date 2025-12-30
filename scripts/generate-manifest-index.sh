#!/bin/bash

# Script to generate a manifest index file that lists all available manifests
# This allows the frontend to automatically discover manifests without hardcoding names

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFESTS_DIR="$SCRIPT_DIR/../web/public/manifests"
INDEX_FILE="$MANIFESTS_DIR/manifests-index.json"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Generating manifest index...${NC}"

# Check if manifests directory exists
if [ ! -d "$MANIFESTS_DIR" ]; then
    echo -e "${RED}Error: Manifests directory not found: $MANIFESTS_DIR${NC}"
    exit 1
fi

# Create temporary file for index
TEMP_INDEX=$(mktemp)
echo "[" > "$TEMP_INDEX"

# Find all JSON files in manifests directory (except the index itself)
FIRST=true
for manifest_file in "$MANIFESTS_DIR"/*.json; do
    # Skip if no files found or if it's the index file
    [ -e "$manifest_file" ] || continue
    [ "$(basename "$manifest_file")" = "manifests-index.json" ] && continue
    
    manifest_name=$(basename "$manifest_file" .json)
    
    # Try to extract basic info from manifest (game_id, filename, etc.)
    # Using a simple approach with grep/sed, or we can use jq if available
    if command -v jq &> /dev/null; then
        # Use jq to extract manifest info
        game_id=$(jq -r '.game_id // empty' "$manifest_file" 2>/dev/null || echo "")
        filename=$(jq -r '.filename // empty' "$manifest_file" 2>/dev/null || echo "")
        total_size=$(jq -r '.total_size // 0' "$manifest_file" 2>/dev/null || echo "0")
        tx_count=$(jq -r '.expected_tx_hashes | length // 0' "$manifest_file" 2>/dev/null || echo "0")
        network=$(jq -r '.network // "mainnet"' "$manifest_file" 2>/dev/null || echo "mainnet")
        sender_address=$(jq -r '.sender_address // ""' "$manifest_file" 2>/dev/null || echo "")
    else
        # Fallback: use grep/sed (less reliable but works without jq)
        game_id=$(grep -o '"game_id"[[:space:]]*:[[:space:]]*[0-9]*' "$manifest_file" | grep -o '[0-9]*' | head -1 || echo "")
        filename=$(grep -o '"filename"[[:space:]]*:[[:space:]]*"[^"]*"' "$manifest_file" | sed 's/.*"filename"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1 || echo "")
        total_size=$(grep -o '"total_size"[[:space:]]*:[[:space:]]*[0-9]*' "$manifest_file" | grep -o '[0-9]*' | head -1 || echo "0")
        tx_count=$(grep -c '"expected_tx_hashes"' "$manifest_file" >/dev/null && grep -o '"expected_tx_hashes"[[:space:]]*:[[:space:]]*\[[^]]*\]' "$manifest_file" | grep -o '"[^"]*"' | wc -l | tr -d ' ' || echo "0")
        network=$(grep -o '"network"[[:space:]]*:[[:space:]]*"[^"]*"' "$manifest_file" | sed 's/.*"network"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1 || echo "mainnet")
        sender_address=$(grep -o '"sender_address"[[:space:]]*:[[:space:]]*"[^"]*"' "$manifest_file" | sed 's/.*"sender_address"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | head -1 || echo "")
    fi
    
    # Add comma if not first entry
    if [ "$FIRST" = false ]; then
        echo "," >> "$TEMP_INDEX"
    fi
    FIRST=false
    
    # Escape quotes in strings for JSON safety
    filename_escaped=$(echo "$filename" | sed 's/"/\\"/g')
    network_escaped=$(echo "$network" | sed 's/"/\\"/g')
    sender_address_escaped=$(echo "$sender_address" | sed 's/"/\\"/g')
    
    # Write manifest entry
    cat >> "$TEMP_INDEX" <<EOF
  {
    "name": "$manifest_name",
    "game_id": ${game_id:-0},
    "filename": "$filename_escaped",
    "total_size": ${total_size:-0},
    "chunk_size": 51,
    "network": "$network_escaped",
    "sender_address": "$sender_address_escaped",
    "tx_count": ${tx_count:-0}
  }
EOF
done

echo "]" >> "$TEMP_INDEX"

# Move temp file to final location
mv "$TEMP_INDEX" "$INDEX_FILE"

echo -e "${GREEN}✓ Manifest index generated: $INDEX_FILE${NC}"
echo ""

# Count manifests
MANIFEST_COUNT=$(jq '. | length' "$INDEX_FILE" 2>/dev/null || grep -c '"name"' "$INDEX_FILE" || echo "0")
echo "Found $MANIFEST_COUNT manifest(s)"

