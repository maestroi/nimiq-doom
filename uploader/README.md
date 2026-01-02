# Nimiq Uploader

CLI tool for uploading games and files to the Nimiq blockchain using the cartridge format (CART/DATA/CENT).

## Installation

### Quick Install (Linux/macOS)

```bash
# Build and install to ~/bin (no sudo required)
make install-user

# Or install system-wide (may require sudo)
make install
```

### Manual Build

```bash
# Just build
make build

# Or with Go directly
go build -o nimiq-uploader .
```

### Verify Installation

```bash
nimiq-uploader version
nimiq-uploader config
```

## Quick Start

### 1. Create Account

```bash
# Save credentials locally (./account_credentials.txt)
nimiq-uploader account create

# Or save globally (~/.config/nimiq-uploader/account_credentials.txt)
nimiq-uploader account create --global
```

### 2. Fund the Address

Send some NIM to the address shown (mainnet).

### 3. Check Balance

```bash
nimiq-uploader account balance
```

### 4. Upload a Game

```bash
# Package your game first (creates a ZIP with run.json)
nimiq-uploader package --dir /path/to/game --output game.zip --title "My Game" --platform DOS

# Upload to blockchain
nimiq-uploader upload-cartridge \
  --file game.zip \
  --title "My Game" \
  --semver 1.0.0 \
  --platform 0 \
  --catalog-addr main \
  --generate-cartridge-addr
```

## Commands

### Main Commands

| Command | Description |
|---------|-------------|
| `upload-cartridge` | Upload a file using CART/DATA/CENT format |
| `account` | Manage Nimiq accounts |
| `package` | Package game files into a ZIP |
| `retire-app` | Mark an app as retired in the catalog |
| `config` | Show configuration paths |
| `version` | Show version information |

### Account Subcommands

| Command | Description |
|---------|-------------|
| `account create` | Create a new account |
| `account import` | Import an account by private key |
| `account status` | Check account status |
| `account balance` | Check account balance |
| `account unlock` | Unlock an account |
| `account lock` | Lock an account |
| `account wait-funds` | Wait until account has minimum balance |
| `account consensus` | Check if node has consensus |

## Configuration

Credentials are loaded from (in order):
1. `./account_credentials.txt` (current directory)
2. `~/.config/nimiq-uploader/account_credentials.txt` (global config)

### View Configuration

```bash
nimiq-uploader config
```

### Credentials File Format

```
ADDRESS=NQ00 ...
PUBLIC_KEY=...
PRIVATE_KEY=...
PASSPHRASE=...
RPC_URL=http://localhost:8648
```

**Keep this file secure!** It contains your private key.

## Upload Examples

### Upload a DOS Game

```bash
nimiq-uploader upload-cartridge \
  --file doom.zip \
  --title "DOOM" \
  --semver 1.0.0 \
  --platform 0 \
  --catalog-addr main \
  --generate-cartridge-addr \
  --concurrency 5 \
  --rate 25
```

### Upload a New Version

```bash
nimiq-uploader upload-cartridge \
  --file doom-v2.zip \
  --title "DOOM" \
  --semver 1.1.0 \
  --platform 0 \
  --catalog-addr main \
  --generate-cartridge-addr
```

The tool automatically finds the existing app-id for the title.

### Dry Run (Test Without Sending)

```bash
nimiq-uploader upload-cartridge \
  --file game.zip \
  --title "Test Game" \
  --semver 1.0.0 \
  --catalog-addr test \
  --generate-cartridge-addr \
  --dry-run
```

## Platform Codes

| Code | Platform |
|------|----------|
| 0 | DOS |
| 1 | Game Boy |
| 2 | Game Boy Color |
| 3 | NES |

## Catalog Addresses

| Shortcut | Address |
|----------|---------|
| `main` | NQ15 NXMP 11A0 TMKP G1Q8 4ABD U16C XD6Q D948 |
| `test` | NQ32 0VD4 26TR 1394 KXBJ 862C NFKG 61M5 GFJ0 |

## Progress and Resumption

Upload progress is saved to `upload_cartridge_<app_id>_<cartridge_id>.json`. If interrupted, run the same command again to resume.

## Makefile Targets

```bash
make              # Build
make build        # Build
make build-all    # Build for all platforms
make install      # Install to /usr/local/bin
make install-user # Install to ~/bin
make config       # Set up config directory
make uninstall    # Remove installed binary
make clean        # Clean build artifacts
make help         # Show help
```

## Requirements

- Go 1.21+
- Nimiq RPC endpoint (run your own node or set RPC_URL in credentials)
- Account funded with NIM

## Legacy Commands

The following commands are deprecated but kept for backwards compatibility:

- `upload` - Old DOOM format upload (use `upload-cartridge` instead)
- `manifest` - Old manifest generation (not needed with cartridge format)
