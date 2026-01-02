#!/bin/bash
# Load account credentials from file and set environment variables
# Searches for credentials in:
# 1. Specified file path (if provided)
# 2. ./account_credentials.txt (current directory)
# 3. ~/.config/nimiq-uploader/account_credentials.txt (global config)

CREDENTIALS_FILE="${1:-}"

# If no file specified, search in order
if [ -z "$CREDENTIALS_FILE" ]; then
    if [ -f "account_credentials.txt" ]; then
        CREDENTIALS_FILE="account_credentials.txt"
    elif [ -f "$HOME/.config/nimiq-uploader/account_credentials.txt" ]; then
        CREDENTIALS_FILE="$HOME/.config/nimiq-uploader/account_credentials.txt"
    else
        echo "Error: Credentials file not found"
        echo "Searched: ./account_credentials.txt"
        echo "         ~/.config/nimiq-uploader/account_credentials.txt"
        echo ""
        echo "Usage: source load-credentials.sh [credentials_file]"
        echo "Or run: nimiq-uploader account create --global"
        return 1 2>/dev/null || exit 1
    fi
fi

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "Error: Credentials file not found: $CREDENTIALS_FILE"
    echo "Usage: source load-credentials.sh [credentials_file]"
    return 1 2>/dev/null || exit 1
fi

# Extract values from the file
export ADDRESS=$(grep "^ADDRESS=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export PRIVATE_KEY=$(grep "^PRIVATE_KEY=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export PASSPHRASE=$(grep "^PASSPHRASE=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export RPC_URL=$(grep "^RPC_URL=" "$CREDENTIALS_FILE" | cut -d'=' -f2)
export PUBLIC_KEY=$(grep "^PUBLIC_KEY=" "$CREDENTIALS_FILE" | cut -d'=' -f2)

# Set NIMIQ_RPC_URL for the uploader CLI
if [ -n "$RPC_URL" ]; then
    export NIMIQ_RPC_URL="$RPC_URL"
fi

if [ -z "$ADDRESS" ] || [ -z "$PRIVATE_KEY" ] || [ -z "$PASSPHRASE" ]; then
    echo "Error: Invalid credentials file format"
    return 1 2>/dev/null || exit 1
fi

echo "✅ Credentials loaded from $CREDENTIALS_FILE"
echo "   Address: $ADDRESS"
echo "   RPC URL: ${RPC_URL:-http://localhost:8648 (default)}"
echo ""
echo "Environment variables set:"
echo "   ADDRESS, PRIVATE_KEY, PASSPHRASE, NIMIQ_RPC_URL, PUBLIC_KEY"
echo ""
echo "You can now use:"
echo "   nimiq-uploader account unlock --passphrase \"\$PASSPHRASE\""
echo "   nimiq-uploader account balance"
echo "   nimiq-uploader account wait-funds"
