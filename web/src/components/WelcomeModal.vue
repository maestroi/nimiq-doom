<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style="background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
      @click.self="isOpen = false"
    >
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 scale-95 translate-y-4"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-4"
      >
        <div
          v-if="isOpen"
          class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl"
          style="
            background: var(--color-card);
            border: 1px solid var(--color-primary);
            box-shadow: 0 0 0 1px rgba(124,58,237,0.2), 0 0 40px rgba(124,58,237,0.25), 0 24px 48px rgba(0,0,0,0.6);
          "
        >
          <!-- Top glow line -->
          <div class="absolute top-0 left-0 right-0 h-px rounded-t-xl" style="background: linear-gradient(90deg, transparent, var(--color-primary), var(--color-primary-l), var(--color-primary), transparent);"></div>

          <!-- Corner decorations -->
          <div class="absolute top-3 left-3 w-4 h-4 border-t border-l rounded-tl-sm" style="border-color: var(--color-primary-l);"></div>
          <div class="absolute top-3 right-3 w-4 h-4 border-t border-r rounded-tr-sm" style="border-color: var(--color-primary-l);"></div>
          <div class="absolute bottom-3 left-3 w-4 h-4 border-b border-l rounded-bl-sm" style="border-color: var(--color-primary-l);"></div>
          <div class="absolute bottom-3 right-3 w-4 h-4 border-b border-r rounded-br-sm" style="border-color: var(--color-primary-l);"></div>

          <div class="relative px-6 py-8 sm:px-8">

            <!-- Header -->
            <div class="flex items-start gap-4 mb-6">
              <div
                class="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg"
                style="background: rgba(124,58,237,0.2); border: 1px solid var(--color-primary);"
              >
                <svg class="w-6 h-6" style="color: var(--color-primary-l);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h2
                  class="neon-purple mb-1"
                  style="font-family: var(--font-retro); font-size: 0.7rem; line-height: 1.6; letter-spacing: 0.04em; color: var(--color-primary-l);"
                >
                  NIMIQ ARCADE
                </h2>
                <p style="font-family: var(--font-terminal); font-size: 1rem; letter-spacing: 0.06em; color: var(--color-muted);">
                  GAMES PRESERVED ON THE BLOCKCHAIN
                </p>
              </div>
            </div>

            <!-- Description -->
            <p class="text-sm leading-relaxed mb-5" style="color: var(--color-muted);">
              Play classic retro games permanently stored on the
              <span style="color: var(--color-primary-l); font-weight: 600;">Nimiq blockchain</span>.
              No servers needed — games are reconstructed directly from blockchain transactions.
            </p>

            <!-- Feature bullets -->
            <div class="space-y-2 mb-6">
              <div v-for="feat in features" :key="feat.title" class="flex items-start gap-3">
                <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <p class="text-sm" style="color: var(--color-muted);">
                  <span style="color: var(--color-text); font-weight: 600;">{{ feat.title }}</span> — {{ feat.desc }}
                </p>
              </div>
            </div>

            <!-- Quick Start -->
            <div class="rounded-lg p-4 mb-5" style="background: rgba(15,15,35,0.6); border: 1px solid var(--color-border);">
              <h3
                class="text-xs font-semibold mb-3 flex items-center gap-2"
                style="font-family: var(--font-terminal); font-size: 0.95rem; letter-spacing: 0.1em; color: var(--color-primary-l);"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                QUICK START
              </h3>
              <ol class="space-y-2">
                <li v-for="(step, i) in quickStart" :key="i" class="flex items-start gap-2.5 text-sm" style="color: var(--color-muted);">
                  <span
                    class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-xs font-bold"
                    style="background: rgba(124,58,237,0.2); color: var(--color-primary-l); font-family: var(--font-terminal);"
                  >{{ i + 1 }}</span>
                  {{ step }}
                </li>
              </ol>
            </div>

            <!-- Keyboard hint -->
            <div class="flex items-center gap-2 text-xs mb-5" style="color: var(--color-dim);">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>
                <kbd class="retro-kbd">F11</kbd> fullscreen &nbsp;
                <kbd class="retro-kbd">Ctrl+R</kbd> reset &nbsp;
                <kbd class="retro-kbd">P</kbd> pause &nbsp;
                <kbd class="retro-kbd">M</kbd> mute
              </span>
            </div>

            <!-- Advanced Settings (expandable) -->
            <div class="mb-5">
              <button
                @click="showAdvanced = !showAdvanced"
                class="flex items-center gap-2 w-full text-sm cursor-pointer transition-colors duration-150"
                style="color: var(--color-dim);"
                @mouseenter="e => e.currentTarget.style.color = 'var(--color-muted)'"
                @mouseleave="e => e.currentTarget.style.color = 'var(--color-dim)'"
              >
                <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-90': showAdvanced }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span style="font-family: var(--font-terminal); letter-spacing: 0.06em; font-size: 0.9rem;">ADVANCED SETTINGS</span>
                <span class="text-xs" style="color: var(--color-dim);">(RPC &amp; Catalogs)</span>
              </button>

              <Transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="showAdvanced" class="mt-3 space-y-2.5">
                  <div v-for="adv in advancedItems" :key="adv.title" class="rounded-lg p-3" style="background: rgba(15,15,35,0.6); border: 1px solid var(--color-border);">
                    <div class="flex items-center gap-2 mb-1.5">
                      <svg class="w-3.5 h-3.5 flex-shrink-0" :style="`color: ${adv.color};`" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="adv.icon" />
                      </svg>
                      <h4 class="text-xs font-semibold" style="color: var(--color-text);">{{ adv.title }}</h4>
                    </div>
                    <p class="text-xs leading-relaxed" style="color: var(--color-dim);" v-html="adv.body"></p>
                    <div v-if="adv.chips" class="flex gap-1.5 mt-2">
                      <span v-for="chip in adv.chips" :key="chip.label"
                        class="text-xs px-1.5 py-0.5 rounded"
                        :style="`background: ${chip.bg}; color: ${chip.color}; border: 1px solid ${chip.border}; font-family: var(--font-terminal); letter-spacing: 0.04em;`"
                      >{{ chip.label }}</span>
                      <span class="text-xs self-center" style="color: var(--color-border);">→</span>
                      <span v-for="(chip2, idx) in adv.chips2" :key="idx"
                        class="text-xs px-1.5 py-0.5 rounded"
                        :style="`background: ${chip2.bg}; color: ${chip2.color}; border: 1px solid ${chip2.border}; font-family: var(--font-terminal); letter-spacing: 0.04em;`"
                      >{{ chip2.label }}</span>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Legal Disclaimer (expandable) -->
            <div class="mb-5">
              <button
                @click="showDisclaimer = !showDisclaimer"
                class="flex items-center gap-2 w-full text-sm cursor-pointer transition-colors duration-150"
                style="color: var(--color-dim);"
                @mouseenter="e => e.currentTarget.style.color = 'var(--color-muted)'"
                @mouseleave="e => e.currentTarget.style.color = 'var(--color-dim)'"
              >
                <svg class="w-4 h-4 transition-transform duration-200" :class="{ 'rotate-90': showDisclaimer }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span style="font-family: var(--font-terminal); letter-spacing: 0.06em; font-size: 0.9rem;">LEGAL DISCLAIMER</span>
              </button>

              <Transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
              >
                <div v-if="showDisclaimer" class="mt-3 rounded-lg p-4" style="background: rgba(15,15,35,0.6); border: 1px solid var(--color-border);">
                  <div class="space-y-3 text-xs leading-relaxed" style="color: var(--color-dim);">
                    <div v-for="clause in legalClauses" :key="clause.title">
                      <p class="font-semibold mb-1" style="color: var(--color-muted);">{{ clause.title }}</p>
                      <p>{{ clause.body }}</p>
                    </div>
                    <p class="italic pt-2 border-t" style="color: var(--color-dim); border-color: var(--color-border);">
                      By using this service, you acknowledge that you have read, understood, and agree to be bound by this disclaimer.
                    </p>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Legal Acceptance -->
            <div class="rounded-lg p-4 mb-5" style="background: rgba(15,15,35,0.6); border: 1px solid var(--color-border);">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="legalAccepted"
                  class="mt-1 w-4 h-4 rounded cursor-pointer"
                  style="accent-color: var(--color-primary);"
                />
                <p class="text-sm leading-relaxed" style="color: var(--color-muted);">
                  I have read and agree to the
                  <button @click.stop="showDisclaimer = true" class="underline cursor-pointer transition-colors" style="color: var(--color-primary-l);">Legal Disclaimer</button>.
                  I understand this service is for educational purposes and I will only use games I legally own or that are in the public domain.
                </p>
              </label>
            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                @click="startPlaying"
                :disabled="!legalAccepted"
                class="btn-cta flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold cursor-pointer"
                style="font-family: var(--font-terminal); font-size: 1rem; letter-spacing: 0.08em;"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                START PLAYING
              </button>
              <button
                @click="dismiss"
                class="btn-ghost px-5 py-3 rounded-lg font-medium cursor-pointer"
                style="font-family: var(--font-terminal); font-size: 0.9rem; letter-spacing: 0.06em;"
              >
                DON'T SHOW AGAIN
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const STORAGE_KEY = 'nimiq-games-welcome-dismissed'
const LEGAL_ACCEPTANCE_KEY = 'nimiq-games-legal-accepted'

