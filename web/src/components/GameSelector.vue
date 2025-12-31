<template>
  <div class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
    <div class="px-4 py-5 sm:px-6">
      <h2 class="text-xl font-semibold text-white">Select Game & Download</h2>
    </div>
    <div class="px-4 py-5 sm:p-6">
      <div class="space-y-4">
        <!-- Game Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Game</label>
          <select
            :value="selectedGame ? selectedGame.appId : ''"
            @change="onGameSelect($event.target.value)"
            class="w-full text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
          >
            <option value="">-- Select Game --</option>
            <option v-for="game in games" :key="game.appId" :value="game.appId">
              {{ game.title }} ({{ game.platform }})
            </option>
          </select>
        </div>
        
        <!-- Version Selection -->
        <div v-if="selectedGame && selectedGame.versions.length > 0">
          <label class="block text-sm font-medium text-gray-300 mb-2">Version</label>
          <select
            :value="selectedVersion ? selectedVersion.semver.string : ''"
            @change="onVersionSelect($event.target.value)"
            class="w-full text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
          >
            <option value="">-- Select Version --</option>
            <option v-for="version in selectedGame.versions" :key="version.semver.string" :value="version.semver.string">
              v{{ version.semver.string }}
            </option>
          </select>
        </div>
        
        <!-- Cartridge Info (when version selected) -->
        <div v-if="selectedVersion && (cartHeader || runJson)" class="pt-4 border-t border-gray-700 dark:border-white/10">
          <h3 class="text-sm font-semibold text-white mb-3">Cartridge Info</h3>
          <dl class="space-y-2 text-sm">
            <div v-if="runJson?.title">
              <dt class="text-xs font-medium text-gray-400">Title</dt>
              <dd class="mt-0.5 text-white font-semibold">{{ runJson.title }}</dd>
            </div>
            <div v-if="platformName">
              <dt class="text-xs font-medium text-gray-400">Platform</dt>
              <dd class="mt-0.5 text-white">{{ platformName }}</dd>
            </div>
            <div v-if="cartHeader">
              <dt class="text-xs font-medium text-gray-400">Total Size</dt>
              <dd class="mt-0.5 text-sm text-white">{{ formatBytes(cartHeader.totalSize) }}</dd>
            </div>
            <div v-if="cartHeader">
              <dt class="text-xs font-medium text-gray-400">SHA256</dt>
              <dd class="mt-0.5 text-xs text-white font-mono break-words">{{ formatHash(cartHeader.sha256) }}</dd>
            </div>
          </dl>
        </div>

        <!-- Download Progress -->
        <div v-if="syncProgress && syncProgress.expectedChunks > 0" class="pt-4 border-t border-gray-700 dark:border-white/10">
          <h3 class="text-sm font-semibold text-white mb-2">Download Progress</h3>
          <div class="space-y-2">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-400">Chunks</span>
                <span class="text-white font-medium">{{ syncProgress.chunksFound.toLocaleString() }} / {{ syncProgress.expectedChunks.toLocaleString() }}</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
                <div
                  class="bg-indigo-600 h-full rounded-full transition-all duration-300 absolute left-0 top-0"
                  :style="{ width: `${Math.round(progressPercent)}%` }"
                  :title="`${Math.round(progressPercent)}% (${syncProgress.chunksFound}/${syncProgress.expectedChunks})`"
                ></div>
              </div>
            </div>
            <div v-if="cartHeader">
              <div class="flex justify-between text-xs mb-1">
                <span class="text-gray-400">Bytes</span>
                <span class="text-white font-medium">{{ formatBytes(syncProgress.bytes) }} / {{ formatBytes(cartHeader.totalSize) }}</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
                <div
                  class="bg-green-600 h-full rounded-full transition-all duration-300 absolute left-0 top-0"
                  :style="{ width: cartHeader && cartHeader.totalSize > 0 ? `${Math.min(100, Math.max(0, (syncProgress.bytes / cartHeader.totalSize * 100)))}%` : '0%' }"
                ></div>
              </div>
            </div>
            <div class="text-center pt-1">
              <span class="text-lg font-bold text-white">{{ Math.round(progressPercent) }}%</span>
              <span class="text-xs text-gray-400 ml-1">Complete</span>
            </div>
            <div v-if="syncProgress.rate > 0" class="text-center pt-1">
              <span class="text-xs text-gray-400">Speed: </span>
              <span class="text-xs text-white font-medium">{{ syncProgress.rate.toFixed(1) }} chunks/s</span>
            </div>
          </div>
        </div>

        <!-- File Verification -->
        <div v-if="verified && !error" class="pt-3 border-t border-gray-700 dark:border-white/10">
          <div class="flex items-center">
            <svg class="h-4 w-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <div>
              <div class="text-xs font-medium text-green-200">File Verified</div>
              <div class="text-xs text-green-300">SHA256 verified</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Download Button -->
    <div class="px-4 py-4 sm:px-6 border-t border-gray-700 dark:border-white/10">
      <div class="flex gap-2">
        <button
          @click="$emit('load-cartridge')"
          :disabled="loading || !selectedVersion"
          class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else-if="verified && fileData" class="-ml-1 mr-2 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ verified && fileData ? 'Re-sync' : (loading ? 'Downloading...' : 'Download Cartridge') }}
        </button>
        <button
          v-if="verified && fileData"
          @click="$emit('clear-cache')"
          :disabled="loading"
          class="inline-flex items-center justify-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear cache and force re-download"
        >
          <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <!-- Status indicator -->
      <div v-if="verified && fileData" class="mt-2 text-xs text-green-400 flex items-center">
        <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>Downloaded and verified</span>
      </div>
      <div v-else-if="!loading && !cartHeader && selectedVersion" class="mt-2 text-xs text-gray-400">
        Click "Download Cartridge" to start downloading
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatBytes, formatHash } from '../utils.js'

const props = defineProps({
  games: Array,
  selectedGame: Object,
  selectedVersion: Object,
  cartHeader: Object,
  runJson: Object,
  syncProgress: Object,
  verified: Boolean,
  fileData: Object,
  loading: Boolean,
  error: String,
  progressPercent: Number
})

const emit = defineEmits(['update:game', 'update:version', 'load-cartridge', 'clear-cache'])

function onGameSelect(appId) {
  const game = props.games?.find(g => g.appId === Number(appId))
  emit('update:game', game || null)
}

function onVersionSelect(semverString) {
  if (!props.selectedGame) return
  const version = props.selectedGame.versions.find(v => v.semver.string === semverString)
  emit('update:version', version || null)
}

const platformName = computed(() => {
  if (props.runJson?.platform) return props.runJson.platform
  if (!props.cartHeader) return null
  const platformCode = props.cartHeader.platform
  return platformCode === 0 ? 'DOS' : 
         platformCode === 1 ? 'GB' :
         platformCode === 2 ? 'GBC' : `Platform ${platformCode}`
})
</script>

