<template>
  <div class="dev-uploader">
    <!-- Public RPC Warning -->
    <div v-if="isPublicRpc" class="mb-3 p-3 rounded-md bg-red-900/40 border border-red-600 text-red-300 text-sm">
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div>
          <strong class="text-red-200">Public RPC Not Supported</strong>
          <p class="mt-1">Uploading requires a local Nimiq node with wallet access. Public RPCs don't support wallet operations.</p>
          <p class="mt-1 text-xs text-red-400">Set RPC URL to your local node (e.g., http://localhost:8648)</p>
        </div>
      </div>
    </div>
    
    <!-- RPC URL -->
    <div class="mb-3">
      <label class="block text-xs font-medium text-yellow-300 mb-1">RPC URL *</label>
      <input
        type="text"
        v-model="config.rpcUrl"
        placeholder="/rpc (proxied)"
        :disabled="loading"
        class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        :class="{ 'border-red-500': isPublicRpc }"
      />
      <span class="text-xs text-yellow-600 mt-1">Proxied to 192.168.50.99:8648 to avoid CORS</span>
    </div>
    
    <!-- Config Row 1 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Sender Address *</label>
        <div class="flex gap-2">
          <input
            type="text"
            v-model="config.senderAddress"
            placeholder="NQ... (your wallet)"
            :disabled="loading || isPublicRpc"
            class="flex-1 px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
            :class="{ 'border-red-500': senderWarning }"
          />
          <button
            @click="checkSenderAccount"
            :disabled="loading || isPublicRpc || !config.senderAddress"
            class="px-2 py-1 text-xs rounded bg-yellow-800/50 text-yellow-300 hover:bg-yellow-800 border border-yellow-700/50 disabled:opacity-50"
            title="Check if account is unlocked"
          >
            Check
          </button>
        </div>
        <!-- Sender Warning -->
        <div v-if="senderWarning" class="mt-1 text-xs text-red-400">
          ⚠️ {{ senderWarning }}
        </div>
        <div v-else-if="senderOk" class="mt-1 text-xs text-green-400">
          ✓ Account is unlocked and ready
        </div>
      </div>
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Cartridge Address *</label>
        <div class="flex gap-2">
          <input
            type="text"
            v-model="config.cartridgeAddress"
            placeholder="NQ... (destination)"
            :disabled="loading || isPublicRpc"
            class="flex-1 px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
          />
          <button
            @click="generateCartridgeAddress"
            :disabled="loading || isPublicRpc || generatingAddress"
            class="px-2 py-1 text-xs rounded bg-yellow-800/50 text-yellow-300 hover:bg-yellow-800 border border-yellow-700/50 disabled:opacity-50"
            title="Generate new address via RPC"
          >
            <span v-if="generatingAddress">...</span>
            <span v-else>Gen</span>
          </button>
        </div>
        <div v-if="cartridgeGenError" class="mt-1 text-xs text-red-400">
          {{ cartridgeGenError }}
        </div>
      </div>
    </div>
    
    <!-- Config Row 2 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Title * <span class="text-yellow-600">({{ config.title.length }}/16)</span></label>
        <input
          type="text"
          v-model="config.title"
          maxlength="16"
          placeholder="Game Name"
          :disabled="loading"
          class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Version *</label>
        <input
          type="text"
          v-model="config.semver"
          placeholder="1.0.0"
          :disabled="loading"
          class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white placeholder-gray-500 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Platform</label>
        <select
          v-model="config.platform"
          :disabled="loading"
          class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        >
          <option value="DOS">DOS</option>
          <option value="GB">Game Boy</option>
          <option value="GBC">GBC</option>
          <option value="NES">NES</option>
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Catalog</label>
        <select
          v-model="catalogSelection"
          :disabled="loading"
          class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        >
          <option value="test">Test</option>
          <option value="main">Main</option>
        </select>
      </div>
    </div>
    
    <!-- Config Row 3: Rate & Concurrency -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Rate (tx/s)</label>
        <input
          type="number"
          v-model.number="config.rateLimit"
          min="1"
          max="50"
          :disabled="loading"
          class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-yellow-300 mb-1">Concurrency</label>
        <input
          type="number"
          v-model.number="config.concurrency"
          min="1"
          max="10"
          :disabled="loading"
          class="w-full px-3 py-2 text-sm rounded-md bg-gray-800 border border-yellow-700/50 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
        />
      </div>
    </div>
    
    <!-- File Drop + Actions -->
    <div class="flex gap-3 mb-3">
      <!-- Drop Zone -->
      <div
        class="flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors"
        :class="[
          isDragging ? 'border-yellow-400 bg-yellow-900/20' : 'border-yellow-700/50 hover:border-yellow-600',
          fileName ? 'bg-green-900/20 border-green-600' : ''
        ]"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".zip"
          @change="handleFileSelect"
          :disabled="loading"
          hidden
        />
        <div v-if="!fileName" class="text-yellow-400 text-sm">
          📦 Drop ZIP or click to browse
        </div>
        <div v-else class="text-green-400 text-sm">
          ✓ {{ fileName }} ({{ formatBytes(fileSize) }})
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex flex-col gap-2">
        <button
          @click="startUpload"
          :disabled="loading || !canUpload"
          class="px-4 py-2 text-sm font-medium rounded-md transition-colors"
          :class="[
            loading || !canUpload 
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
              : 'bg-yellow-600 text-black hover:bg-yellow-500'
          ]"
        >
          <span v-if="loading" class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Uploading...
          </span>
          <span v-else>{{ config.dryRun ? 'Dry Run' : 'Upload' }}</span>
        </button>
        <label class="flex items-center gap-1 text-xs text-yellow-400 cursor-pointer">
          <input type="checkbox" v-model="config.dryRun" class="rounded border-yellow-700 bg-gray-800 text-yellow-500" />
          Dry run
        </label>
      </div>
    </div>
    
    <!-- Progress -->
    <div v-if="progress.stage" class="mb-3">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-yellow-300">{{ status }}</span>
        <span class="text-yellow-500">{{ progressPercent }}%</span>
      </div>
      <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-300"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
      <div v-if="progress.cartTxHash" class="mt-2 text-xs text-green-400 font-mono truncate">
        CART: {{ progress.cartTxHash }}
      </div>
    </div>
    
    <!-- Error -->
    <div v-if="error" class="p-2 rounded bg-red-900/30 border border-red-700 text-red-300 text-sm mb-3">
      {{ error }}
    </div>
    
    <!-- Log (collapsible) -->
    <details v-if="uploadLog.length > 0" class="text-xs">
      <summary class="text-yellow-400 cursor-pointer hover:text-yellow-300">
        View Log ({{ uploadLog.length }} entries)
      </summary>
      <div class="mt-2 max-h-32 overflow-y-auto bg-gray-900 rounded p-2 font-mono">
        <div 
          v-for="(entry, idx) in uploadLog" 
          :key="idx"
          :class="[
            'py-0.5',
            entry.type === 'error' ? 'text-red-400' : entry.type === 'warn' ? 'text-yellow-400' : 'text-gray-400'
          ]"
        >
          {{ entry.message }}
        </div>
      </div>
    </details>
    
    <!-- Help -->
    <div class="mt-3 pt-3 border-t border-yellow-700/30 text-xs text-yellow-600 space-y-1">
      <p>💡 <strong>Requirements:</strong></p>
      <ul class="list-disc list-inside ml-2 space-y-0.5">
        <li>Local Nimiq node with RPC enabled (<code class="px-1 py-0.5 rounded bg-gray-800 text-yellow-400">--rpc-server</code>)</li>
        <li>Sender wallet imported and unlocked on the node</li>
        <li>Sufficient NIM balance for transaction fees</li>
      </ul>
      <p class="mt-2">To unlock: <code class="px-1 py-0.5 rounded bg-gray-800 text-yellow-400">unlockAccount(address, passphrase, 0)</code></p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAdminUploader } from '../composables/useAdminUploader.js'

