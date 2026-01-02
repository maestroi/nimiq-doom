# Nimiq: Retro Games Onchain

A project that stores retro game files (DOS, Game Boy, NES, and other classic games) on the Nimiq blockchain using a cartridge-based architecture. Games are stored as cartridges with catalog entries, allowing versioning and discovery. Anyone can browse the catalog, load cartridges, and play games using emulators like DOSBox, binjgb, or other browser-based emulators.

**🌐 Live Demo:** [https://maestroi.github.io/nimiq-doom/](https://maestroi.github.io/nimiq-doom/)

## ⚠️ Legal Notice

This project is a **technical demonstration** of storing and retrieving data on the Nimiq blockchain. 

**For uploaders:** Only upload content you have the legal right to distribute (homebrew, public domain, freeware, or content you created). Uploading copyrighted ROMs without permission is illegal. See the [uploader disclaimer](uploader/README.md#️-legal-disclaimer) for details.

**For users:** This frontend simply retrieves and displays data from the public Nimiq blockchain. The project maintainers do not control what content is uploaded by third parties.

## Architecture

The system uses a **cartridge-based architecture** with three main components:

- **CART (Cartridge Header)**: Metadata transaction stored at a cartridge address containing schema, platform, chunk size, cartridge ID, total size, and SHA256 hash
- **DATA (Data Chunks)**: File data split into 64-byte transaction payloads, stored at the cartridge address
- **CENT (Catalog Entry)**: Registration transaction in a catalog address linking app-id, cartridge-id, semver, cartridge address, and title

**Key Features:**
- ✅ **No Backend Required** - Frontend connects directly to public Nimiq RPC endpoints
- ✅ **Static Hosting** - Perfect for GitHub Pages, Netlify, Vercel, etc.
- ✅ **Browser-Based** - All file reconstruction happens client-side using WebCrypto API
- ✅ **Catalog System** - Centralized catalog for game discovery and versioning
- ✅ **Version Management** - Automatic versioning with semantic versioning (semver)
- ✅ **Platform Support** - DOS, Game Boy, Game Boy Color, NES, and more

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

## Cartridge System Overview

### Components

1. **Cartridge Address**: Each game version gets its own unique address where CART header and DATA chunks are stored
2. **Catalog Address**: Central address where all CENT entries are registered for game discovery
3. **App-ID**: Unique identifier for a game (e.g., "Doom" = app-id 1)
4. **Cartridge-ID**: Version identifier within an app (e.g., Doom v1.0.0 = cartridge-id 1, v1.1.0 = cartridge-id 2)

### Workflow

1. **Upload**: Uploader creates a cartridge address, uploads CART header and DATA chunks
2. **Register**: Uploader registers a CENT entry in the catalog address
3. **Discover**: Frontend queries catalog address to list all games
4. **Load**: Frontend queries cartridge address to fetch CART header and DATA chunks
5. **Reconstruct**: Frontend reconstructs file from chunks and verifies SHA256
6. **Play**: Frontend extracts ZIP and runs game in appropriate emulator

## Platform Codes

Platform codes are used in CART headers and CENT entries to identify the game platform:

| Code | Platform | Description |
|------|----------|-------------|
| `0` | DOS | MS-DOS games (uses JS-DOS/DOSBox) |
| `1` | GB | Game Boy games (uses binjgb emulator) |
| `2` | GBC | Game Boy Color games (uses binjgb emulator) |
| `3` | NES | Nintendo Entertainment System games |

These codes are used when uploading cartridges with the `--platform` flag.

## Payload Formats

### CART Header (64 bytes)

The CART header contains metadata about the cartridge:

```
Offset  Size    Field           Description
0..3    4       MAGIC           ASCII "CART" (0x43 0x41 0x52 0x54)
4       1       SCHEMA          Schema version (currently 0)
5       1       PLATFORM        Platform code (0=DOS, 1=GB, 2=GBC, 3=NES)
6       1       CHUNK_SIZE      Size of data chunks (typically 51)
7       1       FLAGS           Reserved flags
8..11   4       CARTRIDGE_ID     uint32 little-endian
12..19  8       TOTAL_SIZE       uint64 little-endian
20..51  32      SHA256           File hash
52..63  12      RESERVED         Reserved for future use
```

### DATA Chunk (64 bytes)

Each DATA chunk contains a portion of the file:

```
Offset  Size    Field           Description
0..3    4       MAGIC           ASCII "DATA" (0x44 0x41 0x54 0x41)
4..7    4       CARTRIDGE_ID     uint32 little-endian
8..11   4       CHUNK_INDEX      uint32 little-endian
12      1       LEN              uint8 (0..51)
13..63  51      DATA             Only first LEN bytes are valid
```

- `LEN < 51` indicates the last chunk
- Reconstruction uses `CART.total_size` to determine completion

### CENT Entry (64 bytes)

The CENT entry registers a cartridge in the catalog:

```
Offset  Size    Field           Description
0..3    4       MAGIC           ASCII "CENT" (0x43 0x45 0x4E 0x54)
4       1       SCHEMA          Schema version (currently 0)
5       1       PLATFORM        Platform code (0=DOS, 1=GB, 2=GBC, 3=NES)
6       1       FLAGS           Flags (bit 0: retired)
7..10   4       APP_ID           uint32 little-endian
11      1       SEMVER_MAJOR     uint8
12      1       SEMVER_MINOR     uint8
13      1       SEMVER_PATCH     uint8
14..33  20      CARTRIDGE_ADDR   20-byte cartridge address
34..49  16      TITLE_SHORT      Null-terminated string (max 15 chars)
50..63  14      RESERVED         Reserved for future use
```

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
- Ensure proper file structure for emulators

### Using the Go Package Tool Directly

```bash
cd uploader
./uploader package \
  --dir ./doom-files \
  --output doom.zip \
  --exe DOOM.EXE
```

**Important:** The ZIP file should contain:
- `run.json` (optional but recommended) - This replaces the old manifest.json system. See [RUN_JSON.md](RUN_JSON.md) for format
- Game executable (.exe, .com, or .bat for DOS games; .gb/.gbc for Game Boy games)
- Game data files (.WAD, .DAT, etc. for DOS games; ROM files for Game Boy)
- Any other required files

**Note:** There are no manifest.json files anymore. Metadata is stored in:
- Catalog entries (CENT) for game discovery and versioning
- `run.json` (inside ZIP) for emulator configuration

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

## Uploading Cartridges

### Basic Upload

The uploader will automatically:
1. Check that your account is imported and unlocked
2. Wait for consensus to be established
3. Wait for sufficient balance (if needed)
4. Query catalog to determine app-id and cartridge-id
5. Generate or use a cartridge address
6. Create CART header and DATA chunks
7. Send transactions to cartridge address
8. Register CENT entry in catalog address

```bash
./uploader upload-cartridge \
  --file /path/to/game.zip \
  --title "Doom" \
  --semver "1.0.0" \
  --platform 0 \
  --catalog-addr "NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES" \
  --generate-cartridge-addr \
  --rpc-url http://localhost:8648 \
  --rate 1.0
```

**Platform Codes:**
- `0` = DOS
- `1` = Game Boy (GB)
- `2` = Game Boy Color (GBC)
- `3` = NES

**Catalog Address Shortcuts:**
- `test` = Testnet catalog address
- `main` = Mainnet catalog address
- Or provide full address: `"NQ27 21G6 9BG1 JBHJ NUFA YVJS 1R6C D2X0 QAES"`

### Automatic Version Detection

The uploader automatically detects if you're uploading a new version by matching the title:

- **If title matches existing game**: Uses the existing app-id, auto-increments cartridge-id
- **If title is new**: Creates a new app-id (new game)

Just use the **same title** as the existing game:

```bash
./uploader upload-cartridge \
  --file doom-v1.1.0.zip \
  --title "Doom" \
  --semver "1.1.0" \
  --platform 0 \
  --generate-cartridge-addr \
  --catalog-addr test
```

**What happens:**
- Finds existing app-id for "Doom" (e.g., app-id 1)
- Auto-generates next cartridge-id (e.g., cartridge-id 2)
- Creates new cartridge address
- Uploads as version 1.1.0

See [UPLOAD_NEW_VERSION.md](uploader/UPLOAD_NEW_VERSION.md) for more details.

### Manual App-ID Specification

If you want to explicitly specify the app-id:

```bash
./uploader upload-cartridge \
  --file doom-v1.1.0.zip \
  --app-id 1 \
  --title "Doom" \
  --semver "1.1.0" \
  --platform 0 \
  --generate-cartridge-addr \
  --catalog-addr test
```

### Dry-Run Mode (Testing)

Generate cartridge payloads without actually sending transactions:

```bash
./uploader upload-cartridge \
  --file /path/to/game.zip \
  --title "Test Game" \
  --semver "1.0.0" \
  --platform 0 \
  --catalog-addr test \
  --dry-run
```

This creates `upload_cartridge_<app_id>_<cartridge_id>.json` with upload progress data.

### Upload Options

- `--file`: Path to ZIP file to upload
- `--title`: Game title (used for catalog entry)
- `--semver`: Semantic version (e.g., "1.0.0")
- `--platform`: Platform code (0=DOS, 1=GB, 2=GBC, 3=NES)
- `--catalog-addr`: Catalog address (required)
- `--generate-cartridge-addr`: Generate new cartridge address (required for new uploads)
- `--cartridge-addr`: Use existing cartridge address (optional)
- `--app-id`: Explicit app-id (optional, auto-detected if not provided)
- `--cartridge-id`: Explicit cartridge-id (optional, auto-incremented if not provided)
- `--rpc-url`: Nimiq RPC endpoint URL
- `--sender`: Sender address (defaults to account_credentials.txt)
- `--rate`: Transaction rate limit (tx/s, default 1.0)
- `--fee`: Transaction fee in Luna (optional)
- `--dry-run`: Don't send transactions, just generate plan

## Reconstruction Process

The reconstruction process happens entirely in the browser:

1. **Load Catalog** - Frontend queries catalog address to get list of games (CENT entries)
2. **Select Game** - User selects a game and version from the catalog
3. **Get Cartridge Address** - Frontend extracts cartridge address from CENT entry
4. **Fetch CART Header** - Frontend queries cartridge address to find CART header transaction
5. **Fetch DATA Chunks** - Frontend queries cartridge address to fetch all DATA chunk transactions
6. **Parse Chunks** - Extract cartridge_id, chunk_idx, length, and data from each transaction
7. **Sort Chunks** - Sort by `chunk_idx` to ensure correct order
8. **Reconstruct File** - Concatenate data fields (only first `len` bytes of each)
9. **Verify SHA256** - Use WebCrypto API to verify the reconstructed file matches CART header
10. **Extract run.json** - Extract optional `run.json` from ZIP for emulator configuration
11. **Run Game** - Extract ZIP (if needed), mount files in emulator, and execute

No backend needed! Everything runs client-side.

## Web Frontend

The Vue 3 frontend provides:

1. **RPC Endpoint Selection** - Choose from public endpoints (NimiqScan Mainnet/Testnet) or enter custom
2. **Catalog Address Selection** - Enter catalog address to browse games
3. **Game Browser** - Browse games grouped by app-id with version selection
4. **Cartridge Loading** - Fetches CART header and DATA chunks from cartridge address
5. **Progress Tracking** - Shows chunks fetched, bytes downloaded, and completion percentage
6. **Verify SHA256** - Browser-side verification using WebCrypto API (automatic after sync)
7. **Run Game** - Integrates with emulators to run games directly in the browser

### Emulator Integration

The frontend automatically:
- Extracts game files from ZIP archives using JSZip
- **DOS Games**: Mounts IMG disk images using DOSBox's `imgmount` command, writes files to JS-DOS virtual filesystem, executes game executables (.exe, .com, .bat), creates AUTOEXEC.BAT files for automatic game startup
- **Game Boy Games**: Loads ROM files into binjgb WebAssembly emulator with save state support
- **Game Boy Color Games**: Full color palette support via binjgb
- **NES Games**: Loads ROM files into NES emulator
- **Other Platforms**: Extensible architecture for additional emulator support

**Note:** Game assets are not included due to copyright. Users must upload their own games to the blockchain.

## run.json Format

The `run.json` file is an optional metadata file that should be included in the ZIP archive. It replaces the old `manifest.json` system and provides additional information about how to run the game.

**Key differences from old manifest system:**
- `run.json` is stored **inside the ZIP file**, not as a separate file
- No transaction hashes needed - the catalog system handles discovery
- Simpler format focused on emulator configuration
- Platform, title, and executable/ROM paths are specified here

See [RUN_JSON.md](RUN_JSON.md) for complete documentation.

**Quick Example:**

```json
{
  "title": "Commander Keen",
  "filename": "keen.zip",
  "executable": "KEEN.EXE",
  "platform": "DOS"
}
```

## Retiring Games

To retire a game (hide it from listings), use the retire command:

```bash
./uploader retire-app \
  --app-id 1 \
  --catalog-addr test \
  --rpc-url http://localhost:8648
```

This sets the retired flag on all CENT entries for the specified app-id, hiding the game from catalog listings (unless "Show Retired Games" is enabled in the UI).

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
go run . upload-cartridge --file test.zip --title "Test" --semver "1.0.0" --platform 0 --catalog-addr test
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

Create a test game and upload it:

```bash
# Create a small test ZIP file
cd uploader
./uploader package --dir ./test-files --output test.zip

# Upload to blockchain
./uploader upload-cartridge \
  --file test.zip \
  --title "Test Game" \
  --semver "1.0.0" \
  --platform 0 \
  --catalog-addr test \
  --generate-cartridge-addr \
  --rpc-url http://localhost:8648
```

## How It Works

1. **Upload Phase:**
   - Uploader chunks a file into 51-byte pieces
   - Each chunk is wrapped in a 64-byte DATA payload with magic bytes, cartridge_id, chunk_idx, length, and data
   - CART header is created with metadata
   - Transactions are sent to a cartridge address with these payloads
   - CENT entry is registered in catalog address

2. **Discovery Phase:**
   - Frontend queries catalog address to get all CENT entries
   - CENT entries are grouped by app-id and sorted by semver
   - User can browse games and select versions

3. **Reconstruction Phase:**
   - Frontend extracts cartridge address from selected CENT entry
   - Frontend queries cartridge address to find CART header transaction
   - Frontend queries cartridge address to fetch all DATA chunk transactions
   - Parses chunks from transaction data
   - Reconstructs the original file
   - Verifies SHA256 hash matches CART header

4. **Execution Phase:**
   - If the file is a ZIP, extracts it using JSZip
   - Extracts `run.json` if present (replaces old manifest.json) for emulator configuration
   - Falls back to catalog/platform information if `run.json` is missing
   - **DOS Games**: Writes files to JS-DOS virtual filesystem, mounts IMG files if detected, executes the game executable
   - **Game Boy Games**: Loads ROM files into binjgb emulator
   - **NES Games**: Loads ROM files into NES emulator
   - **Other Platforms**: Platform-specific emulator integration

## Migration from Old System

**⚠️ The old system is deprecated and no longer supported.**

The old system used:
- "DOOM" magic bytes in transaction payloads
- Separate `manifest.json` files stored in a `manifests/` directory
- Transaction hashes stored in manifest files
- Manual manifest management

The new cartridge system provides:
- **Catalog-based discovery** - Games are discovered via catalog addresses (CENT entries)
- **Version management** - Automatic versioning with semantic versioning (semver)
- **Platform support** - DOS, Game Boy, Game Boy Color, NES, and more
- **run.json metadata** - Optional metadata stored inside ZIP files (replaces manifest.json)
- **No manifest files** - Everything is stored on-chain in catalog and cartridge addresses

**Old uploads and manifest files will not work with the current frontend.** You must re-upload games using the new `upload-cartridge` command.

## License

This project is provided as-is for educational/meme purposes. Game assets are not included - users must provide their own copies and upload them to the blockchain.
