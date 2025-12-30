# Manifests Directory

This directory contains game manifest files and an automatically generated index.

## Manifest Files

Each game has a manifest JSON file (e.g., `keen.json`, `digger.json`) that contains:
- Game metadata (game_id, filename, total_size, etc.)
- Transaction hashes for all chunks stored on the blockchain
- SHA256 hash for verification

## Manifest Index

The `manifests-index.json` file is automatically generated and lists all available manifests. This allows the frontend to discover manifests without hardcoding names.

### Regenerating the Index

After adding a new manifest file, regenerate the index:

```bash
./scripts/generate-manifest-index.sh
```

Or from the project root:

```bash
cd scripts && ./generate-manifest-index.sh
```

### Automatic Regeneration

The index should be regenerated:
- After adding a new manifest file
- After removing a manifest file
- Before deploying to production

The frontend will automatically load all manifests listed in the index file.

