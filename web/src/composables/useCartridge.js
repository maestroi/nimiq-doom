import { ref, computed } from 'vue'
import { parseCART, parseDATA, computeExpectedChunks, verifySHA256, hexToBytes, normalizeAddress } from '../utils/payloads.js'
import { useCache } from './useCache.js'

/**
 * Cartridge loader composable
 * Fetches transactions from CARTRIDGE_ADDRESS, finds CART header, collects DATA chunks, and reconstructs ZIP
 */
export function useCartridge(rpcClient, cartridgeAddress, publisherAddress) {
  const loading = ref(false)
  const error = ref(null)
  const fileData = ref(null)
  const verified = ref(false)
  const cartHeader = ref(null)
  const progress = ref({
    chunksFound: 0,
    expectedChunks: 0,
    bytes: 0,
    rate: 0
  })
  const syncStartTime = ref(null)
  
  // Cache integration
  const cache = useCache()

  const progressPercent = computed(() => {
    if (progress.value.expectedChunks === 0) return 0
    const percent = (progress.value.chunksFound / progress.value.expectedChunks) * 100
    return Math.min(100, Math.max(0, percent))
  })

  /**
   * Load only CART header info (for display, no download)
   */
  async function loadCartridgeInfo() {
    if (!cartridgeAddress.value || !rpcClient.value) {
      error.value = 'Cartridge address or RPC client not configured'
      return
    }

    console.log('Loading cartridge info from address:', cartridgeAddress.value)

    try {
      // Fetch ALL transactions - CART header is uploaded first, so it's the oldest transaction
      // For large games with 1000+ chunks, we need to paginate through all to find the CART header
      const allTxs = await rpcClient.value.getAllTransactionsByAddress(
        cartridgeAddress.value,
        500, // 500 per page
        (progress) => {
          console.log(`Loading cartridge info: page ${progress.page}, ${progress.totalFetched} transactions`)
        }
      )

      console.log(`Found ${allTxs.length} transactions at cartridge address`)

      // Find CART header first (don't filter by publisher - CART header is the most important)
      // Sort by height (newest first) since CART header is uploaded AFTER all DATA chunks
      const sortedTxs = [...allTxs].sort((a, b) => (b.height || b.blockNumber || 0) - (a.height || a.blockNumber || 0))
      
      let foundCART = false
      let foundDATA = 0
      let foundOther = 0
      
      for (const tx of sortedTxs) {
        const txData = tx.recipientData || tx.data || ''
        if (!txData) {
          foundOther++
          continue
        }

        try {
          const data = hexToBytes(txData)
          
          // Check for CART magic
          const magic = String.fromCharCode(data[0], data[1], data[2], data[3])
          if (magic === 'CART') {
            const cart = parseCART(data)
            if (cart) {
              foundCART = true
              // Found CART header - verify it's from the publisher if publisher is set
              const normalizedPublisher = publisherAddress.value ? normalizeAddress(publisherAddress.value) : null
              if (normalizedPublisher && normalizeAddress(tx.from) !== normalizedPublisher) {
                console.warn(`CART header found but not from publisher (from: ${tx.from}, expected: ${publisherAddress.value}), continuing search...`)
                continue
              }
              
              console.log(`Found CART header: cartridgeId=${cart.cartridgeId}, totalSize=${cart.totalSize}, from=${tx.from}`)
              cartHeader.value = {
                ...cart,
                txHash: tx.hash,
                height: tx.height || tx.blockNumber || 0
              }
              return // Found header, done
            }
          } else if (magic === 'DATA') {
            foundDATA++
          } else {
            foundOther++
          }
        } catch (err) {
          foundOther++
          // Not a valid payload, continue
        }
      }

      console.log(`Transaction breakdown: CART=${foundCART ? 1 : 0}, DATA=${foundDATA}, Other=${foundOther}`)

      // No CART header found
      cartHeader.value = null
      error.value = `CART header not found in cartridge address transactions (found ${foundDATA} DATA chunks, ${foundOther} other transactions)`
    } catch (err) {
      error.value = err.message || 'Failed to load cartridge info'
      console.error('Cartridge info loading error:', err)
    }
  }

  /**
   * Load cartridge from blockchain (full download)
   */
  async function loadCartridge() {
    if (!cartridgeAddress.value || !rpcClient.value) {
      error.value = 'Cartridge address or RPC client not configured'
      return
    }

    console.log('Loading cartridge from address:', cartridgeAddress.value)

    loading.value = true
    error.value = null
    progress.value = { chunksFound: 0, expectedChunks: 0, bytes: 0, rate: 0 }
    syncStartTime.value = Date.now()

    try {
      // First, try to load CART header to get cartridge info for cache lookup
      // We'll do a quick fetch to get the header first
      const quickTxs = await rpcClient.value.getAllTransactionsByAddress(
        cartridgeAddress.value,
        500,
        () => {} // No progress callback for quick fetch
      )

      const normalizedPublisher = publisherAddress.value ? normalizeAddress(publisherAddress.value) : null
      const filteredTxs = quickTxs.filter(tx => {
        if (normalizedPublisher && normalizeAddress(tx.from) !== normalizedPublisher) {
          return false
        }
        return true
      })

      // Find CART header - sort by newest first since CART is uploaded AFTER all DATA chunks
      let quickCartData = null
      const sortedTxs = [...filteredTxs].sort((a, b) => (b.height || 0) - (a.height || 0))
      
      for (const tx of sortedTxs) {
        const txData = tx.recipientData || tx.data || ''
        if (!txData) continue

        try {
          const data = hexToBytes(txData)
          const cart = parseCART(data)
          if (cart) {
            quickCartData = cart
            cartHeader.value = {
              ...cart,
              txHash: tx.hash,
              height: tx.height
            }
            break
          }
        } catch (err) {
          // Not a CART header, continue
        }
      }

      if (!quickCartData) {
        error.value = 'CART header not found in cartridge address transactions'
        loading.value = false
        return
      }

      // Check cache first
      const cacheKey = {
        cartridgeId: quickCartData.cartridgeId,
        sha256: quickCartData.sha256
      }
      
      const cachedData = await cache.loadFromCache(cacheKey)
      if (cachedData) {
        // Verify cached data matches expected hash
        const isValid = await verifySHA256(cachedData, quickCartData.sha256)
        if (isValid) {
          console.log('Loaded from cache, verified successfully')
          fileData.value = cachedData
          verified.value = true
          progress.value = {
            chunksFound: computeExpectedChunks(quickCartData.totalSize, quickCartData.chunkSize),
            expectedChunks: computeExpectedChunks(quickCartData.totalSize, quickCartData.chunkSize),
            bytes: quickCartData.totalSize,
            rate: 0
          }
          loading.value = false
          return
        } else {
          console.warn('Cached data failed verification, re-downloading...')
          // Clear invalid cache
          await cache.clearCache(cacheKey)
        }
      }

      // Not in cache or cache invalid, proceed with full download
      fileData.value = null
      verified.value = false
      
      // Reuse the already-fetched transactions (we already have quickTxs and filteredTxs)
      console.log(`Using ${filteredTxs.length} transactions from publisher`)

      // Use the already-found CART header
      const cartData = quickCartData
      
      console.log('Found CART header:', cartHeader.value)

      // Compute expected chunks
      const expectedChunks = computeExpectedChunks(cartData.totalSize, cartData.chunkSize)
      progress.value.expectedChunks = expectedChunks

      // Collect DATA chunks
      const chunks = new Map()
      
      for (const tx of filteredTxs) {
        const txData = tx.recipientData || tx.data || ''
        if (!txData) continue

        try {
          const data = hexToBytes(txData)
          const dataChunk = parseDATA(data)
          
          if (dataChunk && dataChunk.cartridgeId === cartData.cartridgeId) {
            // Only keep the first occurrence of each chunk index (in case of duplicates)
            if (!chunks.has(dataChunk.chunkIndex)) {
              chunks.set(dataChunk.chunkIndex, {
                ...dataChunk,
                txHash: tx.hash
              })
            }
          }
        } catch (err) {
          // Not a DATA chunk, continue
        }
      }

      progress.value.chunksFound = chunks.size
      console.log(`Found ${chunks.size} of ${expectedChunks} expected chunks`)

      if (chunks.size < expectedChunks) {
        error.value = `Only found ${chunks.size} of ${expectedChunks} expected chunks. Some transactions may not be confirmed yet.`
        loading.value = false
        return
      }

      // Reconstruct file
      const sortedChunks = Array.from(chunks.values())
        .sort((a, b) => a.chunkIndex - b.chunkIndex)

      const reconstructed = new Uint8Array(cartData.totalSize)
      let offset = 0
      let totalBytes = 0

      for (const chunk of sortedChunks) {
        const chunkData = chunk.data.slice(0, chunk.len)
        reconstructed.set(chunkData, offset)
        offset += chunk.len
        totalBytes += chunk.len
      }

      progress.value.bytes = totalBytes
      fileData.value = reconstructed

      // Verify SHA256
      console.log('Verifying SHA256...')
      const isValid = await verifySHA256(reconstructed, cartData.sha256)
      verified.value = isValid

      if (!isValid) {
        error.value = `SHA256 verification failed! Expected ${cartData.sha256}, computed hash mismatch.`
      } else {
        console.log('SHA256 verification passed')
        
        // Save to cache after successful verification
        const cacheKey = {
          cartridgeId: cartData.cartridgeId,
          sha256: cartData.sha256,
          filename: 'game.zip' // Will be updated when run.json is extracted
        }
        await cache.saveToCache(cacheKey, reconstructed)
        console.log('Saved to cache')
      }

      // Update progress
      const elapsed = (Date.now() - syncStartTime.value) / 1000
      if (elapsed > 0) {
        progress.value.rate = chunks.size / elapsed
      }

    } catch (err) {
      error.value = err.message || 'Failed to load cartridge'
      console.error('Cartridge loading error:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Extract run.json from ZIP file
   */
  async function extractRunJson() {
    if (!fileData.value || !verified.value) {
      return null
    }

    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(fileData.value)
      
      const runJsonFile = zip.files['run.json']
      if (!runJsonFile || runJsonFile.dir) {
        return null
      }

      const runJsonText = await runJsonFile.async('string')
      return JSON.parse(runJsonText)
    } catch (err) {
      console.warn('Failed to extract run.json:', err)
      return null
    }
  }

  /**
   * Clear cache for current cartridge
   */
  async function clearCache() {
    if (!cartHeader.value) return
    
    const cacheKey = {
      cartridgeId: cartHeader.value.cartridgeId,
      sha256: cartHeader.value.sha256
    }
    
    await cache.clearCache(cacheKey)
    
    // Reset state to force re-download
    fileData.value = null
    verified.value = false
    progress.value = {
      chunksFound: 0,
      expectedChunks: 0,
      bytes: 0,
      rate: 0
    }
    
    console.log('Cache cleared, cartridge state reset')
  }

  return {
    loading,
    error,
    fileData,
    verified,
    cartHeader,
    progress,
    progressPercent,
    loadCartridgeInfo,
    loadCartridge,
    extractRunJson,
    clearCache
  }
}

