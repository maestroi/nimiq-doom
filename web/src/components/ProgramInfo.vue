<template>
  <div v-if="manifest" class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
    <div class="px-4 py-5 sm:px-6">
      <h2 class="text-xl font-semibold text-white">Program Info</h2>
    </div>
    <div class="px-4 py-5 sm:p-6">
      <dl class="space-y-2">
        <div v-if="manifest.title">
          <dt class="text-xs font-medium text-gray-400">Title</dt>
          <dd class="mt-0.5 text-sm text-white font-semibold">{{ manifest.title }}</dd>
        </div>
        <div v-if="manifest.platform">
          <dt class="text-xs font-medium text-gray-400">Platform</dt>
          <dd class="mt-0.5 text-sm text-white">{{ manifest.platform }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-gray-400">Filename</dt>
          <dd class="mt-0.5 text-sm text-white font-mono text-xs">{{ manifest.filename }}</dd>
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
          <dd class="mt-0.5 text-xs text-white font-mono break-words">{{ formatHash(manifest.sha256) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-gray-400">Sender Address</dt>
          <dd class="mt-0.5 text-xs text-white font-mono break-words">
            <a 
              :href="`https://nimiqscan.com/account/${encodeURIComponent(manifest.sender_address)}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-400 hover:text-indigo-300 hover:underline"
              :title="manifest.sender_address"
            >
              {{ formatAddress(manifest.sender_address) }}
            </a>
          </dd>
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

      <!-- Sync Progress -->
      <div v-if="syncProgress.total > 0" class="mt-4 pt-4 border-t border-gray-700 dark:border-white/10">
        <h3 class="text-sm font-semibold text-white mb-2">Sync Progress</h3>
        <div class="space-y-2">
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-400">Chunks</span>
              <span class="text-white font-medium">{{ syncProgress.fetched.toLocaleString() }} / {{ syncProgress.total.toLocaleString() }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
              <div
                class="bg-indigo-600 h-full rounded-full transition-all duration-300 absolute left-0 top-0"
                :style="{ width: `${Math.round(syncProgressPercent)}%` }"
                :title="`${Math.round(syncProgressPercent)}% (${syncProgress.fetched}/${syncProgress.total})`"
              ></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-gray-400">Bytes</span>
              <span class="text-white font-medium">{{ formatBytes(syncProgress.bytes) }} / {{ formatBytes(manifest?.total_size || 0) }}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
              <div
                class="bg-green-600 h-full rounded-full transition-all duration-300 absolute left-0 top-0"
                :style="{ width: manifest && manifest.total_size > 0 ? `${Math.min(100, Math.max(0, (syncProgress.bytes / manifest.total_size * 100)))}%` : '0%' }"
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
            <span class="text-xs text-gray-400 ml-2">• </span>
            <span class="text-xs text-white font-medium">{{ formatBytes(Math.round(syncProgress.rate * (manifest?.chunk_size || 51))) }}/s</span>
            <span v-if="estimatedTimeRemaining !== null" class="text-xs text-gray-400 ml-2">• ETA: </span>
            <span v-if="estimatedTimeRemaining !== null" class="text-xs text-white font-medium">{{ formatTimeRemaining(estimatedTimeRemaining) }}</span>
          </div>
        </div>
      </div>

      <!-- File Verification -->
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
      <div class="flex gap-2">
        <button
          @click="$emit('sync-chunks')"
          :disabled="!manifest || loading"
          class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ verified && fileData ? 'Re-sync' : 'Download Program' }}
        </button>
        <button
          v-if="verified && fileData"
          @click="$emit('clear-cache')"
          :disabled="loading"
          class="px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear cache and re-sync from blockchain"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <!-- Cache indicator -->
      <div v-if="verified && fileData" class="mt-2 text-xs text-green-400 flex items-center">
        <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span v-if="loadedFromCache">Loaded from cache</span>
        <span v-else>Synced from blockchain</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatBytes, formatHash, formatAddress, formatTimeRemaining } from '../utils.js'

const props = defineProps({
  manifest: Object,
  syncProgress: Object,
  verified: Boolean,
  fileData: Object,
  loading: Boolean,
  error: String,
  estimatedTimeRemaining: Number,
  loadedFromCache: Boolean
})

const syncProgressPercent = computed(() => {
  if (props.syncProgress.total === 0) return 0
  const percent = (props.syncProgress.fetched / props.syncProgress.total) * 100
  return Math.min(100, Math.max(0, percent))
})

defineEmits(['sync-chunks', 'clear-cache'])
</script>
