/**
 * Admin Uploader Composable
 * Handles uploading cartridges to the Nimiq blockchain via web interface
 */

import { ref, computed, shallowRef } from 'vue'
import {
  encodeCART,
  encodeDATA,
  encodeCENT,
  chunkFile,
  addressNQToBytes,
  calculateSHA256,
  bytesToHex,
  parseSemver,
  getPlatformCode,
  MAX_FILE_SIZE
} from '../utils/cartridge-encoder.js'

// Catalog address shortcuts
const CATALOG_ADDRESSES = {
  main: 'NQ15 NXMP 11A0 TMKP G1Q8 4ABD U16C XD6Q D948',
  test: 'NQ32 0VD4 26TR 1394 KXBJ 862C NFKG 61M5 GFJ0'
}

/**
 * Resolve catalog address shortcut to full address
 * @param {string} addr - 'main', 'test', or full NQ address
 * @returns {string} Full NQ address
 */
function resolveCatalogAddress(addr) {
  const lower = addr.toLowerCase()
  if (CATALOG_ADDRESSES[lower]) {
    return CATALOG_ADDRESSES[lower]
  }
  return addr
}

/**
 * Rate limiter class
 */
class RateLimiter {
  constructor(rate) {
    this.rate = rate // requests per second
    this.lastRequest = 0
  }
  
  async wait() {
    const now = Date.now()
    const minInterval = 1000 / this.rate
    const timeSinceLast = now - this.lastRequest
    
    if (timeSinceLast < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLast))
    }
    
    this.lastRequest = Date.now()
  }
}

/**
 * Admin Uploader Composable
 */
