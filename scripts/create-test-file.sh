#!/bin/bash
# Create a small test binary file for testing

OUTPUT_FILE="${1:-test.bin}"
SIZE="${2:-256}"

echo "Creating test file: $OUTPUT_FILE (${SIZE} bytes)"
dd if=/dev/urandom of="$OUTPUT_FILE" bs=1 count="$SIZE" 2>/dev/null

echo "Created $OUTPUT_FILE"
echo "SHA256: $(sha256sum "$OUTPUT_FILE" | cut -d' ' -f1)"