const props = defineProps({
  rpcUrl: {
    type: String,
    default: ''
  }
})

const {
  loading,
  error,
  status,
  progress,
  progressPercent,
  fileName,
  fileSize,
  config,
  uploadLog,
  loadFile,
  startUpload: doUpload,
  formatBytes
} = useAdminUploader()

// Local state
const isDragging = ref(false)
const catalogSelection = ref('test')
const senderWarning = ref('')
const senderOk = ref(false)
const generatingAddress = ref(false)
const cartridgeGenError = ref('')

// Known public RPCs that don't support wallet operations
const PUBLIC_RPCS = [
  'nimiqscan.com',
  'nimiq.watch',
  'nimiq.network',
  'albatross-api'
]

// Detect if using a public RPC
const isPublicRpc = computed(() => {
  const url = config.value.rpcUrl.toLowerCase()
  return PUBLIC_RPCS.some(publicRpc => url.includes(publicRpc))
})

// Set default RPC URL (proxied through Vite to avoid CORS)
config.value.rpcUrl = '/rpc'

// Sync catalog selection
watch(catalogSelection, (val) => {
  config.value.catalogAddress = val
})

// Reset sender status when address changes
watch(() => config.value.senderAddress, () => {
  senderWarning.value = ''
  senderOk.value = false
})

