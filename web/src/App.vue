<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Header -->
    <Header
      :selected-rpc-endpoint="selectedRpcEndpoint"
      :custom-rpc-endpoint="customRpcEndpoint"
      :rpc-endpoints="rpcEndpoints"
      :manifests="manifests"
      :selected-manifest-name="selectedManifestName"
      :loading="loading"
      @update:rpc-endpoint="onRpcEndpointChange"
      @update:custom-rpc="onCustomRpcEndpointChange"
      @update:manifest="onManifestChange"
      @refresh-manifests="loadManifestsList"
    />

    <!-- Main Content -->
    <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Developer Mode Panel -->
      <div v-if="developerMode" class="mb-6 rounded-md bg-purple-900/30 border border-purple-700 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-purple-200">🧪 Developer Mode</h3>
          <button
            @click="developerMode = false"
            class="text-purple-400 hover:text-purple-300"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">
              Test Local Game File (ZIP)
            </label>
            <div class="flex gap-2">
              <input
                type="file"
                ref="localFileInput"
                @change="handleLocalFileUpload"
                accept=".zip"
                class="hidden"
                id="local-file-input"
              />
              <label
                for="local-file-input"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-200 bg-purple-800/50 hover:bg-purple-800 cursor-pointer"
              >
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {{ localFileName || 'Choose ZIP file...' }}
              </label>
              <button
                v-if="localFileData"
                @click="runLocalGame"
                :disabled="loading || gameReady"
                class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run Local Game
              </button>
            </div>
            <p v-if="localFileName" class="mt-2 text-xs text-purple-300">
              Loaded: {{ localFileName }} ({{ formatBytes(localFileData?.length || 0) }})
            </p>
          </div>
           <div>
             <label class="block text-sm font-medium text-purple-200 mb-2">
               Sync Speed Override (tx/s)
             </label>
             <div class="flex gap-2 items-center">
               <input
                 type="number"
                 v-model.number="devSyncSpeed"
                 min="1"
                 max="1000"
                 placeholder="Auto (default)"
                 class="flex-1 px-3 py-2 border border-purple-600 text-sm rounded-md text-purple-200 bg-purple-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
               />
               <button
                 @click="devSyncSpeed = null"
                 class="px-3 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-200 bg-purple-800/50 hover:bg-purple-800"
                 title="Reset to default"
               >
                 Reset
               </button>
             </div>
             <p class="mt-1 text-xs text-purple-300">
               Override sync speed for testing. Default: 50 tx/s (public) or 10 tx/s (custom). 
               {{ devSyncSpeed ? `Current: ${devSyncSpeed} tx/s` : 'Using default rate limiting' }}
             </p>
           </div>
           <div>
             <label class="block text-sm font-medium text-purple-200 mb-2">
               Delay Override (ms between requests)
             </label>
             <div class="flex gap-2 items-center">
               <input
                 type="number"
                 v-model.number="devSyncDelay"
                 min="0"
                 max="10000"
                 step="1"
                 placeholder="Auto (calculated from speed)"
                 class="flex-1 px-3 py-2 border border-purple-600 text-sm rounded-md text-purple-200 bg-purple-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
               />
               <button
                 @click="devSyncDelay = null"
                 class="px-3 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-200 bg-purple-800/50 hover:bg-purple-800"
                 title="Reset to default"
               >
                 Reset
               </button>
             </div>
             <p class="mt-1 text-xs text-purple-300">
               Override delay between requests (in milliseconds). If set, takes precedence over speed override.
               {{ devSyncDelay !== null ? `Current: ${devSyncDelay}ms (${(1000/devSyncDelay).toFixed(1)} tx/s)` : 'Using calculated delay from speed' }}
             </p>
           </div>
          <div class="pt-2 border-t border-purple-700/50">
            <p class="text-xs text-purple-300">
              💡 This mode allows you to test games locally before uploading to the blockchain. 
              Upload a ZIP file containing your DOS game files and run it directly.
            </p>
          </div>
        </div>
      </div>

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

      <!-- Main Content Grid: Manifest + Emulator side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-[0.8fr_1.7fr] gap-6 mb-6">
        <!-- Program Info Card -->
        <ProgramInfo
          :manifest="manifest"
          :sync-progress="syncProgress"
          :verified="verified"
          :file-data="fileData"
          :loading="loading"
          :error="error"
          :estimated-time-remaining="estimatedTimeRemaining"
          :loaded-from-cache="loadedFromCache"
          @sync-chunks="syncChunks"
          @clear-cache="clearCacheAndResync"
        />

        <!-- Emulator Container -->
        <EmulatorContainer
          :platform="manifest?.platform || 'DOS'"
          :verified="verified"
          :loading="loading"
          :game-ready="gameReady"
          @run-game="runGame"
          @stop-game="stopGame"
          @download-file="downloadFile"
          ref="emulatorContainerRef"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatBytes } from './utils.js'
