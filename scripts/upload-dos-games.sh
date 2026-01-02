#!/bin/bash

# Script to upload DOS game ZIP files to the blockchain
# Checks if games already exist and skips them
# Uploads with concurrent workers and rate limiting
# Usage: ./upload-dos-games.sh [games-directory] [catalog-addr] [rpc-url]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOADER_DIR="$SCRIPT_DIR/../uploader"
GAMES_DIR="${1:-$SCRIPT_DIR/../games/dos}"
CATALOG_ADDR="${2:-test}"
# RPC_URL can be a comma-separated list for fallback, or empty to use default from credentials
RPC_URL="${3:-}"
CONCURRENCY=5
RATE_LIMIT=200
SEMVER="1.0.0"
PLATFORM=0
# Size threshold in bytes for using default RPC (bigger games use default RPC from credentials)
BIG_GAME_SIZE=${4:-10485760}  # Default: 10MB

# Get sender address and default RPC from account_credentials.txt
SENDER_ADDRESS=""
DEFAULT_RPC_URL=""
CREDENTIALS_FILE="$UPLOADER_DIR/account_credentials.txt"
if [ -f "$CREDENTIALS_FILE" ]; then
    SENDER_ADDRESS=$(grep "^ADDRESS=" "$CREDENTIALS_FILE" | cut -d'=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | head -1)
    DEFAULT_RPC_URL=$(grep "^RPC_URL=" "$CREDENTIALS_FILE" | cut -d'=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | head -1)
fi

# Default sender if not found in credentials
if [ -z "$SENDER_ADDRESS" ]; then
    SENDER_ADDRESS="NQ89 4GDH 0J4U C2FY TU0Y TP1X J1H7 3HX3 PVSE"
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}Uploading DOS games from: ${GAMES_DIR}${NC}"
echo -e "${BLUE}Catalog: ${CATALOG_ADDR}${NC}"
echo -e "${BLUE}Sender: ${SENDER_ADDRESS}${NC}"
echo -e "${BLUE}Concurrency: ${CONCURRENCY}${NC}"
echo -e "${BLUE}Rate limit: ${RATE_LIMIT} tx/s${NC}"
echo ""

# Check if games directory exists
if [ ! -d "$GAMES_DIR" ]; then
    echo -e "${RED}Error: Directory '$GAMES_DIR' does not exist${NC}"
    exit 1
fi

# Check if uploader exists
UPLOADER_CMD=""
if [ -f "$UPLOADER_DIR/uploader" ]; then
    UPLOADER_CMD="$UPLOADER_DIR/uploader"
elif command -v go >/dev/null 2>&1; then
    UPLOADER_CMD="go run $UPLOADER_DIR"
else
    echo -e "${RED}Error: uploader binary not found and go is not available${NC}"
    exit 1
fi

# Function to clean up title (remove "box", "gus", etc.)
clean_title() {
    local title="$1"
    # Convert to lowercase for processing
    local lower_title=$(echo "$title" | tr '[:upper:]' '[:lower:]')
    
    # Handle specific cases
    if [[ "$lower_title" == *"duke2box"* ]] || [[ "$lower_title" == *"duke2"* ]]; then
        title="Duke 2"
    elif [[ "$lower_title" == *"w3d"* ]] || [[ "$lower_title" == *"wolf3d"* ]] || [[ "$lower_title" == *"wolf 3d"* ]]; then
        title="Wolf 3D"
    elif [[ "$lower_title" == *"lemming"* ]]; then
        title="Lemmings"
    else
        # Convert to title case
        title=$(echo "$title" | sed 's/[-_]/ /g' | sed 's/\b\(.\)/\u\1/g')
        # Remove common suffixes/words (case insensitive)
        title=$(echo "$title" | sed 's/[Bb][Oo][Xx]//g' | sed 's/[Gg][Uu][Ss]//g')
        # Clean up multiple spaces
        title=$(echo "$title" | sed 's/  */ /g' | sed 's/^ *//' | sed 's/ *$//')
    fi
    
    # Truncate to 16 characters (max for catalog)
    title=$(echo "$title" | cut -c1-16)
    echo "$title"
}

# Function to extract title from run.json or generate from filename
get_title() {
    local zip_file="$1"
    local temp_dir=$(mktemp -d)
    
    # Try to extract run.json
    if unzip -q -j "$zip_file" run.json -d "$temp_dir" 2>/dev/null; then
        if [ -f "$temp_dir/run.json" ]; then
            local title=$(python3 -c "import json, sys; print(json.load(open('$temp_dir/run.json')).get('title', ''))" 2>/dev/null || echo "")
            rm -rf "$temp_dir"
            if [ -n "$title" ]; then
                echo "$title"
                return
            fi
        fi
    fi
    rm -rf "$temp_dir"
    
    # Fallback: generate from filename
    local zip_name=$(basename "$zip_file" .zip)
    clean_title "$zip_name"
}

# Function to check if game already exists in catalog
check_game_exists() {
    local title="$1"
    local semver="$2"
    
    # Use uploader to query catalog (dry-run will check)
    # We'll use a simpler approach: try to find by title
    # The uploader will auto-detect if app-id exists and reuse it
    # For now, we'll let the uploader handle it and check the output
    echo "0" # Return 0 for now, let uploader handle duplicate detection
}

# Function to upload a single game
upload_game() {
    local zip_file="$1"
    local zip_name=$(basename "$zip_file")
    
    echo -e "${CYAN}[$(date +%H:%M:%S)] Processing: ${zip_name}${NC}"
    
    # Get cleaned title
    local title=$(get_title "$zip_file")
    
    if [ -z "$title" ]; then
        echo -e "${RED}  ✗ Failed to get title${NC}"
        return 1
    fi
    
    echo -e "${BLUE}  Title: ${title}${NC}"
    
    # Build upload command
    local cmd_args=(
        "upload-cartridge"
        "--file" "$zip_file"
        "--title" "$title"
        "--semver" "$SEMVER"
        "--platform" "$PLATFORM"
        "--catalog-addr" "$CATALOG_ADDR"
        "--generate-cartridge-addr"
        "--concurrency" "$CONCURRENCY"
        "--rate" "$RATE_LIMIT"
        "--sender" "$SENDER_ADDRESS"
    )
    
    if [ -n "$RPC_URL" ]; then
        cmd_args+=("--rpc-url" "$RPC_URL")
    fi
    
    # Run upload and show progress
    local output_file=$(mktemp)
    local error_file=$(mktemp)
    local exit_code=1
    
    echo -e "${BLUE}  Starting upload...${NC}"
    
    if [ -f "$UPLOADER_CMD" ]; then
        # Run uploader and capture output
        if "$UPLOADER_CMD" "${cmd_args[@]}" > "$output_file" 2> "$error_file"; then
            exit_code=0
        fi
    else
        # Use go run
        cd "$UPLOADER_DIR"
        if go run . "${cmd_args[@]}" > "$output_file" 2> "$error_file"; then
            exit_code=0
        fi
        cd - > /dev/null
    fi
    
    # Check output for various conditions
    local combined_output=$(cat "$output_file" "$error_file" 2>/dev/null)
    
    # Show important progress messages
    if [ -n "$combined_output" ]; then
        # Show auto-generated IDs
        if echo "$combined_output" | grep -q "Auto-generated\|Found existing"; then
            echo "$combined_output" | grep "Auto-generated\|Found existing" | while read -r line; do
                echo -e "${YELLOW}    ${line}${NC}"
            done
        fi
        
        # Show upload progress (chunks)
        if echo "$combined_output" | grep -q "Uploading chunk\|Sent.*chunk"; then
            echo "$combined_output" | grep "Uploading chunk\|Sent.*chunk" | tail -1 | sed 's/^/    /' | while read -r line; do
                echo -e "${BLUE}${line}${NC}"
            done
        fi
    fi
    
    # Check for "already exists" or duplicate messages
    if echo "$combined_output" | grep -qi "already exists\|duplicate\|same.*version"; then
        echo -e "${YELLOW}  ⚠ Game already exists, skipped${NC}"
        rm -f "$output_file" "$error_file"
        return 0
    fi
    
    # Check for success
    if [ $exit_code -eq 0 ] && echo "$combined_output" | grep -qi "upload complete\|✓.*complete\|CART header\|CENT entry"; then
        echo -e "${GREEN}  ✓ Upload successful${NC}"
        # Show key info from output - extract CART hash
        local cart_line=$(echo "$combined_output" | grep -i "CART header" | head -1)
        if [ -n "$cart_line" ]; then
            # Try different patterns to extract hash
            local cart_hash=$(echo "$cart_line" | sed -n 's/.*CART header:[[:space:]]*\([A-Za-z0-9]\{64,\}\).*/\1/p')
            if [ -z "$cart_hash" ]; then
                cart_hash=$(echo "$cart_line" | sed -n 's/.*CART header:[[:space:]]*\(NQ[0-9A-Z ]*\).*/\1/p' | tr -d ' ')
            fi
            if [ -n "$cart_hash" ] && [ "$cart_hash" != "===" ] && [ ${#cart_hash} -gt 10 ]; then
                echo -e "${GREEN}    CART: ${cart_hash}${NC}"
            fi
        fi
        # Extract CENT hash
        local cent_line=$(echo "$combined_output" | grep -i "CENT entry" | head -1)
        if [ -n "$cent_line" ]; then
            local cent_hash=$(echo "$cent_line" | sed -n 's/.*CENT entry:[[:space:]]*\([A-Za-z0-9]\{64,\}\).*/\1/p')
            if [ -z "$cent_hash" ]; then
                cent_hash=$(echo "$cent_line" | sed -n 's/.*CENT entry:[[:space:]]*\(NQ[0-9A-Z ]*\).*/\1/p' | tr -d ' ')
            fi
            if [ -n "$cent_hash" ] && [ "$cent_hash" != "===" ] && [ ${#cent_hash} -gt 10 ]; then
                echo -e "${GREEN}    CENT: ${cent_hash}${NC}"
            fi
        fi
        # Extract chunk info
        local chunks_line=$(echo "$combined_output" | grep -i "DATA chunks" | head -1)
        if [ -n "$chunks_line" ]; then
            local chunks=$(echo "$chunks_line" | sed -n 's/.*DATA chunks:[[:space:]]*\([0-9]*\)\/\([0-9]*\).*/\1\/\2/p')
            if [ -n "$chunks" ]; then
                echo -e "${GREEN}    Chunks: ${chunks}${NC}"
            fi
        fi
        rm -f "$output_file" "$error_file"
        return 0
    fi
    
    # If we get here, there was an error
    echo -e "${RED}  ✗ Upload failed${NC}"
    if [ -s "$error_file" ]; then
        local error_msg=$(head -5 "$error_file" | grep -v "^$" | head -1)
        if [ -n "$error_msg" ]; then
            echo -e "${RED}    Error: ${error_msg}${NC}"
        fi
    elif [ -s "$output_file" ]; then
        local error_msg=$(grep -i "error\|failed\|fatal" "$output_file" | head -1)
        if [ -n "$error_msg" ]; then
            echo -e "${RED}    Error: ${error_msg}${NC}"
        fi
    fi
    rm -f "$output_file" "$error_file"
    return 1
}

# Collect all ZIP files
zip_files=()
while IFS= read -r -d '' file; do
    zip_files+=("$file")
done < <(find "$GAMES_DIR" -maxdepth 1 -name "*.zip" -type f -print0 | sort -z)

if [ ${#zip_files[@]} -eq 0 ]; then
    echo -e "${YELLOW}No ZIP files found in ${GAMES_DIR}${NC}"
    exit 0
fi

echo -e "${BLUE}Found ${#zip_files[@]} game(s) to process${NC}"
echo ""

# Process games sequentially (one at a time) to see progress clearly
uploaded=0
skipped=0
failed=0
total=${#zip_files[@]}
current=0

# Upload games one by one
for zip_file in "${zip_files[@]}"; do
    current=$((current + 1))
    echo -e "${CYAN}[${current}/${total}]${NC}"
    
    if upload_game "$zip_file"; then
        uploaded=$((uploaded + 1))
    else
        failed=$((failed + 1))
    fi
    
    echo "" # Blank line between games
done

# Summary
echo ""
echo -e "${BLUE}=== Upload Summary ===${NC}"
echo -e "${GREEN}Uploaded: ${uploaded}${NC}"
if [ $skipped -gt 0 ]; then
    echo -e "${YELLOW}Skipped: ${skipped}${NC}"
fi
if [ $failed -gt 0 ]; then
    echo -e "${RED}Failed: ${failed}${NC}"
fi

if [ $uploaded -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Upload process completed!${NC}"
fi
