<template>
  <div class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
    <div class="px-4 py-5 sm:px-6">
      <h2 class="text-xl font-semibold text-white">Game Boy Emulator</h2>
    </div>
    <div class="px-4 py-5 sm:p-6">
      <div ref="gameContainer" class="bg-gray-900 rounded w-full mb-4 flex items-center justify-center" style="min-height: 400px; aspect-ratio: 10/9;">
        <div class="text-center text-gray-500">
          <p class="text-sm mb-2">Game Boy emulator support coming soon!</p>
          <p class="text-xs">This will support .gb and .gbc ROM files.</p>
        </div>
      </div>
      
      <div v-if="!verified" class="text-center py-4 text-gray-500">
        <p class="text-sm">Sync and verify a Game Boy ROM to enable the emulator</p>
      </div>
    </div>
    <div class="px-4 py-4 sm:px-6">
      <div class="flex flex-wrap gap-3">
        <button
          @click="$emit('download-file')"
          :disabled="!verified || loading"
          class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download File
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  verified: Boolean,
  loading: Boolean
})

const gameContainer = ref(null)

defineExpose({
  gameContainer
})

defineEmits(['download-file'])
</script>