import { NimiqRPC } from './nimiq-rpc.js'
import Header from './components/Header.vue'
import ProgramInfo from './components/ProgramInfo.vue'
import EmulatorContainer from './components/EmulatorContainer.vue'
import { useManifests } from './composables/useManifests.js'
import { useCache } from './composables/useCache.js'
import { useSync } from './composables/useSync.js'
import { useDosEmulator } from './composables/useDosEmulator.js'

// RPC Configuration
const rpcEndpoints = ref([
  { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
  { name: 'Custom...', url: 'custom' }
])

const selectedRpcEndpoint = ref('https://rpc-mainnet.nimiqscan.com')
const customRpcEndpoint = ref('')
let rpcClient = new NimiqRPC(selectedRpcEndpoint.value)

// Developer Mode
const developerMode = ref(false)
const devSyncSpeed = ref(null)
const devSyncDelay = ref(null)

// Composables
const { manifests, selectedManifestName, manifest, loading: manifestsLoading, error: manifestsError, loadManifestsList, loadManifest } = useManifests()
const { loadFromCache, saveToCache, clearCache } = useCache()

// Handle manifest selection change
async function onManifestChange(manifestName) {
  selectedManifestName.value = manifestName
  await loadManifest()
}

// Sync composable
const sync = useSync(
  manifest,
  rpcClient,
  devSyncSpeed,
  devSyncDelay,
  selectedRpcEndpoint,
  customRpcEndpoint,
  loadFromCache,
  saveToCache
)

const {
  loading: syncLoading,
  error: syncError,
  verified,
  fileData,
  syncProgress,
  estimatedTimeRemaining,
  loadedFromCache,
  syncProgressPercent,
  syncChunks,
  verifyFile,
  downloadFile
} = sync

// Watch for manifest changes to auto-load from cache
watch(manifest, async (newManifest) => {
  if (!newManifest) {
    fileData.value = null
    verified.value = false
    loadedFromCache.value = false
    syncProgress.value = { fetched: 0, total: 0, bytes: 0, rate: 0 }
    gameReady.value = false
    return
  }
  
  // Reset state
  fileData.value = null
  verified.value = false
  loadedFromCache.value = false
  syncProgress.value = { fetched: 0, total: 0, bytes: 0, rate: 0 }
  gameReady.value = false
  
  // Try to load from cache immediately when manifest changes
  const cachedData = await loadFromCache(newManifest)
  if (cachedData) {
    console.log('Auto-loading from cache for', newManifest.filename)
    fileData.value = cachedData
    loadedFromCache.value = true
    syncProgress.value = { 
      fetched: newManifest.expected_tx_hashes?.length || 0, 
      total: newManifest.expected_tx_hashes?.length || 0, 
      bytes: cachedData.length,
      rate: 0
    }
    // Verify cached data
    await verifyFile()
  }
}, { immediate: false })

// Combined loading and error states
const loading = computed(() => manifestsLoading.value || syncLoading.value)
const error = computed(() => manifestsError.value || syncError.value)

// Emulator
const gameReady = ref(false)
const emulatorContainerRef = ref(null)

// DOS Emulator composable
const dosEmulator = useDosEmulator(manifest, fileData, verified, loading, error, gameReady)

// Wrapper functions that get the container element and call the composable
async function runGame() {
  const emulatorComponent = emulatorContainerRef.value?.emulatorRef
  const containerElement = emulatorComponent?.gameContainer
  
  if (!containerElement) {
    error.value = 'Game container not found in emulator component.'
    return
  }
  
  await dosEmulator.runGame(containerElement)
}

async function stopGame() {
  const emulatorComponent = emulatorContainerRef.value?.emulatorRef
  const containerElement = emulatorComponent?.gameContainer
  
  await dosEmulator.stopGame(containerElement)
}

// Developer mode
const localFileData = ref(null)
const localFileName = ref(null)

// RPC endpoint handlers
function onRpcEndpointChange(newEndpoint) {
  selectedRpcEndpoint.value = newEndpoint
  if (newEndpoint !== 'custom') {
    rpcClient = new NimiqRPC(newEndpoint)
  }
}

function onCustomRpcEndpointChange(newUrl) {
  customRpcEndpoint.value = newUrl
  if (newUrl) {
    selectedRpcEndpoint.value = newUrl
    rpcClient = new NimiqRPC(newUrl)
  }
}

// Clear cache and force re-sync
async function clearCacheAndResync() {
  if (!manifest.value) return
  
  await clearCache(manifest.value)
  loadedFromCache.value = false
  fileData.value = null
  verified.value = false
  
  // Re-sync from blockchain
  await syncChunks()
}

// Wrapper functions that get the container element and call the composable


// Developer mode functions
const localFileInput = ref(null)

async function handleLocalFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  if (!file.name.toLowerCase().endsWith('.zip')) {
    error.value = 'Please select a ZIP file'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    localFileData.value = new Uint8Array(arrayBuffer)
    localFileName.value = file.name
    console.log('Loaded local file:', file.name, 'Size:', localFileData.value.length)
  } catch (err) {
    error.value = `Failed to load file: ${err.message}`
    console.error('Error loading local file:', err)
  } finally {
    loading.value = false
  }
}

