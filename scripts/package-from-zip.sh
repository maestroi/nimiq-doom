#!/bin/bash

# Script to extract a ZIP file and package it for blockchain upload
# Usage: ./package-from-zip.sh <input-zip> [output-zip] [game-executable]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAMES_DIR="$SCRIPT_DIR/../games"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <input-zip> [output-zip] [game-executable]"
    echo ""
    echo "Extracts a ZIP file and packages it for blockchain upload."
    echo ""
    echo "Arguments:"
    echo "  input-zip       ZIP file containing game files (required)"
    echo "  output-zip      Output ZIP filename (optional, defaults to <input-name>_packaged.zip)"
    echo "  game-executable Main game executable (optional, auto-detected if not specified)"
    echo ""
    echo "Examples:"
    echo "  $0 games/keen1.zip"
    echo "  $0 games/keen1.zip keen1.zip KEEN1.EXE"
    exit 1
}

if [ $# -lt 1 ]; then
    echo -e "${RED}Error: input-zip is required${NC}"
    usage
fi

INPUT_ZIP="$1"
OUTPUT_ZIP="${2:-}"
GAME_EXE="${3:-}"

# Validate input ZIP
if [ ! -f "$INPUT_ZIP" ]; then
    echo -e "${RED}Error: ZIP file '$INPUT_ZIP' does not exist${NC}"
    exit 1
fi

# Get base name for extraction directory
ZIP_BASENAME=$(basename "$INPUT_ZIP" .zip)
EXTRACT_DIR="$GAMES_DIR/${ZIP_BASENAME}_extracted"

# Determine output filename
if [ -z "$OUTPUT_ZIP" ]; then
    OUTPUT_ZIP="$GAMES_DIR/${ZIP_BASENAME}_packaged.zip"
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Packaging DOS Game from ZIP${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Extract ZIP
echo -e "${YELLOW}Step 1: Extracting ZIP file...${NC}"
if [ -d "$EXTRACT_DIR" ]; then
    echo -e "${YELLOW}  Directory $EXTRACT_DIR already exists. Removing...${NC}"
    rm -rf "$EXTRACT_DIR"
fi

mkdir -p "$EXTRACT_DIR"

if command -v unzip &> /dev/null; then
    unzip -q "$INPUT_ZIP" -d "$EXTRACT_DIR"
    echo -e "${GREEN}  ✓ Extracted to $EXTRACT_DIR${NC}"
else
    echo -e "${RED}  ✗ unzip command not found. Please install unzip or extract manually.${NC}"
    exit 1
fi

echo ""

# Step 2: Package using the package-game script
echo -e "${YELLOW}Step 2: Packaging for blockchain...${NC}"

ARGS=("$EXTRACT_DIR" "$OUTPUT_ZIP")
if [ -n "$GAME_EXE" ]; then
    ARGS+=("$GAME_EXE")
fi

"$SCRIPT_DIR/package-game.sh" "${ARGS[@]}"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ✓ Successfully packaged!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Package location: $OUTPUT_ZIP"
    echo ""
    echo "Next steps:"
    echo "  1. Upload to blockchain:"
    echo "     cd uploader"
    echo "     ./uploader upload --file $OUTPUT_ZIP --game-id <id> --rpc-url <rpc-url>"
    echo ""
    echo "  2. Generate manifest:"
    echo "     ./uploader manifest --file $OUTPUT_ZIP --game-id <id> --sender <address>"
    echo ""
    echo "  3. Copy manifest to web/public/manifests/:"
    echo "     cp manifest.json ../web/public/manifests/${ZIP_BASENAME}.json"
    echo ""
    echo "  4. Regenerate manifest index:"
    echo "     ./scripts/generate-manifest-index.sh"
    echo ""
    echo "  5. Clean up (optional):"
    echo "     rm -rf $EXTRACT_DIR"
else
    echo -e "${RED}✗ Failed to package game${NC}"
    exit 1
fi

