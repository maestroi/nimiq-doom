#!/bin/bash

# Script to package DOS game files into a ZIP file ready for blockchain upload
# Usage: ./package-game.sh <game-directory> [output-zip] [game-executable]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOADER_DIR="$SCRIPT_DIR/../uploader"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <game-directory> [output-zip] [game-executable]"
    echo ""
    echo "Packages DOS game files into a ZIP file ready for blockchain upload."
    echo ""
    echo "Arguments:"
    echo "  game-directory   Directory containing game files (required)"
    echo "  output-zip      Output ZIP filename (optional, defaults to <dirname>.zip)"
    echo "  game-executable Main game executable (optional, auto-detected if not specified)"
    echo ""
    echo "Examples:"
    echo "  $0 ./doom-files"
    echo "  $0 ./doom-files doom.zip"
    echo "  $0 ./doom-files doom.zip DOOM.EXE"
    exit 1
}

if [ $# -lt 1 ]; then
    echo -e "${RED}Error: game-directory is required${NC}"
    usage
fi

GAME_DIR="$1"
OUTPUT_ZIP="${2:-}"
GAME_EXE="${3:-}"

# Validate game directory
if [ ! -d "$GAME_DIR" ]; then
    echo -e "${RED}Error: Directory '$GAME_DIR' does not exist${NC}"
    exit 1
fi

# Build the uploader package command
cd "$UPLOADER_DIR"

ARGS=("-dir" "$GAME_DIR")

if [ -n "$OUTPUT_ZIP" ]; then
    ARGS+=("-output" "$OUTPUT_ZIP")
fi

if [ -n "$GAME_EXE" ]; then
    ARGS+=("-exe" "$GAME_EXE")
fi

echo -e "${GREEN}Packaging DOS game...${NC}"
echo ""

# Run the uploader package command
if [ -f "./uploader" ]; then
    ./uploader package "${ARGS[@]}"
else
    go run . package "${ARGS[@]}"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Package created successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Upload the ZIP file to the blockchain using:"
    echo "     cd uploader && ./uploader upload --file <zip-file> --game-id <id>"
    echo "  2. Generate manifest:"
    echo "     cd uploader && ./uploader manifest --file <zip-file> --game-id <id>"
    echo "  3. Place manifest in manifests/ directory"
    echo "  4. Users can sync and run the game in the browser!"
else
    echo -e "${RED}✗ Failed to create package${NC}"
    exit 1
fi