async function runLocalGame() {
  if (!localFileData.value) {
    error.value = 'No local file loaded'
    return
  }
  
  // Stop any currently running game
  if (gameReady.value) {
    stopGame()
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Reset state
  error.value = null
  loading.value = true
  
  try {
    // Create a temporary manifest-like object for local files
    const tempManifest = {
      filename: localFileName.value,
      game_id: 0,
      total_size: localFileData.value.length,
      chunk_size: 51,
      network: 'local',
      sender_address: 'LOCAL',
      sha256: '' // Will be computed if needed
    }
    
    // Set fileData and verified to allow running
    fileData.value = localFileData.value
    verified.value = true
    manifest.value = tempManifest
    syncProgress.value = { 
      fetched: 0, 
      total: 0, 
      bytes: localFileData.value.length,
      rate: 0
    }
    
    // Now run the game using the existing runGame function
    await runGame()
  } catch (err) {
    error.value = `Failed to run local game: ${err.message}`
    console.error('Error running local game:', err)
  } finally {
    loading.value = false
  }
}

// Keyboard shortcut for developer mode (Ctrl+Shift+D)
function handleKeyDown(event) {
  if (event.ctrlKey && event.shiftKey && event.key === 'D') {
    event.preventDefault()
    developerMode.value = !developerMode.value
    console.log('Developer mode:', developerMode.value ? 'enabled' : 'disabled')
  }
}

onMounted(() => {
  // Add keyboard listener for developer mode
  window.addEventListener('keydown', handleKeyDown)
  
  // Auto-load manifests list on mount
  loadManifestsList()
})

onUnmounted(() => {
  // Cleanup keyboard listener
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
