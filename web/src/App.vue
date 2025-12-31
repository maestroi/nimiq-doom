<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Header -->
    <Header
      :selected-rpc-endpoint="selectedRpcEndpoint"
      :custom-rpc-endpoint="customRpcEndpoint"
      :rpc-endpoints="rpcEndpoints"
      :games="catalogGames"
      :selected-game="selectedGame"
      :selected-version="selectedVersion"
      :loading="catalogLoading || loading"
      :catalogs="catalogs"
      :selected-catalog-name="selectedCatalogName"
      :catalog-address="catalogAddress"
      :publisher-address="publisherAddress"
      @update:rpc-endpoint="onRpcEndpointChange"
      @update:custom-rpc="onCustomRpcEndpointChange"
      @update:catalog="onCatalogChange"
      @update:game="onGameChange"
      @update:version="onVersionChange"
      @refresh-catalog="loadCatalog"
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
              <h4 class="font-semibold text-blue-200 mb-1">2. Discover Games</h4>
              <p class="text-blue-100/90">The frontend queries the catalog address to discover available games. Each game has multiple versions stored at dedicated cartridge addresses.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">3. Download Cartridge</h4>
              <p class="text-blue-100/90">When you select a game version, the app fetches the CART header and all DATA chunks from the cartridge address. The chunks are reassembled in order to reconstruct the original ZIP file.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">4. Verification</h4>
              <p class="text-blue-100/90">After downloading, the reconstructed file is automatically verified using SHA256. The computed hash is compared with the hash stored in the CART header to ensure data integrity and authenticity.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">5. Run in Browser</h4>
              <p class="text-blue-100/90">Once verified, you can run the program directly in your browser. DOS games use JS-DOS (a JavaScript port of DOSBox). The program runs entirely client-side - no server required!</p>
            </div>
            <div class="pt-2 border-t border-blue-700/50">
              <p class="text-xs text-blue-200/80"><strong>Note:</strong> All data is stored permanently on the blockchain. Games are discovered from the catalog address and downloaded from cartridge addresses. Only transactions from the trusted publisher address are accepted.</p>
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

      <!-- Main Content: Game Selector + Emulator side by side, Sync below -->
      <div class="space-y-6 mb-6">
        <!-- Top Row: Game Selector + Emulator -->
        <div class="grid grid-cols-1 lg:grid-cols-[0.6fr_1.4fr] gap-6">
          <!-- Game Selector Card (with download/sync) -->
          <GameSelector
            :games="catalogGames"
            :selected-game="selectedGame"
            :selected-version="selectedVersion"
            :cart-header="cartHeader"
            :run-json="runJson"
            :sync-progress="cartridgeProgress"
            :verified="verified"
            :file-data="fileData"
            :loading="loading"
            :error="error"
            :progress-percent="cartridgeProgressPercent"
            @update:game="onGameChange"
            @update:version="onVersionChange"
            @load-cartridge="loadCartridge"
            @clear-cache="clearCartridgeCache"
          />

          <!-- Emulator Container -->
          <EmulatorContainer
            :platform="cartHeader?.platform || runJson?.platform || 'DOS'"
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatBytes } from './utils.js'
import { NimiqRPC } from './nimiq-rpc.js'
import Header from './components/Header.vue'
import EmulatorContainer from './components/EmulatorContainer.vue'
import GameSelector from './components/GameSelector.vue'
import { useCatalog } from './composables/useCatalog.js'
import { useCartridge } from './composables/useCartridge.js'
import { useDosEmulator } from './composables/useDosEmulator.js'
import { useGbEmulator } from './composables/useGbEmulator.js'

