#!/bin/bash

# Script to prepare DOS game ZIP files for upload by adding run.json files
# Detects executables (.bat, .exe, .com) and creates appropriate run.json
# Usage: ./prepare-dos-games.sh [games-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAMES_DIR="${1:-$SCRIPT_DIR/../games/dos}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility names to skip when auto-detecting
UTILITY_NAMES=("setup" "install" "readme" "help" "config" "options" "catalog" "uninstall")

echo -e "${BLUE}Preparing DOS games in: ${GAMES_DIR}${NC}"
echo ""

# Check if games directory exists
if [ ! -d "$GAMES_DIR" ]; then
    echo -e "${RED}Error: Directory '$GAMES_DIR' does not exist${NC}"
    exit 1
fi

# Function to detect the best executable in a directory
detect_executable() {
    local dir="$1"
    local zip_name="$2"
    
    local all_executables=()
    local bat_files=()
    local exe_files=()
    local com_files=()
    
    # Find all executables
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            all_executables+=("$file")
            local lower_file=$(echo "$file" | tr '[:upper:]' '[:lower:]')
            if [[ "$lower_file" == *.bat ]]; then
                bat_files+=("$file")
            elif [[ "$lower_file" == *.exe ]]; then
                exe_files+=("$file")
            elif [[ "$lower_file" == *.com ]]; then
                com_files+=("$file")
            fi
        fi
    done < <(find "$dir" -type f \( -iname "*.bat" -o -iname "*.exe" -o -iname "*.com" \) | sort)
    
    # Extract zip base name (without .zip extension)
    local zip_base=$(basename "$zip_name" .zip | tr '[:upper:]' '[:lower:]')
    
    # Priority 1: .BAT files in root directory matching zip name
    for bat in "${bat_files[@]}"; do
        local rel_bat=$(realpath --relative-to="$dir" "$bat" 2>/dev/null || echo "$bat")
        local bat_name=$(basename "$rel_bat" .bat | tr '[:upper:]' '[:lower:]')
        local bat_dir=$(dirname "$rel_bat" | tr '[:upper:]' '[:lower:]')
        
        # Check if it's in root and matches zip name
        if [[ "$bat_dir" == "." ]] && [[ "$bat_name" == "$zip_base"* ]] || [[ "$zip_base" == "$bat_name"* ]]; then
            echo "$rel_bat"
            return 0
        fi
    done
    
    # Priority 2: .BAT files in root directory (not utilities)
    for bat in "${bat_files[@]}"; do
        local rel_bat=$(realpath --relative-to="$dir" "$bat" 2>/dev/null || echo "$bat")
        local bat_name=$(basename "$rel_bat" .bat | tr '[:upper:]' '[:lower:]')
        local bat_dir=$(dirname "$rel_bat" | tr '[:upper:]' '[:lower:]')
        
        if [[ "$bat_dir" == "." ]]; then
            # Check if it's not a utility
            local is_utility=false
            for util in "${UTILITY_NAMES[@]}"; do
                if [[ "$bat_name" == *"$util"* ]]; then
                    is_utility=true
                    break
                fi
            done
            if [ "$is_utility" = false ]; then
                echo "$rel_bat"
                return 0
            fi
        fi
    done
    
    # Priority 3: Any .BAT file (not utilities)
    for bat in "${bat_files[@]}"; do
        local rel_bat=$(realpath --relative-to="$dir" "$bat" 2>/dev/null || echo "$bat")
        local bat_name=$(basename "$rel_bat" .bat | tr '[:upper:]' '[:lower:]')
        
        local is_utility=false
        for util in "${UTILITY_NAMES[@]}"; do
            if [[ "$bat_name" == *"$util"* ]]; then
                is_utility=true
                break
            fi
        done
        if [ "$is_utility" = false ]; then
            echo "$rel_bat"
            return 0
        fi
    done
    
    # Priority 4: .EXE files matching zip name (not utilities)
    for exe in "${exe_files[@]}"; do
        local rel_exe=$(realpath --relative-to="$dir" "$exe" 2>/dev/null || echo "$exe")
        local exe_name=$(basename "$rel_exe" .exe | tr '[:upper:]' '[:lower:]')
        
        if [[ "$exe_name" == "$zip_base"* ]] || [[ "$zip_base" == "$exe_name"* ]]; then
            local is_utility=false
            for util in "${UTILITY_NAMES[@]}"; do
                if [[ "$exe_name" == *"$util"* ]]; then
                    is_utility=true
                    break
                fi
            done
            if [ "$is_utility" = false ]; then
                echo "$rel_exe"
                return 0
            fi
        fi
    done
    
    # Priority 5: Any .EXE file (not utilities)
    for exe in "${exe_files[@]}"; do
        local rel_exe=$(realpath --relative-to="$dir" "$exe" 2>/dev/null || echo "$exe")
        local exe_name=$(basename "$rel_exe" .exe | tr '[:upper:]' '[:lower:]')
        
        local is_utility=false
        for util in "${UTILITY_NAMES[@]}"; do
            if [[ "$exe_name" == *"$util"* ]]; then
                is_utility=true
                break
            fi
        done
        if [ "$is_utility" = false ]; then
            echo "$rel_exe"
            return 0
        fi
    done
    
    # Priority 6: Any .COM file
    if [ ${#com_files[@]} -gt 0 ]; then
        local rel_com=$(realpath --relative-to="$dir" "${com_files[0]}" 2>/dev/null || echo "${com_files[0]}")
        echo "$rel_com"
        return 0
    fi
    
    # Priority 7: First .BAT file found (even if utility)
    if [ ${#bat_files[@]} -gt 0 ]; then
        local rel_bat=$(realpath --relative-to="$dir" "${bat_files[0]}" 2>/dev/null || echo "${bat_files[0]}")
        echo "$rel_bat"
        return 0
    fi
    
    # Priority 8: First .EXE file found (even if utility)
    if [ ${#exe_files[@]} -gt 0 ]; then
        local rel_exe=$(realpath --relative-to="$dir" "${exe_files[0]}" 2>/dev/null || echo "${exe_files[0]}")
        echo "$rel_exe"
        return 0
    fi
    
    return 1
}

# Function to generate a title from filename (cleaned up)
generate_title() {
    local zip_name="$1"
    local title=$(basename "$zip_name" .zip)
    # Convert to title case and replace dashes/underscores with spaces
    title=$(echo "$title" | sed 's/[-_]/ /g' | sed 's/\b\(.\)/\u\1/g')
    # Remove common suffixes/words (box, gus, etc.)
    title=$(echo "$title" | sed 's/\bBox\b//g' | sed 's/\bGus\b//g' | sed 's/\bGUS\b//g' | sed 's/\bBOX\b//g')
    # Clean up multiple spaces
    title=$(echo "$title" | sed 's/  */ /g' | sed 's/^ *//' | sed 's/ *$//')
    # Fix common abbreviations
    title=$(echo "$title" | sed 's/W3d/W3D/g' | sed 's/Wolf3d/Wolf 3D/g')
    echo "$title"
}

# Process each ZIP file
processed=0
skipped=0
failed=0

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
        failed=$((failed + 1))
        rm -rf "$temp_dir"
        continue
    fi
    
    # Check if run.json already exists
    if [ -f "$temp_dir/run.json" ]; then
        echo -e "${YELLOW}  ⚠ run.json already exists, skipping${NC}"
        skipped=$((skipped + 1))
        rm -rf "$temp_dir"
        continue
    fi
    
    # Detect executable
    executable=$(detect_executable "$temp_dir" "$zip_name")
    
    if [ -z "$executable" ]; then
        echo -e "${RED}  ✗ No executable found (.exe, .bat, or .com)${NC}"
        failed=$((failed + 1))
        rm -rf "$temp_dir"
        continue
    fi
    
    # Normalize executable path (use forward slashes, uppercase for DOS compatibility)
    executable=$(echo "$executable" | tr '\\' '/' | tr '[:lower:]' '[:upper:]')
    
    echo -e "${GREEN}  ✓ Found executable: ${executable}${NC}"
    
    # Generate title
    title=$(generate_title "$zip_name")
    
    # Create run.json
    run_json="$temp_dir/run.json"
    cat > "$run_json" <<EOF
{
  "title": "$title",
  "filename": "$zip_name",
  "executable": "$executable",
  "platform": "DOS"
}
EOF
    
    echo -e "${GREEN}  ✓ Created run.json${NC}"
    
    # Create backup of original ZIP
    backup_file="${zip_file}.backup"
    if [ ! -f "$backup_file" ]; then
        cp "$zip_file" "$backup_file"
        echo -e "${YELLOW}  ℹ Created backup: $(basename "$backup_file")${NC}"
    fi
    
    # Create new ZIP with run.json included
    cd "$temp_dir"
    if zip -q -r "$zip_file" . 2>/dev/null; then
        echo -e "${GREEN}  ✓ Updated ZIP file${NC}"
        processed=$((processed + 1))
    else
        echo -e "${RED}  ✗ Failed to create new ZIP file${NC}"
        failed=$((failed + 1))
    fi
    
    cd - > /dev/null
    rm -rf "$temp_dir"
    echo ""
done

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
echo -e "${GREEN}Processed: ${processed}${NC}"
if [ $skipped -gt 0 ]; then
    echo -e "${YELLOW}Skipped: ${skipped}${NC}"
fi
if [ $failed -gt 0 ]; then
    echo -e "${RED}Failed: ${failed}${NC}"
fi

if [ $processed -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All games are now ready for upload!${NC}"
    echo "Backup files (.backup) were created for safety."
fi
