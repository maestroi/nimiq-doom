<template>
  <div v-if="recentGames.length > 0" class="flex items-center gap-3 py-1.5">
    <!-- Label -->
    <span
      class="text-xs whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
      style="font-family: var(--font-terminal); font-size: 1rem; letter-spacing: 0.1em; color: var(--color-muted);"
    >
      <svg class="w-3.5 h-3.5" style="color: #F43F5E;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      CONTINUE:
    </span>

    <!-- Horizontal scrolling game chips -->
    <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
      <button
        v-for="game in recentGames"
        :key="game.appId"
        @click="$emit('select', game)"
        class="flex items-center gap-2 px-3 py-1 rounded cursor-pointer whitespace-nowrap transition-all duration-200"
        style="background: rgba(45,45,94,0.5); border: 1px solid var(--color-border); color: var(--color-muted);"
        @mouseenter="e => e.currentTarget.style.borderColor = 'var(--color-primary-l)'"
        @mouseleave="e => e.currentTarget.style.borderColor = 'var(--color-border)'"
      >
        <!-- Platform badge -->
        <span
          class="text-xs px-1 rounded font-medium"
          :class="getPlatformBadgeClass(game.platform)"
          style="font-family: var(--font-terminal); letter-spacing: 0.05em;"
        >
          {{ game.platform }}
        </span>

        <!-- Game Title -->
        <span class="text-xs font-medium max-w-[100px] truncate" style="color: var(--color-text);">
          {{ game.title }}
        </span>

        <!-- Time ago -->
        <span class="text-xs" style="color: var(--color-dim);">{{ formatLastPlayed(game.lastPlayed) }}</span>
      </button>
    </div>

    <!-- Clear button -->
    <button
      @click="$emit('clear')"
      class="btn-ghost p-1 rounded cursor-pointer flex-shrink-0"
      title="Clear history"
      aria-label="Clear recently played"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { useRecentlyPlayed } from '../composables/useRecentlyPlayed.js'

defineProps({
  recentGames: {
    type: Array,
    required: true
  }
})

defineEmits(['select', 'clear'])

const { formatLastPlayed } = useRecentlyPlayed()

function getPlatformBadgeClass(platform) {
  const map = {
    DOS: 'platform-dos',
    GB: 'platform-gb',
    GBC: 'platform-gbc',
    NES: 'platform-nes'
  }
  return map[platform] || 'platform-dos'
}
</script>
