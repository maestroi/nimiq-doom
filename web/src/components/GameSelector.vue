<template>
  <div class="retro-card glow-border-hover flex flex-col h-full">
    <!-- Card header -->
    <div class="px-4 py-3 border-b flex items-center gap-2" style="border-color: var(--color-border);">
      <svg class="h-4 w-4 flex-shrink-0" style="color: var(--color-primary-l);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
      <h2
        class="text-xs font-semibold tracking-widest"
        style="font-family: var(--font-terminal); font-size: 1.1rem; letter-spacing: 0.12em; color: var(--color-primary-l);"
      >
        SELECT GAME
      </h2>
    </div>

    <div class="px-4 py-4 flex-1 overflow-y-auto">
      <!-- Loading Skeleton -->
      <LoadingSkeleton v-if="catalogLoading" :show-cards="true" :card-count="3" />

      <div v-else class="space-y-3">
        <!-- Platform Selection -->
        <div v-if="availablePlatforms.length > 1">
          <label class="block text-xs font-medium mb-1.5" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            PLATFORM
          </label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="platform in availablePlatforms"
              :key="platform"
              @click="onPlatformSelect(selectedPlatform === platform ? null : platform)"
              class="px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all duration-150"
              :class="[
                getPlatformBadgeClass(platform),
                selectedPlatform === platform ? 'ring-1 ring-offset-1 ring-offset-transparent' : 'opacity-60 hover:opacity-90'
              ]"
              :style="selectedPlatform === platform ? 'ring-color: var(--color-primary-l);' : ''"
              style="font-family: var(--font-terminal); letter-spacing: 0.05em;"
            >
              {{ platform }}
            </button>
          </div>
        </div>

        <!-- Game Selection -->
        <div class="relative" ref="gameDropdownRef">
          <label class="block text-xs font-medium mb-1.5" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            GAME
            <span v-if="selectedGame" class="ml-2 font-normal" style="color: var(--color-dim); font-family: var(--font-ui); letter-spacing: 0; font-size: 0.65rem;">
              ID: {{ selectedGame.appId }}
            </span>
          </label>

          <div class="relative">
            <input
              ref="gameInputRef"
              type="text"
              :value="gameInputValue"
              @input="onGameInputChange($event.target.value)"
              @focus="openGameDropdown"
              @keydown="onGameKeydown"
              :placeholder="selectedGame ? '' : 'Search or select...'"
              class="retro-input w-full pr-8"
              aria-label="Select game"
            />
            <button
              v-if="gameSearchQuery || selectedGame"
              @click="clearGameSelection"
              class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-150"
              style="color: var(--color-dim);"
              @mouseenter="e => e.currentTarget.style.color = 'var(--color-text)'"
              @mouseleave="e => e.currentTarget.style.color = 'var(--color-dim)'"
              type="button"
              aria-label="Clear selection"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              v-else
              @click="toggleGameDropdown"
              class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer transition-colors duration-150"
              style="color: var(--color-dim);"
              type="button"
              aria-label="Toggle game list"
            >
              <svg class="w-4 h-4 transition-transform duration-150" :class="{ 'rotate-180': gameDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <!-- Dropdown list -->
          <div
            v-show="gameDropdownOpen"
            class="absolute z-20 w-full mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto"
            style="background: var(--color-surface); border: 1px solid var(--color-primary); box-shadow: 0 0 20px rgba(124,58,237,0.25);"
          >
            <div v-if="filteredGames.length === 0" class="px-3 py-2 text-xs" style="color: var(--color-dim);">
              No games found
            </div>
            <button
              v-for="(game, index) in filteredGames"
              :key="game.appId"
              @click="selectGame(game)"
              @mouseenter="highlightedIndex = index"
              :class="[
                'w-full text-left px-3 py-2 text-xs transition-colors duration-100 flex items-center justify-between cursor-pointer',
                highlightedIndex === index ? 'bg-purple-600/30' : '',
                selectedGame?.appId === game.appId ? 'bg-purple-900/40' : ''
              ]"
              :style="highlightedIndex !== index && selectedGame?.appId !== game.appId ? 'color: var(--color-muted);' : 'color: var(--color-text);'"
              type="button"
            >
              <span class="truncate">{{ game.title }}{{ game.retired ? ' (Retired)' : '' }}</span>
              <span
                class="text-xs ml-2 flex-shrink-0 px-1.5 py-0.5 rounded"
                :class="getPlatformBadgeClass(game.platform)"
                style="font-family: var(--font-terminal); letter-spacing: 0.04em;"
              >
                {{ game.platform }}
              </span>
            </button>
          </div>
        </div>

        <!-- Version Selection -->
        <div v-if="selectedGame && selectedGame.versions.length > 0">
          <label class="block text-xs font-medium mb-1.5" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            VERSION
          </label>
          <select
            :value="selectedVersion ? selectedVersion.semver.string : ''"
            @change="onVersionSelect($event.target.value)"
            class="retro-select w-full text-xs"
          >
            <option value="">-- Select Version --</option>
            <option v-for="version in selectedGame.versions" :key="version.semver.string" :value="version.semver.string">
              v{{ version.semver.string }}
            </option>
          </select>
        </div>

        <!-- Game Info -->
        <div v-if="selectedGame" class="pt-3 border-t" style="border-color: var(--color-border);">
          <h3 class="text-sm font-semibold mb-1" style="color: var(--color-text);">
            {{ runJson?.title || selectedGame?.title }}
          </h3>
          <p v-if="runJson?.description" class="text-xs leading-relaxed" style="color: var(--color-muted);">
            {{ runJson.description }}
          </p>
        </div>

        <!-- Cartridge Info -->
        <div v-if="selectedVersion && (cartHeader || runJson)" class="pt-3 border-t space-y-2" style="border-color: var(--color-border);">
          <h3
            class="text-xs font-semibold tracking-widest"
            style="font-family: var(--font-terminal); font-size: 0.95rem; letter-spacing: 0.1em; color: var(--color-primary-l);"
          >
            CARTRIDGE INFO
          </h3>

          <dl class="space-y-2">
            <div v-if="platformName" class="flex items-center justify-between">
              <dt class="text-xs" style="color: var(--color-dim);">Platform</dt>
              <dd>
                <span class="text-xs px-1.5 py-0.5 rounded" :class="getPlatformBadgeClass(platformName)" style="font-family: var(--font-terminal); letter-spacing: 0.04em;">
                  {{ platformName }}
                </span>
              </dd>
            </div>

            <!-- Cartridge Address -->
            <div v-if="selectedVersion.cartridgeAddress">
              <dt class="text-xs mb-0.5" style="color: var(--color-dim);">Cartridge Address</dt>
              <dd class="text-xs font-mono flex items-center gap-1" style="color: var(--color-text); font-family: var(--font-terminal);">
                <span class="truncate" :title="selectedVersion.cartridgeAddress">{{ formatHash(selectedVersion.cartridgeAddress) }}</span>
                <button
                  @click="handleCopy(selectedVersion.cartridgeAddress, 'address')"
                  class="p-1 rounded cursor-pointer transition-colors duration-150 flex-shrink-0"
                  style="color: var(--color-dim);"
                  @mouseenter="e => e.currentTarget.style.color = 'var(--color-primary-l)'"
                  @mouseleave="e => e.currentTarget.style.color = 'var(--color-dim)'"
                  :title="copiedField === 'address' ? 'Copied!' : 'Copy address'"
                  aria-label="Copy cartridge address"
                >
                  <svg v-if="copiedField === 'address'" class="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </dd>
            </div>

            <div v-if="cartHeader" class="flex items-center justify-between">
              <dt class="text-xs" style="color: var(--color-dim);">Size</dt>
              <dd class="text-xs" style="color: var(--color-text); font-family: var(--font-terminal);">{{ formatBytes(cartHeader.totalSize) }}</dd>
            </div>

            <div v-if="cartHeader">
              <dt class="text-xs mb-0.5" style="color: var(--color-dim);">SHA256</dt>
              <dd class="text-xs font-mono flex items-center gap-1" style="color: var(--color-text); font-family: var(--font-terminal);">
                <span class="truncate">{{ formatHash(cartHeader.sha256) }}</span>
                <button
                  @click="handleCopy(cartHeader.sha256, 'sha256')"
                  class="p-1 rounded cursor-pointer transition-colors duration-150 flex-shrink-0"
                  style="color: var(--color-dim);"
                  @mouseenter="e => e.currentTarget.style.color = 'var(--color-primary-l)'"
                  @mouseleave="e => e.currentTarget.style.color = 'var(--color-dim)'"
                  :title="copiedField === 'sha256' ? 'Copied!' : 'Copy hash'"
                  aria-label="Copy SHA256 hash"
                >
                  <svg v-if="copiedField === 'sha256'" class="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <span v-if="verified" class="text-green-400 flex-shrink-0" title="SHA256 verified">
                  <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </span>
              </dd>
            </div>

            <div v-if="cartHeader && cartHeader.publisherVerified !== undefined" class="flex items-center justify-between">
              <dt class="text-xs" style="color: var(--color-dim);">Publisher</dt>
              <dd class="text-xs flex items-center gap-1">
                <span v-if="cartHeader.publisherVerified" class="flex items-center gap-1 text-green-400">
                  <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Verified
                </span>
                <span v-else class="flex items-center gap-1 text-yellow-400">
                  <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  Not verified
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Download Progress -->
        <div
          v-if="(loading || verified) && selectedVersion && syncProgress && (syncProgress.expectedChunks > 0 || syncProgress.txPagesFetched > 0)"
          class="pt-3 border-t space-y-2.5"
          style="border-color: var(--color-border);"
        >
          <h3
            class="text-xs tracking-widest"
            style="font-family: var(--font-terminal); font-size: 0.95rem; letter-spacing: 0.1em; color: var(--color-primary-l);"
          >
            DOWNLOADING
          </h3>

          <div v-if="syncProgress && (syncProgress.expectedChunks > 0 || syncProgress.txPagesFetched > 0)" class="space-y-2.5">
            <!-- TX Fetching -->
            <div v-if="syncProgress.txEstimatedPages > 0 || syncProgress.txPagesFetched > 0">
              <div class="flex justify-between text-xs mb-1">
                <span style="color: var(--color-dim);">Transactions</span>
                <span style="color: var(--color-text); font-family: var(--font-terminal);">
                  <span v-if="syncProgress.txPagesFetched > 0">Pg {{ syncProgress.txPagesFetched }}</span>
                  <span v-if="syncProgress.txEstimatedPages > 0"> / {{ syncProgress.txEstimatedPages }}</span>
                  <span v-if="syncProgress.txTotalFetched > 0"> ({{ syncProgress.txTotalFetched.toLocaleString() }} tx)</span>
                </span>
              </div>
              <div class="retro-progress-track">
                <div
                  class="retro-progress-fill-blue"
                  :style="{ width: syncProgress.txEstimatedPages > 0 ? `${Math.min(100, Math.max(0, (syncProgress.txPagesFetched / syncProgress.txEstimatedPages * 100)))}%` : (syncProgress.phase === 'fetching-txs' ? '10%' : '100%') }"
                ></div>
              </div>
            </div>

            <!-- Chunks -->
            <div v-if="syncProgress.expectedChunks > 0">
              <div class="flex justify-between text-xs mb-1">
                <span style="color: var(--color-dim);">Chunks</span>
                <span style="color: var(--color-text); font-family: var(--font-terminal);">
                  {{ syncProgress.chunksFound.toLocaleString() }} / {{ syncProgress.expectedChunks.toLocaleString() }}
                </span>
              </div>
              <div class="retro-progress-track">
                <div
                  class="retro-progress-fill-purple"
                  :style="{ width: `${Math.round(progressPercent)}%` }"
                ></div>
              </div>
            </div>

            <!-- Bytes -->
            <div v-if="cartHeader">
              <div class="flex justify-between text-xs mb-1">
                <span style="color: var(--color-dim);">Bytes</span>
                <span style="color: var(--color-text); font-family: var(--font-terminal);">
                  {{ formatBytes(syncProgress.bytes) }} / {{ formatBytes(cartHeader.totalSize) }}
                </span>
              </div>
              <div class="retro-progress-track">
                <div
                  class="retro-progress-fill-green"
                  :style="{ width: cartHeader && cartHeader.totalSize > 0 ? `${Math.min(100, Math.max(0, (syncProgress.bytes / cartHeader.totalSize * 100)))}%` : '0%' }"
                ></div>
              </div>
            </div>

            <!-- Overall percentage + ETA -->
            <div class="flex items-center justify-between pt-1">
              <div>
                <span class="text-xl font-bold" style="color: var(--color-text); font-family: var(--font-terminal);">
                  {{ Math.round(combinedProgress) }}%
                </span>
                <span class="text-xs ml-1" style="color: var(--color-dim);">complete</span>
              </div>
              <div class="text-right text-xs">
                <span v-if="syncProgress.rate > 0" style="color: var(--color-muted); font-family: var(--font-terminal);">
                  {{ syncProgress.rate.toFixed(1) }} chunks/s
                </span>
                <span v-if="estimatedTimeRemaining && syncProgress.chunksFound < syncProgress.expectedChunks" class="ml-2" style="color: #F43F5E; font-family: var(--font-terminal);">
                  ETA: {{ estimatedTimeRemaining }}
                </span>
              </div>
            </div>
          </div>

          <!-- Init spinner -->
          <div v-else class="flex items-center justify-center py-4 gap-2">
            <svg class="animate-spin h-4 w-4" style="color: var(--color-primary-l);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm" style="color: var(--color-muted);">{{ syncProgress?.statusMessage || 'Loading cartridge...' }}</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Download buttons -->
    <div class="px-4 py-3 border-t" style="border-color: var(--color-border);">
      <div class="flex gap-2">
        <button
          @click="$emit('load-cartridge')"
          :disabled="loading || !selectedVersion"
          class="btn-cta flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md cursor-pointer"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else-if="verified && fileData" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ verified && fileData ? 'RE-SYNC' : (loading ? 'DOWNLOADING...' : 'DOWNLOAD CARTRIDGE') }}
        </button>

        <button
          v-if="verified && fileData"
          @click="$emit('clear-cache')"
          :disabled="loading"
          class="btn-ghost inline-flex items-center justify-center p-2 rounded-md cursor-pointer"
          title="Clear cache and re-download"
          aria-label="Clear cache"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <!-- Status indicator -->
      <div v-if="verified && fileData" class="mt-2 text-xs flex items-center gap-1 text-green-400">
        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Downloaded &amp; verified
      </div>
      <div v-else-if="!loading && !cartHeader && selectedVersion" class="mt-2 text-xs" style="color: var(--color-dim);">
        Press DOWNLOAD CARTRIDGE to begin
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { formatBytes, formatHash, copyToClipboard, estimateDownloadTime } from '../utils.js'
import LoadingSkeleton from './LoadingSkeleton.vue'

