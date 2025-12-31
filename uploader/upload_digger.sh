#!/bin/bash
# Upload Digger to cartridge system

# Make sure account is unlocked first
echo "Make sure your account is unlocked before running this!"
echo "Run: ./uploader account unlock --passphrase \"d349f402ee90f18eea731c9cc3432d87045508a77c7e5e4b613ad0b8f6c79f8a\""
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Upload to test catalog (app-id and cartridge-id will be auto-generated)
./uploader upload-cartridge \
  --file digger.zip \
  --title "Digger" \
  --semver "1.0.0" \
  --platform 0 \
  --generate-cartridge-addr \
  --catalog-addr test
