<template>
  <div class="relative" ref="containerRef">
    <!-- Toggle button -->
    <button
      @click="showHelp = !showHelp"
      class="inline-flex items-center justify-center p-2 rounded-md cursor-pointer transition-all duration-150"
      :style="showHelp
        ? 'border: 1px solid var(--color-primary-l); color: var(--color-primary-l); background: rgba(124,58,237,0.15);'
        : 'border: 1px solid var(--color-border); color: var(--color-dim); background: transparent;'"
      title="Keyboard Shortcuts"
      aria-label="Toggle keyboard shortcuts"
      @mouseenter="e => { if (!showHelp) e.currentTarget.style.borderColor = 'var(--color-primary-l)' }"
      @mouseleave="e => { if (!showHelp) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-dim)'; } }"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    </button>

    <!-- Shortcuts panel -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="showHelp"
        class="absolute right-0 top-full mt-2 w-64 rounded-lg z-50"
        style="
          background: var(--color-card);
          border: 1px solid var(--color-primary);
          box-shadow: 0 0 20px rgba(124,58,237,0.25), 0 8px 24px rgba(0,0,0,0.5);
        "
      >
        <!-- Panel header -->
        <div class="px-3 py-2.5 border-b flex items-center gap-2" style="border-color: var(--color-border);">
          <svg class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--color-primary-l);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <h3
            class="text-xs font-semibold"
            style="font-family: var(--font-terminal); font-size: 0.9rem; letter-spacing: 0.1em; color: var(--color-primary-l);"
          >
            SHORTCUTS
          </h3>
        </div>

        <!-- Shortcut rows -->
        <div class="p-3 space-y-1.5">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.key"
            class="flex items-center justify-between"
          >
            <span class="text-xs" style="color: var(--color-muted);">{{ shortcut.description }}</span>
            <kbd class="retro-kbd">{{ shortcut.display || shortcut.key }}</kbd>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t" style="border-color: var(--color-border);">
          <p
            class="text-xs"
            style="color: var(--color-dim); font-family: var(--font-terminal); letter-spacing: 0.04em; font-size: 0.75rem;"
          >
            ACTIVE WHEN GAME IS RUNNING
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const showHelp = ref(false)
const containerRef = ref(null)

const shortcuts = [
  { key: 'F11',    description: 'Fullscreen' },
  { key: 'Escape', description: 'Exit Fullscreen', display: 'Esc' },
  { key: 'Ctrl+R', description: 'Reset Game' },
  { key: 'P',      description: 'Pause / Resume' },
  { key: 'F5',     description: 'Save State' },
  { key: 'F9',     description: 'Load State' },
  { key: 'M',      description: 'Mute / Unmute' },
]

function handleClickOutside(event) {
  if (showHelp.value && containerRef.value && !containerRef.value.contains(event.target)) {
    showHelp.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.retro-kbd {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(15, 15, 35, 0.8);
  border: 1px solid var(--color-border);
  color: var(--color-primary-l);
  font-family: var(--font-terminal);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  box-shadow: 0 2px 0 rgba(45, 45, 94, 0.8);
}
</style>