const props = defineProps({
  games: Array,
  selectedGame: Object,
  selectedVersion: Object,
  selectedPlatform: String,
  cartHeader: Object,
  runJson: Object,
  syncProgress: Object,
  verified: Boolean,
  fileData: Object,
  loading: Boolean,
  catalogLoading: Boolean,
  error: String,
  progressPercent: Number
})

const emit = defineEmits(['update:platform', 'update:game', 'update:version', 'load-cartridge', 'clear-cache'])

// Game dropdown state
const gameDropdownRef = ref(null)
const gameInputRef = ref(null)
const gameDropdownOpen = ref(false)
const gameSearchQuery = ref('')
const highlightedIndex = ref(0)

const gameInputValue = computed(() => {
  if (gameDropdownOpen.value) return gameSearchQuery.value
  return props.selectedGame?.title || ''
})

function openGameDropdown() {
  gameDropdownOpen.value = true
  gameSearchQuery.value = ''
  highlightedIndex.value = 0
}

function toggleGameDropdown() {
  if (gameDropdownOpen.value) {
    gameDropdownOpen.value = false
  } else {
    openGameDropdown()
    gameInputRef.value?.focus()
  }
}

function onGameInputChange(value) {
  gameSearchQuery.value = value
  gameDropdownOpen.value = true
  highlightedIndex.value = 0
}

