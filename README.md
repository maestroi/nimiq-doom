# Nimiq: Retro Games Onchain

A project that stores retro game files (DOS, Game Boy, and other classic games) on the Nimiq blockchain by splitting them into 64-byte transaction payload chunks. Anyone can reconstruct the file from the chain and play it using emulators like DOSBox, JS-DOS, or Game Boy emulators.

**🌐 Live Demo:** [https://maestroi.github.io/nimiq-doom/](https://maestroi.github.io/nimiq-doom/)

> **Note:** If you see this README on GitHub Pages instead of the web app, go to Settings → Pages and change the Source to **"GitHub Actions"** (not "Deploy from a branch").

## Architecture

- **Uploader** (Go): CLI tool to chunk files and submit transactions to Nimiq blockchain
- **Web** (Vue 3): Frontend that connects directly to public Nimiq RPC endpoints to fetch transactions, reconstruct files, verify SHA256, and run games in the browser using emulators (JS-DOS for DOS games, with support for Game Boy and other platforms)

**Key Features:**
- ✅ **No Backend Required** - Frontend connects directly to public Nimiq RPC endpoints
- ✅ **Static Hosting** - Perfect for GitHub Pages, Netlify, Vercel, etc.
- ✅ **Browser-Based** - All file reconstruction happens client-side using WebCrypto API
- ✅ **RPC Endpoint Selection** - Users can choose from public endpoints or use custom ones
- ✅ **Direct Blockchain Access** - Fetches transactions by hash directly from the blockchain

## Quick Start

### Prerequisites

- Node.js 20+ (for web frontend)
- Go 1.21+ (for uploader CLI)
- A Nimiq RPC endpoint (public endpoints available, or run your own)

### Running Web Locally

```bash
cd web
npm install
npm run dev
```

Access the web interface at `http://localhost:5173`

The frontend connects directly to public Nimiq RPC endpoints (configurable in the UI). No backend needed!

### Running with Docker (Optional)

```bash
docker compose up -d
```

Access at `http://localhost:5174`

### Running the Uploader

The uploader is a standalone CLI tool:

```bash
cd uploader
go build -o uploader .
./uploader --help
```

Or install it:

```bash
cd uploader
go install .
uploader --help
```

## Payload Format

Each transaction's 64-byte data field follows this exact layout:

```
Offset  Size    Field           Description
0..3    4       MAGIC           ASCII "DOOM" (0x44 0x4F 0x4F 0x4D)
4..7    4       GAME_ID         uint32 little-endian
8..11   4       CHUNK_INDEX     uint32 little-endian
12      1       LEN             uint8 (0..51)
13..63  51      DATA            Only first LEN bytes are valid
```

- `LEN < 51` indicates the last chunk
- Reconstruction can also use `manifest.total_size` to determine completion

## Manifest Format

The `manifest.json` file contains metadata about the stored file:

```json
{
  "game_id": 1,
  "filename": "doom1.wad",
  "total_size": 4194304,
  "chunk_size": 51,
  "sha256": "abc123...",
  "sender_address": "NQ00 ...",
  "network": "mainnet",
  "expected_tx_hashes": [
    "tx_hash_1",
    "tx_hash_2",
    "..."
  ]
}
```

**Important:** The `expected_tx_hashes` array contains the transaction hashes that store each chunk. The frontend uses these to fetch transactions directly from the blockchain.

## Generating a Manifest

The uploader automatically generates a manifest after a successful upload. You can also generate one manually:

```bash
cd uploader
go build -o uploader .
./uploader manifest \
  --file /path/to/file.bin \
  --game-id 1 \
  --sender "NQ00 ..." \
  --network mainnet \
  --output manifest.json
```

This will:
- Read the file
- Calculate SHA256
- Create `manifest.json` with all metadata (but without `expected_tx_hashes` - those are added after upload)

## Account Management

Before uploading, you need to ensure your account is imported and unlocked in the Nimiq RPC node.

### Create a New Account

```bash
./uploader account create \
  --rpc-url http://localhost:8648
```

This will:
- Create a new account via RPC
- Generate a random passphrase
- Save credentials to `account_credentials.txt`
- Display the address, public key, and private key

**Save the credentials securely!** The account will be automatically imported and unlocked.

### Check Account Status

```bash
./uploader account status \
  --address "NQ00 ..." \
  --rpc-url http://localhost:8648
```

### Import an Existing Account

```bash
./uploader account import \
  --from-file \
  --unlock \
  --rpc-url http://localhost:8648
```

This loads credentials from `account_credentials.txt` and imports/unlocks the account.

### Check Balance

```bash
./uploader account balance \
  --address "NQ00 ..." \
  --rpc-url http://localhost:8648
```

### Wait for Funds

The uploader can wait until your account has sufficient NIM:

```bash
./uploader account wait-funds \
  --address "NQ00 ..." \
  --min-balance 1000000 \
  --rpc-url http://localhost:8648
```

## Packaging Games

Before uploading to the blockchain, package your game files into a ZIP file. For DOS games, ensure compatibility with JS-DOS:

### Using the Package Script

```bash
# Package a directory of game files
./scripts/package-game.sh ./doom-files

# Specify output filename
./scripts/package-game.sh ./doom-files doom.zip

# Specify game executable explicitly
./scripts/package-game.sh ./doom-files doom.zip DOOM.EXE
```

The script will:
- Create a ZIP file with all game files
- Auto-detect the game executable (.exe, .com, or .bat for DOS games)
- Calculate SHA256 hash
- Ensure proper file structure for emulators (JS-DOS for DOS games)

### Using the Go Package Tool Directly

```bash
cd uploader
./uploader package \
  --dir ./doom-files \
  --output doom.zip \
  --exe DOOM.EXE
```

**Important:** The ZIP file should contain:
- Game executable (.exe, .com, or .bat for DOS games; .gb/.gbc for Game Boy games)
- Game data files (.WAD, .DAT, etc. for DOS games; ROM files for Game Boy)
- Any other required files

The ZIP structure will be preserved, and emulators will be able to extract and run the game directly in the browser after syncing from the blockchain.

### Handling DOS IMG Disk Images

Some DOS games come as IMG disk image files. The frontend automatically detects IMG files and mounts them using DOSBox's `imgmount` command.

To package an IMG file:

```bash
# Package IMG directly (frontend will mount it)
./uploader package \
  --dir . \
  --output digger.zip \
  --exe DIGGER.EXE

# Or extract first, then package
./scripts/extract-img.sh DiggerRem.img extracted-files
./scripts/package-game.sh extracted-files DiggerRem.zip DIGGER.EXE
```

## Uploading Files

### Real Upload Mode

The uploader will automatically:
1. Check that your account is imported and unlocked
2. Wait for consensus to be established
3. Wait for sufficient balance (if needed)
4. Create chunks and send transactions
5. Generate a manifest with transaction hashes

```bash
./uploader upload \
  --file /path/to/file.zip \
  --game-id 1 \
  --rpc-url http://localhost:8648 \
  --receiver "NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES" \
  --rate 1.0
```

The uploader supports:
- Rate limiting (configurable tx/s)
- Progress tracking (resumable via `upload_progress_<game_id>.json`)
- Retry logic for failed sends
- Automatic account status verification
- Automatic manifest generation with transaction hashes

After upload, the manifest will be saved with all transaction hashes. Place it in the `manifests/` directory for the frontend to discover it.

### Dry-Run Mode (Testing)

Generate chunk payloads without actually sending transactions:

```bash
./uploader upload \
  --file /path/to/file.bin \
  --game-id 1 \
  --sender "NQ00 ..." \
  --dry-run \
  --rate 1.0
```

This creates `upload_plan.jsonl` with one JSON object per line for manual broadcasting.

## Reconstruction Process

The reconstruction process happens entirely in the browser:

1. **Load Manifest** - Frontend loads manifest from `/manifests/` directory (static JSON files)
2. **Select RPC Endpoint** - User chooses a public Nimiq RPC endpoint (or custom)
3. **Fetch Transactions** - Frontend calls `getTransactionByHash` for each hash in `expected_tx_hashes`
4. **Parse Chunks** - Extract DOOM magic bytes, game_id, chunk_idx, length, and data from each transaction
5. **Sort Chunks** - Sort by `chunk_idx` to ensure correct order
6. **Reconstruct File** - Concatenate data fields (only first `len` bytes of each)
7. **Verify SHA256** - Use WebCrypto API to verify the reconstructed file matches the manifest
8. **Run Game** - Extract ZIP (if needed), mount files in JS-DOS, and execute

No backend needed! Everything runs client-side.

## Web Frontend

The Vue 3 frontend provides:

1. **RPC Endpoint Selection** - Choose from public endpoints (NimiqScan Mainnet/Testnet) or enter custom
2. **Manifest Selection** - Load manifests from `/manifests/` directory
3. **Sync Chunks** - Fetches transactions directly from blockchain by hash
4. **Progress Tracking** - Shows chunks fetched, bytes downloaded, and completion percentage
5. **Verify SHA256** - Browser-side verification using WebCrypto API (automatic after sync)
6. **Run Game** - Integrates with emulators (JS-DOS for DOS games) to run games directly in the browser

### Emulator Integration

The frontend automatically:
- Extracts game files from ZIP archives using JSZip
- **DOS Games**: Mounts IMG disk images using DOSBox's `imgmount` command, writes files to JS-DOS virtual filesystem, executes game executables (.exe, .com, .bat), creates AUTOEXEC.BAT files for automatic game startup
- **Game Boy Games**: Support for Game Boy emulators (coming soon)
- **Other Platforms**: Extensible architecture for additional emulator support

**Note:** Game assets are not included due to copyright. Users must upload their own games to the blockchain.

## GitHub Pages Deployment

This project is deployed to GitHub Pages! See [GITHUB_PAGES.md](GITHUB_PAGES.md) for details.

**To deploy your own:**

1. Fork this repository
2. Go to Settings → Pages
3. Set Source to **"GitHub Actions"**
4. Push to `main` branch - the workflow will automatically build and deploy

The app will be available at `https://yourusername.github.io/nimiq-doom/`

**Note:** If your repository name differs, update the `base` path in `web/vite.config.js`.

## Development

### Uploader

Build and run:

```bash
cd uploader
go mod download
go build -o uploader .
./uploader --help
```

Or run directly:

```bash
cd uploader
go run . manifest --file test.bin --game-id 1 --sender "NQ00 ..."
```

### Web

```bash
cd web
npm install
npm run dev
```

Build for production:

```bash
cd web
npm run build
# Output in web/dist/
```

## Testing

Create a test binary and upload it:

```bash
# Create a small test file
dd if=/dev/urandom of=test.bin bs=256 count=1

# Upload to blockchain
cd uploader
go build -o uploader .
./uploader upload \
  --file ../test.bin \
  --game-id 999 \
  --rpc-url http://localhost:8648

# This will generate a manifest with transaction hashes
# Copy it to manifests/ directory for the frontend to discover
cp manifest.json ../manifests/testfile.json
```

## How It Works

1. **Upload Phase:**
   - Uploader chunks a file into 51-byte pieces
   - Each chunk is wrapped in a 64-byte payload with magic bytes, game_id, chunk_idx, length, and data
   - Transactions are sent to the Nimiq blockchain with these payloads
   - A manifest is generated with all transaction hashes

2. **Reconstruction Phase:**
   - Frontend loads manifest from `/manifests/` directory
   - For each transaction hash, calls `getTransactionByHash` on the selected RPC endpoint
   - Parses chunks from transaction data
   - Reconstructs the original file
   - Verifies SHA256 hash matches the manifest

3. **Execution Phase:**
   - If the file is a ZIP, extracts it using JSZip
   - **DOS Games**: Writes files to JS-DOS virtual filesystem, mounts IMG files if detected, executes the game executable
   - **Game Boy Games**: Loads ROM files into Game Boy emulator (coming soon)
   - **Other Platforms**: Platform-specific emulator integration

## License

This project is provided as-is for educational/meme purposes. Game assets are not included - users must provide their own copies and upload them to the blockchain.
