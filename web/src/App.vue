<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Header -->
    <div class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-white">🎮 Nimiq DOS Games Onchain</h1>
            <p class="mt-1 text-sm text-gray-400">Download DOS games from the blockchain and play them in your browser!</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3">
            <!-- RPC Endpoint Selection -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-400 whitespace-nowrap">RPC:</label>
              <select
                v-model="selectedRpcEndpoint"
                @change="onRpcEndpointChange"
                class="text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 min-w-[200px]"
              >
                <option v-for="endpoint in rpcEndpoints" :key="endpoint.url" :value="endpoint.url">
                  {{ endpoint.name }}
                </option>
              </select>
              <input
                v-if="selectedRpcEndpoint === 'custom'"
                v-model="customRpcEndpoint"
                @blur="onCustomRpcEndpointChange"
                placeholder="https://rpc-mainnet.nimiqscan.com"
                class="text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 min-w-[200px]"
              />
            </div>
            <!-- Program Selection -->
            <div v-if="manifests.length > 0" class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-400 whitespace-nowrap">Program:</label>
              <select
                v-model="selectedManifestName"
                @change="loadManifest"
                class="text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 min-w-[200px]"
              >
                <option value="">-- Select --</option>
                <option v-for="m in manifests" :key="m.name" :value="m.name">
                  {{ m.name }}
                </option>
              </select>
              <button
                @click="loadManifestsList"
                :disabled="loading"
                class="inline-flex items-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh Programs"
              >
                <svg v-if="loading" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- How It Works Info -->
      <div class="mb-6 rounded-md bg-blue-900/30 border border-blue-700 p-4">
        <details class="cursor-pointer">
          <summary class="text-sm font-medium text-blue-200 hover:text-blue-100 flex items-center">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works
          </summary>
          <div class="mt-4 text-sm text-blue-100 space-y-3">
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">1. Storage on Blockchain</h4>
              <p class="text-blue-100/90">Programs are split into 64-byte chunks and stored as transaction data on the Nimiq blockchain. Each chunk contains a magic header, game ID, chunk index, and up to 51 bytes of program data.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">2. Download Program</h4>
              <p class="text-blue-100/90">When you click "Download Program", the app fetches all transaction chunks from the blockchain using the transaction hashes in the manifest. The chunks are reassembled in order to reconstruct the original file.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">3. Verification</h4>
              <p class="text-blue-100/90">After downloading, the reconstructed file is automatically verified using SHA256. The computed hash is compared with the hash stored in the manifest to ensure data integrity and authenticity.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">4. Run in Browser</h4>
              <p class="text-blue-100/90">Once verified, you can run the DOS program directly in your browser using JS-DOS (a JavaScript port of DOSBox). The program runs entirely client-side - no server required!</p>
            </div>
            <div class="pt-2 border-t border-blue-700/50">
              <p class="text-xs text-blue-200/80"><strong>Note:</strong> All data is stored permanently on the blockchain. Anyone can reconstruct and run these programs by downloading the manifest and syncing chunks from any Nimiq RPC endpoint.</p>
            </div>
          </div>
        </details>
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
        <div v-if="manifest" class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
          <div class="px-4 py-5 sm:px-6">
            <h2 class="text-xl font-semibold text-white">Program Info</h2>
          </div>
          <div class="px-4 py-5 sm:p-6">
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
            <div v-if="syncProgress.total > 0" class="mt-4 pt-4 border-t border-gray-700 dark:border-white/10">
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
              <div v-if="syncProgress.rate > 0" class="text-center pt-1">
                <span class="text-xs text-gray-400">Speed: </span>
                <span class="text-xs text-white font-medium">{{ syncProgress.rate.toFixed(1) }} tx/s</span>
                <span v-if="estimatedTimeRemaining !== null" class="text-xs text-gray-400 ml-2">• ETA: </span>
                <span v-if="estimatedTimeRemaining !== null" class="text-xs text-white font-medium">{{ formatTimeRemaining(estimatedTimeRemaining) }}</span>
              </div>
            </div>
            </div>

            <!-- File Verification (smaller, under sync progress) -->
            <div v-if="verified && !error" class="mt-3 pt-3 border-t border-gray-700 dark:border-white/10">
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
          <div class="px-4 py-4 sm:px-6">
            <!-- Download Program Button -->
            <button
              @click="syncChunks"
              :disabled="!manifest || loading"
              class="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Download Program
            </button>
          </div>
        </div>

        <!-- DOS Container -->
        <div class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
          <div class="px-4 py-5 sm:px-6">
            <h2 class="text-xl font-semibold text-white">DOS Emulator</h2>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <div ref="gameContainer" class="bg-black rounded w-full mb-4" style="min-height: 400px; display: block; aspect-ratio: 4/3;"></div>
            
            <div v-if="!gameReady && verified" class="text-center py-4 text-gray-400">
              <p class="text-sm">Ready to run. Click "Run Program" to start the DOS emulator.</p>
            </div>
            <div v-else-if="!gameReady && !verified" class="text-center py-4 text-gray-500">
              <p class="text-sm">Sync and verify a program to enable the DOS emulator</p>
            </div>
          </div>
          <div class="px-4 py-4 sm:px-6">
            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-3">
              <button
                @click="runGame"
                :disabled="!verified || loading"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Program
              </button>
              <button
                @click="downloadFile"
                :disabled="!verified || loading"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download File
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { NimiqRPC } from './nimiq-rpc.js'

