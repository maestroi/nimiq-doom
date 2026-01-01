#!/usr/bin/env node

/**
 * Publisher Tools: Generate CENT/CART/DATA payloads
 * 
 * This script generates the payload bytes for CENT (catalog entry), CART (cartridge header),
 * and DATA (chunk) transactions from a ZIP file.
 * 
 * Usage:
 *   node generate-payloads.js <zip-file> [options]
 * 
 * Options:
 *   --app-id <id>          App ID (uint32, required)
 *   --cartridge-id <id>    Cartridge ID (uint32, required)
 *   --title <title>        Short title (max 16 chars, required)
 *   --platform <code>      Platform code: 0=DOS, 1=GB, 2=GBC (default: 0)
 *   --semver <version>     Semantic version (e.g., "1.0.0", required)
 *   --cartridge-addr <addr> Cartridge address (NQ..., required)
 *   --schema <version>     Schema version (default: 1)
 *   --chunk-size <size>    Chunk size in bytes (default: 51)
 */

const fs = require('fs')
const crypto = require('crypto')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const zipFile = args[0]

if (!zipFile) {
  console.error('Usage: node generate-payloads.js <zip-file> [options]')
  process.exit(1)
}

if (!fs.existsSync(zipFile)) {
  console.error(`Error: File not found: ${zipFile}`)
  process.exit(1)
}

// Parse options
const options = {}
for (let i = 1; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '')
  const value = args[i + 1]
  if (key && value) {
    options[key.replace(/-/g, '_')] = value
  }
}

// Required options
const appId = parseInt(options.app_id || options.appId)
const cartridgeId = parseInt(options.cartridge_id || options.cartridgeId)
const title = options.title
const semver = options.semver
const cartridgeAddr = options.cartridge_addr || options.cartridgeAddr

if (!appId || isNaN(appId)) {
  console.error('Error: --app-id is required')
  process.exit(1)
}

if (!cartridgeId || isNaN(cartridgeId)) {
  console.error('Error: --cartridge-id is required')
  process.exit(1)
}

if (!title || title.length > 16) {
  console.error('Error: --title is required and must be <= 16 characters')
  process.exit(1)
}

if (!semver) {
  console.error('Error: --semver is required (e.g., "1.0.0")')
  process.exit(1)
}

if (!cartridgeAddr || !cartridgeAddr.startsWith('NQ')) {
  console.error('Error: --cartridge-addr is required and must be a valid Nimiq address (NQ...)')
  process.exit(1)
}

// Optional options with defaults
const platform = parseInt(options.platform || '0')
const schema = parseInt(options.schema || '1')
const chunkSize = parseInt(options.chunk_size || options.chunkSize || '51')

// Parse semver
const semverParts = semver.split('.').map(v => parseInt(v))
if (semverParts.length !== 3 || semverParts.some(v => isNaN(v) || v > 255)) {
  console.error('Error: --semver must be in format "major.minor.patch" (each 0-255)')
  process.exit(1)
}

// Read ZIP file
const zipData = fs.readFileSync(zipFile)
const totalSize = zipData.length

// Calculate SHA256
const sha256 = crypto.createHash('sha256').update(zipData).digest('hex')
const sha256Bytes = Buffer.from(sha256, 'hex')

// Convert cartridge address to bytes
function addressNQToBytes(address) {
  if (!address.startsWith('NQ')) {
    throw new Error('Invalid address format')
  }
  const hex = address.slice(2)
  if (hex.length !== 40) {
    throw new Error('Invalid address length')
  }
  return Buffer.from(hex, 'hex')
}

const cartridgeAddrBytes = addressNQToBytes(cartridgeAddr)

// Generate CART header (64 bytes)
function generateCART() {
  const buffer = Buffer.alloc(64)
  
  // MAGIC "CART" (4 bytes)
  buffer.write('CART', 0)
  
  // schema (1 byte)
  buffer[4] = schema
  
  // platform (1 byte)
  buffer[5] = platform
  
  // chunk_size (1 byte)
  buffer[6] = chunkSize
  
  // flags (1 byte)
  buffer[7] = 0
  
  // cartridge_id (u32, little-endian)
  buffer.writeUInt32LE(cartridgeId, 8)
  
  // total_size (u64, little-endian)
  buffer.writeBigUInt64LE(BigInt(totalSize), 12)
  
  // sha256 (32 bytes)
  sha256Bytes.copy(buffer, 20)
  
  // reserved (12 bytes) - already zero
  
  return buffer
}

// Generate DATA chunks
function generateDATAChunks() {
  const chunks = []
  const expectedChunks = Math.ceil(totalSize / chunkSize)
  
  for (let i = 0; i < expectedChunks; i++) {
    const offset = i * chunkSize
    const remaining = totalSize - offset
    const chunkDataLen = Math.min(chunkSize, remaining)
    const chunkData = zipData.slice(offset, offset + chunkDataLen)
    
    const buffer = Buffer.alloc(64)
    
    // MAGIC "DATA" (4 bytes)
    buffer.write('DATA', 0)
    
    // cartridge_id (u32, little-endian)
    buffer.writeUInt32LE(cartridgeId, 4)
    
    // chunk_index (u32, little-endian)
    buffer.writeUInt32LE(i, 8)
    
    // len (1 byte)
    buffer[12] = chunkDataLen
    
    // bytes (51 bytes)
    chunkData.copy(buffer, 13)
    
    chunks.push({
      index: i,
      payload: buffer,
      hex: buffer.toString('hex')
    })
  }
  
  return chunks
}

