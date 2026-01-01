/**
 * Cartridge Encoder - JavaScript equivalent of Go cartridge.go and chunk.go
 * Encodes CART headers, DATA chunks, and CENT catalog entries
 */

const MAGIC_CART = 'CART'
const MAGIC_DATA = 'DATA'
const MAGIC_CENT = 'CENT'
const CHUNK_SIZE = 51
const PAYLOAD_SIZE = 64

// Nimiq base32 alphabet (excludes I, O, W, Z to avoid confusion)
// Full alphabet: 0-9, A-H (no I), J-N (no O), P-Y (no W, Z) = 32 chars
const NIMIQ_BASE32_ALPHABET = '0123456789ABCDEFGHJKLMNPQRSTUVXY'

/**
 * Convert a Nimiq address string (NQ...) to 20-byte binary
 * @param {string} address - Nimiq address (e.g., "NQ32 0VD4 26TR...")
 * @returns {Uint8Array} 20-byte address
 */
export function addressNQToBytes(address) {
  // Remove spaces
  const cleanAddress = address.replace(/\s/g, '')
  
  if (cleanAddress.length !== 36 || !cleanAddress.startsWith('NQ')) {
    throw new Error(`Invalid address format: expected NQ + 34 chars, got ${cleanAddress.length} chars`)
  }
  
  // Skip NQ (2 chars) and check digits (2 chars), decode only the 32-char address body
  const base32Str = cleanAddress.slice(4).toUpperCase()
  if (base32Str.length !== 32) {
    throw new Error(`Invalid address body length: expected 32 base32 chars, got ${base32Str.length}`)
  }
  
  // Build a lookup map for the base32 alphabet
  const alphabetMap = new Map()
  for (let i = 0; i < NIMIQ_BASE32_ALPHABET.length; i++) {
    alphabetMap.set(NIMIQ_BASE32_ALPHABET[i], i)
  }
  
  // Decode 32 base32 characters = 160 bits = exactly 20 bytes
  const decoded = []
  let bitBuffer = 0n
  let bitsInBuffer = 0
  
  for (let i = 0; i < 32; i++) {
    const char = base32Str[i]
    const value = alphabetMap.get(char)
    if (value === undefined) {
      throw new Error(`Invalid base32 character: ${char} (not in Nimiq alphabet)`)
    }
    
    bitBuffer = (bitBuffer << 5n) | BigInt(value)
    bitsInBuffer += 5
    
    while (bitsInBuffer >= 8) {
      decoded.push(Number(bitBuffer >> BigInt(bitsInBuffer - 8) & 0xFFn))
      bitsInBuffer -= 8
      bitBuffer &= (1n << BigInt(bitsInBuffer)) - 1n
    }
  }
  
  if (decoded.length !== 20) {
    throw new Error(`Decoded address wrong size: got ${decoded.length} bytes, expected 20`)
  }
  
  return new Uint8Array(decoded)
}

/**
 * Calculate SHA256 hash of data
 * @param {Uint8Array} data - Data to hash
 * @returns {Promise<Uint8Array>} 32-byte SHA256 hash
 */
export async function calculateSHA256(data) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hashBuffer)
}

/**
 * Encode a CART header into a 64-byte payload
 * @param {Object} header - CART header
 * @param {number} header.schema - Schema version (uint8)
 * @param {number} header.platform - Platform code (uint8)
 * @param {number} header.chunkSize - Chunk size in bytes (uint8)
 * @param {number} header.flags - Flags (uint8)
 * @param {number} header.cartridgeId - Cartridge ID (uint32)
 * @param {bigint|number} header.totalSize - Total file size (uint64)
 * @param {Uint8Array} header.sha256 - SHA256 hash (32 bytes)
 * @returns {Uint8Array} 64-byte encoded payload
 */
export function encodeCART(header) {
  const payload = new Uint8Array(64)
  const view = new DataView(payload.buffer)
  
  // MAGIC "CART" (4 bytes)
  for (let i = 0; i < 4; i++) {
    payload[i] = MAGIC_CART.charCodeAt(i)
  }
  
  // schema (1 byte)
  payload[4] = header.schema
  
  // platform (1 byte)
  payload[5] = header.platform
  
  // chunk_size (1 byte)
  payload[6] = header.chunkSize
  
  // flags (1 byte)
  payload[7] = header.flags
  
  // cartridge_id (u32, little-endian)
  view.setUint32(8, header.cartridgeId, true)
  
  // total_size (u64, little-endian)
  const totalSize = BigInt(header.totalSize)
  view.setBigUint64(12, totalSize, true)
  
  // sha256 (32 bytes)
  if (header.sha256 && header.sha256.length === 32) {
    payload.set(header.sha256, 20)
  }
  
  // reserved (12 bytes) - already zero
  
  return payload
}

/**
 * Encode a DATA chunk into a 64-byte payload
 * @param {Object} data - DATA payload
 * @param {number} data.cartridgeId - Cartridge ID (uint32)
 * @param {number} data.chunkIndex - Chunk index (uint32)
 * @param {number} data.length - Data length (uint8)
 * @param {Uint8Array} data.data - Chunk data (up to 51 bytes)
 * @returns {Uint8Array} 64-byte encoded payload
 */
