<template>
  <div class="admin-uploader">
    <!-- Public RPC Warning -->
    <div v-if="isPublicRpc" class="warning-box">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <div>
        <strong>Public RPC Not Supported</strong>
        <p>Uploading requires a local Nimiq node with wallet access. Public RPCs don't support wallet operations like createAccount or sendTransaction with wallet signing.</p>
      </div>
    </div>
    
    <!-- Configuration Section -->
    <div class="config-section">
      <h2 class="section-title">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/>
        </svg>
        Upload Configuration
      </h2>
      
      <div class="config-grid">
        <!-- RPC URL -->
        <div class="form-group">
          <label for="rpc-url">RPC URL</label>
          <input
            id="rpc-url"
            type="text"
            v-model="config.rpcUrl"
            placeholder="http://192.168.50.99:8648"
            :disabled="loading"
            :class="{ 'input-error': isPublicRpc }"
          />
          <span v-if="isPublicRpc" class="hint hint-error">⚠️ Public RPC detected - use local node instead</span>
          <span v-else class="hint">Nimiq node RPC endpoint (local node required)</span>
        </div>
        
        <!-- Sender Address -->
        <div class="form-group">
          <label for="sender-addr">Sender Address *</label>
          <input
            id="sender-addr"
            type="text"
            v-model="config.senderAddress"
            placeholder="NQ... (your wallet address)"
            :disabled="loading"
          />
          <span class="hint">Address that will sign transactions (must be unlocked)</span>
        </div>
        
        <!-- Cartridge Address -->
        <div class="form-group">
          <label for="cartridge-addr">Cartridge Address *</label>
          <div class="input-with-button">
            <input
              id="cartridge-addr"
              type="text"
              v-model="config.cartridgeAddress"
              placeholder="NQ... (destination for game data)"
              :disabled="loading || isPublicRpc"
            />
            <button
              type="button"
              @click="generateCartridgeAddress"
              :disabled="loading || isPublicRpc || generatingAddress"
              class="btn-secondary btn-sm"
              title="Generate new address via RPC"
            >
              {{ generatingAddress ? '...' : 'Generate' }}
            </button>
          </div>
          <span v-if="cartridgeGenError" class="hint" style="color: #f87171;">{{ cartridgeGenError }}</span>
          <span v-else class="hint">Unique address where cartridge data will be stored (generated via RPC)</span>
        </div>
        
        <!-- Catalog Address -->
        <div class="form-group">
          <label for="catalog-addr">Catalog Address *</label>
          <select
            id="catalog-addr"
            v-model="catalogSelection"
            :disabled="loading"
          >
            <option value="main">Main Catalog</option>
            <option value="test">Test Catalog</option>
            <option value="custom">Custom...</option>
          </select>
          <input
            v-if="catalogSelection === 'custom'"
            type="text"
            v-model="config.catalogAddress"
            placeholder="NQ... (custom catalog address)"
            :disabled="loading"
            class="mt-2"
          />
          <span class="hint">Catalog where game will be registered</span>
        </div>
      </div>
    </div>
    
    <!-- Game Info Section -->
    <div class="config-section">
      <h2 class="section-title">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
        Game Information
      </h2>
      
      <div class="config-grid">
        <!-- Title -->
        <div class="form-group">
          <label for="title">Title * <span class="char-count">({{ config.title.length }}/16)</span></label>
          <input
            id="title"
            type="text"
            v-model="config.title"
            maxlength="16"
            placeholder="My Game"
            :disabled="loading"
          />
          <span class="hint">Short display title (max 16 characters)</span>
        </div>
        
        <!-- Version -->
        <div class="form-group">
          <label for="semver">Version *</label>
          <input
            id="semver"
            type="text"
            v-model="config.semver"
            placeholder="1.0.0"
            :disabled="loading"
            pattern="\d+\.\d+\.\d+"
          />
          <span class="hint">Semantic version (major.minor.patch)</span>
        </div>
        
        <!-- Platform -->
        <div class="form-group">
          <label for="platform">Platform *</label>
          <select
            id="platform"
            v-model="config.platform"
            :disabled="loading"
          >
            <option value="DOS">DOS</option>
            <option value="GB">Game Boy</option>
            <option value="GBC">Game Boy Color</option>
            <option value="NES">NES</option>
          </select>
          <span class="hint">Target emulator platform</span>
        </div>
        
        <!-- Rate Limit -->
        <div class="form-group">
          <label for="rate">Upload Rate (tx/s)</label>
          <input
            id="rate"
            type="number"
            v-model.number="config.rateLimit"
            min="1"
            max="50"
            :disabled="loading"
          />
          <span class="hint">Transaction rate limit (1-50 tx/s)</span>
        </div>
      </div>
      
      <!-- Advanced Options -->
      <details class="advanced-options">
        <summary>Advanced Options</summary>
        <div class="config-grid">
          <div class="form-group">
            <label for="app-id">App ID (0 = auto)</label>
            <input
              id="app-id"
              type="number"
              v-model.number="config.appId"
              min="0"
              :disabled="loading"
            />
          </div>
          <div class="form-group">
            <label for="cartridge-id">Cartridge ID (0 = auto)</label>
            <input
              id="cartridge-id"
              type="number"
              v-model.number="config.cartridgeId"
              min="0"
              :disabled="loading"
            />
          </div>
          <div class="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                v-model="config.dryRun"
                :disabled="loading"
              />
              Dry Run (don't send transactions)
            </label>
          </div>
        </div>
      </details>
    </div>
    
    <!-- File Upload Section -->
    <div class="config-section file-section">
      <h2 class="section-title">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
          <polyline points="13 2 13 9 20 9"/>
        </svg>
        Game Package
      </h2>
      
      <div
        class="drop-zone"
        :class="{ 'drag-over': isDragging, 'has-file': fileName }"
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
        
        <div v-if="!fileName" class="drop-content">
          <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>Drop your ZIP file here or click to browse</p>
          <span class="hint">Maximum file size: 6MB</span>
        </div>
        
        <div v-else class="file-info">
          <svg class="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <div class="file-details">
            <strong>{{ fileName }}</strong>
            <span>{{ formatBytes(fileSize) }}</span>
            <code class="sha256">SHA256: {{ fileSHA256.substring(0, 16) }}...</code>
          </div>
          <button
            type="button"
            @click.stop="clearFile"
            :disabled="loading"
            class="btn-icon"
            title="Remove file"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div class="actions">
      <button
        type="button"
        @click="reset"
        :disabled="loading"
        class="btn-secondary"
      >
        Reset
      </button>
      <button
        type="button"
        @click="startUpload"
        :disabled="loading || !canUpload"
        class="btn-primary"
      >
        <svg v-if="loading" class="spinner" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round"/>
        </svg>
        <span v-else>
          {{ config.dryRun ? 'Dry Run' : 'Start Upload' }}
        </span>
      </button>
    </div>
    
    <!-- Progress Section -->
    <div v-if="progress.stage" class="progress-section">
      <h2 class="section-title">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
        Upload Progress
      </h2>
      
      <!-- Status -->
      <div class="status-bar">
        <span class="status-text">{{ status }}</span>
        <span class="status-rate" v-if="progress.currentRate > 0">
          {{ progress.currentRate.toFixed(1) }} tx/s
        </span>
      </div>
      
      <!-- Progress Bar -->
      <div class="progress-bar-container">
        <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        <span class="progress-text">
          {{ progress.sentChunks }} / {{ progress.totalChunks }} chunks ({{ progressPercent }}%)
        </span>
      </div>
      
      <!-- Stage indicators -->
      <div class="stages">
        <div class="stage" :class="{ active: progress.stage === 'uploading', complete: ['cart', 'cent', 'complete'].includes(progress.stage) }">
          <div class="stage-dot"></div>
          <span>DATA Chunks</span>
        </div>
        <div class="stage-line"></div>
        <div class="stage" :class="{ active: progress.stage === 'cart', complete: ['cent', 'complete'].includes(progress.stage) }">
          <div class="stage-dot"></div>
          <span>CART Header</span>
        </div>
        <div class="stage-line"></div>
        <div class="stage" :class="{ active: progress.stage === 'cent', complete: progress.stage === 'complete' }">
          <div class="stage-dot"></div>
          <span>CENT Entry</span>
        </div>
      </div>
      
      <!-- Transaction Hashes -->
      <div v-if="progress.cartTxHash || progress.centTxHash" class="tx-hashes">
        <div v-if="progress.cartTxHash" class="tx-hash">
          <span class="label">CART TX:</span>
          <code>{{ progress.cartTxHash }}</code>
        </div>
        <div v-if="progress.centTxHash" class="tx-hash">
          <span class="label">CENT TX:</span>
          <code>{{ progress.centTxHash }}</code>
        </div>
      </div>
    </div>
    
    <!-- Error Display -->
    <div v-if="error" class="error-box">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>
        <strong>Error</strong>
        <p>{{ error }}</p>
      </div>
    </div>
    
    <!-- Upload Log -->
    <div v-if="uploadLog.length > 0" class="log-section">
      <div class="log-header">
        <h2 class="section-title">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Upload Log
        </h2>
        <button @click="clearLog" class="btn-sm btn-ghost">Clear</button>
      </div>
      <div class="log-content" ref="logContainer">
        <div
          v-for="(entry, idx) in uploadLog"
          :key="idx"
          class="log-entry"
          :class="entry.type"
        >
          <span class="log-time">{{ entry.timestamp }}</span>
          <span class="log-message">{{ entry.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useAdminUploader } from '../composables/useAdminUploader.js'

const {
  loading,
  error,
  status,
  progress,
  progressPercent,
  fileData,
  fileName,
  fileSize,
  fileSHA256,
  config,
  uploadLog,
  loadFile,
  startUpload,
  reset: resetUploader,
  clearLog,
  formatBytes,
  CATALOG_ADDRESSES
} = useAdminUploader()

// Local state
const isDragging = ref(false)
const catalogSelection = ref('test')
const logContainer = ref(null)
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

// Sync catalog selection with config
watch(catalogSelection, (newVal) => {
  if (newVal === 'main') {
    config.value.catalogAddress = 'main'
  } else if (newVal === 'test') {
    config.value.catalogAddress = 'test'
  }
  // 'custom' leaves catalogAddress as is for manual input
})

// Auto-scroll log
watch(uploadLog, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}, { deep: true })

// Computed
const canUpload = computed(() => {
  return (
    !isPublicRpc.value &&
    fileName.value &&
    config.value.title &&
    config.value.senderAddress &&
    config.value.cartridgeAddress &&
    config.value.catalogAddress
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

// Methods
async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    await loadFile(file)
  }
}

async function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file) {
    await loadFile(file)
  }
}

