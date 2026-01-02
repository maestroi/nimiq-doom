#!/bin/bash

# Script to update run.json titles with cleaned versions
# Removes "box", "gus", etc. from titles
# Usage: ./update-run-json-titles.sh [games-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAMES_DIR="${1:-$SCRIPT_DIR/../games/dos}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Updating run.json titles in: ${GAMES_DIR}${NC}"
echo ""

# Check if games directory exists
if [ ! -d "$GAMES_DIR" ]; then
    echo -e "${RED}Error: Directory '$GAMES_DIR' does not exist${NC}"
    exit 1
fi

# Function to clean up title
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
        # Remove common suffixes/words (case insensitive)
        title=$(echo "$title" | sed 's/[Bb][Oo][Xx]//g' | sed 's/[Gg][Uu][Ss]//g')
        # Clean up multiple spaces
        title=$(echo "$title" | sed 's/  */ /g' | sed 's/^ *//' | sed 's/ *$//')
        # Convert to title case
        title=$(echo "$title" | sed 's/\b\(.\)/\u\1/g')
    fi
    
    echo "$title"
}

# Process each ZIP file
updated=0
skipped=0

for zip_file in "$GAMES_DIR"/*.zip; do
    if [ ! -f "$zip_file" ]; then
        continue
    fi
    
    zip_name=$(basename "$zip_file")
    echo -e "${BLUE}Processing: ${zip_name}${NC}"
    
    # Create temporary directory
    temp_dir=$(mktemp -d)
    
    # Extract ZIP to temp directory
    if ! unzip -q "$zip_file" -d "$temp_dir" 2>/dev/null; then
        echo -e "${RED}  ✗ Failed to extract ZIP file${NC}"
        rm -rf "$temp_dir"
        continue
    fi
    
    # Check if run.json exists
    if [ ! -f "$temp_dir/run.json" ]; then
        echo -e "${YELLOW}  ⚠ No run.json found, skipping${NC}"
        skipped=$((skipped + 1))
        rm -rf "$temp_dir"
        continue
    fi
    
    # Read current title
    current_title=$(python3 -c "import json, sys; print(json.load(open('$temp_dir/run.json')).get('title', ''))" 2>/dev/null || echo "")
    
    if [ -z "$current_title" ]; then
        echo -e "${YELLOW}  ⚠ No title in run.json, skipping${NC}"
        skipped=$((skipped + 1))
        rm -rf "$temp_dir"
        continue
    fi
    
    # Clean title
    cleaned_title=$(clean_title "$current_title")
    
    if [ "$current_title" = "$cleaned_title" ]; then
        echo -e "${GREEN}  ✓ Title already clean: ${current_title}${NC}"
        skipped=$((skipped + 1))
        rm -rf "$temp_dir"
        continue
    fi
    
    echo -e "${YELLOW}  Old: ${current_title}${NC}"
    echo -e "${GREEN}  New: ${cleaned_title}${NC}"
    
    # Update run.json
    python3 <<EOF
import json
import sys

with open('$temp_dir/run.json', 'r') as f:
    data = json.load(f)

data['title'] = '$cleaned_title'

with open('$temp_dir/run.json', 'w') as f:
    json.dump(data, f, indent=2)
EOF
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}  ✗ Failed to update run.json${NC}"
        rm -rf "$temp_dir"
        continue
    fi
    
    # Create backup if it doesn't exist
    backup_file="${zip_file}.backup"
    if [ ! -f "$backup_file" ]; then
        cp "$zip_file" "$backup_file"
        echo -e "${YELLOW}  ℹ Created backup: $(basename "$backup_file")${NC}"
    fi
    
    # Update ZIP file
    cd "$temp_dir"
    if zip -q -r "$zip_file" . 2>/dev/null; then
        echo -e "${GREEN}  ✓ Updated ZIP file${NC}"
        updated=$((updated + 1))
    else
        echo -e "${RED}  ✗ Failed to update ZIP file${NC}"
    fi
    
    cd - > /dev/null
    rm -rf "$temp_dir"
    echo ""
done

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}Updated: ${updated}${NC}"
if [ $skipped -gt 0 ]; then
    echo -e "${YELLOW}Skipped: ${skipped}${NC}"
fi

if [ $updated -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Titles updated!${NC}"
fi
