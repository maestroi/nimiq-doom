<template>
  <div class="retro-card glow-border-hover flex flex-col h-full">
    <!-- Card header -->
    <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color: var(--color-border);">
      <div class="flex items-center gap-2">
        <svg class="h-4 w-4" style="color: #34d399;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 4H7c-2.21 0-4 1.79-4 4v8c0 2.21 1.79 4 4 4h10c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4zM8 14H6v-2h2v2zm0-3H6V9h2v2zm3 3H9v-2h2v2zm0-3H9V9h2v2zm5 2h-2v2h-1v-2h-2v-1h2v-2h1v2h2v1z"/>
        </svg>
        <h2
          class="text-xs font-semibold tracking-widest"
          style="font-family: var(--font-terminal); font-size: 1.1rem; letter-spacing: 0.12em; color: var(--color-primary-l);"
        >
          GAME BOY EMULATOR
        </h2>
        <span
          v-if="gameReady"
          class="text-xs px-2 py-0.5 rounded animate-pulse"
          style="background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); font-family: var(--font-terminal); letter-spacing: 0.08em;"
        >
          RUNNING
        </span>
        <span
          v-else-if="platform === 'GBC'"
          class="text-xs px-2 py-0.5 rounded"
          style="background: rgba(167,139,250,0.15); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); font-family: var(--font-terminal); letter-spacing: 0.06em;"
        >
          COLOR
        </span>
        <span
          v-else
          class="text-xs px-2 py-0.5 rounded"
          style="background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); font-family: var(--font-terminal); letter-spacing: 0.06em;"
        >
          CLASSIC
        </span>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-1.5">
        <KeyboardShortcutsHelp />

        <button
          v-if="!gameReady"
          @click="$emit('run-game')"
          :disabled="!verified || loading"
          class="btn-cta inline-flex items-center justify-center p-2 rounded-md cursor-pointer"
          title="Run Game"
          aria-label="Run game"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          v-else
          @click="$emit('stop-game')"
          class="inline-flex items-center justify-center p-2 rounded-md cursor-pointer transition-all duration-150"
          style="background: rgba(234,88,12,0.15); border: 1px solid rgba(234,88,12,0.4); color: #fb923c;"
          title="Stop Emulation"
          aria-label="Stop game"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z" />
          </svg>
        </button>
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

    <!-- Emulator area -->
    <div class="px-4 py-4 flex-1">
      <div class="crt-frame relative" :class="{ 'scanlines': !gameReady }">
        <!-- Idle placeholder -->
        <div
          v-show="!gameReady"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-md"
          style="background: #000;"
        >
          <svg class="h-14 w-14 mb-4" :style="verified ? 'color: #34d399;' : 'color: rgba(52,211,153,0.3);'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 4H7c-2.21 0-4 1.79-4 4v8c0 2.21 1.79 4 4 4h10c2.21 0 4-1.79 4-4V8c0-2.21-1.79-4-4-4zM8 14H6v-2h2v2zm0-3H6V9h2v2zm3 3H9v-2h2v2zm0-3H9V9h2v2zm5 2h-2v2h-1v-2h-2v-1h2v-2h1v2h2v1z"/>
          </svg>
          <p class="text-xs" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            {{ verified ? 'ROM VERIFIED — PRESS RUN' : 'GAME BOY / COLOR' }}
          </p>
          <p v-if="!verified" class="text-xs mt-1" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            POWERED BY BINJGB
          </p>
        </div>

        <div
          ref="gameContainer"
          class="w-full rounded-md overflow-hidden"
          style="min-height: 580px; background: #000;"
        ></div>
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
  gameReady: Boolean,
  platform: { type: String, default: 'GB' }
})

const gameContainer = ref(null)

defineExpose({ gameContainer })
defineEmits(['run-game', 'stop-game', 'download-file'])
</script>
