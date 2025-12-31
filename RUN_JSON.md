# run.json Format

The `run.json` file is an optional metadata file that should be included in the ZIP archive when uploading a cartridge. It provides additional information about how to run the game.

## Location

The `run.json` file should be placed in the root of the ZIP archive:
```
game.zip
├── run.json          ← Place it here
├── GAME.EXE
├── GAME.DAT
└── ...
```

## Schema

```json
{
  "title": "Game Title",
  "filename": "game.zip",
  "executable": "GAME.EXE",
  "platform": "DOS"
}
```

## Fields

### Required Fields

None - all fields are optional. However, it's recommended to include at least `title` and `executable` for better UX.

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Display title of the game. Used in the UI to show the game name. Falls back to catalog title if not provided. | `"Commander Keen"` |
| `filename` | string | Filename of the ZIP archive. Used for download filename. Defaults to `"game.zip"` if not provided. | `"keen.zip"` |
| `executable` | string | Path to the main executable file to run. For DOS games, this should be relative to the ZIP root. The emulator will use this to automatically start the game. Falls back to auto-detection if not provided. | `"KEEN.EXE"` or `"GAME/KEEN.EXE"` |
| `platform` | string | Platform name. Can be `"DOS"`, `"GB"`, `"GBC"`, etc. This overrides the platform code from the CART header. | `"DOS"` |

## Examples

### DOS Game Example

```json
{
  "title": "Commander Keen",
  "filename": "keen.zip",
  "executable": "KEEN.EXE",
  "platform": "DOS"
}
```

### Game Boy Game Example

```json
{
  "title": "Pokemon Red",
  "filename": "pokemon-red.zip",
  "platform": "GB"
}
```

Note: For GB games, the executable field is not needed as the emulator will find the .gb or .gbc file automatically.

### Minimal Example

```json
{
  "title": "My Game",
  "executable": "GAME.EXE"
}
```

## Behavior

1. **If `run.json` is missing**: The system will still work, but will use defaults:
   - Title: Falls back to catalog title (from CENT entry)
   - Filename: Defaults to `"game.zip"`
   - Executable: Auto-detected from ZIP contents
   - Platform: Uses platform code from CART header

2. **If `run.json` exists but fields are missing**: The system uses the same fallbacks as above.

3. **Priority**: `run.json` values take precedence over catalog/CART header values when both are available.

## Integration with Uploader

When using the `package` command to create a ZIP file, you can manually add `run.json` to the directory before packaging:

```bash
# Create run.json
cat > run.json << EOF
{
  "title": "My Game",
  "executable": "GAME.EXE",
  "platform": "DOS"
}
EOF

# Package the directory (run.json will be included)
./uploader package --dir ./game-files --output game.zip
```

## Notes

- The file must be valid JSON
- Field names are case-sensitive
- Paths in `executable` should use forward slashes (`/`) for cross-platform compatibility
- The `executable` path is relative to the ZIP root, not absolute

