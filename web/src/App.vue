<template>
  <div id="app">
    <h1>🎮 Nimiq DOOM Onchain</h1>
    <p>Download DOOM from the blockchain and play it in your browser!</p>

    <div class="controls">
      <button @click="loadManifest" :disabled="loading">Load Manifest</button>
      <button @click="syncChunks" :disabled="!manifest || loading">Sync Chunks</button>
      <button @click="verifyFile" :disabled="!fileData || loading">Verify SHA256</button>
      <button @click="downloadFile" :disabled="!verified || loading">Download File</button>
      <button @click="runDoom" :disabled="!verified || loading">Run DOOM</button>
    </div>

    <div v-if="manifest" class="status">
      <h2>Manifest</h2>
      <p><strong>Game ID:</strong> {{ manifest.game_id }}</p>
      <p><strong>Filename:</strong> {{ manifest.filename }}</p>
      <p><strong>Total Size:</strong> {{ formatBytes(manifest.total_size) }}</p>
      <p><strong>Chunks:</strong> {{ Math.ceil(manifest.total_size / manifest.chunk_size) }}</p>
      <p><strong>SHA256:</strong> <code>{{ manifest.sha256 }}</code></p>
      <p><strong>Sender:</strong> {{ manifest.sender_address }}</p>
      <p><strong>Network:</strong> {{ manifest.network }}</p>
      <div v-if="manifest.expected_tx_hashes && manifest.expected_tx_hashes.length > 0">
        <p><strong>Expected Transactions:</strong> {{ manifest.expected_tx_hashes.length }}</p>
        <details style="margin-top: 0.5rem;">
          <summary style="cursor: pointer; color: #4a9eff;">Show Transaction Hashes</summary>
          <ul style="margin-top: 0.5rem; margin-left: 1.5rem; font-family: monospace; font-size: 0.85em;">
            <li v-for="(hash, idx) in manifest.expected_tx_hashes" :key="idx">
              <code>{{ hash }}</code>
            </li>
          </ul>
        </details>
      </div>
    </div>

    <div v-if="syncProgress.total > 0" class="status">
      <h2>Sync Progress</h2>
      <p>Chunks: {{ syncProgress.fetched }} / {{ syncProgress.total }}</p>
      <p>Bytes: {{ formatBytes(syncProgress.bytes) }} / {{ formatBytes(manifest?.total_size || 0) }}</p>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: syncProgressPercent + '%' }">
          {{ Math.round(syncProgressPercent) }}%
        </div>
      </div>
    </div>

    <div v-if="error" class="error">
      <strong>Error:</strong> {{ error }}
    </div>

    <div v-if="verified" class="success">
      ✅ File verified! SHA256 matches manifest.
    </div>

    <div v-if="verified && !doomReady" class="info">
      <p><strong>DOOM Setup Required</strong></p>
      <p>To run DOOM, you need to provide the DOOM executable bundle (DOOM.EXE + DOOM1.WAD).</p>
      <p>Due to copyright restrictions, these files are not included in this repository.</p>
      <p>You can obtain the shareware version of DOOM from id Software's website or use your own copy.</p>
      <p>Once you have the files, place them in the <code>public/doom/</code> directory:</p>
      <ul style="margin-left: 2rem; margin-top: 0.5rem;">
        <li><code>public/doom/DOOM.EXE</code></li>
        <li><code>public/doom/DOOM1.WAD</code></li>
      </ul>
    </div>

    <div v-if="doomReady" class="doom-container">
      <div ref="doomContainer"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const manifest = ref(null)
const loading = ref(false)
const error = ref(null)
const verified = ref(false)
const fileData = ref(null)
const syncProgress = ref({ fetched: 0, total: 0, bytes: 0 })
const doomReady = ref(false)
const doomContainer = ref(null)

const syncProgressPercent = computed(() => {
  if (syncProgress.value.total === 0) return 0
  return (syncProgress.value.fetched / syncProgress.value.total) * 100
})

// Use backend URL directly - defaults to http://localhost:8080/api
// Can be overridden with VITE_API_BASE environment variable at build time
// For Docker: set VITE_API_BASE=http://backend:8080/api in .env or docker-compose
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'

