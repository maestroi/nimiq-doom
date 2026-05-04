<template>
  <header class="relative border-b" style="background-color: var(--color-surface); border-color: var(--color-border);">
    <!-- Subtle top glow line -->
    <div class="absolute top-0 left-0 right-0 h-px" style="background: linear-gradient(90deg, transparent, var(--color-primary), var(--color-primary-l), var(--color-primary), transparent);"></div>

    <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        <!-- Logo + tagline -->
        <div class="flex items-center gap-3">
          <div>
            <h1
              class="text-base md:text-lg neon-purple"
              style="font-family: var(--font-retro); letter-spacing: 0.04em; line-height: 1.4;"
            >
              NIMIQ ARCADE
            </h1>
            <p style="font-family: var(--font-terminal); font-size: 1.05rem; color: var(--color-muted); letter-spacing: 0.05em;">
              RETRO GAMES ONCHAIN
            </p>
          </div>

          <!-- Help / How It Works -->
          <button
            @click="$emit('show-help')"
            class="btn-ghost flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md cursor-pointer"
            title="How It Works"
            style="font-family: var(--font-ui);"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="hidden sm:inline">HOW IT WORKS</span>
          </button>
        </div>

        <!-- Controls row -->
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center">

          <!-- RPC Endpoint -->
          <div class="flex items-center gap-2 flex-wrap">
            <label class="text-xs font-medium whitespace-nowrap" style="color: var(--color-dim); font-family: var(--font-terminal); font-size: 0.95rem; letter-spacing: 0.08em;">
              RPC:
            </label>
            <select
              :value="selectedRpcEndpoint"
              @change="$emit('update:rpc-endpoint', ($event.target).value)"
              class="retro-select text-sm"
              style="min-width: 190px;"
            >
              <option v-for="endpoint in rpcEndpoints" :key="endpoint.url" :value="endpoint.url">
                {{ endpoint.name }}
              </option>
            </select>
            <input
              v-if="selectedRpcEndpoint === 'custom'"
              :value="customRpcEndpoint"
              @input="$emit('update:custom-rpc', $event.target.value)"
              @keyup.enter="$emit('update:custom-rpc', $event.target.value)"
              placeholder="https://rpc-mainnet.nimiqscan.com"
              type="url"
              class="retro-input text-sm flex-1"
              style="min-width: 260px;"
            />
          </div>

          <!-- Catalog -->
          <div v-if="catalogs && catalogs.length > 0" class="flex items-center gap-2 flex-wrap">
            <label class="text-xs font-medium whitespace-nowrap" style="color: var(--color-dim); font-family: var(--font-terminal); font-size: 0.95rem; letter-spacing: 0.08em;">
              CATALOG:
            </label>
            <select
              :value="selectedCatalogName"
              @change="$emit('update:catalog', ($event.target).value)"
              class="retro-select text-sm"
              style="min-width: 110px;"
            >
              <option v-for="catalog in catalogs" :key="catalog.name" :value="catalog.name">
                {{ catalog.name }}
              </option>
            </select>
            <input
              v-if="selectedCatalogName === 'Custom...'"
              :value="customCatalogAddress"
              @input="$emit('update:custom-catalog', $event.target.value)"
              @keyup.enter="$emit('update:custom-catalog', $event.target.value)"
              placeholder="NQ32 0VD4 ..."
              type="text"
              class="retro-input text-sm flex-1"
              style="min-width: 260px;"
            />
          </div>

          <!-- Refresh -->
          <div v-if="catalogAddress" class="flex items-center">
            <button
              @click="$emit('refresh-catalog')"
              :disabled="loading"
              class="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md cursor-pointer"
              title="Refresh Catalog"
            >
              <svg v-if="loading" class="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              REFRESH
            </button>
          </div>

        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  selectedRpcEndpoint: String,
  customRpcEndpoint: String,
  rpcEndpoints: Array,
  games: Array,
  selectedGame: Object,
  selectedVersion: Object,
  loading: Boolean,
  catalogs: Array,
  selectedCatalogName: String,
  catalogAddress: String,
  customCatalogAddress: String,
  publisherAddress: String
})

defineEmits([
  'update:rpc-endpoint',
  'update:custom-rpc',
  'update:catalog',
  'update:custom-catalog',
  'update:game',
  'update:version',
  'refresh-catalog',
  'show-help'
])
</script>
