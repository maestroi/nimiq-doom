#!/bin/bash
# Load account credentials from file and set environment variables

CREDENTIALS_FILE="${1:-account_credentials.txt}"

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "Error: Credentials file not found: $CREDENTIALS_FILE"
    echo "Usage: source load-credentials.sh [credentials_file]"
    echo "Or: ./load-credentials.sh [credentials_file]"
    exit 1
fi

# Source the credentials file (it contains shell-compatible variable assignments)
# Extract values from the file
export ADDRESS=$(grep "^ADDRESS=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export PRIVATE_KEY=$(grep "^PRIVATE_KEY=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export PASSPHRASE=$(grep "^PASSPHRASE=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export RPC_URL=$(grep "^RPC_URL=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export PUBLIC_KEY=$(grep "^PUBLIC_KEY=" "$CREDENTIALS_FILE" | cut -d'=' -f2)

if [ -z "$ADDRESS" ] || [ -z "$PRIVATE_KEY" ] || [ -z "$PASSPHRASE" ]; then
    echo "Error: Invalid credentials file format"
    exit 1
fi

echo "✅ Credentials loaded from $CREDENTIALS_FILE"
echo "   Address: $ADDRESS"
echo "   RPC URL: ${RPC_URL:-http://192.168.50.99:8648}"
echo ""
echo "Environment variables set:"
echo "   ADDRESS, PRIVATE_KEY, PASSPHRASE, RPC_URL, PUBLIC_KEY"
echo ""
echo "You can now use:"
echo "   ./uploader account unlock --passphrase \"\$PASSPHRASE\""
echo "   ./uploader account balance"
echo "   ./uploader account wait-funds"