export function useAdminUploader() {
  // State
  const loading = ref(false)
  const error = ref(null)
  const status = ref('')
  
  // Upload progress
  const progress = ref({
    stage: '', // 'preparing', 'uploading', 'cart', 'cent', 'complete'
    totalChunks: 0,
    sentChunks: 0,
    failedChunks: [],
    cartTxHash: '',
    centTxHash: '',
    currentRate: 0
  })
  
  // File data
  const fileData = shallowRef(null)
  const fileName = ref('')
  const fileSize = ref(0)
  const fileSHA256 = ref('')
  
  // Configuration
  const config = ref({
    rpcUrl: '/rpc', // Proxied through Vite to avoid CORS (target: http://192.168.50.99:8648)
    senderAddress: 'NQ89 4GDH 0J4U C2FY TU0Y TP1X J1H7 3HX3 PVSE', // Authorized publisher
    cartridgeAddress: '',
    catalogAddress: 'main',
    title: '',
    semver: '1.0.0',
    platform: 'DOS',
    appId: 0, // 0 = auto-generate from catalog
    cartridgeId: 0, // 0 = auto-generate (timestamp-based, unique per upload)
    rateLimit: 25, // tx/s (default same as Go uploader)
    concurrency: 1, // parallel uploads (1-10)
    dryRun: false
  })
  
  // Upload log
  const uploadLog = ref([])
  
  /**
   * Add a log entry
   */
  function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    uploadLog.value.push({ timestamp, message, type })
    console.log(`[${type.toUpperCase()}] ${message}`)
  }
  
  /**
   * Clear log
   */
  function clearLog() {
    uploadLog.value = []
  }
  
  /**
   * Load file from input
   * @param {File} file - File object
   */
  async function loadFile(file) {
    error.value = null
    
    if (!file) {
      error.value = 'No file selected'
      return false
    }
    
    if (!file.name.toLowerCase().endsWith('.zip')) {
      error.value = 'Please select a ZIP file'
      return false
    }
    
    if (file.size > MAX_FILE_SIZE) {
      error.value = `File size (${formatBytes(file.size)}) exceeds maximum of 6MB`
      return false
    }
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      fileData.value = new Uint8Array(arrayBuffer)
      fileName.value = file.name
      fileSize.value = file.size
      
      // Calculate SHA256
      const hash = await calculateSHA256(fileData.value)
      fileSHA256.value = bytesToHex(hash)
      
      log(`Loaded file: ${file.name} (${formatBytes(file.size)})`)
      log(`SHA256: ${fileSHA256.value}`)
      
      return true
    } catch (err) {
      error.value = `Failed to load file: ${err.message}`
      return false
    }
  }
  
  /**
   * Format bytes to human readable
   */
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  /**
   * Make an RPC call
   */
  async function rpcCall(url, method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`)
    }
    
    // Handle nested data structure
    if (data.result && typeof data.result === 'object' && 'data' in data.result) {
      return data.result.data
    }
    
    return data.result
  }
  
  /**
   * Check if consensus is established
   */
  async function checkConsensus(rpcUrl) {
    try {
      const result = await rpcCall(rpcUrl, 'isConsensusEstablished', {})
      return result === true
    } catch (err) {
      log(`Failed to check consensus: ${err.message}`, 'error')
      return false
    }
  }
  
  /**
   * Get current block number
   */
  async function getBlockNumber(rpcUrl) {
    const result = await rpcCall(rpcUrl, 'getBlockNumber', {})
    if (typeof result === 'number') return result
    if (typeof result === 'object' && result.data) return result.data
    throw new Error('Invalid block number response')
  }
  
  /**
   * Check if account is unlocked
   */
  async function isAccountUnlocked(rpcUrl, address) {
    try {
      const result = await rpcCall(rpcUrl, 'isAccountUnlocked', { address })
      return result === true
    } catch {
      return false
    }
  }
  
  /**
   * Unlock account
   */
  async function unlockAccount(rpcUrl, address, passphrase, duration = 0) {
    return await rpcCall(rpcUrl, 'unlockAccount', { address, passphrase, duration })
  }
  
  /**
   * Create a new account
   */
  async function createAccount(rpcUrl) {
    const result = await rpcCall(rpcUrl, 'createAccount', {})
    return result
  }
  
  /**
   * Send a transaction with data
   */
  async function sendTransaction(rpcUrl, wallet, recipient, data, validityStartHeight) {
    // Value must be > 0 for transactions with data (1 Luna minimum)
    // Ensure numeric types are integers
    const params = {
      wallet: wallet,
      recipient: recipient,
      data: data,
      value: 1,  // 1 Luna - minimum required for data transactions
      fee: 0,
      validityStartHeight: Math.floor(validityStartHeight)
    }
    
    let result
    try {
      result = await rpcCall(rpcUrl, 'sendBasicTransactionWithData', params)
    } catch (err) {
      // Try with array params as fallback (some RPC implementations prefer positional)
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'sendBasicTransactionWithData',
        params: [wallet, recipient, data, 1, 0, Math.floor(validityStartHeight)]
      }
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      
      const responseData = await response.json()
      if (responseData.error) {
        throw new Error(responseData.error.message || JSON.stringify(responseData.error))
      }
      result = responseData.result?.data || responseData.result
    }
    
    // Extract transaction hash from response
    if (typeof result === 'string') return result
    if (result && result.Blake2bHash) return result.Blake2bHash
    if (result && result.hash) return result.hash
    
    throw new Error('No transaction hash in response')
  }
  
/**
 * Query catalog for max app ID by parsing CENT entries
 */
async function getMaxAppId(rpcUrl, catalogAddr, publisherAddr) {
  log('Querying catalog for max app ID...', 'info')
  
  const normalizedCatalog = catalogAddr.replace(/\s/g, '').toUpperCase()
  const normalizedPublisher = publisherAddr.replace(/\s/g, '').toUpperCase()
  
  // Query transactions from catalog
  let allTxs = []
  let startAt = null
  
  try {
    // Fetch all transactions (with pagination)
    for (let page = 0; page < 20; page++) {
      const params = { address: normalizedCatalog, max: 500 }
      if (startAt) params.startAt = startAt
      
      const result = await rpcCall(rpcUrl, 'getTransactionsByAddress', params)
      const txs = Array.isArray(result) ? result : (result?.data || result?.transactions || [])
      
      if (txs.length === 0) break
      allTxs.push(...txs)
      
      if (txs.length < 500) break
      startAt = txs[txs.length - 1]?.hash
      if (!startAt) break
    }
    
    log(`Fetched ${allTxs.length} catalog transactions`, 'info')
    
    // Parse CENT entries to find max app ID
    let maxAppId = 0
    for (const tx of allTxs) {
      // Filter by publisher
      const from = (tx.from || tx.From || '').replace(/\s/g, '').toUpperCase()
      if (normalizedPublisher && from !== normalizedPublisher) continue
      
      // Get data hex
      const dataHex = tx.recipientData || tx.RecipientData || tx.data || tx.Data || tx.senderData || ''
      if (!dataHex || dataHex.length < 128) continue // 64 bytes = 128 hex chars
      
      // Check CENT magic
      const magic = hexToString(dataHex.slice(0, 8))
      if (magic !== 'CENT') continue
      
      // Parse app_id (u32 little-endian at offset 7)
      const appId = hexToUint32LE(dataHex.slice(14, 22)) // bytes 7-10 = hex 14-22
      if (appId > maxAppId) maxAppId = appId
    }
    
    const nextId = maxAppId === 0 ? 1 : maxAppId + 1
    log(`Max app ID in catalog: ${maxAppId}, next: ${nextId}`, 'info')
    return nextId
    
  } catch (err) {
    log(`Failed to query catalog: ${err.message}. Using timestamp fallback.`, 'warn')
    return Math.floor(Date.now() / 1000) % 0xFFFFFFFF
  }
}

/**
 * Find existing app ID by title
 */
async function findAppIdByTitle(rpcUrl, catalogAddr, publisherAddr, title) {
  const normalizedCatalog = catalogAddr.replace(/\s/g, '').toUpperCase()
  const normalizedPublisher = publisherAddr.replace(/\s/g, '').toUpperCase()
  const normalizedTitle = title.toLowerCase().trim()
  
  try {
    const params = { address: normalizedCatalog, max: 500 }
    const result = await rpcCall(rpcUrl, 'getTransactionsByAddress', params)
    const txs = Array.isArray(result) ? result : (result?.data || result?.transactions || [])
    
    for (const tx of txs) {
      const from = (tx.from || tx.From || '').replace(/\s/g, '').toUpperCase()
      if (normalizedPublisher && from !== normalizedPublisher) continue
      
      const dataHex = tx.recipientData || tx.RecipientData || tx.data || tx.Data || tx.senderData || ''
      if (!dataHex || dataHex.length < 128) continue
      
      const magic = hexToString(dataHex.slice(0, 8))
      if (magic !== 'CENT') continue
      
      // Parse title (16 bytes at offset 34)
      const titleHex = dataHex.slice(68, 100) // bytes 34-49 = hex 68-100
      const centTitle = hexToString(titleHex).replace(/\0/g, '').toLowerCase().trim()
      
      if (centTitle === normalizedTitle) {
        const appId = hexToUint32LE(dataHex.slice(14, 22))
        return appId
      }
    }
    
    return 0 // Not found
  } catch {
    return 0
  }
}

// Helper: hex string to ASCII string
function hexToString(hex) {
  let str = ''
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16)
    if (code === 0) break
    str += String.fromCharCode(code)
  }
  return str
}

// Helper: hex to uint32 little-endian
function hexToUint32LE(hex) {
  const bytes = []
  for (let i = 0; i < 8; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)
}
  
  /**
   * Start the upload process
   */
  async function startUpload() {
    if (!fileData.value) {
      error.value = 'No file loaded'
      return false
    }
    
    // Validate configuration
    if (!config.value.title || config.value.title.length > 16) {
      error.value = 'Title is required and must be <= 16 characters'
      return false
    }
    
    if (!config.value.senderAddress) {
      error.value = 'Sender address is required'
      return false
    }
    
    if (!config.value.cartridgeAddress) {
      error.value = 'Cartridge address is required'
      return false
    }
    
    if (!config.value.catalogAddress) {
      error.value = 'Catalog address is required'
      return false
    }
    
    // Parse semver
    let semverArr
    try {
      semverArr = parseSemver(config.value.semver)
    } catch (err) {
      error.value = err.message
      return false
    }
    
    clearLog()
    loading.value = true
    error.value = null
    
    const rpcUrl = config.value.rpcUrl
    const catalogAddr = resolveCatalogAddress(config.value.catalogAddress)
    const cartridgeAddr = config.value.cartridgeAddress
    const senderAddr = config.value.senderAddress
    
    progress.value = {
      stage: 'preparing',
      totalChunks: 0,
      sentChunks: 0,
      failedChunks: [],
      cartTxHash: '',
      centTxHash: '',
      currentRate: 0
    }
    
    try {
      log('=== Upload Started ===')
      log(`File: ${fileName.value}`)
      log(`Size: ${formatBytes(fileSize.value)}`)
      log(`SHA256: ${fileSHA256.value}`)
      log(`Title: ${config.value.title}`)
      log(`Semver: ${config.value.semver}`)
      log(`Platform: ${config.value.platform}`)
      log(`Cartridge Address: ${cartridgeAddr}`)
      log(`Catalog Address: ${catalogAddr}`)
      log(`Sender: ${senderAddr}`)
      log(`RPC URL: ${rpcUrl}`)
      
      // Check consensus (skip in dry-run)
      if (!config.value.dryRun) {
        status.value = 'Checking consensus...'
        const consensus = await checkConsensus(rpcUrl)
        if (!consensus) {
          throw new Error('Node does not have consensus with the network')
        }
        log('✓ Consensus established')
        
        // Check if sender account is unlocked
        status.value = 'Checking account status...'
        const unlocked = await isAccountUnlocked(rpcUrl, senderAddr)
        if (!unlocked) {
          log('⚠️ Account is locked. Please unlock via RPC first.', 'warn')
          throw new Error('Sender account is locked. Unlock it via RPC or use the node\'s wallet UI.')
        }
        log('✓ Account is unlocked')
      }
      
      // Calculate SHA256 hash
      const sha256Hash = await calculateSHA256(fileData.value)
      
      // Generate cartridge ID if not provided
      let cartridgeId = config.value.cartridgeId
      if (cartridgeId === 0) {
        cartridgeId = Math.floor(Date.now() / 1000) % 0xFFFFFFFF
        log(`Auto-generated cartridge ID: ${cartridgeId}`)
      }
      
      // Generate app ID if not provided
      let appId = config.value.appId
      if (appId === 0) {
        status.value = 'Querying catalog for app ID...'
        
        // First try to find existing app by title (for new versions of existing games)
        if (config.value.title) {
          const existingAppId = await findAppIdByTitle(rpcUrl, catalogAddr, senderAddr, config.value.title)
          if (existingAppId > 0) {
            appId = existingAppId
            log(`Found existing app ID ${appId} for title "${config.value.title}" (new version)`)
          }
        }
        
        // If not found by title, get next available ID
        if (appId === 0) {
          appId = await getMaxAppId(rpcUrl, catalogAddr, senderAddr)
          log(`Auto-generated app ID: ${appId} (new game)`)
        }
      }
      
      // Chunk the file
      const chunks = chunkFile(fileData.value, cartridgeId, 51)
      progress.value.totalChunks = chunks.length
      log(`Created ${chunks.length} chunks`)
      log(`Rate limit: ${config.value.rateLimit} tx/s`)
      
      // Rate limiter (skip in dry-run for instant results)
      const limiter = config.value.dryRun ? null : new RateLimiter(config.value.rateLimit)
      
      // Upload DATA chunks
      progress.value.stage = 'uploading'
      status.value = config.value.dryRun ? 'Dry run: simulating chunks...' : 'Uploading DATA chunks...'
      log('=== Step 1: Uploading DATA chunks ===')
      
      const startTime = Date.now()
      let consecutiveFailures = 0
      const MAX_CONSECUTIVE_FAILURES = 5
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        // Rate limit (skip in dry-run)
        if (limiter) await limiter.wait()
        
        // Encode DATA payload
        const dataPayload = encodeDATA({
          cartridgeId: chunk.cartridgeId,
          chunkIndex: chunk.chunkIndex,
          length: chunk.length,
          data: chunk.data
        })
        
        const dataHex = bytesToHex(dataPayload)
        
        // Debug: log first chunk details
        if (i === 0) {
          log(`First chunk - cartridgeId: ${chunk.cartridgeId}, index: ${chunk.chunkIndex}, len: ${chunk.length}`)
          log(`Data hex (first 40 chars): ${dataHex.substring(0, 40)}...`)
          log(`Sender: ${senderAddr}`)
          log(`Recipient: ${cartridgeAddr}`)
        }
        
        if (config.value.dryRun) {
          // Dry run - just log
          progress.value.sentChunks++
          if ((i + 1) % 100 === 0 || i === chunks.length - 1) {
            log(`[DRY-RUN] Chunk ${i + 1}/${chunks.length}`)
          }
        } else {
          try {
            const blockNumber = await getBlockNumber(rpcUrl)
            const txHash = await sendTransaction(rpcUrl, senderAddr, cartridgeAddr, dataHex, blockNumber)
            
            progress.value.sentChunks++
            consecutiveFailures = 0 // Reset on success
            
            // Calculate rate
            const elapsed = (Date.now() - startTime) / 1000
            progress.value.currentRate = progress.value.sentChunks / elapsed
            
            if ((i + 1) % 50 === 0 || i === chunks.length - 1) {
              log(`Sent chunk ${i + 1}/${chunks.length} (${progress.value.currentRate.toFixed(1)} tx/s)`)
            }
          } catch (err) {
            progress.value.failedChunks.push(i)
            consecutiveFailures++
            log(`Failed chunk ${i}: ${err.message}`, 'error')
            
            // Stop if too many consecutive failures
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              log(`⛔ Stopping: ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Check RPC connection and account status.`, 'error')
              throw new Error(`Upload stopped: ${MAX_CONSECUTIVE_FAILURES} consecutive chunk failures`)
            }
          }
        }
        
        // Update status
        const pct = Math.round((i + 1) / chunks.length * 100)
        status.value = `Uploading chunks: ${i + 1}/${chunks.length} (${pct}%)`
      }
      
      log(`✓ Uploaded ${progress.value.sentChunks}/${chunks.length} chunks`)
      
      // Upload CART header
      progress.value.stage = 'cart'
      status.value = 'Uploading CART header...'
      log('=== Step 2: Uploading CART header ===')
      
      const cartHeader = encodeCART({
        schema: 1,
        platform: getPlatformCode(config.value.platform),
        chunkSize: 51,
        flags: 0,
        cartridgeId,
        totalSize: BigInt(fileSize.value),
        sha256: sha256Hash
      })
      
      const cartHex = bytesToHex(cartHeader)
      
      if (config.value.dryRun) {
        log('[DRY-RUN] CART header ready')
        progress.value.cartTxHash = 'dry-run-cart-hash'
      } else {
        await limiter.wait()
        const blockNumber = await getBlockNumber(rpcUrl)
        const cartTxHash = await sendTransaction(rpcUrl, senderAddr, cartridgeAddr, cartHex, blockNumber)
        progress.value.cartTxHash = cartTxHash
        log(`✓ CART header sent: ${cartTxHash}`)
      }
      
      // Upload CENT entry to catalog
      progress.value.stage = 'cent'
      status.value = 'Registering in catalog (CENT)...'
      log('=== Step 3: Registering cartridge in catalog (CENT) ===')
      
      const cartridgeAddrBytes = addressNQToBytes(cartridgeAddr)
      
      const centEntry = encodeCENT({
        schema: 1,
        platform: getPlatformCode(config.value.platform),
        flags: 0,
        appId,
        semver: semverArr,
        cartridgeAddr: cartridgeAddrBytes,
        titleShort: config.value.title
      })
      
      const centHex = bytesToHex(centEntry)
      
      if (config.value.dryRun) {
        log('[DRY-RUN] CENT entry ready')
        progress.value.centTxHash = 'dry-run-cent-hash'
      } else {
        await limiter.wait()
        const blockNumber = await getBlockNumber(rpcUrl)
        const centTxHash = await sendTransaction(rpcUrl, senderAddr, catalogAddr, centHex, blockNumber)
        progress.value.centTxHash = centTxHash
        log(`✓ CENT entry sent to catalog: ${centTxHash}`)
      }
      
      // Complete
      progress.value.stage = 'complete'
      status.value = 'Upload complete!'
      
      log('=== Upload Complete ===')
      log(`CART header: ${progress.value.cartTxHash}`)
      log(`DATA chunks: ${progress.value.sentChunks}/${progress.value.totalChunks}`)
      log(`CENT entry: ${progress.value.centTxHash}`)
      
      if (progress.value.failedChunks.length > 0) {
        log(`⚠️ Failed chunks: ${progress.value.failedChunks.join(', ')}`, 'warn')
      }
      
      return true
    } catch (err) {
      error.value = err.message
      log(`Error: ${err.message}`, 'error')
      return false
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Reset state
   */
  function reset() {
    loading.value = false
    error.value = null
    status.value = ''
    fileData.value = null
    fileName.value = ''
    fileSize.value = 0
    fileSHA256.value = ''
    progress.value = {
      stage: '',
      totalChunks: 0,
      sentChunks: 0,
      failedChunks: [],
      cartTxHash: '',
      centTxHash: '',
      currentRate: 0
    }
    clearLog()
  }
  
  // Computed properties
  const progressPercent = computed(() => {
    if (progress.value.totalChunks === 0) return 0
    return Math.round((progress.value.sentChunks / progress.value.totalChunks) * 100)
  })
  
  const isComplete = computed(() => progress.value.stage === 'complete')
  
  return {
    // State
    loading,
    error,
    status,
    progress,
    progressPercent,
    isComplete,
    
    // File
    fileData,
    fileName,
    fileSize,
    fileSHA256,
    
    // Config
    config,
    
    // Log
    uploadLog,
    
    // Methods
    loadFile,
    startUpload,
    reset,
    clearLog,
    formatBytes,
    
    // Catalog addresses for reference
    CATALOG_ADDRESSES
  }
}