export function encodeDATA(data) {
  const payload = new Uint8Array(64)
  const view = new DataView(payload.buffer)
  
  // MAGIC "DATA" (4 bytes)
  for (let i = 0; i < 4; i++) {
    payload[i] = MAGIC_DATA.charCodeAt(i)
  }
  
  // cartridge_id (u32, little-endian)
  view.setUint32(4, data.cartridgeId, true)
  
  // chunk_index (u32, little-endian)
  view.setUint32(8, data.chunkIndex, true)
  
  // len (1 byte)
  if (data.length > 51) {
    throw new Error(`Chunk data too large: ${data.length} bytes (max 51)`)
  }
  payload[12] = data.length
  
  // bytes (51 bytes)
  if (data.data && data.data.length > 0) {
    if (data.data.length > 51) {
      throw new Error(`Chunk data too large: ${data.data.length} bytes (max 51)`)
    }
    payload.set(data.data, 13)
  }
  
  return payload
}

/**
 * Encode a CENT catalog entry into a 64-byte payload
 * @param {Object} entry - CENT entry
 * @param {number} entry.schema - Schema version (uint8)
 * @param {number} entry.platform - Platform code (uint8)
 * @param {number} entry.flags - Flags (uint8)
 * @param {number} entry.appId - App ID (uint32)
 * @param {number[]} entry.semver - Semantic version [major, minor, patch]
 * @param {Uint8Array} entry.cartridgeAddr - Cartridge address (20 bytes)
 * @param {string} entry.titleShort - Short title (max 16 chars)
 * @returns {Uint8Array} 64-byte encoded payload
 */
export function encodeCENT(entry) {
  const payload = new Uint8Array(64)
  const view = new DataView(payload.buffer)
  
  // MAGIC "CENT" (4 bytes)
  for (let i = 0; i < 4; i++) {
    payload[i] = MAGIC_CENT.charCodeAt(i)
  }
  
  // schema (1 byte)
  payload[4] = entry.schema
  
  // platform (1 byte)
  payload[5] = entry.platform
  
  // flags (1 byte)
  payload[6] = entry.flags
  
  // app_id (u32, little-endian)
  view.setUint32(7, entry.appId, true)
  
  // semver (3 bytes: major, minor, patch)
  payload[11] = entry.semver[0]
  payload[12] = entry.semver[1]
  payload[13] = entry.semver[2]
  
  // cartridge_address (20 bytes)
  if (entry.cartridgeAddr && entry.cartridgeAddr.length === 20) {
    payload.set(entry.cartridgeAddr, 14)
  }
  
  // title_short (16 bytes, null-terminated)
  const titleBytes = new TextEncoder().encode(entry.titleShort)
  const titleLen = Math.min(titleBytes.length, 15)
  payload.set(titleBytes.slice(0, titleLen), 34)
  // null terminator is already zero
  
  // reserved (14 bytes) - already zero
  
  return payload
}

/**
 * Split file data into chunks
 * @param {Uint8Array} fileData - File data
 * @param {number} cartridgeId - Cartridge ID
 * @param {number} chunkSize - Chunk size (default: 51)
 * @returns {Object[]} Array of chunk objects with index and data
 */
export function chunkFile(fileData, cartridgeId, chunkSize = CHUNK_SIZE) {
  const chunks = []
  let index = 0
  
  for (let offset = 0; offset < fileData.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, fileData.length)
    const chunkData = fileData.slice(offset, end)
    
    chunks.push({
      cartridgeId,
      chunkIndex: index,
      length: chunkData.length,
      data: chunkData
    })
    
    index++
  }
  
  return chunks
}

/**
 * Convert bytes to hex string
 * @param {Uint8Array} bytes - Byte array
 * @returns {string} Hex string
 */
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Parse semver string to array
 * @param {string} semver - Semver string (e.g., "1.0.0")
 * @returns {number[]} Array of [major, minor, patch]
 */
export function parseSemver(semver) {
  const parts = semver.split('.')
  if (parts.length !== 3) {
    throw new Error('Semver must be in format major.minor.patch (e.g., 1.0.0)')
  }
  
  const result = parts.map((part, i) => {
    const val = parseInt(part, 10)
    if (isNaN(val) || val < 0 || val > 255) {
      throw new Error(`Invalid semver component: ${part} (must be 0-255)`)
    }
    return val
  })
  
  return result
}

/**
 * Platform codes
 */
export const PLATFORMS = {
  DOS: 0,
  GB: 1,
  GBC: 2,
  NES: 3
}

/**
 * Get platform code from string
 * @param {string} platform - Platform name (DOS, GB, GBC, NES)
 * @returns {number} Platform code
 */
export function getPlatformCode(platform) {
  const upper = (platform || 'DOS').toUpperCase()
  return PLATFORMS[upper] ?? 0
}

/**
 * Max file size (6MB)
 */
export const MAX_FILE_SIZE = 6 * 1024 * 1024

