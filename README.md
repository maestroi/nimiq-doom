# Nimiq DOS Games Onchain

A project that stores DOS game files (and other binaries) on the Nimiq blockchain by splitting them into 64-byte transaction payload chunks. Anyone can reconstruct the file from the chain and play it using DOS emulators like DOSBox or JS-DOS.

## Architecture

- **Backend** (Go): HTTP API with SQLite indexer that fetches transactions and extracts game chunks
- **Uploader** (Go): CLI tool to chunk files and submit transactions to Nimiq
- **Web** (Vue 3): Frontend to download chunks, reconstruct files, verify SHA256, and download game packages

## Quick Start

### Prerequisites

- Docker and Docker Compose (for backend and web)
- Go 1.21+ (for uploader CLI)
- Nimiq RPC endpoint (configured via environment variables)

### Running Backend and Web with Docker Compose

1. Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your Nimiq RPC URL
```

2. Start backend and web services:

```bash
docker compose up -d
```

3. Access the web interface at `http://localhost:5173`

The backend will start indexing blocks automatically. The web interface will load the manifest and allow you to sync chunks.

### Running the Uploader

The uploader is a standalone CLI tool that should be run directly (not via Docker Compose):

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
  "network": "testnet",
  "start_height": 1000000,
  "end_height": 1001000
}
```

## Generating a Manifest

Use the uploader CLI to generate a manifest:

```bash
cd uploader
go build -o uploader .
./uploader manifest \
  --file /path/to/file.bin \
  --game-id 1 \
  --sender "NQ00 ..." \
  --network testnet \
  --output manifest.json
```

Or if installed:

```bash
uploader manifest \
  --file /path/to/file.bin \
  --game-id 1 \
  --sender "NQ00 ..." \
  --network testnet \
  --output manifest.json
```

This will:
- Read the file
- Calculate SHA256
- Create `manifest.json` with all metadata

## Account Management

Before uploading, you need to ensure your account is imported and unlocked in the Nimiq RPC node.

### Check Account Status

```bash
./uploader account status \
  --address "NQ00 ..." \
  --rpc-url http://localhost:8648
```

### Create a New Account

```bash
./uploader account create \
  --passphrase "your-secure-passphrase" \
  --rpc-url http://localhost:8648
```

This will create a new account and display the address, public key, and private key. **Save the private key securely!**

### Import an Existing Account

```bash
./uploader account import \
  --private-key "hex-private-key" \
  --passphrase "your-secure-passphrase" \
  --rpc-url http://localhost:8648
```

The private key should be in hexadecimal format (with or without `0x` prefix).

**Note:** After importing, you may need to unlock the account using your Nimiq RPC node's unlock method (not included in this tool).

## Packaging DOS Games

Before uploading to the blockchain, package your DOS game files into a ZIP file that's compatible with JS-DOS:

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
- Auto-detect the game executable (.exe, .com, or .bat)
- Calculate SHA256 hash
- Ensure proper file structure for JS-DOS emulator

### Using the Go Package Tool Directly

```bash
cd uploader
go run package.go --dir ./doom-files --output doom.zip --exe DOOM.EXE
```

**Important:** The ZIP file should contain:
- Game executable (.exe, .com, or .bat)
- Game data files (.WAD, .DAT, etc.)
- Any other required files

The ZIP structure will be preserved, and JS-DOS will be able to extract and run the game directly in the browser after syncing from the blockchain.

### Handling IMG Disk Images

Some DOS games come as IMG disk image files. To package them:

```bash
# Try to extract and package automatically
./scripts/extract-img.sh DiggerRem.img extracted-files
./scripts/package-game.sh extracted-files DiggerRem.zip DIGGER.EXE

# Or use the Digger-specific script
./scripts/package-digger.sh DiggerRem.img DiggerRem.zip
```

The extraction script will try multiple methods (mtools, 7z, Python) to extract files from the IMG. If extraction fails, the IMG file can be packaged as-is - the frontend will automatically mount it using `imgmount` when detected.

## Uploading Files

### Dry-Run Mode (Recommended for Testing)

Generate chunk payloads without actually sending transactions:

```bash
./uploader upload \
  --file /path/to/file.bin \
  --game-id 1 \
  --sender "NQ00 ..." \
  --dry-run \
  --rate 1.0