const manifest = ref(null)
const manifests = ref([])
const selectedManifestName = ref(null)
const loading = ref(false)
const error = ref(null)
const verified = ref(false)
const fileData = ref(null)
const syncProgress = ref({ fetched: 0, total: 0, bytes: 0, rate: 0 })
const syncStartTime = ref(null)
const estimatedTimeRemaining = ref(null)
const gameReady = ref(false)
const gameContainer = ref(null)
const dosRuntime = ref(null)

// RPC endpoint configuration
const rpcEndpoints = ref([
  { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
  { name: 'Custom...', url: 'custom' }
])

const selectedRpcEndpoint = ref('https://rpc-mainnet.nimiqscan.com')
const customRpcEndpoint = ref('')
let rpcClient = new NimiqRPC(selectedRpcEndpoint.value)

const syncProgressPercent = computed(() => {
  if (syncProgress.value.total === 0) return 0
  return (syncProgress.value.fetched / syncProgress.value.total) * 100
})

// Calculate estimated time remaining and current rate
function updateEstimatedTime() {
  if (!syncStartTime.value || syncProgress.value.fetched === 0 || syncProgress.value.total === 0) {
    estimatedTimeRemaining.value = null
    syncProgress.value.rate = 0
    return
  }
  
  const elapsed = (Date.now() - syncStartTime.value) / 1000 // seconds
  const rate = syncProgress.value.fetched / elapsed // transactions per second
  syncProgress.value.rate = rate
  
  const remaining = syncProgress.value.total - syncProgress.value.fetched
  const secondsRemaining = remaining / rate
  
  if (secondsRemaining > 0 && isFinite(secondsRemaining)) {
    estimatedTimeRemaining.value = secondsRemaining
  } else {
    estimatedTimeRemaining.value = null
  }
}

function formatTimeRemaining(seconds) {
  if (!seconds || !isFinite(seconds)) return 'Calculating...'
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
}

// Manifest files are served as static files from /manifests/
// On GitHub Pages, this will be /nimiq-doom/manifests/ (base path is handled by Vite)
const MANIFESTS_BASE = import.meta.env.BASE_URL + 'manifests/'

function onRpcEndpointChange() {
  if (selectedRpcEndpoint.value !== 'custom') {
    rpcClient = new NimiqRPC(selectedRpcEndpoint.value)
  }
}

function onCustomRpcEndpointChange() {
  if (customRpcEndpoint.value) {
    selectedRpcEndpoint.value = customRpcEndpoint.value
    rpcClient = new NimiqRPC(customRpcEndpoint.value)
  }
}

async function loadManifestsList() {
  loading.value = true
  error.value = null
  try {
    // Try to fetch a list of manifest files
    // For now, we'll try to load common manifest names or scan a directory
    // Since we can't list files from static hosting, we'll try known names
    const knownManifests = ['digger', 'testfile', 'testbin']
    const loadedManifests = []
    
    for (const name of knownManifests) {
      try {
        const response = await fetch(`${MANIFESTS_BASE}${name}.json`)
        if (response.ok) {
          const manifestData = await response.json()
          loadedManifests.push({
            name: name,
            game_id: manifestData.game_id,
            filename: manifestData.filename,
            total_size: manifestData.total_size,
            chunk_size: manifestData.chunk_size || 51,
            network: manifestData.network,
            sender_address: manifestData.sender_address,
            tx_count: manifestData.expected_tx_hashes?.length || 0
          })
        }
      } catch (err) {
        // Skip if manifest doesn't exist
      }
    }
    
    manifests.value = loadedManifests
    
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
    error.value = "No program selected"
    return
  }
  
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${MANIFESTS_BASE}${selectedManifestName.value}.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load manifest`)
    manifest.value = await response.json()
    
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

// Parse chunk from transaction data
function parseChunkFromTxData(txData) {
  if (!txData || txData.length < 2) return null
  
  // Decode hex string to bytes
  const hexString = txData.startsWith('0x') ? txData.slice(2) : txData
  if (hexString.length % 2 !== 0) return null
  
  const data = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < hexString.length; i += 2) {
    data[i / 2] = parseInt(hexString.substr(i, 2), 16)
  }
  
  // Check minimum length
  if (data.length < 13) return null
  
  // Check magic bytes "DOOM"
  const magic = String.fromCharCode(data[0], data[1], data[2], data[3])
  if (magic !== 'DOOM') return null
  
  // Parse chunk header (little-endian)
  const gameID = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)
  const chunkIdx = data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24)
  const length = data[12]
  
  // Validate length
  if (length > 51 || data.length < 13 + length) return null
  
  // Extract chunk data
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

  if (!manifest.value.expected_tx_hashes || manifest.value.expected_tx_hashes.length === 0) {
    error.value = 'Manifest has no expected transaction hashes. Cannot sync chunks.'
    return
  }

  loading.value = true
  error.value = null
  syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
  syncStartTime.value = Date.now()
  estimatedTimeRemaining.value = null
  fileData.value = null
  verified.value = false

  try {
    const totalChunks = Math.ceil(manifest.value.total_size / manifest.value.chunk_size)
    const chunks = new Map()
    const expectedHashes = manifest.value.expected_tx_hashes
    
    syncProgress.value.total = expectedHashes.length
    
    // Rate limiting: public endpoints get rate limited, custom endpoints don't
    const currentEndpoint = selectedRpcEndpoint.value === 'custom' ? customRpcEndpoint.value : selectedRpcEndpoint.value
    const isCustomEndpoint = selectedRpcEndpoint.value === 'custom' || 
                            (currentEndpoint && !currentEndpoint.includes('nimiqscan.com'))
    const maxRequestsPerSecond = isCustomEndpoint ? 10 : 50 // 50 req/s for public, 10 for custom
    const delayBetweenRequests = 1000 / maxRequestsPerSecond // milliseconds
    
    console.log(`Rate limiting: ${maxRequestsPerSecond} req/s (${isCustomEndpoint ? 'custom' : 'public'} endpoint), delay: ${delayBetweenRequests.toFixed(2)}ms`)
    
    // Track request times for rate limiting
    const requestTimes = []
    
    // Fetch each transaction by hash
    for (let i = 0; i < expectedHashes.length; i++) {
      const txHash = expectedHashes[i]
      const requestStartTime = Date.now()
      
      try {
        const tx = await rpcClient.getTransactionByHash(txHash)
        
        const requestDuration = Date.now() - requestStartTime
        
        // Rate limiting: ensure we don't exceed maxRequestsPerSecond
        // Only apply delay if request was faster than the minimum delay between requests
        // This way we account for actual request time and only wait if needed
        if (!isCustomEndpoint && i < expectedHashes.length - 1) {
          const minDelay = delayBetweenRequests
          if (requestDuration < minDelay) {
            const waitTime = minDelay - requestDuration
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
        
        // Update progress after successful fetch
        syncProgress.value.fetched = i + 1
        updateEstimatedTime()
        
        // Get transaction data (recipientData or data field)
        const txData = tx.recipientData || tx.data || ''
        
        if (!txData) {
          console.warn(`Transaction ${txHash} has no data field`)
          continue
        }
        
        // Parse chunk from transaction data
        const chunk = parseChunkFromTxData(txData)
        
        if (!chunk) {
          console.warn(`Failed to parse chunk from transaction ${txHash}`)
          continue
        }
        
        // Verify game ID matches
        if (chunk.gameID !== manifest.value.game_id) {
          console.warn(`Chunk game ID ${chunk.gameID} doesn't match manifest game ID ${manifest.value.game_id}`)
          continue
        }
        
        // Store chunk
        chunks.set(chunk.chunkIdx, chunk)
        
        // Calculate bytes from all chunks found so far
        let bytes = 0
        for (const c of chunks.values()) {
          bytes += c.length
        }
        syncProgress.value.bytes = bytes
        
      } catch (err) {
        console.warn(`Failed to fetch transaction ${txHash}:`, err)
        // Update progress even if fetch failed
        syncProgress.value.fetched = i + 1
        updateEstimatedTime()
      }
    }

    if (chunks.size === 0) {
      error.value = 'No chunks found. Transactions may not be confirmed yet or RPC endpoint may be unavailable.'
      return
    }

    if (chunks.size < totalChunks) {
      error.value = `Only found ${chunks.size} of ${totalChunks} expected chunks. Some transactions may not be confirmed yet.`
    }

    // Reconstruct file
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
      // All chunks found, clear any previous error
      error.value = null
      
      // Automatically verify the file after successful sync
      await verifyFile()
    }
  } catch (err) {
    error.value = err.message || 'Failed to sync chunks from blockchain'
    console.error('Sync error:', err)
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