// Generate CENT entry (64 bytes)
function generateCENT() {
  const buffer = Buffer.alloc(64)
  
  // MAGIC "CENT" (4 bytes)
  buffer.write('CENT', 0)
  
  // schema (1 byte)
  buffer[4] = schema
  
  // platform (1 byte)
  buffer[5] = platform
  
  // flags (1 byte)
  buffer[6] = 0
  
  // app_id (u32, little-endian)
  buffer.writeUInt32LE(appId, 7)
  
  // semver (3 bytes: major, minor, patch)
  buffer[11] = semverParts[0]
  buffer[12] = semverParts[1]
  buffer[13] = semverParts[2]
  
  // cartridge_address (20 bytes)
  cartridgeAddrBytes.copy(buffer, 14)
  
  // title_short (16 bytes, null-terminated)
  const titleBytes = Buffer.from(title, 'utf8').slice(0, 15)
  titleBytes.copy(buffer, 34)
  buffer[34 + titleBytes.length] = 0 // null terminator
  
  // reserved (14 bytes) - already zero
  
  return buffer
}

// Generate all payloads
const cartPayload = generateCART()
const dataChunks = generateDATAChunks()
const centPayload = generateCENT()

// Output plan
console.log('='.repeat(80))
console.log('PAYLOAD GENERATION PLAN')
console.log('='.repeat(80))
console.log()

console.log('Input File:')
console.log(`  Path: ${zipFile}`)
console.log(`  Size: ${totalSize.toLocaleString()} bytes`)
console.log(`  SHA256: ${sha256}`)
console.log()

console.log('Configuration:')
console.log(`  App ID: ${appId}`)
console.log(`  Cartridge ID: ${cartridgeId}`)
console.log(`  Title: "${title}"`)
console.log(`  Platform: ${platform} (${platform === 0 ? 'DOS' : platform === 1 ? 'GB' : platform === 2 ? 'GBC' : 'Unknown'})`)
console.log(`  Semver: ${semver}`)
console.log(`  Cartridge Address: ${cartridgeAddr}`)
console.log(`  Schema: ${schema}`)
console.log(`  Chunk Size: ${chunkSize} bytes`)
console.log(`  Expected Chunks: ${dataChunks.length}`)
console.log()

console.log('='.repeat(80))
console.log('CENT (Catalog Entry) - 1 transaction')
console.log('='.repeat(80))
console.log(`Hex: ${centPayload.toString('hex')}`)
console.log(`Size: ${centPayload.length} bytes`)
console.log()
console.log('Transaction Details:')
console.log(`  To: <CATALOG_ADDRESS>`)
console.log(`  Data: ${centPayload.toString('hex')}`)
console.log()

console.log('='.repeat(80))
console.log('CART (Cartridge Header) - 1 transaction')
console.log('='.repeat(80))
console.log(`Hex: ${cartPayload.toString('hex')}`)
console.log(`Size: ${cartPayload.length} bytes`)
console.log()
console.log('Transaction Details:')
console.log(`  To: ${cartridgeAddr}`)
console.log(`  Data: ${cartPayload.toString('hex')}`)
console.log()

console.log('='.repeat(80))
console.log(`DATA Chunks - ${dataChunks.length} transactions`)
console.log('='.repeat(80))
console.log()

// Show first few and last few chunks
const showChunks = 3
for (let i = 0; i < Math.min(showChunks, dataChunks.length); i++) {
  const chunk = dataChunks[i]
  console.log(`Chunk ${chunk.index}:`)
  console.log(`  Hex: ${chunk.hex}`)
  console.log(`  Size: ${chunk.payload.length} bytes`)
  console.log(`  To: ${cartridgeAddr}`)
  console.log()
}

if (dataChunks.length > showChunks * 2) {
  console.log(`... (${dataChunks.length - showChunks * 2} more chunks) ...`)
  console.log()
}

for (let i = Math.max(showChunks, dataChunks.length - showChunks); i < dataChunks.length; i++) {
  const chunk = dataChunks[i]
  console.log(`Chunk ${chunk.index}:`)
  console.log(`  Hex: ${chunk.hex}`)
  console.log(`  Size: ${chunk.payload.length} bytes`)
  console.log(`  To: ${cartridgeAddr}`)
  console.log()
}

console.log('='.repeat(80))
console.log('UPLOAD PLAN')
console.log('='.repeat(80))
console.log()
console.log('1. Upload CENT entry to CATALOG_ADDRESS')
console.log(`   - 1 transaction`)
console.log()
console.log(`2. Upload CART header to ${cartridgeAddr}`)
console.log(`   - 1 transaction`)
console.log()
console.log(`3. Upload ${dataChunks.length} DATA chunks to ${cartridgeAddr}`)
console.log(`   - ${dataChunks.length} transactions`)
console.log()
console.log(`Total: ${1 + 1 + dataChunks.length} transactions`)
console.log()

// Save payloads to files
const outputDir = path.join(path.dirname(zipFile), 'payloads')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

fs.writeFileSync(path.join(outputDir, 'CENT.hex'), centPayload.toString('hex'))
fs.writeFileSync(path.join(outputDir, 'CART.hex'), cartPayload.toString('hex'))

const dataChunksFile = dataChunks.map((chunk, i) => 
  `chunk_${i.toString().padStart(4, '0')}.hex:${chunk.hex}`
).join('\n')
fs.writeFileSync(path.join(outputDir, 'DATA.chunks'), dataChunksFile)

console.log(`Payloads saved to: ${outputDir}/`)
console.log(`  - CENT.hex`)
console.log(`  - CART.hex`)
console.log(`  - DATA.chunks`)