```

This creates `upload_plan.jsonl` with one JSON object per line:
```json
{"idx": 0, "payload_hex": "444f4f4d..."}
{"idx": 1, "payload_hex": "444f4f4d..."}
```

You can then broadcast these transactions using other tooling.

### Real Upload Mode

The uploader will automatically check that your account is:
1. **Imported** - Account exists in the RPC node
2. **Unlocked** - Account is ready to send transactions

If either check fails, the upload will abort with a helpful error message.

```bash
./uploader upload \
  --file /path/to/file.bin \
  --game-id 1 \
  --sender "NQ00 ..." \
  --rpc-url http://localhost:8648 \
  --rate 1.0 \
  --fee 0
```

The uploader supports:
- Rate limiting (configurable tx/s)
- Progress tracking (resumable via `upload_progress_<game_id>.json`)
- Retry logic for failed sends
- Automatic account status verification
- Configurable transaction fees

## Backend API

### Endpoints

- `GET /api/manifest` - Returns the manifest.json
- `GET /api/status` - Returns indexing status:
  ```json
  {
    "latestIndexedHeight": 1000000,
    "chunksStored": 500,
    "missingRanges": []
  }
  ```
- `GET /api/chunks?game_id=1&from=0&limit=1000` - Returns chunks:
  ```json
  {
    "game_id": 1,
    "chunk_size": 51,
    "items": [
      {"idx": 0, "len": 51, "data_base64": "..."},
      {"idx": 1, "len": 51, "data_base64": "..."}
    ]
  }
  ```
- `GET /api/chunks/raw` - Returns reconstructed file as `application/octet-stream`
- `GET /api/verify` - Server-side verification:
  ```json
  {
    "sha256": "abc123...",
    "matches": true,
    "expected_sha": "abc123..."
  }
  ```

### Configuration

Environment variables:
- `NIMIQ_RPC_URL` - Nimiq RPC endpoint (required)
- `INDEX_START_HEIGHT` - Start indexing from this height (default: 0)
- `POLL_INTERVAL_SECONDS` - Poll interval (default: 2)

## Reconstruction

The reconstruction process:

1. Fetch chunks via `/api/chunks` (paginated)
2. Sort chunks by `idx`
3. Concatenate `data` fields (only first `len` bytes of each)
4. Verify SHA256 matches manifest
5. Use reconstructed file (e.g., mount in JS-DOS)

The backend stores chunks in SQLite:
- `chunks(game_id, idx, len, data, tx_hash, height)`
- `meta(key, value)` for indexing state

## Web Frontend

The Vue 3 frontend provides:

1. **Load Manifest** - Fetches manifest from backend
2. **Sync Chunks** - Downloads all chunks (paginated)
3. **Verify SHA256** - Browser-side verification using WebCrypto
4. **Run DOOM** - Integrates with JS-DOS (requires DOOM files)

### JS-DOS Integration

To run DOOM:

1. Place DOOM files in `web/public/doom/`:
   - `DOOM.EXE`
   - `DOOM1.WAD` (or use the reconstructed file)

2. Download js-dos and place in `web/public/jsdos/`

3. The frontend will mount the reconstructed WAD file and boot DOOM

**Note:** DOOM assets are not included due to copyright. Use the shareware version or your own copy.

## Development

### Backend

```bash
cd backend
go mod download
go run .
```

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

## Testing

Create a test binary:

```bash
# Create a small test file
dd if=/dev/urandom of=test.bin bs=256 count=1

# Generate manifest
cd uploader
go build -o uploader .
./uploader manifest \
  --file ../test.bin \
  --game-id 1 \
  --sender "NQ00 0000 0000 0000 0000 0000 0000 0000 0000" \
  --output ../manifest.json

# Upload (dry-run)
./uploader upload \
  --file ../test.bin \
  --game-id 1 \
  --sender "NQ00 0000 0000 0000 0000 0000 0000 0000 0000" \
  --dry-run
```

## Nimiq RPC Notes

The implementation includes placeholder RPC methods that may need adjustment based on the actual Nimiq RPC API:

- `GetHeadHeight()` - Tries multiple method names
- `GetBlockByHeight()` - Tries multiple method names
- Transaction sending - Not yet implemented (see `uploader/sender.go`)

Check the code for `TODO` comments indicating where RPC method names may differ.

## License

This project is provided as-is for educational/meme purposes. DOOM is a trademark of id Software. This project does not include DOOM assets - users must provide their own copy.


Creating test file: test.bin (256 bytes)
Created test.bin
SHA256: 7b2a4605625e2c49e21feb6e2db3d234642272c783ecae0c9f555a1c0bd89129