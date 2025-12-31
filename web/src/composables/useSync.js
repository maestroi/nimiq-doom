import { ref, computed } from 'vue'
import { NimiqRPC } from '../nimiq-rpc.js'

export function useSync(manifest, rpcClient, devSyncSpeed, devSyncDelay, selectedRpcEndpoint, customRpcEndpoint, loadFromCache, saveToCache) {
  const loading = ref(false)
  const error = ref(null)
  const verified = ref(false)
  const fileData = ref(null)
  const syncProgress = ref({ fetched: 0, total: 0, bytes: 0, rate: 0 })
  const syncStartTime = ref(null)
  const estimatedTimeRemaining = ref(null)
  const loadedFromCache = ref(false)

  const syncProgressPercent = computed(() => {
    if (syncProgress.value.total === 0) return 0
    const percent = (syncProgress.value.fetched / syncProgress.value.total) * 100
    return Math.min(100, Math.max(0, percent))
  })

  function updateEstimatedTime() {
    if (!syncStartTime.value || syncProgress.value.fetched === 0 || syncProgress.value.total === 0) {
      estimatedTimeRemaining.value = null
      syncProgress.value.rate = 0
      return
    }
    
    const elapsed = (Date.now() - syncStartTime.value) / 1000
    const rate = syncProgress.value.fetched / elapsed
    syncProgress.value.rate = rate
    
    const remaining = syncProgress.value.total - syncProgress.value.fetched
    const secondsRemaining = remaining / rate
    
    if (secondsRemaining > 0 && isFinite(secondsRemaining)) {
      estimatedTimeRemaining.value = secondsRemaining
    } else {
      estimatedTimeRemaining.value = null
    }
  }

  function parseChunkFromTxData(txData) {
    if (!txData || txData.length < 2) return null
    
    const hexString = txData.startsWith('0x') ? txData.slice(2) : txData
    if (hexString.length % 2 !== 0) return null
    
    const data = new Uint8Array(hexString.length / 2)
    for (let i = 0; i < hexString.length; i += 2) {
      data[i / 2] = parseInt(hexString.substr(i, 2), 16)
    }
    
    if (data.length < 13) return null
    
    const magic = String.fromCharCode(data[0], data[1], data[2], data[3])
    if (magic !== 'DOOM') return null
    
    const gameID = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)
    const chunkIdx = data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24)
    const length = data[12]
    
    if (length > 51 || data.length < 13 + length) return null
    
    const chunkData = data.slice(13, 13 + length)
    
    return {
      gameID,
      chunkIdx,
      length,
      data: chunkData
    }
  }

  async function syncChunks() {
    if (!manifest.value) {
      error.value = 'No program loaded. Please select and load a program first.'
      return
    }

    loading.value = true
    error.value = null
    
    const cachedData = await loadFromCache(manifest.value)
    if (cachedData) {
      fileData.value = cachedData
      loadedFromCache.value = true
      syncProgress.value = { 
        fetched: manifest.value.expected_tx_hashes?.length || 0, 
        total: manifest.value.expected_tx_hashes?.length || 0, 
        bytes: cachedData.length,
        rate: 0
      }
      await verifyFile()
      loading.value = false
      return
    }
    
    loadedFromCache.value = false

    if (!manifest.value.expected_tx_hashes || manifest.value.expected_tx_hashes.length === 0) {
      error.value = 'Manifest has no expected transaction hashes. Cannot sync chunks.'
      loading.value = false
      return
    }

    syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
    syncStartTime.value = Date.now()
    estimatedTimeRemaining.value = null
    fileData.value = null
    verified.value = false

    try {
      const totalChunks = Math.ceil(manifest.value.total_size / manifest.value.chunk_size)
      const chunks = new Map()
      const expectedHashes = manifest.value.expected_tx_hashes
      
      if (!expectedHashes || expectedHashes.length === 0) {
        error.value = 'Manifest has no expected transaction hashes. Cannot sync chunks.'
        loading.value = false
        return
      }
      
      syncProgress.value.total = expectedHashes.length
      syncProgress.value.fetched = 0
      syncProgress.value.bytes = 0
      
      const currentEndpoint = selectedRpcEndpoint.value === 'custom' ? customRpcEndpoint.value : selectedRpcEndpoint.value
      const isCustomEndpoint = selectedRpcEndpoint.value === 'custom' || 
                              (currentEndpoint && !currentEndpoint.includes('nimiqscan.com'))
      
      let delayBetweenRequests
      let maxRequestsPerSecond
      
      if (devSyncDelay.value !== null && devSyncDelay.value >= 0) {
        delayBetweenRequests = devSyncDelay.value
        maxRequestsPerSecond = 1000 / delayBetweenRequests
      } else {
        maxRequestsPerSecond = devSyncSpeed.value !== null && devSyncSpeed.value > 0 
          ? devSyncSpeed.value 
          : (isCustomEndpoint ? 10 : 50)
        delayBetweenRequests = 1000 / maxRequestsPerSecond
      }
      
      for (let i = 0; i < expectedHashes.length; i++) {
        const txHash = expectedHashes[i]
        const requestStartTime = Date.now()
        
        try {
          const tx = await rpcClient.getTransactionByHash(txHash)
          const requestDuration = Date.now() - requestStartTime
          
          const shouldRateLimit = (devSyncSpeed.value !== null || devSyncDelay.value !== null) || !isCustomEndpoint
          if (shouldRateLimit && i < expectedHashes.length - 1) {
            const minDelay = delayBetweenRequests
            if (requestDuration < minDelay) {
              const waitTime = minDelay - requestDuration
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
          }
          
          syncProgress.value.fetched = i + 1
          updateEstimatedTime()
          
          const txData = tx.recipientData || tx.data || ''
          
          if (!txData) {
            console.warn(`Transaction ${txHash} has no data field`)
            continue
          }
          
          const chunk = parseChunkFromTxData(txData)
          
          if (!chunk) {
            console.warn(`Failed to parse chunk from transaction ${txHash}`)
            continue
          }
          
          if (chunk.gameID !== manifest.value.game_id) {
            console.warn(`Chunk game ID ${chunk.gameID} doesn't match manifest game ID ${manifest.value.game_id}`)
            continue
          }
          
          chunks.set(chunk.chunkIdx, chunk)
          
          let bytes = 0
          for (const c of chunks.values()) {
            bytes += c.length
          }
          syncProgress.value.bytes = bytes
          
        } catch (err) {
          console.warn(`Failed to fetch transaction ${txHash}:`, err)
          syncProgress.value.fetched = i + 1
          updateEstimatedTime()
        }
      }

      syncProgress.value.fetched = syncProgress.value.total
      
      if (chunks.size === 0) {
        error.value = 'No chunks found. Transactions may not be confirmed yet or RPC endpoint may be unavailable.'
        loading.value = false
        return
      }

      if (chunks.size < totalChunks) {
        error.value = `Only found ${chunks.size} of ${totalChunks} expected chunks. Some transactions may not be confirmed yet.`
        loading.value = false
        return
      }

      const sortedChunks = Array.from(chunks.values())
        .sort((a, b) => a.chunkIdx - b.chunkIdx)

      const reconstructed = new Uint8Array(manifest.value.total_size)
      let offset = 0
      for (const chunk of sortedChunks) {
        reconstructed.set(chunk.data.slice(0, chunk.length), offset)
        offset += chunk.length
      }

      fileData.value = reconstructed
      
      if (chunks.size === totalChunks) {
        error.value = null
        await verifyFileInternal()
        
        if (verified.value) {
          await saveToCache(manifest.value, fileData.value)
        }
      }
    } catch (err) {
      error.value = err.message || 'Failed to sync chunks from blockchain'
      console.error('Sync error:', err)
    } finally {
      loading.value = false
    }
  }

  async function verifyFileInternal() {
    if (!fileData.value || !manifest.value) return
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', fileData.value)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      
      verified.value = hashHex === manifest.value.sha256.toLowerCase()
      
      if (!verified.value) {
        error.value = `SHA256 mismatch! Expected ${manifest.value.sha256}, got ${hashHex}`
      }
    } catch (err) {
      error.value = `Failed to verify file: ${err.message}`
      verified.value = false
    }
  }

  async function verifyFile() {
    await verifyFileInternal()
  }

  function downloadFile() {
    if (!fileData.value || !manifest.value) return
    
    const blob = new Blob([fileData.value], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = manifest.value.filename || 'downloaded-file'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    loading,
    error,
    verified,
    fileData,
    syncProgress,
    estimatedTimeRemaining,
    loadedFromCache,
    syncProgressPercent,
    syncChunks,
    verifyFile,
    downloadFile
  }
}
