<template>
  <div class="retro-card glow-border-hover flex flex-col h-full">
    <!-- Card header -->
    <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color: var(--color-border);">
      <div class="flex items-center gap-2">
        <svg class="h-4 w-4 flex-shrink-0" style="color: var(--color-primary-l);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2
          class="text-xs font-semibold tracking-widest"
          style="font-family: var(--font-terminal); font-size: 1.1rem; letter-spacing: 0.12em; color: var(--color-primary-l);"
        >
          DOS EMULATOR
        </h2>
        <span
          v-if="gameReady"
          class="text-xs px-2 py-0.5 rounded animate-pulse"
          style="background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); font-family: var(--font-terminal); letter-spacing: 0.08em;"
        >
          RUNNING
        </span>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-1.5">
        <!-- Toggle on-screen controls -->
        <button
          v-if="gameReady"
          @click="showControls = !showControls"
          class="inline-flex items-center justify-center p-2 rounded-md cursor-pointer transition-all duration-150"
          :style="showControls
            ? 'border: 1px solid #A78BFA; color: #A78BFA; background: rgba(124,58,237,0.15);'
            : 'border: 1px solid var(--color-border); color: var(--color-dim); background: transparent;'"
          @mouseenter="e => { if (!showControls) e.currentTarget.style.borderColor = 'var(--color-primary-l)' }"
          @mouseleave="e => { if (!showControls) e.currentTarget.style.borderColor = 'var(--color-border)' }"
          title="Toggle On-Screen Controls"
          aria-label="Toggle on-screen controls"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </button>

        <!-- Keyboard shortcuts help -->
        <KeyboardShortcutsHelp />

        <!-- Run / Stop -->
        <button
          v-if="!gameReady"
          @click="$emit('run-game')"
          :disabled="!verified || loading"
          class="btn-cta inline-flex items-center justify-center p-2 rounded-md cursor-pointer"
          title="Run Game"
          aria-label="Run game"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          v-else
          @click="$emit('stop-game')"
          class="inline-flex items-center justify-center p-2 rounded-md cursor-pointer transition-all duration-150"
          style="background: rgba(234,88,12,0.15); border: 1px solid rgba(234,88,12,0.4); color: #fb923c;"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(234,88,12,0.25)'"
          @mouseleave="e => e.currentTarget.style.background = 'rgba(234,88,12,0.15)'"
          title="Stop Emulation"
          aria-label="Stop game"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z" />
          </svg>
        </button>

        <!-- Download -->
        <button
          @click="$emit('download-file')"
          :disabled="!verified || loading"
          class="btn-primary inline-flex items-center justify-center p-2 rounded-md cursor-pointer"
          title="Download File"
          aria-label="Download game file"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Emulator canvas area -->
    <div class="px-4 py-4 flex-1">
      <div
        class="crt-frame relative"
        :class="{ 'scanlines': !gameReady }"
      >
        <!-- Idle screen -->
        <div
          v-if="!gameReady && !loading"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-md"
          style="background: #000;"
        >
          <div class="text-center px-4">
            <p
              class="mb-3 neon-purple"
              style="font-family: var(--font-retro); font-size: 0.55rem; line-height: 2; letter-spacing: 0.1em; color: #A78BFA;"
            >
              INSERT COIN
            </p>
            <p class="text-xs" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.08em;">
              Select a game and press
            </p>
            <p class="text-xs mt-1" style="color: var(--color-primary-l); font-family: var(--font-terminal); letter-spacing: 0.08em;">
              DOWNLOAD CARTRIDGE
            </p>
          </div>
        </div>

        <!-- Loading state -->
        <div
          v-if="loading && !gameReady"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-md"
          style="background: rgba(0,0,0,0.85);"
        >
          <svg class="animate-spin h-8 w-8 mb-3" style="color: var(--color-primary-l);" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-xs" style="color: var(--color-muted); font-family: var(--font-terminal); letter-spacing: 0.08em;">LOADING...</p>
        </div>

        <div ref="gameContainer" class="w-full rounded-md" style="min-height: 520px; display: block; background: #000;"></div>
      </div>

      <!-- On-Screen Controls -->
      <div v-if="gameReady && showControls" class="mt-4 select-none">
        <div class="flex flex-wrap justify-center items-center gap-4">

          <!-- D-Pad -->
          <div class="flex flex-col items-center">
            <span class="text-xs mb-2" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.08em;">MOVE</span>
            <div class="grid grid-cols-3 gap-1">
              <div></div>
              <button @pointerdown="pressKey('ArrowUp')" @pointerup="releaseKey('ArrowUp')" @pointerleave="releaseKey('ArrowUp')"
                class="touch-btn w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg cursor-pointer"
                style="background: var(--color-card); border: 1px solid var(--color-border);" aria-label="Move up">▲</button>
              <div></div>
              <button @pointerdown="pressKey('ArrowLeft')" @pointerup="releaseKey('ArrowLeft')" @pointerleave="releaseKey('ArrowLeft')"
                class="touch-btn w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg cursor-pointer"
                style="background: var(--color-card); border: 1px solid var(--color-border);" aria-label="Move left">◀</button>
              <button @pointerdown="pressKey('ArrowDown')" @pointerup="releaseKey('ArrowDown')" @pointerleave="releaseKey('ArrowDown')"
                class="touch-btn w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg cursor-pointer"
                style="background: var(--color-card); border: 1px solid var(--color-border);" aria-label="Move down">▼</button>
              <button @pointerdown="pressKey('ArrowRight')" @pointerup="releaseKey('ArrowRight')" @pointerleave="releaseKey('ArrowRight')"
                class="touch-btn w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg cursor-pointer"
                style="background: var(--color-card); border: 1px solid var(--color-border);" aria-label="Move right">▶</button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col items-center gap-2">
            <span class="text-xs mb-1" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.08em;">ACTIONS</span>
            <div class="flex gap-2">
              <button @pointerdown="pressKey('Control')" @pointerup="releaseKey('Control')" @pointerleave="releaseKey('Control')"
                class="touch-btn w-16 h-14 rounded-lg flex items-center justify-center font-bold text-xs shadow-lg cursor-pointer"
                style="background: rgba(220,38,38,0.3); border: 1px solid rgba(220,38,38,0.5); color: #f87171; font-family: var(--font-terminal); letter-spacing: 0.06em;"
                aria-label="Fire">FIRE</button>
              <button @pointerdown="pressKey(' ')" @pointerup="releaseKey(' ')" @pointerleave="releaseKey(' ')"
                class="touch-btn w-16 h-14 rounded-lg flex items-center justify-center font-bold text-xs shadow-lg cursor-pointer"
                style="background: rgba(37,99,235,0.3); border: 1px solid rgba(37,99,235,0.5); color: #60a5fa; font-family: var(--font-terminal); letter-spacing: 0.06em;"
                aria-label="Use / Open">USE</button>
            </div>
            <div class="flex gap-2">
              <button @pointerdown="pressKey('Shift')" @pointerup="releaseKey('Shift')" @pointerleave="releaseKey('Shift')"
                class="touch-btn w-16 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-lg cursor-pointer"
                style="background: rgba(161,98,7,0.3); border: 1px solid rgba(161,98,7,0.5); color: #fbbf24; font-family: var(--font-terminal); letter-spacing: 0.06em;"
                aria-label="Run">RUN</button>
              <button @pointerdown="pressKey('Escape')" @pointerup="releaseKey('Escape')" @pointerleave="releaseKey('Escape')"
                class="touch-btn w-16 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-lg cursor-pointer"
                style="background: rgba(71,85,105,0.5); border: 1px solid var(--color-border); color: var(--color-muted); font-family: var(--font-terminal); letter-spacing: 0.06em;"
                aria-label="Escape / Menu">ESC</button>
            </div>
          </div>

          <!-- Confirm -->
          <div class="flex flex-col items-center">
            <span class="text-xs mb-2" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.08em;">CONFIRM</span>
            <button @pointerdown="pressKey('Enter')" @pointerup="releaseKey('Enter')" @pointerleave="releaseKey('Enter')"
              class="touch-btn w-20 h-12 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg cursor-pointer"
              style="background: rgba(5,150,105,0.3); border: 1px solid rgba(5,150,105,0.5); color: #34d399; font-family: var(--font-terminal); letter-spacing: 0.06em;"
              aria-label="Enter / Confirm">ENTER</button>
          </div>
        </div>

        <p class="text-center text-xs mt-3" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
          HOLD FOR CONTINUOUS INPUT
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp.vue'

