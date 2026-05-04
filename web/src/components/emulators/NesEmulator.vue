<template>
  <div class="retro-card glow-border-hover flex flex-col h-full">
    <!-- Card header -->
    <div class="px-4 py-3 border-b flex items-center justify-between" style="border-color: var(--color-border);">
      <div class="flex items-center gap-2">
        <svg class="h-4 w-4" style="color: #f87171;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-11 8H8v-2H6v2H4v-2H6v-2H4V8h2v2h2V8h2v4zm5.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 10 18.5 10s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
        <h2
          class="text-xs font-semibold tracking-widest"
          style="font-family: var(--font-terminal); font-size: 1.1rem; letter-spacing: 0.12em; color: var(--color-primary-l);"
        >
          NES EMULATOR
        </h2>
        <span
          v-if="gameReady"
          class="text-xs px-2 py-0.5 rounded animate-pulse"
          style="background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.3); font-family: var(--font-terminal); letter-spacing: 0.08em;"
        >
          RUNNING
        </span>
        <span
          v-else
          class="text-xs px-2 py-0.5 rounded"
          style="background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); font-family: var(--font-terminal); letter-spacing: 0.06em;"
        >
          NINTENDO
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
          <svg class="h-14 w-14 mb-4" :style="verified ? 'color: #f87171;' : 'color: rgba(248,113,113,0.3);'" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-11 8H8v-2H6v2H4v-2H6v-2H4V8h2v2h2V8h2v4zm5.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 10 18.5 10s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
          <p class="text-xs" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            {{ verified ? 'ROM VERIFIED — PRESS RUN' : 'NINTENDO ENTERTAINMENT SYSTEM' }}
          </p>
          <p v-if="!verified" class="text-xs mt-1" style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.06em;">
            POWERED BY JSNES
          </p>
        </div>

        <div
          ref="gameContainer"
          class="w-full rounded-md overflow-hidden"
          style="min-height: 720px; background: #000;"
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
  gameReady: Boolean
})

const gameContainer = ref(null)

defineExpose({ gameContainer })
defineEmits(['run-game', 'stop-game', 'download-file'])
</script>