// Computed
const canUpload = computed(() => {
  return (
    !isPublicRpc.value &&
    fileName.value && 
    config.value.title && 
    config.value.senderAddress && 
    config.value.cartridgeAddress
  )
})

// RPC helper
async function rpcCall(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  }
  
  const response = await fetch(config.value.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error))
  }
  
  // Handle nested data structure
  if (data.result && typeof data.result === 'object' && 'data' in data.result) {
    return data.result.data
  }
  
  return data.result
}

// Check if sender account is imported and unlocked
async function checkSenderAccount() {
  if (!config.value.senderAddress) return
  
  senderWarning.value = ''
  senderOk.value = false
  
  try {
    // First check if account is imported
    const isImported = await rpcCall('isAccountImported', { address: config.value.senderAddress })
    
    if (!isImported) {
      senderWarning.value = 'Account not imported in wallet. Import it first via RPC.'
      return
    }
    
    // Check if account is unlocked
    const isUnlocked = await rpcCall('isAccountUnlocked', { address: config.value.senderAddress })
    
    if (!isUnlocked) {
      senderWarning.value = 'Account is locked. Unlock it via RPC: unlockAccount(address, passphrase, duration)'
      return
    }
    
    senderOk.value = true
  } catch (err) {
    senderWarning.value = `RPC error: ${err.message}`
  }
}

// Generate cartridge address via RPC createAccount
async function generateCartridgeAddress() {
  if (isPublicRpc.value) {
    cartridgeGenError.value = 'Cannot generate address with public RPC'
    return
  }
  
  generatingAddress.value = true
  cartridgeGenError.value = ''
  
  try {
    const account = await rpcCall('createAccount', {})
    
    if (account && account.address) {
      config.value.cartridgeAddress = account.address
    } else if (typeof account === 'string') {
      config.value.cartridgeAddress = account
    } else {
      throw new Error('Invalid response from createAccount')
    }
  } catch (err) {
    cartridgeGenError.value = `Failed: ${err.message}`
  } finally {
    generatingAddress.value = false
  }
}

// Wrap startUpload to check sender first
async function startUpload() {
  if (isPublicRpc.value) {
    error.value = 'Cannot upload using public RPC. Use a local node.'
    return
  }
  
  // Check sender account first
  await checkSenderAccount()
  if (senderWarning.value) {
    return // Don't proceed if sender has issues
  }
  
  await doUpload()
}

// Methods
async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) await loadFile(file)
}

async function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file) await loadFile(file)
}
</script>