function clearFile() {
  fileData.value = null
  fileName.value = ''
  fileSize.value = 0
  fileSHA256.value = ''
}

function reset() {
  resetUploader()
  catalogSelection.value = 'test'
}

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
</script>

<style scoped>
.admin-uploader {
  --primary: #f5af02;
  --primary-dark: #c98f00;
  --secondary: #6366f1;
  --danger: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --bg-dark: #0f0f14;
  --bg-card: #1a1a24;
  --bg-input: #252532;
  --border: #2d2d3d;
  --text: #e5e5e5;
  --text-muted: #9ca3af;
  
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  max-width: 900px;
  margin: 0 auto;
}

/* Warning Box */
.warning-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.warning-box .icon {
  width: 24px;
  height: 24px;
  color: var(--danger);
  flex-shrink: 0;
}

.warning-box strong {
  color: #fca5a5;
  display: block;
  margin-bottom: 0.25rem;
}

.warning-box p {
  margin: 0;
  color: #f87171;
  font-size: 0.875rem;
}

.input-error {
  border-color: var(--danger) !important;
}

.hint-error {
  color: #f87171 !important;
}

.config-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 1.25rem 0;
}

.section-title .icon {
  width: 20px;
  height: 20px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.form-group .char-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
}

.form-group input,
.form-group select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: var(--text);
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(245, 175, 2, 0.15);
}

