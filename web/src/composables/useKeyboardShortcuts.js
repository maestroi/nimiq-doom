import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Keyboard shortcuts composable
 * Provides global keyboard shortcuts for emulator controls
 */
export function useKeyboardShortcuts(options = {}) {
  const {
    onFullscreen = null,
    onReset = null,
    onPause = null,
    onSaveState = null,
    onLoadState = null,
    onMute = null,
    enabled = ref(true)
  } = options

  const shortcuts = ref([
    { key: 'F11', description: 'Toggle Fullscreen', action: 'fullscreen' },
    { key: 'Escape', description: 'Exit Fullscreen', action: 'exitFullscreen' },
    { key: 'R', description: 'Reset Game', action: 'reset', requiresCtrl: true },
    { key: 'P', description: 'Pause/Resume', action: 'pause' },
    { key: 'F5', description: 'Save State', action: 'saveState' },
    { key: 'F9', description: 'Load State', action: 'loadState' },
    { key: 'M', description: 'Mute/Unmute', action: 'mute' },
  ])

  const isFullscreen = ref(false)
  const isPaused = ref(false)
  const isMuted = ref(false)

  function handleKeyDown(event) {
    // Don't trigger if typing in an input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
      return
    }

    // Check if shortcuts are enabled
    if (!enabled.value) return

    const key = event.key

    // F11 - Toggle Fullscreen
    if (key === 'F11') {
      event.preventDefault()
      toggleFullscreen()
      return
    }

    // Escape - Exit Fullscreen
    if (key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen()
      isFullscreen.value = false
      return
    }

    // Ctrl+R - Reset (prevent browser refresh)
    if (key.toLowerCase() === 'r' && event.ctrlKey) {
      event.preventDefault()
      if (onReset) onReset()
      return
    }

    // P - Pause/Resume
    if (key.toLowerCase() === 'p' && !event.ctrlKey && !event.altKey) {
      event.preventDefault()
      isPaused.value = !isPaused.value
      if (onPause) onPause(isPaused.value)
      return
    }

    // F5 - Save State (prevent page refresh)
    if (key === 'F5') {
      event.preventDefault()
      if (onSaveState) onSaveState()
      return
    }

    // F9 - Load State
    if (key === 'F9') {
      event.preventDefault()
      if (onLoadState) onLoadState()
      return
    }

    // M - Mute/Unmute
    if (key.toLowerCase() === 'm' && !event.ctrlKey && !event.altKey) {
      isMuted.value = !isMuted.value
      if (onMute) onMute(isMuted.value)
      return
    }
  }

  function toggleFullscreen(element = null) {
    const target = element || document.querySelector('.emulator-container') || document.documentElement
    
    if (!document.fullscreenElement) {
      target.requestFullscreen?.() || target.webkitRequestFullscreen?.()
      isFullscreen.value = true
      if (onFullscreen) onFullscreen(true)
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.()
      isFullscreen.value = false
      if (onFullscreen) onFullscreen(false)
    }
  }

  function handleFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })

  return {
    shortcuts,
    isFullscreen,
    isPaused,
    isMuted,
    toggleFullscreen
  }
}

