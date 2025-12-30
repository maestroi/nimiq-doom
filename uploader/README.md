# Nimiq DOOM Uploader

CLI tool for chunking files and uploading them to the Nimiq blockchain as DOOM chunks.

## Quick Start

### Build

```bash
go build -o uploader .
```

### Create Account and Get Started

1. **Create account** (generates random passphrase and saves credentials to `account_credentials.txt`):
   ```bash
   ./uploader account create
   ```
   This automatically generates a secure random passphrase and saves it in the credentials file.

2. **Fund the address** (send some NIM to the address shown - mainnet)

3. **Load credentials**:
   ```bash
   source load-credentials.sh
   ```

4. **Unlock account** (required before sending transactions):
   ```bash
   ./uploader account unlock --passphrase "$PASSPHRASE"
   ```
   Or use the passphrase from the credentials file directly.

5. **Wait for funds**:
   ```bash
   ./uploader account wait-funds
   ```

6. **Upload your file**:
   ```bash
   ./uploader upload --file yourfile.bin --game-id 1
   ```
   Data transactions will be sent to the default receiver address (`NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES`). You can override with `--receiver`.

### Quick Usage

All commands support loading the default address from `account_credentials.txt` if you don't specify `--address`.

## Commands

### Account Management

#### Check Account Status
```bash
./uploader account status --address "NQ00 ..."
```

#### Check Balance
```bash
./uploader account balance --address "NQ00 ..."
```

#### Wait for Funds
```bash
./uploader account wait-funds --address "NQ00 ..." --min-nim 0.001
```

#### Create New Account
```bash
./uploader account create
```
This automatically:
- Creates a new account via RPC
- Generates a secure random passphrase (64 hex characters)
- Saves all credentials including passphrase to `account_credentials.txt`
- Account is already imported in the RPC node (no need to import separately)

You can then use `source load-credentials.sh` to load the credentials into your shell environment.

#### Import Account
```bash
# Import using credentials from account_credentials.txt and unlock
./uploader account import --from-file --unlock

# Or import manually
./uploader account import --private-key "hex-key" --passphrase "passphrase" --unlock
```
The `--from-file` flag loads `PRIVATE_KEY` and `PASSPHRASE` from `account_credentials.txt`. The `--unlock` flag unlocks the account after importing.

### File Operations

#### Generate Manifest
```bash
./uploader manifest --file /path/to/file.bin --game-id 1 --sender "NQ00 ..." --network testnet
```

#### Upload (Dry-Run)
```bash
./uploader upload --file /path/to/file.bin --game-id 1 --sender "NQ00 ..." --dry-run
```

#### Upload (Real)
```bash
./uploader upload --file /path/to/file.bin --game-id 1 --sender "NQ00 ..." --receiver "NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES" --rate 1.0 --fee 0
```
The `--receiver` flag specifies where to send the data transactions (defaults to `NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES`).

## Flags

### Common Flags
- `--rpc-url`: Nimiq RPC URL (default: `http://192.168.50.99:8648` mainnet, or set `NIMIQ_RPC_URL` env var)
- `--game-id`: Game ID (uint32, required for upload/manifest)
- `--sender`: Sender address (required)

### Upload Flags
- `--file`: Path to file to upload (required)
- `--sender`: Sender address (defaults to ADDRESS from account_credentials.txt)
- `--receiver`: Receiver address for data transactions (default: `NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES`)
- `--dry-run`: Generate upload plan without sending transactions
- `--rate`: Transaction rate limit (tx/s, default: 1.0)
- `--fee`: Transaction fee in Luna (default: 0)

### Manifest Flags
- `--network`: Network (default: mainnet, or set `NIMIQ_NETWORK` env var)
- `--output`: Output manifest file (default: manifest.json)

### Account Flags
- `--save`: File to save credentials to (default: account_credentials.txt)
- `--min-nim`: Minimum NIM balance for wait-funds (default: 0.001)
- `--interval`: Check interval in seconds for wait-funds (default: 10)

## Progress Tracking

Upload progress is automatically saved to `upload_plan_<game_id>.json`. If an upload is interrupted, simply run the upload command again - it will resume from where it left off.

## Credentials File

When you create an account, credentials are saved to `account_credentials.txt` with:
- ADDRESS
- PUBLIC_KEY
- PRIVATE_KEY
- PASSPHRASE
- RPC_URL

**Keep this file secure!** It contains your private key.

Use `source load-credentials.sh` to load these into your shell environment.

## Requirements

- Go 1.21+
- Nimiq RPC endpoint (default: http://192.168.50.99:8648 mainnet)
- Account imported and unlocked in the RPC node
- Account funded with some NIM (transactions cost just a few cents)

## See Also

- `usage-examples.sh` - Interactive usage examples
- `load-credentials.sh` - Load credentials from file
- Main project README.md for full documentation