const isOpen = ref(false)
const showAdvanced = ref(false)
const showDisclaimer = ref(false)
const legalAccepted = ref(false)

const emit = defineEmits(['close'])

const features = [
  { title: 'Decentralized', desc: 'Games live forever on-chain, no takedowns' },
  { title: 'Verified', desc: 'SHA256 hash ensures authentic game files' },
  { title: 'Multi-platform', desc: 'DOS, NES, Game Boy & Game Boy Color' },
]

const quickStart = [
  'Select a game from the dropdown menu',
  'Wait for blockchain download & verification',
  'Game starts automatically — enjoy!',
]

const advancedItems = [
  {
    title: 'RPC Server',
    color: '#60a5fa',
    icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
    body: 'Connects to the Nimiq blockchain to fetch game data. Default: <span style="color:#94A3B8;font-family:var(--font-terminal);font-size:0.75rem;">rpc-mainnet.nimiqscan.com</span>. You can use any Nimiq RPC or your own node.',
  },
  {
    title: 'Game Catalog',
    color: '#a78bfa',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
    body: 'A Nimiq address indexing available games. Contains CENT transactions pointing to game cartridges stored on-chain. Anyone can create their own catalog!',
  },
  {
    title: 'On-Chain Storage',
    color: '#34d399',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    body: 'Games split into 64-byte chunks stored as transaction data. CART header contains metadata + SHA256. DATA transactions hold the actual file bytes.',
    chips: [{ label: 'CART', bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' }],
    chips2: [
      { label: 'DATA×N', bg: 'rgba(37,99,235,0.15)', color: '#60a5fa', border: 'rgba(37,99,235,0.3)' },
      { label: 'CENT', bg: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: 'rgba(124,58,237,0.3)' },
    ],
  },
]

const legalClauses = [
  { title: 'Educational & Research Purposes', body: 'This project is for educational and research purposes only. The platform demonstrates blockchain-based game storage and emulation technology.' },
  { title: 'Legal Ownership Required', body: 'Users are responsible for ensuring they have the legal right to use any game files. Only use games you legally own or that are in the public domain.' },
  { title: 'Anti-Piracy Statement', body: 'The developers do not condone piracy and are not responsible for any misuse. We do not host, distribute, or encourage the use of copyrighted material without proper authorization.' },
  { title: 'Copyright & Trademark Notice', body: 'All game titles, characters, graphics, and other content are the property of their respective copyright holders. This service is for educational and preservation purposes only.' },
  { title: 'No Warranty', body: 'This software is provided "as is" without warranty of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free.' },
  { title: 'Blockchain & Data', body: 'Games are stored on the Nimiq blockchain. We are not responsible for any loss of data, funds, or issues related to blockchain transactions or network connectivity.' },
  { title: 'Limitation of Liability', body: 'In no event shall we be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of this service.' },
]

watch(legalAccepted, (v) => {
  if (v) localStorage.setItem(LEGAL_ACCEPTANCE_KEY, 'true')
})

onMounted(() => {
  const legalStored = localStorage.getItem(LEGAL_ACCEPTANCE_KEY)
  if (legalStored === 'true') legalAccepted.value = true

  const dismissed = localStorage.getItem(STORAGE_KEY)
  if (!dismissed) {
    setTimeout(() => {
      isOpen.value = true
      if (!legalAccepted.value) showDisclaimer.value = true
    }, 500)
  }
})

function startPlaying() {
  if (!legalAccepted.value) return
  isOpen.value = false
  emit('close')
}

function dismiss() {
  if (legalAccepted.value) {
    localStorage.setItem(STORAGE_KEY, 'true')
    isOpen.value = false
    emit('close')
  }
}

function show() {
  isOpen.value = true
}

defineExpose({ show })
</script>

<style scoped>
.retro-kbd {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(45,45,94,0.8);
  border: 1px solid var(--color-border);
  color: var(--color-primary-l);
  font-family: var(--font-terminal);
  font-size: 0.85rem;
  letter-spacing: 0.04em;
}
</style>