function onGameKeydown(event) {
  if (!gameDropdownOpen.value && (event.key === 'ArrowDown' || event.key === 'Enter')) {
    openGameDropdown()
    event.preventDefault()
    return
  }
  if (!gameDropdownOpen.value) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredGames.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      break
    case 'Enter':
      event.preventDefault()
      if (filteredGames.value[highlightedIndex.value]) selectGame(filteredGames.value[highlightedIndex.value])
      break
    case 'Escape':
      event.preventDefault()
      gameDropdownOpen.value = false
      gameSearchQuery.value = ''
      break
  }
}

function selectGame(game) {
  emit('update:game', game)
  gameDropdownOpen.value = false
  gameSearchQuery.value = ''
  gameInputRef.value?.blur()
}

function clearGameSelection() {
  emit('update:game', null)
  gameSearchQuery.value = ''
  gameDropdownOpen.value = false
}

function handleClickOutside(event) {
  if (gameDropdownRef.value && !gameDropdownRef.value.contains(event.target)) {
    gameDropdownOpen.value = false
    gameSearchQuery.value = ''
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

const copiedField = ref(null)

async function handleCopy(text, field) {
  const success = await copyToClipboard(text)
  if (success) {
    copiedField.value = field
    setTimeout(() => { copiedField.value = null }, 2000)
  }
}

const availablePlatforms = computed(() => {
  if (!props.games || props.games.length === 0) return []
  return [...new Set(props.games.map(g => g.platform).filter(Boolean))].sort()
})

const filteredGames = computed(() => {
  if (!props.games || props.games.length === 0) return []
  let filtered = props.games
  if (props.selectedPlatform) filtered = filtered.filter(g => g.platform === props.selectedPlatform)
  if (gameSearchQuery.value) {
    const q = gameSearchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(g => g.title?.toLowerCase().includes(q) || g.platform?.toLowerCase().includes(q))
  }
  return filtered
})

const estimatedTimeRemaining = computed(() => {
  if (!props.syncProgress || !props.cartHeader) return null
  const remaining = props.syncProgress.expectedChunks - props.syncProgress.chunksFound
  if (remaining <= 0 || !props.syncProgress.rate) return null
  return estimateDownloadTime(remaining, props.syncProgress.rate)
})

function onPlatformSelect(platform) {
  emit('update:platform', platform || null)
}

function onVersionSelect(semverString) {
  if (!props.selectedGame) return
  const version = props.selectedGame.versions.find(v => v.semver.string === semverString)
  emit('update:version', version || null)
}

const platformName = computed(() => {
  if (props.runJson?.platform) return props.runJson.platform
  if (!props.cartHeader) return null
  const code = props.cartHeader.platform
  return code === 0 ? 'DOS' : code === 1 ? 'GB' : code === 2 ? 'GBC' : `Platform ${code}`
})

const combinedProgress = computed(() => {
  if (!props.syncProgress) return 0
  const progress = props.syncProgress
  if (progress.expectedChunks > 0) {
    const chunkProgress = Math.min(1, progress.chunksFound / progress.expectedChunks)
    if (progress.chunksFound >= progress.expectedChunks) {
      if (props.cartHeader && props.cartHeader.totalSize > 0 && progress.bytes > 0) {
        return 90 + (Math.min(1, progress.bytes / props.cartHeader.totalSize) * 10)
      }
      return 90
    }
    return chunkProgress * 90
  }
  if (progress.txEstimatedPages > 0) return Math.min(1, progress.txPagesFetched / progress.txEstimatedPages) * 10
  if (progress.phase === 'fetching-txs') return 5
  return 0
})

function getPlatformBadgeClass(platform) {
  const map = { DOS: 'platform-dos', GB: 'platform-gb', GBC: 'platform-gbc', NES: 'platform-nes' }
  return map[platform] || 'platform-dos'
}
</script>
