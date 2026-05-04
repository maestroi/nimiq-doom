<template>
  <!-- Error state -->
  <div v-if="hasError" class="retro-card flex flex-col">
    <div class="px-4 py-3 border-b flex items-center gap-2" style="border-color: rgba(220,38,38,0.4);">
      <svg class="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h2
        class="text-xs font-semibold tracking-widest text-red-400"
        style="font-family: var(--font-terminal); font-size: 1.1rem; letter-spacing: 0.12em;"
      >
        EMULATOR ERROR
      </h2>
    </div>

    <div class="px-4 py-8 flex flex-col items-center gap-4 flex-1">
      <p class="text-sm text-red-300 text-center">The emulator encountered an error and stopped.</p>
      <pre class="text-xs text-center px-4 py-2 rounded w-full max-w-md"
        style="color: var(--color-muted); background: rgba(0,0,0,0.4); border: 1px solid var(--color-border); font-family: var(--font-terminal); white-space: pre-wrap; word-break: break-word;"
      >{{ errorMessage }}</pre>
      <button
        @click="clearError"
        class="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-md cursor-pointer"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        TRY AGAIN
      </button>
    </div>

    <div class="px-4 py-3 border-t" style="border-color: var(--color-border);">
      <button
        @click="$emit('download-file')"
        :disabled="!verified || loading"
        class="btn-ghost w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md cursor-pointer"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download File Instead
      </button>
    </div>
  </div>

  <!-- Platform emulators -->
  <DosEmulator
    v-else-if="platform === 'DOS'"
    :verified="verified"
    :loading="loading"
    :game-ready="gameReady"
    @run-game="$emit('run-game')"
    @stop-game="$emit('stop-game')"
    @download-file="$emit('download-file')"
    ref="emulatorRef"
  />
  <GameBoyEmulator
    v-else-if="platform === 'GB' || platform === 'GBC'"
    :verified="verified"
    :loading="loading"
    :game-ready="gameReady"
    :platform="platform"
    @run-game="$emit('run-game')"
    @stop-game="$emit('stop-game')"
    @download-file="$emit('download-file')"
    ref="emulatorRef"
  />
  <NesEmulator
    v-else-if="platform === 'NES'"
    :verified="verified"
    :loading="loading"
    :game-ready="gameReady"
    @run-game="$emit('run-game')"
    @stop-game="$emit('stop-game')"
    @download-file="$emit('download-file')"
    ref="emulatorRef"
  />

  <!-- Unknown platform -->
  <div v-else class="retro-card flex flex-col">
    <div class="px-4 py-3 border-b" style="border-color: var(--color-border);">
      <h2
        class="text-xs font-semibold tracking-widest"
        style="font-family: var(--font-terminal); font-size: 1.1rem; letter-spacing: 0.12em; color: var(--color-primary-l);"
      >
        {{ platform || 'UNKNOWN' }} EMULATOR
      </h2>
    </div>
    <div class="px-4 py-8 flex-1 flex flex-col items-center justify-center gap-3">
      <p class="text-sm text-center" style="color: var(--color-muted);">
        Emulator support for <span style="color: var(--color-primary-l);">{{ platform || 'Unknown' }}</span> is not yet implemented.
      </p>
      <button
        @click="$emit('download-file')"
        :disabled="!verified || loading"
        class="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-md cursor-pointer"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download File
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured, watch } from 'vue'
import DosEmulator from './emulators/DosEmulator.vue'
import GameBoyEmulator from './emulators/GameBoyEmulator.vue'
import NesEmulator from './emulators/NesEmulator.vue'

const props = defineProps({
  platform: String,
  verified: Boolean,
  loading: Boolean,
  gameReady: Boolean
})

const emulatorRef = ref(null)
const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((error) => {
  hasError.value = true
  errorMessage.value = error?.message || 'An unexpected error occurred'
  return false
})

function clearError() {
  hasError.value = false
  errorMessage.value = ''
}

watch(() => props.platform, () => {
  if (hasError.value) clearError()
})

defineExpose({ emulatorRef, hasError, clearError })
defineEmits(['run-game', 'stop-game', 'download-file'])
</script>