async function loadManifest() {
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${API_BASE}/manifest`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    manifest.value = await response.json()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function syncChunks() {
  if (!manifest.value) return

  loading.value = true
  error.value = null
  syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
  fileData.value = null
  verified.value = false

  try {
    // First check status to see if chunks are available
    const statusResponse = await fetch(`${API_BASE}/status`)
    if (!statusResponse.ok) throw new Error(`Failed to get status: HTTP ${statusResponse.status}`)
    const status = await statusResponse.json()
    
    if (status.chunksStored === 0) {
      error.value = `No chunks indexed yet. Backend has indexed ${status.chunksStored} chunks. The indexer is scanning blocks (current height: ${status.latestIndexedHeight}). If you just uploaded, wait for the transactions to be confirmed and indexed.`
      if (status.missingTxHashes && status.missingTxHashes.length > 0) {
        error.value += ` Missing ${status.missingTxHashes.length} expected transactions.`
      }
      return
    }

    const totalChunks = Math.ceil(manifest.value.total_size / manifest.value.chunk_size)
    const chunks = new Map()
    let from = 0
    const limit = 1000

    while (chunks.size < totalChunks) {
      const response = await fetch(
        `${API_BASE}/chunks?game_id=${manifest.value.game_id}&from=${from}&limit=${limit}`
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      if (data.items.length === 0) break

      for (const item of data.items) {
        chunks.set(item.idx, item)
      }

      syncProgress.value.fetched = chunks.size
      syncProgress.value.total = totalChunks

      // Calculate bytes
      let bytes = 0
      for (const chunk of chunks.values()) {
        bytes += chunk.len
      }
      syncProgress.value.bytes = bytes

      if (data.items.length < limit) break
      from = data.items[data.items.length - 1].idx + 1
    }

    if (chunks.size === 0) {
      error.value = 'No chunks found in database. The backend indexer may still be scanning blocks.'
      return
    }

    if (chunks.size < totalChunks) {
      error.value = `Only found ${chunks.size} of ${totalChunks} expected chunks. Some chunks may not be indexed yet.`
    }

    // Reconstruct file
    const sortedChunks = Array.from(chunks.values())
      .sort((a, b) => a.idx - b.idx)

    const reconstructed = new Uint8Array(manifest.value.total_size)
    let offset = 0
    for (const chunk of sortedChunks) {
      const chunkData = Uint8Array.from(atob(chunk.data_base64), c => c.charCodeAt(0))
      reconstructed.set(chunkData.slice(0, chunk.len), offset)
      offset += chunk.len
    }

    fileData.value = reconstructed
    
    if (chunks.size === totalChunks) {
      // All chunks found, clear any previous error
      error.value = null
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function verifyFile() {
  if (!fileData.value || !manifest.value) return

  loading.value = true
  error.value = null

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData.value)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    verified.value = hashHex === manifest.value.sha256

    if (!verified.value) {
      error.value = `SHA256 mismatch! Expected: ${manifest.value.sha256}, Got: ${hashHex}`
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function downloadFile() {
  if (!fileData.value || !manifest.value || !verified.value) return

  // Create a blob from the file data
  const blob = new Blob([fileData.value], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  
  // Create a temporary anchor element and trigger download
  const a = document.createElement('a')
  a.href = url
  a.download = manifest.value.filename || 'downloaded-file.bin'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  // Clean up the object URL
  URL.revokeObjectURL(url)
}

async function runDoom() {
  if (!verified.value || !fileData.value) return

  // Check if DOOM files are available
  try {
    const doomExeResponse = await fetch('/doom/DOOM.EXE')
    const doomWadResponse = await fetch('/doom/DOOM1.WAD')
    
    if (!doomExeResponse.ok || !doomWadResponse.ok) {
      doomReady.value = false
      error.value = 'DOOM executable files not found. Please place DOOM.EXE and DOOM1.WAD in public/doom/'
      return
    }

    doomReady.value = true
    error.value = null

    // Load JS-DOS and mount the WAD file
    // For MVP, we'll show a placeholder since JS-DOS integration requires additional setup
    if (doomContainer.value) {
      const fileSize = formatBytes(fileData.value.length)
      const sha256 = manifest.value.sha256
      doomContainer.value.innerHTML = `
        <div class="doom-placeholder">
          <h2>DOOM Runtime</h2>
          <p>JS-DOS integration placeholder</p>
          <p>To complete the integration:</p>
          <ol style="text-align: left; display: inline-block; margin-top: 1rem;">
            <li>Download js-dos from <a href="https://js-dos.com" target="_blank" style="color: #4a9eff;">js-dos.com</a></li>
            <li>Place js-dos files in <code>public/jsdos/</code></li>
            <li>Mount DOOM.EXE and the reconstructed DOOM1.WAD file</li>
            <li>Initialize the DOS emulator</li>
          </ol>
          <p style="margin-top: 1rem;">
            <strong>Reconstructed WAD file:</strong> ${fileSize} bytes<br>
            <strong>SHA256:</strong> <code>${sha256}</code>
          </p>
        </div>
      `
    }
  } catch (err) {
    error.value = `Failed to load DOOM: ${err.message}`
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

onMounted(() => {
  // Auto-load manifest on mount
  loadManifest()
})
</script>
