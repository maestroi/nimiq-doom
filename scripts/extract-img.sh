#!/bin/bash

# Script to extract files from DOS IMG disk images
# Usage: ./extract-img.sh <img-file> [output-directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <img-file> [output-directory]"
    echo ""
    echo "Extracts files from a DOS IMG disk image."
    echo ""
    echo "Arguments:"
    echo "  img-file         Path to the .img file (required)"
    echo "  output-directory Directory to extract files to (optional, defaults to <img-name>_extracted)"
    exit 1
}

if [ $# -lt 1 ]; then
    echo -e "${RED}Error: img-file is required${NC}"
    usage
fi

IMG_FILE="$1"
OUTPUT_DIR="${2:-}"

# Validate IMG file
if [ ! -f "$IMG_FILE" ]; then
    echo -e "${RED}Error: File '$IMG_FILE' does not exist${NC}"
    exit 1
fi

# Determine output directory
if [ -z "$OUTPUT_DIR" ]; then
    BASENAME=$(basename "$IMG_FILE" .img)
    OUTPUT_DIR="${BASENAME}_extracted"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}Extracting DOS IMG disk image...${NC}"
echo "  Input: $IMG_FILE"
echo "  Output: $OUTPUT_DIR"
echo ""

# Try different methods to extract IMG files

# Method 1: Use mtools (if available)
if command -v mcopy &> /dev/null; then
    echo "Using mtools to extract files..."
    # Mount parameters from instructions: -size 512,8,2,384
    # This means: 512 bytes/sector, 8 sectors/track, 2 heads, 384 sectors
    # Try to extract using mcopy
    mcopy -s -i "$IMG_FILE" "*.*" "$OUTPUT_DIR/" 2>/dev/null || {
        echo -e "${YELLOW}Warning: mcopy failed, trying alternative method...${NC}"
    }
    
    if [ "$(ls -A $OUTPUT_DIR 2>/dev/null)" ]; then
        echo -e "${GREEN}✓ Successfully extracted files using mtools${NC}"
        ls -lh "$OUTPUT_DIR"
        exit 0
    fi
fi

# Method 2: Use 7z (if available) - some IMG files are actually archives
if command -v 7z &> /dev/null; then
    echo "Trying 7z to extract files..."
    7z x "$IMG_FILE" -o"$OUTPUT_DIR" -y > /dev/null 2>&1 || true
    
    if [ "$(ls -A $OUTPUT_DIR 2>/dev/null)" ]; then
        echo -e "${GREEN}✓ Successfully extracted files using 7z${NC}"
        ls -lh "$OUTPUT_DIR"
        exit 0
    fi
fi

# Method 3: Use dosfstools (if available)
if command -v fsck.msdos &> /dev/null; then
    echo "Trying dosfstools..."
    # Create a loop device and mount (requires root or sudo)
    # This is more complex, so we'll skip it for now
fi

# Method 4: Use Python with pyfatfs or similar
if command -v python3 &> /dev/null; then
    echo "Trying Python extraction..."
    python3 << EOF
import sys
import os

try:
    # Try using pyfatfs if available
    from pyfatfs import PyFatFS
    
    fs = PyFatFS()
    fs.open("$IMG_FILE")
    
    def extract_dir(fs, path, output_dir):
        try:
            items = fs.listdir(path)
            for item in items:
                full_path = os.path.join(path, item)
                output_path = os.path.join(output_dir, item)
                
                if fs.isdir(full_path):
                    os.makedirs(output_path, exist_ok=True)
                    extract_dir(fs, full_path, output_path)
                else:
                    with open(output_path, 'wb') as f:
                        f.write(fs.read(full_path))
        except Exception as e:
            print(f"Error: {e}")
    
    extract_dir(fs, "/", "$OUTPUT_DIR")
    print("✓ Successfully extracted files using Python")
    sys.exit(0)
except ImportError:
    print("pyfatfs not available")
    sys.exit(1)
except Exception as e:
    print(f"Python extraction failed: {e}")
    sys.exit(1)
EOF
    
    if [ $? -eq 0 ] && [ "$(ls -A $OUTPUT_DIR 2>/dev/null)" ]; then
        echo -e "${GREEN}✓ Successfully extracted files using Python${NC}"
        ls -lh "$OUTPUT_DIR"
        exit 0
    fi
fi

# If all methods fail, provide instructions
echo -e "${RED}✗ Could not automatically extract IMG file${NC}"
echo ""
echo "The IMG file needs to be mounted in DOSBox to extract files."
echo ""
echo "Option 1: Use DOSBox to extract files manually"
echo "  1. Install DOSBox"
echo "  2. Mount the IMG file:"
echo "     imgmount c $IMG_FILE -size 512,8,2,384"
echo "  3. Copy files:"
echo "     c:"
echo "     copy *.* c:\\extracted\\"
echo ""
echo "Option 2: Install mtools and try again"
echo "  sudo apt-get install mtools  # Debian/Ubuntu"
echo "  brew install mtools          # macOS"
echo ""
echo "Option 3: Package the IMG file directly"
echo "  The IMG file can be packaged as-is, but JS-DOS may need"
echo "  special handling to mount it. You may need to modify the"
echo "  frontend to use imgmount command."

exit 1