.form-group input:disabled,
.form-group select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group .hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button input {
  flex: 1;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
}

.advanced-options {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.advanced-options summary {
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.advanced-options summary:hover {
  color: var(--text);
}

/* Drop Zone */
.file-section {
  background: linear-gradient(135deg, var(--bg-card), #1e1e2e);
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 10px;
  padding: 2.5rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-input);
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--primary);
  background: rgba(245, 175, 2, 0.05);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: var(--success);
  background: rgba(34, 197, 94, 0.05);
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-muted);
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: var(--primary);
  opacity: 0.7;
}

.drop-content p {
  margin: 0;
  font-size: 1rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-align: left;
}

.file-icon {
  width: 40px;
  height: 40px;
  color: var(--success);
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-details strong {
  color: var(--text);
  word-break: break-all;
}

.file-details span {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.file-details .sha256 {
  font-size: 0.75rem;
  background: var(--bg-dark);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: var(--text-muted);
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--text-muted);
  transition: color 0.2s;
}

.btn-icon:hover {
  color: var(--danger);
}

.btn-icon svg {
  width: 20px;
  height: 20px;
}

/* Buttons */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #000;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 175, 2, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--text-muted);
  background: var(--bg-input);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
}

.btn-ghost {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.btn-ghost:hover {
  color: var(--text);
}

.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Progress Section */
.progress-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.status-text {
  color: var(--text);
  font-weight: 500;
}

.status-rate {
  color: var(--primary);
  font-size: 0.875rem;
}

.progress-bar-container {
  background: var(--bg-input);
  border-radius: 8px;
  height: 32px;
  position: relative;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.progress-bar {
  background: linear-gradient(90deg, var(--primary), var(--primary-dark));
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 8px;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  mix-blend-mode: difference;
}

/* Stages */
.stages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.stage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.stage.active {
  color: var(--primary);
}

.stage.complete {
  color: var(--success);
}

.stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.3s;
}

.stage.active .stage-dot {
  background: var(--primary);
  box-shadow: 0 0 8px var(--primary);
}

.stage.complete .stage-dot {
  background: var(--success);
}

.stage-line {
  width: 40px;
  height: 2px;
  background: var(--border);
}

/* TX Hashes */
.tx-hashes {
  background: var(--bg-input);
  border-radius: 8px;
  padding: 1rem;
}

.tx-hash {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.tx-hash:last-child {
  margin-bottom: 0;
}

.tx-hash .label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 70px;
}

.tx-hash code {
  font-size: 0.8rem;
  color: var(--success);
  word-break: break-all;
}

/* Error Box */
.error-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.error-box .icon {
  width: 24px;
  height: 24px;
  color: var(--danger);
  flex-shrink: 0;
}

.error-box strong {
  color: var(--danger);
  display: block;
  margin-bottom: 0.25rem;
}

.error-box p {
  margin: 0;
  color: #fca5a5;
  font-size: 0.9rem;
}

/* Log Section */
.log-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.log-header .section-title {
  margin: 0;
}

.log-content {
  max-height: 300px;
  overflow-y: auto;
  padding: 0.75rem;
  background: var(--bg-dark);
}

.log-entry {
  display: flex;
  gap: 0.75rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.8rem;
  border-radius: 4px;
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.log-entry.error {
  background: rgba(239, 68, 68, 0.1);
}

.log-entry.warn {
  background: rgba(245, 158, 11, 0.1);
}

.log-time {
  color: var(--text-muted);
  flex-shrink: 0;
}

.log-message {
  color: var(--text);
  word-break: break-word;
}

.log-entry.error .log-message {
  color: #fca5a5;
}

.log-entry.warn .log-message {
  color: #fcd34d;
}

/* Utilities */
.mt-2 {
  margin-top: 0.5rem;
}
</style>