// RPC Configuration
const rpcEndpoints = ref([
  { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
  { name: 'Custom...', url: 'custom' }
])

const selectedRpcEndpoint = ref('https://rpc-mainnet.nimiqscan.com')
const customRpcEndpoint = ref('')
const rpcClient = ref(new NimiqRPC(selectedRpcEndpoint.value))

// Configuration - Multiple catalogs
const catalogs = ref([
  { name: 'Test', address: 'NQ32 0VD4 26TR 1394 KXBJ 862C NFKG 61M5 GFJ0' },
  { name: 'Main', address: 'NQ15 NXMP 11A0 TMKP G1Q8 4ABD U16C XD6Q D948' }
])
const selectedCatalogName = ref('Test')
const catalogAddress = computed(() => {
  const catalog = catalogs.value.find(c => c.name === selectedCatalogName.value)
  return catalog ? catalog.address : catalogs.value[0].address
})
const publisherAddress = ref('NQ89 4GDH 0J4U C2FY TU0Y TP1X J1H7 3HX3 PVSE') // Trusted publisher address

// Developer Mode
const developerMode = ref(false)

// Catalog and Cartridge
const selectedGame = ref(null)
const selectedVersion = ref(null)

// Catalog composable
const catalog = useCatalog(rpcClient, catalogAddress, publisherAddress)
const { 
  loading: catalogLoading, 
  error: catalogError, 
  games: catalogGames, 
  loadCatalog 
} = catalog

// Cartridge composable
const cartridgeAddress = computed(() => {
  return selectedVersion.value?.cartridgeAddress || null
})
const cartridge = useCartridge(rpcClient, cartridgeAddress, publisherAddress)
const {
  loading: cartridgeLoading,
  error: cartridgeError,
  fileData,
  verified,
  cartHeader,
  progress: cartridgeProgress,
  progressPercent: cartridgeProgressPercent,
  loadCartridgeInfo,
  loadCartridge,
  extractRunJson,
  clearCache: clearCartridgeCache
} = cartridge

const runJson = ref(null)

// Watch for cartridge loading completion to extract run.json
watch([fileData, verified], async ([newFileData, newVerified]) => {
  if (newFileData && newVerified) {
    runJson.value = await extractRunJson()
  } else {
    runJson.value = null
  }
})

// Combined loading and error states
const loading = computed(() => catalogLoading.value || cartridgeLoading.value)
const error = computed(() => catalogError.value || cartridgeError.value)

// Handle game selection
function onGameChange(game) {
  selectedGame.value = game
  if (game && game.versions.length > 0) {
    selectedVersion.value = game.versions[0] // Select latest version
  } else {
    selectedVersion.value = null
  }
  // Reset cartridge state
  fileData.value = null
  verified.value = false
  runJson.value = null
}

// Handle catalog selection
function onCatalogChange(catalogName) {
  selectedCatalogName.value = catalogName
  // Reset game selection and reload catalog
  selectedGame.value = null
  selectedVersion.value = null
  fileData.value = null
  verified.value = false
  runJson.value = null
  // Reload catalog with new address
  loadCatalog()
}

// Handle version selection
function onVersionChange(version) {
  selectedVersion.value = version
  // Reset cartridge state
  fileData.value = null
  verified.value = false
  runJson.value = null
}

// Watch for catalog address changes to reload catalog
watch(catalogAddress, async (newAddress) => {
  if (newAddress) {
    // Reset selection and reload catalog
    selectedGame.value = null
    selectedVersion.value = null
    fileData.value = null
    verified.value = false
    runJson.value = null
    await loadCatalog()
  }
}, { immediate: false })

// Watch for version changes to load cartridge info only (no download)
watch(selectedVersion, async (newVersion) => {
  if (!newVersion || !newVersion.cartridgeAddress) {
    fileData.value = null
    verified.value = false
    runJson.value = null
    cartHeader.value = null
    return
  }
  
  // Only load CART header info for display, don't download yet
  await loadCartridgeInfo()
}, { immediate: false })

// Emulator
const gameReady = ref(false)
const emulatorContainerRef = ref(null)

// Create a manifest-like object for DOS emulator compatibility
const manifestForEmulator = computed(() => {
  if (!cartHeader.value && !runJson.value && !fileData.value) return null
  
  const platformCode = cartHeader.value?.platform
  const platformName = platformCode === 0 ? 'DOS' : 
                       platformCode === 1 ? 'GB' :
                       platformCode === 2 ? 'GBC' : 'DOS'
  
  return {
    filename: runJson.value?.filename || 'game.zip',
    game_id: cartHeader.value?.cartridgeId || 0,
    total_size: cartHeader.value?.totalSize || (fileData.value?.length || 0),
    chunk_size: cartHeader.value?.chunkSize || 51,
    network: 'mainnet',
    sender_address: publisherAddress.value || '',
    sha256: cartHeader.value?.sha256 || '',
    platform: platformName,
    executable: runJson.value?.executable || null,
    title: runJson.value?.title || selectedGame.value?.title || null
  }
})

// Emulator composables
const dosEmulator = useDosEmulator(manifestForEmulator, fileData, verified, loading, error, gameReady)
const gbEmulator = useGbEmulator(manifestForEmulator, fileData, verified, loading, error, gameReady)

// Wrapper functions that get the container element and call the composable
async function runGame() {
  const emulatorComponent = emulatorContainerRef.value?.emulatorRef
  const containerElement = emulatorComponent?.gameContainer
  
  if (!containerElement) {
    error.value = 'Game container not found in emulator component.'
    return
  }
  
  // Route to appropriate emulator based on platform
  const platform = manifestForEmulator.value?.platform || 'DOS'
  if (platform === 'DOS') {
    await dosEmulator.runGame(containerElement)
  } else if (platform === 'GB' || platform === 'GBC') {
    await gbEmulator.runGame(containerElement)
  } else {
    error.value = `Emulator for platform "${platform}" not yet implemented`
  }
}

async function stopGame() {
  const emulatorComponent = emulatorContainerRef.value?.emulatorRef
  const containerElement = emulatorComponent?.gameContainer
  
  // Route to appropriate emulator based on platform
  const platform = manifestForEmulator.value?.platform || 'DOS'
  if (platform === 'DOS') {
    await dosEmulator.stopGame(containerElement)
  } else if (platform === 'GB' || platform === 'GBC') {
    await gbEmulator.stopGame(containerElement)
  }
}

// Developer mode
const localFileData = ref(null)
const localFileName = ref(null)

// RPC endpoint handlers
function onRpcEndpointChange(newEndpoint) {
  selectedRpcEndpoint.value = newEndpoint
  if (newEndpoint !== 'custom') {
    rpcClient.value = new NimiqRPC(newEndpoint)
  }
}

function onCustomRpcEndpointChange(newUrl) {
  customRpcEndpoint.value = newUrl
  if (newUrl) {
    selectedRpcEndpoint.value = newUrl
    rpcClient.value = new NimiqRPC(newUrl)
  }
}

// Download file helper
function downloadFile() {
  if (!fileData.value) return
  
  const blob = new Blob([fileData.value], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = runJson.value?.filename || 'game.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
      sha256: '', // Will be computed if needed
      platform: 'DOS'
    }
    
    // Set fileData and verified to allow running
    fileData.value = localFileData.value
    verified.value = true
    cartHeader.value = {
      cartridgeId: 0,
      totalSize: localFileData.value.length,
      chunkSize: 51,
      sha256: '',
      platform: 0 // DOS
    }
    runJson.value = null
    
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
  
  // Auto-load catalog on mount if catalog address is configured
  if (catalogAddress.value) {
    loadCatalog()
  } else {
    console.warn('Catalog address not configured. Please set CATALOG_ADDRESS.')
  }
})

onUnmounted(() => {
  // Cleanup keyboard listener
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
