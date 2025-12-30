<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Header -->
    <div class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-white">🎮 Nimiq DOS Games Onchain</h1>
        <p class="mt-2 text-gray-400">Download DOS games from the blockchain and play them in your browser!</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Manifest Selection -->
      <div v-if="manifests.length > 0" class="mb-6 bg-gray-800 rounded-lg border border-gray-700 p-4">
        <label class="block text-sm font-medium text-gray-300 mb-2">Select Manifest</label>
        <select
          v-model="selectedManifestName"
          @change="loadManifest"
          class="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
        >
          <option v-for="m in manifests" :key="m.name" :value="m.name">
            {{ m.name }} (Game ID: {{ m.game_id }}, {{ formatBytes(m.total_size) }}, {{ m.tx_count.toLocaleString() }} tx)
          </option>
        </select>
      </div>

      <!-- Action Buttons -->
      <div class="mb-8 flex flex-wrap gap-3">
        <button
          @click="loadManifestsList"
          :disabled="loading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Refresh Manifests
        </button>
        <button
          @click="syncChunks"
          :disabled="!manifest || loading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sync Chunks
        </button>
        <button
          @click="downloadFile"
          :disabled="!verified || loading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download File
        </button>
        <button
          @click="runGame"
          :disabled="!verified || loading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Run Game in Browser
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 rounded-md bg-red-900/50 border border-red-700 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-200">Error</h3>
            <div class="mt-2 text-sm text-red-300">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid: Manifest + DOS side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 mb-6">
        <!-- Manifest Card -->
        <div v-if="manifest" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Manifest</h2>
          <dl class="space-y-2">
            <div>
              <dt class="text-xs font-medium text-gray-400">Game ID</dt>
              <dd class="mt-0.5 text-sm text-white font-mono">{{ manifest.game_id }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Filename</dt>
              <dd class="mt-0.5 text-sm text-white">{{ manifest.filename }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Total Size</dt>
              <dd class="mt-0.5 text-sm text-white">{{ formatBytes(manifest.total_size) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Chunks</dt>
              <dd class="mt-0.5 text-sm text-white">{{ Math.ceil(manifest.total_size / manifest.chunk_size).toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">SHA256</dt>
              <dd class="mt-0.5 text-xs text-white font-mono break-all">{{ manifest.sha256 }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Sender Address</dt>
              <dd class="mt-0.5 text-xs text-white font-mono break-all">{{ manifest.sender_address }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Network</dt>
              <dd class="mt-0.5 text-sm text-white">{{ manifest.network }}</dd>
            </div>
            <div v-if="manifest.expected_tx_hashes && manifest.expected_tx_hashes.length > 0">
              <dt class="text-xs font-medium text-gray-400">Expected Transactions</dt>
              <dd class="mt-0.5 text-sm text-white">{{ manifest.expected_tx_hashes.length.toLocaleString() }}</dd>
              <details class="mt-1">
                <summary class="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300">Show Transaction Hashes</summary>
                <div class="mt-2 max-h-40 overflow-y-auto bg-gray-900 rounded p-2">
                  <ul class="space-y-0.5">
                    <li v-for="(hash, idx) in manifest.expected_tx_hashes" :key="idx" class="text-xs font-mono text-gray-300 break-all">
                      {{ hash }}
                    </li>
                  </ul>
                </div>
              </details>
            </div>
          </dl>

          <!-- Sync Progress (smaller, under manifest) -->
          <div v-if="syncProgress.total > 0" class="mt-4 pt-4 border-t border-gray-700">
            <h3 class="text-sm font-semibold text-white mb-2">Sync Progress</h3>
            <div class="space-y-2">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-400">Chunks</span>
                  <span class="text-white font-medium">{{ syncProgress.fetched.toLocaleString() }} / {{ syncProgress.total.toLocaleString() }}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: syncProgressPercent + '%' }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-400">Bytes</span>
                  <span class="text-white font-medium">{{ formatBytes(syncProgress.bytes) }} / {{ formatBytes(manifest?.total_size || 0) }}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div
                    class="bg-green-600 h-2 rounded-full transition-all duration-300"
                    :style="{ width: manifest ? (syncProgress.bytes / manifest.total_size * 100) + '%' : '0%' }"
                  ></div>
                </div>
              </div>
              <div class="text-center pt-1">
                <span class="text-lg font-bold text-white">{{ Math.round(syncProgressPercent) }}%</span>
                <span class="text-xs text-gray-400 ml-1">Complete</span>
              </div>
            </div>
          </div>

          <!-- File Verification (smaller, under sync progress) -->
          <div v-if="verified && !error" class="mt-3 pt-3 border-t border-gray-700">
            <div class="flex items-center">
              <svg class="h-4 w-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <div>
                <div class="text-xs font-medium text-green-200">File Verified</div>
                <div class="text-xs text-green-300">SHA256 matches manifest</div>
              </div>
            </div>
          </div>
        </div>

        <!-- DOS Container -->
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 class="text-xl font-semibold text-white mb-4">DOS Emulator</h2>
          <div ref="gameContainer" class="bg-black rounded w-full" style="min-height: 400px; display: block; aspect-ratio: 4/3;"></div>
          <div v-if="!gameReady && verified" class="text-center py-8 text-gray-400">
            <p class="mb-4">Ready to Run</p>
            <p class="text-sm mb-4">Click "Run Game in Browser" to start the DOS emulator</p>
            <p class="text-xs text-gray-500">The game will run directly in your browser</p>
          </div>
          <div v-else-if="!gameReady && !verified" class="text-center py-8 text-gray-500">
            <p>Load and verify a manifest file to enable DOS emulator</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const manifest = ref(null)
const manifests = ref([])
const selectedManifestName = ref(null)
const loading = ref(false)
const error = ref(null)
const verified = ref(false)
const fileData = ref(null)
const syncProgress = ref({ fetched: 0, total: 0, bytes: 0 })
const gameReady = ref(false)
const gameContainer = ref(null)
const dosRuntime = ref(null)

const syncProgressPercent = computed(() => {
  if (syncProgress.value.total === 0) return 0
  return (syncProgress.value.fetched / syncProgress.value.total) * 100
})

// Use backend URL directly - defaults to http://localhost:8080/api
// Can be overridden with VITE_API_BASE environment variable at build time
// For Docker: set VITE_API_BASE=http://backend:8080/api in .env or docker-compose
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'

async function loadManifestsList() {
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${API_BASE}/manifests`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    manifests.value = data.manifests || []
    
    // Auto-select first manifest if none selected
    if (manifests.value.length > 0 && !selectedManifestName.value) {
      selectedManifestName.value = manifests.value[0].name
      await loadManifest()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function loadManifest() {
  if (!selectedManifestName.value) {
    error.value = "No manifest selected"
    return
  }
  
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${API_BASE}/manifest?name=${encodeURIComponent(selectedManifestName.value)}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    manifest.value = await response.json()
    // Ensure selectedManifestName is set (in case it wasn't set before)
    if (!selectedManifestName.value && manifest.value) {
      // Try to derive from filename or use a default
      const nameFromFilename = manifest.value.filename ? manifest.value.filename.replace(/\.(zip|bin|img|exe|com|bat)$/i, '') : 'default'
      selectedManifestName.value = nameFromFilename
    }
    // Reset state when loading new manifest
    fileData.value = null
    verified.value = false
    syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
    gameReady.value = false
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function syncChunks() {
  if (!manifest.value) {
    error.value = 'No manifest loaded. Please select and load a manifest first.'
    return
  }

  loading.value = true
  error.value = null
  syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
  fileData.value = null
  verified.value = false

  try {
    // Ensure we have a manifest name - use selectedManifestName or try to derive from manifest list
    let manifestName = selectedManifestName.value
    if (!manifestName && manifests.value.length > 0) {
      // Try to find matching manifest by game_id
      const matchingManifest = manifests.value.find(m => m.game_id === manifest.value.game_id)
      if (matchingManifest) {
        manifestName = matchingManifest.name
        selectedManifestName.value = manifestName
      }
    }
    
    if (!manifestName) {
      error.value = 'No manifest name available. Please select a manifest from the dropdown first.'
      return
    }
    
    // First check status to see if chunks are available
    const manifestParam = `&manifest=${encodeURIComponent(manifestName)}`
    const statusResponse = await fetch(`${API_BASE}/status?${manifestParam}`)
    if (!statusResponse.ok) throw new Error(`Failed to get status: HTTP ${statusResponse.status}`)
    const status = await statusResponse.json()
    
    if (status.chunksStored === 0) {
      error.value = `No chunks indexed yet. Backend has indexed ${status.chunksStored} chunks. The indexer is fetching transactions. If you just uploaded, wait for the transactions to be confirmed and indexed.`
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
        `${API_BASE}/chunks?game_id=${manifest.value.game_id}&from=${from}&limit=${limit}${manifestParam}`
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
      error.value = 'No chunks found in database. The backend indexer may still be fetching transactions.'
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
      
      // Automatically verify the file after successful sync
      await verifyFile()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function verifyFile() {
  if (!fileData.value || !manifest.value) return

  // Don't set loading to true if called automatically from syncChunks
  // (it's already set to true there)
  const wasLoading = loading.value
  if (!wasLoading) {
    loading.value = true
  }
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
    // Only set loading to false if we set it to true
    if (!wasLoading) {
      loading.value = false
    }
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

// Helper function to load JS-DOS library dynamically with fallback
function loadDosLibrary() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof Dos !== 'undefined') {
      resolve()
      return
    }
    
    // Check if script is already being loaded
    if (document.querySelector('script[src*="js-dos"]')) {
      // Script tag exists, wait for it to load
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (typeof Dos !== 'undefined') {
          clearInterval(checkInterval)
          resolve()
        } else if (Date.now() - startTime > 10000) {
          clearInterval(checkInterval)
          reject(new Error('JS-DOS library failed to load from script tag'))
        }
      }, 100)
      return
    }
    
    // Try multiple CDN sources (js-dos.com CDN seems to be down, using jsdelivr as primary)
    const cdnSources = [
      'https://cdn.jsdelivr.net/npm/js-dos@6.22.60/dist/js-dos.js',
      'https://unpkg.com/js-dos@6.22.60/dist/js-dos.js',
      'https://js-dos.com/cdn/6.22/js-dos.js' // Fallback (may be 404)
    ]
    
    let currentIndex = 0
    
    const tryLoadScript = (url) => {
      return new Promise((scriptResolve, scriptReject) => {
        const script = document.createElement('script')
        script.src = url
        script.async = true
        script.crossOrigin = 'anonymous'
        
        script.onload = () => {
          // Wait for Dos to be available
          const startTime = Date.now()
          const checkInterval = setInterval(() => {
            if (typeof Dos !== 'undefined') {
              clearInterval(checkInterval)
              scriptResolve()
            } else if (Date.now() - startTime > 5000) {
              clearInterval(checkInterval)
              scriptReject(new Error('JS-DOS library loaded but Dos object not found'))
            }
          }, 50)
        }
        
        script.onerror = () => {
          scriptReject(new Error(`Failed to load from ${url}`))
        }
        
        document.head.appendChild(script)
      })
    }
    
    // Try loading from each CDN source
    const attemptLoad = async () => {
      if (currentIndex >= cdnSources.length) {
        reject(new Error('Failed to load JS-DOS library from all CDN sources. Please check your internet connection.'))
        return
      }
      
      try {
        await tryLoadScript(cdnSources[currentIndex])
        resolve()
      } catch (err) {
        console.warn(`Failed to load JS-DOS from ${cdnSources[currentIndex]}:`, err.message)
        // Remove failed script
        const failedScript = document.querySelector(`script[src="${cdnSources[currentIndex]}"]`)
        if (failedScript) {
          failedScript.remove()
        }
        currentIndex++
        attemptLoad()
      }
    }
    
    attemptLoad()
  })
}

async function runGame() {
  if (!verified.value || !fileData.value || !manifest.value) return

  loading.value = true
  error.value = null

  try {
    // Load JS-DOS library dynamically
    await loadDosLibrary()
    // Check if file is a ZIP
    const isZip = manifest.value.filename.toLowerCase().endsWith('.zip') || 
                  (fileData.value.length >= 2 && fileData.value[0] === 0x50 && fileData.value[1] === 0x4B) // PK header

    let gameFiles = {}
    let gameExecutable = null

    if (isZip) {
      // Extract ZIP file
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(fileData.value)
      
      // Extract all files
      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array')
          gameFiles[filename] = content
          
          // Find game executable (.exe, .com, .bat)
          const lowerName = filename.toLowerCase()
          if (!gameExecutable && (lowerName.endsWith('.exe') || lowerName.endsWith('.com') || lowerName.endsWith('.bat'))) {
            gameExecutable = filename
          }
        }
      }
    } else {
      // Single file - treat as game file
      gameFiles[manifest.value.filename] = fileData.value
      gameExecutable = manifest.value.filename
    }

    // Check if we have an IMG file
    const imgFile = Object.keys(gameFiles).find(f => f.toLowerCase().endsWith('.img'))
    
    if (imgFile && !gameExecutable) {
      // For IMG files, set default executable based on filename
      const imgLower = imgFile.toLowerCase()
      if (imgLower.includes('digger')) {
        gameExecutable = 'DIGGER.EXE'
      } else {
        gameExecutable = 'GAME.EXE' // Generic, will be found inside mounted IMG
      }
    }

    if (!gameExecutable) {
      // Try to find any executable
      const exeFiles = Object.keys(gameFiles).filter(f => 
        f.toLowerCase().endsWith('.exe') || 
        f.toLowerCase().endsWith('.com') || 
        f.toLowerCase().endsWith('.bat')
      )
      if (exeFiles.length > 0) {
        gameExecutable = exeFiles[0]
      } else if (!imgFile) {
        throw new Error('No game executable found. ZIP should contain .exe, .com, .bat, or .img files.')
      }
    }

    // Initialize JS-DOS
    if (!gameContainer.value) {
      throw new Error('Game container not found')
    }

    // Clear container and create a canvas element for JS-DOS
    gameContainer.value.innerHTML = ''
    
    // JS-DOS requires a canvas element to render to
    const canvas = document.createElement('canvas')
    canvas.id = 'jsdos-canvas'
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.display = 'block'
    canvas.style.maxWidth = '100%'
    gameContainer.value.appendChild(canvas)
    
    gameReady.value = true
    
    console.log('Initializing JS-DOS, Dos available:', typeof Dos !== 'undefined')
    console.log('Container element:', gameContainer.value)
    console.log('Canvas element created:', canvas)
    
    // Initialize JS-DOS using Dos API
    // Dos() returns a promise that resolves to a dosbox instance
    // JS-DOS uses a Command Interface (CI) for file operations
    console.log('Dos promise created, waiting for initialization...')
    
    let dosbox
    let ci = null
    
    // Initialize DOS using the .ready() callback pattern
    const initDos = async (options) => {
      // Use the canvas element we created
      const canvasElement = gameContainer.value.querySelector('#jsdos-canvas')
      if (!canvasElement || canvasElement.tagName !== 'CANVAS') {
        throw new Error('Canvas element not found or invalid. JS-DOS requires a canvas element.')
      }
      console.log('Initializing Dos with canvas element:', canvasElement)
      
      // JS-DOS uses .ready() callback that provides fs and main
      return new Promise((resolve, reject) => {
        const dosboxPromise = Dos(canvasElement, options)
        
        dosboxPromise.ready((fs, main) => {
          console.log('JS-DOS ready callback called')
          console.log('fs:', fs)
          console.log('main:', main)
          console.log('fs methods:', fs ? Object.keys(fs) : 'null')
          
          // Store fs and main for later use
          dosbox = { fs, main, ready: dosboxPromise.ready.bind(dosboxPromise) }
          
          // Try to get CI from fs if available
          if (fs && typeof fs.fsWriteFile === 'function') {
            ci = fs
            console.log('Using fs as CI')
          } else if (fs && fs.ci) {
            ci = fs.ci
            console.log('CI found in fs.ci')
          }
          
          resolve({ dosbox, ci, fs, main })
        }).catch((err) => {
          console.error('JS-DOS initialization failed:', err)
          reject(err)
        })
      })
    }
    
    let fs, main
    try {
      // Try official js-dos.com CDN first
      const result = await initDos({
        wdosboxUrl: 'https://js-dos.com/cdn/6.22/wdosbox.js',
        wdosboxWasmUrl: 'https://js-dos.com/cdn/6.22/wdosbox.wasm',
      })
      dosbox = result.dosbox
      ci = result.ci
      fs = result.fs
      main = result.main
      console.log('Successfully initialized with js-dos.com CDN')
    } catch (err) {
      console.warn('js-dos.com CDN failed, trying unpkg:', err)
      // Fallback to unpkg
      try {
        const result = await initDos({
          wdosboxUrl: 'https://unpkg.com/js-dos@6.22.60/dist/wdosbox.js',
          wdosboxWasmUrl: 'https://unpkg.com/js-dos@6.22.60/dist/wdosbox.wasm',
        })
        dosbox = result.dosbox
        ci = result.ci
        fs = result.fs
        main = result.main
        console.log('Successfully initialized with unpkg CDN')
      } catch (err2) {
        console.error('Both CDNs failed:', err2)
        throw new Error(`Failed to initialize JS-DOS: ${err2?.message || String(err2)}`)
      }
    }

    // Log what we have available
    console.log('Initialization complete:')
    console.log('dosbox:', dosbox)
    console.log('fs:', fs)
    console.log('main:', main)
    console.log('ci:', ci)
    
    if (!fs || !main) {
      throw new Error('JS-DOS initialization incomplete: fs or main not available')
    }
    
    // Check if we have an IMG file that needs mounting (imgFile already declared above)
    if (imgFile) {
      // Handle IMG disk image
      const imgContent = gameFiles[imgFile]
      const imgPath = imgFile.replace(/\\/g, '/').toUpperCase()
      
      console.log('Writing IMG file:', imgPath, 'Size:', imgContent.length)
      
      // Write IMG file to filesystem using fs from .ready() callback
      try {
        if (fs && typeof fs.createFile === 'function') {
          fs.createFile(imgPath, imgContent)
          console.log('IMG file written successfully via fs.createFile')
        } else if (fs && typeof fs.fsWriteFile === 'function') {
          await fs.fsWriteFile(imgPath, imgContent)
          console.log('IMG file written successfully via fs.fsWriteFile')
        } else {
          throw new Error(`No file writing method available for IMG file. fs methods: ${fs ? Object.keys(fs).join(', ') : 'null'}`)
        }
      } catch (err) {
        console.error('Error writing IMG file:', err)
        throw new Error(`Failed to write IMG file: ${err?.message || String(err)}`)
      }
      
      // Create AUTOEXEC.BAT to mount IMG and run executable
      if (!main) {
        throw new Error('main function not available from JS-DOS initialization')
      }
      
      const exeInImg = (gameExecutable.split('/').pop() || gameExecutable.split('\\').pop()).toUpperCase()
      console.log('Creating AUTOEXEC.BAT for IMG execution, executable:', exeInImg)
      
      // Create AUTOEXEC.BAT with mount and run commands
      // Parameters: -size 512,8,2,384 (from DiggerRem instructions)
      const batchContent = `@echo off\nimgmount c ${imgPath} -size 512,8,2,384\nc:\n${exeInImg}\n`
      
      // Write AUTOEXEC.BAT using fs
      if (fs && typeof fs.createFile === 'function') {
        fs.createFile('AUTOEXEC.BAT', batchContent)
      } else if (fs && typeof fs.fsWriteFile === 'function') {
        await fs.fsWriteFile('AUTOEXEC.BAT', batchContent)
      } else {
        throw new Error('No file writing method available for AUTOEXEC.BAT')
      }
      
      console.log('Created AUTOEXEC.BAT, calling main() to start DOSBox')
      // Call main() - DOSBox will start and AUTOEXEC.BAT will run automatically
      main(['-c', 'AUTOEXEC.BAT'])
      console.log('Called main() for IMG')
    } else {
      // Regular file mounting
      console.log('Mounting regular files, count:', Object.keys(gameFiles).length)
      
      // Mount all game files using Command Interface or dosbox
      // Log filesystem structure for first file only
      let loggedFsStructure = false
      for (const [filename, content] of Object.entries(gameFiles)) {
        // Normalize path (use forward slashes, uppercase for DOS)
        const normalizedPath = filename.replace(/\\/g, '/').toUpperCase()
        console.log('Writing file:', normalizedPath, 'Size:', content.length)
        
        if (!loggedFsStructure) {
          console.log('dosbox.fs structure:', dosbox?.fs)
          console.log('dosbox.fs methods:', dosbox?.fs ? Object.keys(dosbox.fs) : 'null')
          if (dosbox?.fs?.fs) {
            console.log('dosbox.fs.fs:', dosbox.fs.fs)
            console.log('dosbox.fs.fs methods:', Object.keys(dosbox.fs.fs))
            // Check for common filesystem methods
            console.log('dosbox.fs.fs.writeFile exists:', typeof dosbox.fs.fs.writeFile)
            console.log('dosbox.fs.fs.createFile exists:', typeof dosbox.fs.fs.createFile)
            console.log('dosbox.fs.fs.writeFileSync exists:', typeof dosbox.fs.fs.writeFileSync)
            console.log('dosbox.fs.fs.createDataFile exists:', typeof dosbox.fs.fs.createDataFile)
          }
          loggedFsStructure = true
        }
        
        try {
          // Use fs from .ready() callback
          if (fs && typeof fs.createFile === 'function') {
            // JS-DOS fs.createFile() method
            fs.createFile(normalizedPath, content)
            console.log('File written via fs.createFile')
          } else if (fs && typeof fs.fsWriteFile === 'function') {
            // CI fsWriteFile method
            await fs.fsWriteFile(normalizedPath, content)
            console.log('File written via fs.fsWriteFile')
          } else {
            throw new Error(`No file writing method available for ${normalizedPath}. fs methods: ${fs ? Object.keys(fs).join(', ') : 'null'}`)
          }
        } catch (err) {
          console.error('Error writing file:', normalizedPath, err)
          throw new Error(`Failed to write file ${normalizedPath}: ${err?.message || String(err)}`)
        }
      }

      // Run the game executable
      const command = gameExecutable.replace(/\\/g, '/').toUpperCase()
      console.log('Running executable:', command)
      
      if (!main) {
        throw new Error('main function not available from JS-DOS initialization')
      }
      
      try {
        // Create AUTOEXEC.BAT to auto-run the game
        console.log('Creating AUTOEXEC.BAT with command:', command)
        const batchContent = `@echo off\n${command}\n`
        
        // Write AUTOEXEC.BAT using fs
        if (fs && typeof fs.createFile === 'function') {
          fs.createFile('AUTOEXEC.BAT', batchContent)
        } else if (fs && typeof fs.fsWriteFile === 'function') {
          await fs.fsWriteFile('AUTOEXEC.BAT', batchContent)
        } else {
          throw new Error('No file writing method available for AUTOEXEC.BAT')
        }
        
        console.log('Created AUTOEXEC.BAT, calling main() to start DOSBox')
        // Call main() - DOSBox will start and AUTOEXEC.BAT will run automatically
        main(['-c', 'AUTOEXEC.BAT'])
        console.log('Called main() - DOSBox should start and run AUTOEXEC.BAT')
      } catch (err) {
        console.error('Error running executable:', err)
        throw new Error(`Failed to run executable: ${err?.message || String(err)}`)
      }
    }

    dosRuntime.value = dosbox
    console.log('Game started successfully')

  } catch (err) {
    const errorMsg = err?.message || String(err) || 'Unknown error'
    error.value = `Failed to run game: ${errorMsg}`
    gameReady.value = false
    console.error('Game execution error:', err)
    console.error('Error stack:', err?.stack)
  } finally {
    loading.value = false
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
  // Auto-load manifests list on mount
  loadManifestsList()
})
</script>