defineProps({
  verified: Boolean,
  loading: Boolean,
  gameReady: Boolean
})

const gameContainer = ref(null)
const showControls = ref(false)
const pressedKeys = new Set()

function getIframe() {
  return gameContainer.value?.querySelector('iframe') ?? null
}

function sendKeyEvent(type, key) {
  const iframe = getIframe()
  if (!iframe) return

  const keyCodeMap = {
    ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
    Control: 17, Shift: 16, Enter: 13, Escape: 27, ' ': 32
  }
  const keyCode = keyCodeMap[key] || key.charCodeAt(0)

  try {
    const event = new KeyboardEvent(type, {
      key, code: key === ' ' ? 'Space' : key,
      keyCode, which: keyCode,
      bubbles: true, cancelable: true
    })
    if (iframe.contentDocument) iframe.contentDocument.dispatchEvent(event)
    if (iframe.contentWindow)   iframe.contentWindow.dispatchEvent(event)
    iframe.dispatchEvent(event)
  } catch (e) {
    console.warn('Could not dispatch key event:', e)
  }
}

function pressKey(key) {
  if (pressedKeys.has(key)) return
  pressedKeys.add(key)
  sendKeyEvent('keydown', key)
}

function releaseKey(key) {
  if (!pressedKeys.has(key)) return
  pressedKeys.delete(key)
  sendKeyEvent('keyup', key)
}

defineExpose({ gameContainer })
defineEmits(['run-game', 'stop-game', 'download-file'])
</script>

<style scoped>
.touch-btn {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.touch-btn:active {
  transform: scale(0.93);
}
</style>
