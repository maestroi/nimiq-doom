<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Header -->
    <div class="bg-gray-800 border-b border-gray-700">
      <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-white">🎮 Nimiq DOS Games Onchain</h1>
            <p class="mt-1 text-sm text-gray-400">Download DOS games from the blockchain and play them in your browser!</p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3">
            <!-- RPC Endpoint Selection -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-400 whitespace-nowrap">RPC:</label>
              <select
                v-model="selectedRpcEndpoint"
                @change="onRpcEndpointChange"
                class="text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 min-w-[200px]"
              >
                <option v-for="endpoint in rpcEndpoints" :key="endpoint.url" :value="endpoint.url">
                  {{ endpoint.name }}
                </option>
              </select>
              <input
                v-if="selectedRpcEndpoint === 'custom'"
                v-model="customRpcEndpoint"
                @blur="onCustomRpcEndpointChange"
                placeholder="https://rpc-mainnet.nimiqscan.com"
                class="text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 min-w-[200px]"
              />
            </div>
            <!-- Developer Mode Toggle (hidden, activated with Ctrl+Shift+D) -->
            <button
              @click="developerMode = !developerMode"
              class="text-xs px-2 py-1 rounded border border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-300"
              title="Developer Mode (Ctrl+Shift+D)"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <!-- Program Selection -->
            <div v-if="manifests.length > 0" class="flex items-center gap-2">
              <label class="text-xs font-medium text-gray-400 whitespace-nowrap">Program:</label>
              <select
                v-model="selectedManifestName"
                @change="loadManifest"
                class="text-sm rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-1.5 min-w-[200px]"
              >
                <option value="">-- Select --</option>
                <option v-for="m in manifests" :key="m.name" :value="m.name">
                  {{ m.title || m.filename || m.name }}
                </option>
              </select>
              <button
                @click="loadManifestsList"
                :disabled="loading"
                class="inline-flex items-center px-2 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh Programs"
              >
                <svg v-if="loading" class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Developer Mode Panel -->
      <div v-if="developerMode" class="mb-6 rounded-md bg-purple-900/30 border border-purple-700 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-purple-200">🧪 Developer Mode</h3>
          <button
            @click="developerMode = false"
            class="text-purple-400 hover:text-purple-300"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-purple-200 mb-2">
              Test Local Game File (ZIP)
            </label>
            <div class="flex gap-2">
              <input
                type="file"
                ref="localFileInput"
                @change="handleLocalFileUpload"
                accept=".zip"
                class="hidden"
                id="local-file-input"
              />
              <label
                for="local-file-input"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-200 bg-purple-800/50 hover:bg-purple-800 cursor-pointer"
              >
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {{ localFileName || 'Choose ZIP file...' }}
              </label>
              <button
                v-if="localFileData"
                @click="runLocalGame"
                :disabled="loading || gameReady"
                class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run Local Game
              </button>
            </div>
            <p v-if="localFileName" class="mt-2 text-xs text-purple-300">
              Loaded: {{ localFileName }} ({{ formatBytes(localFileData?.length || 0) }})
            </p>
          </div>
           <div>
             <label class="block text-sm font-medium text-purple-200 mb-2">
               Sync Speed Override (tx/s)
             </label>
             <div class="flex gap-2 items-center">
               <input
                 type="number"
                 v-model.number="devSyncSpeed"
                 min="1"
                 max="1000"
                 placeholder="Auto (default)"
                 class="flex-1 px-3 py-2 border border-purple-600 text-sm rounded-md text-purple-200 bg-purple-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
               />
               <button
                 @click="devSyncSpeed = null"
                 class="px-3 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-200 bg-purple-800/50 hover:bg-purple-800"
                 title="Reset to default"
               >
                 Reset
               </button>
             </div>
             <p class="mt-1 text-xs text-purple-300">
               Override sync speed for testing. Default: 50 tx/s (public) or 10 tx/s (custom). 
               {{ devSyncSpeed ? `Current: ${devSyncSpeed} tx/s` : 'Using default rate limiting' }}
             </p>
           </div>
           <div>
             <label class="block text-sm font-medium text-purple-200 mb-2">
               Delay Override (ms between requests)
             </label>
             <div class="flex gap-2 items-center">
               <input
                 type="number"
                 v-model.number="devSyncDelay"
                 min="0"
                 max="10000"
                 step="1"
                 placeholder="Auto (calculated from speed)"
                 class="flex-1 px-3 py-2 border border-purple-600 text-sm rounded-md text-purple-200 bg-purple-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
               />
               <button
                 @click="devSyncDelay = null"
                 class="px-3 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-200 bg-purple-800/50 hover:bg-purple-800"
                 title="Reset to default"
               >
                 Reset
               </button>
             </div>
             <p class="mt-1 text-xs text-purple-300">
               Override delay between requests (in milliseconds). If set, takes precedence over speed override.
               {{ devSyncDelay !== null ? `Current: ${devSyncDelay}ms (${(1000/devSyncDelay).toFixed(1)} tx/s)` : 'Using calculated delay from speed' }}
             </p>
           </div>
          <div class="pt-2 border-t border-purple-700/50">
            <p class="text-xs text-purple-300">
              💡 This mode allows you to test games locally before uploading to the blockchain. 
              Upload a ZIP file containing your DOS game files and run it directly.
            </p>
          </div>
        </div>
      </div>

      <!-- How It Works Info -->
      <div class="mb-6 rounded-md bg-blue-900/30 border border-blue-700 p-4">
        <details class="cursor-pointer">
          <summary class="text-sm font-medium text-blue-200 hover:text-blue-100 flex items-center">
            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works
          </summary>
          <div class="mt-4 text-sm text-blue-100 space-y-3">
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">1. Storage on Blockchain</h4>
              <p class="text-blue-100/90">Programs are split into 64-byte chunks and stored as transaction data on the Nimiq blockchain. Each chunk contains a magic header, game ID, chunk index, and up to 51 bytes of program data.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">2. Download Program</h4>
              <p class="text-blue-100/90">When you click "Download Program", the app fetches all transaction chunks from the blockchain using the transaction hashes in the manifest. The chunks are reassembled in order to reconstruct the original file.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">3. Verification</h4>
              <p class="text-blue-100/90">After downloading, the reconstructed file is automatically verified using SHA256. The computed hash is compared with the hash stored in the manifest to ensure data integrity and authenticity.</p>
            </div>
            <div>
              <h4 class="font-semibold text-blue-200 mb-1">4. Run in Browser</h4>
              <p class="text-blue-100/90">Once verified, you can run the DOS program directly in your browser using JS-DOS (a JavaScript port of DOSBox). The program runs entirely client-side - no server required!</p>
            </div>
            <div class="pt-2 border-t border-blue-700/50">
              <p class="text-xs text-blue-200/80"><strong>Note:</strong> All data is stored permanently on the blockchain. Anyone can reconstruct and run these programs by downloading the manifest and syncing chunks from any Nimiq RPC endpoint.</p>
            </div>
          </div>
        </details>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 rounded-md bg-red-900/50 border border-red-700 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-200">Error</h3>
            <div class="mt-2 text-sm text-red-300">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content Grid: Manifest + DOS side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-[0.8fr_1.7fr] gap-6 mb-6">
        <!-- Manifest Card -->
        <div v-if="manifest" class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
          <div class="px-4 py-5 sm:px-6">
            <h2 class="text-xl font-semibold text-white">Program Info</h2>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dl class="space-y-2">
            <div v-if="manifest.title">
              <dt class="text-xs font-medium text-gray-400">Title</dt>
              <dd class="mt-0.5 text-sm text-white font-semibold">{{ manifest.title }}</dd>
            </div>
            <div v-if="manifest.platform">
              <dt class="text-xs font-medium text-gray-400">Platform</dt>
              <dd class="mt-0.5 text-sm text-white">{{ manifest.platform }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Filename</dt>
              <dd class="mt-0.5 text-sm text-white font-mono text-xs">{{ manifest.filename }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Total Size</dt>
              <dd class="mt-0.5 text-sm text-white">{{ formatBytes(manifest.total_size) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Chunks</dt>
              <dd class="mt-0.5 text-sm text-white">{{ Math.ceil(manifest.total_size / manifest.chunk_size).toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">SHA256</dt>
              <dd class="mt-0.5 text-xs text-white font-mono break-words">{{ formatHash(manifest.sha256) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Sender Address</dt>
              <dd class="mt-0.5 text-xs text-white font-mono break-words">
                <a 
                  :href="`https://nimiqscan.com/account/${encodeURIComponent(manifest.sender_address)}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-indigo-400 hover:text-indigo-300 hover:underline"
                  :title="manifest.sender_address"
                >
                  {{ formatAddress(manifest.sender_address) }}
                </a>
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-400">Network</dt>
              <dd class="mt-0.5 text-sm text-white">{{ manifest.network }}</dd>
            </div>
            <div v-if="manifest.expected_tx_hashes && manifest.expected_tx_hashes.length > 0">
              <dt class="text-xs font-medium text-gray-400">Expected Transactions</dt>
              <dd class="mt-0.5 text-sm text-white">{{ manifest.expected_tx_hashes.length.toLocaleString() }}</dd>
              <details class="mt-1">
                <summary class="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300">Show Transaction Hashes</summary>
                <div class="mt-2 max-h-40 overflow-y-auto bg-gray-900 rounded p-2">
                  <ul class="space-y-0.5">
                    <li v-for="(hash, idx) in manifest.expected_tx_hashes" :key="idx" class="text-xs font-mono text-gray-300 break-all">
                      {{ hash }}
                    </li>
                  </ul>
                </div>
              </details>
            </div>
            </dl>

            <!-- Sync Progress (smaller, under manifest) -->
            <div v-if="syncProgress.total > 0" class="mt-4 pt-4 border-t border-gray-700 dark:border-white/10">
              <h3 class="text-sm font-semibold text-white mb-2">Sync Progress</h3>
            <div class="space-y-2">
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-400">Chunks</span>
                  <span class="text-white font-medium">{{ syncProgress.fetched.toLocaleString() }} / {{ syncProgress.total.toLocaleString() }}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
                  <div
                    class="bg-indigo-600 h-full rounded-full transition-all duration-300 absolute left-0 top-0"
                    :style="{ width: `${Math.round(syncProgressPercent)}%` }"
                    :title="`${Math.round(syncProgressPercent)}% (${syncProgress.fetched}/${syncProgress.total})`"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-xs mb-1">
                  <span class="text-gray-400">Bytes</span>
                  <span class="text-white font-medium">{{ formatBytes(syncProgress.bytes) }} / {{ formatBytes(manifest?.total_size || 0) }}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
                  <div
                    class="bg-green-600 h-full rounded-full transition-all duration-300 absolute left-0 top-0"
                    :style="{ width: manifest && manifest.total_size > 0 ? `${Math.min(100, Math.max(0, (syncProgress.bytes / manifest.total_size * 100)))}%` : '0%' }"
                  ></div>
                </div>
              </div>
              <div class="text-center pt-1">
                <span class="text-lg font-bold text-white">{{ Math.round(syncProgressPercent) }}%</span>
                <span class="text-xs text-gray-400 ml-1">Complete</span>
              </div>
              <div v-if="syncProgress.rate > 0" class="text-center pt-1">
                <span class="text-xs text-gray-400">Speed: </span>
                <span class="text-xs text-white font-medium">{{ syncProgress.rate.toFixed(1) }} tx/s</span>
                <span v-if="estimatedTimeRemaining !== null" class="text-xs text-gray-400 ml-2">• ETA: </span>
                <span v-if="estimatedTimeRemaining !== null" class="text-xs text-white font-medium">{{ formatTimeRemaining(estimatedTimeRemaining) }}</span>
              </div>
            </div>
            </div>

            <!-- File Verification (smaller, under sync progress) -->
            <div v-if="verified && !error" class="mt-3 pt-3 border-t border-gray-700 dark:border-white/10">
              <div class="flex items-center">
                <svg class="h-4 w-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div>
                  <div class="text-xs font-medium text-green-200">File Verified</div>
                  <div class="text-xs text-green-300">SHA256 matches manifest</div>
                </div>
              </div>
            </div>
          </div>
          <div class="px-4 py-4 sm:px-6">
            <!-- Download Program Button -->
            <div class="flex gap-2">
              <button
                @click="syncChunks"
                :disabled="!manifest || loading"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ verified && fileData ? 'Re-sync' : 'Download Program' }}
              </button>
              <button
                v-if="verified && fileData"
                @click="clearCacheAndResync"
                :disabled="loading"
                class="px-3 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear cache and re-sync from blockchain"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <!-- Cache indicator -->
            <div v-if="verified && fileData" class="mt-2 text-xs text-green-400 flex items-center">
              <svg class="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span v-if="loadedFromCache">Loaded from cache</span>
              <span v-else>Synced from blockchain</span>
            </div>
          </div>
        </div>

        <!-- DOS Container -->
        <div class="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm dark:divide-white/10 dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-1 dark:outline-white/10">
          <div class="px-4 py-5 sm:px-6">
            <h2 class="text-xl font-semibold text-white">DOS Emulator</h2>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <div ref="gameContainer" class="bg-black rounded w-full mb-4" style="min-height: 400px; display: block; aspect-ratio: 4/3;"></div>
            
            <div v-if="!gameReady && verified" class="text-center py-4 text-gray-400">
              <p class="text-sm">Ready to run. Click "Run Program" to start the DOS emulator.</p>
            </div>
            <div v-else-if="!gameReady && !verified" class="text-center py-4 text-gray-500">
              <p class="text-sm">Sync and verify a program to enable the DOS emulator</p>
            </div>
          </div>
          <div class="px-4 py-4 sm:px-6">
            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-3">
              <button
                v-if="!gameReady"
                @click="runGame"
                :disabled="!verified || loading"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Program
              </button>
              <button
                v-else
                @click="stopGame"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z" />
                </svg>
                Stop Emulation
              </button>
              <button
                @click="downloadFile"
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NimiqRPC } from './nimiq-rpc.js'

const manifest = ref(null)
const manifests = ref([])
const selectedManifestName = ref(null)
const loading = ref(false)
const error = ref(null)
const verified = ref(false)
const fileData = ref(null)
const syncProgress = ref({ fetched: 0, total: 0, bytes: 0, rate: 0 })
const syncStartTime = ref(null)
const estimatedTimeRemaining = ref(null)
const gameReady = ref(false)
const gameContainer = ref(null)
const dosRuntime = ref(null)
const dosPromise = ref(null) // Store the Dos promise to properly terminate
const dosCi = ref(null) // Store the Command Interface for proper termination
const loadedFromCache = ref(false)
const developerMode = ref(false)
const localFileData = ref(null)
const localFileName = ref(null)
const devSyncSpeed = ref(null) // Developer sync speed override (tx/s), null = use default
const devSyncDelay = ref(null) // Developer sync delay override (ms), null = use calculated from speed

// RPC endpoint configuration
const rpcEndpoints = ref([
  { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
  { name: 'Custom...', url: 'custom' }
])

const selectedRpcEndpoint = ref('https://rpc-mainnet.nimiqscan.com')
const customRpcEndpoint = ref('')
let rpcClient = new NimiqRPC(selectedRpcEndpoint.value)

const syncProgressPercent = computed(() => {
  if (syncProgress.value.total === 0) return 0
  // Ensure we don't exceed 100%
  const percent = (syncProgress.value.fetched / syncProgress.value.total) * 100
  const clamped = Math.min(100, Math.max(0, percent))
  return clamped
})

// Calculate estimated time remaining and current rate
function updateEstimatedTime() {
  if (!syncStartTime.value || syncProgress.value.fetched === 0 || syncProgress.value.total === 0) {
    estimatedTimeRemaining.value = null
    syncProgress.value.rate = 0
    return
  }
  
  const elapsed = (Date.now() - syncStartTime.value) / 1000 // seconds
  const rate = syncProgress.value.fetched / elapsed // transactions per second
  syncProgress.value.rate = rate
  
  const remaining = syncProgress.value.total - syncProgress.value.fetched
  const secondsRemaining = remaining / rate
  
  if (secondsRemaining > 0 && isFinite(secondsRemaining)) {
    estimatedTimeRemaining.value = secondsRemaining
  } else {
    estimatedTimeRemaining.value = null
  }
}

function formatTimeRemaining(seconds) {
  if (!seconds || !isFinite(seconds)) return 'Calculating...'
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
}

// Manifest files are served as static files from /manifests/
// On GitHub Pages, this will be /nimiq-doom/manifests/ (base path is handled by Vite)
const MANIFESTS_BASE = import.meta.env.BASE_URL + 'manifests/'

// Cache management using IndexedDB
const CACHE_DB_NAME = 'nimiq-doom-cache'
const CACHE_DB_VERSION = 1
const CACHE_STORE_NAME = 'game-files'

// Initialize IndexedDB cache
let cacheDB = null
async function initCache() {
  if (cacheDB) return cacheDB
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      cacheDB = request.result
      resolve(cacheDB)
    }
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

// Get cache key from manifest
function getCacheKey(manifest) {
  if (!manifest) return null
  // Use manifest name + SHA256 to invalidate cache if manifest changes
  return `${manifest.game_id || 'unknown'}_${manifest.sha256 || 'unknown'}`
}

// Load file from cache
async function loadFromCache(manifest) {
  try {
    const db = await initCache()
    const key = getCacheKey(manifest)
    if (!key) return null
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.get(key)
      
      request.onsuccess = () => {
        const result = request.result
        if (result && result.data) {
          // Convert Array back to Uint8Array
          const uint8Array = new Uint8Array(result.data)
          console.log(`Loaded ${manifest.filename} from cache (${uint8Array.length} bytes)`)
          resolve(uint8Array)
        } else {
          resolve(null)
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Cache load error:', err)
    return null
  }
}

// Save file to cache
async function saveToCache(manifest, fileData) {
  try {
    const db = await initCache()
    const key = getCacheKey(manifest)
    if (!key || !fileData) return
    
    // Convert Uint8Array to Array for storage (IndexedDB doesn't support Uint8Array directly)
    const dataArray = Array.from(fileData)
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.put({
        key: key,
        data: dataArray,
        manifestName: manifest.filename || 'unknown',
        gameId: manifest.game_id || 0,
        timestamp: Date.now()
      })
      
      request.onsuccess = () => {
        console.log(`Saved ${manifest.filename} to cache (${fileData.length} bytes)`)
        resolve()
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Cache save error:', err)
    // Don't throw - caching is optional
  }
}

// Clear cache for a specific manifest
async function clearCache(manifest) {
  try {
    const db = await initCache()
    const key = getCacheKey(manifest)
    if (!key) return
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.delete(key)
      
      request.onsuccess = () => {
        console.log(`Cleared cache for ${manifest.filename}`)
        resolve()
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Cache clear error:', err)
  }
}

// Clear all cache
async function clearAllCache() {
  try {
    const db = await initCache()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(CACHE_STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => {
        console.log('Cleared all cache')
        resolve()
      }
      
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Cache clear all error:', err)
  }
}

function onRpcEndpointChange() {
  if (selectedRpcEndpoint.value !== 'custom') {
    rpcClient = new NimiqRPC(selectedRpcEndpoint.value)
  }
}

function onCustomRpcEndpointChange() {
  if (customRpcEndpoint.value) {
    selectedRpcEndpoint.value = customRpcEndpoint.value
    rpcClient = new NimiqRPC(customRpcEndpoint.value)
  }
}

async function loadManifestsList() {
  loading.value = true
  error.value = null
  try {
    // Load manifest index file that lists all available manifests
    // This index is generated by scripts/generate-manifest-index.sh
    const indexResponse = await fetch(`${MANIFESTS_BASE}manifests-index.json`)
    
    if (indexResponse.ok) {
      // Load from index file
      const indexData = await indexResponse.json()
      manifests.value = indexData
      console.log(`Loaded ${indexData.length} manifest(s) from index`)
    } else {
      // Fallback: try to load known manifests if index doesn't exist
      console.warn('Manifest index not found, falling back to known manifests')
      const knownManifests = ['digger', 'keen', 'testfile', 'testbin']
      const loadedManifests = []
      
      for (const name of knownManifests) {
        try {
          const response = await fetch(`${MANIFESTS_BASE}${name}.json`)
          if (response.ok) {
            const manifestData = await response.json()
            loadedManifests.push({
              name: name,
              game_id: manifestData.game_id,
              title: manifestData.title,
              platform: manifestData.platform,
              filename: manifestData.filename,
              total_size: manifestData.total_size,
              chunk_size: manifestData.chunk_size || 51,
              network: manifestData.network,
              sender_address: manifestData.sender_address,
              tx_count: manifestData.expected_tx_hashes?.length || 0
            })
          }
        } catch (err) {
          // Skip if manifest doesn't exist
        }
      }
      
      manifests.value = loadedManifests
    }
    
    // Auto-select first manifest if none selected
    if (manifests.value.length > 0 && !selectedManifestName.value) {
      selectedManifestName.value = manifests.value[0].name
      await loadManifest()
    }
  } catch (err) {
    error.value = err.message
    console.error('Error loading manifests:', err)
  } finally {
    loading.value = false
  }
}

async function loadManifest() {
  if (!selectedManifestName.value) {
    error.value = "No program selected"
    return
  }
  
  loading.value = true
  error.value = null
  try {
    const response = await fetch(`${MANIFESTS_BASE}${selectedManifestName.value}.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load manifest`)
    manifest.value = await response.json()
    
    // Reset state when loading new manifest
    fileData.value = null
    verified.value = false
    loadedFromCache.value = false
    syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
    gameReady.value = false
    
    // Try to load from cache immediately when manifest changes
    const cachedData = await loadFromCache(manifest.value)
    if (cachedData) {
      console.log('Auto-loading from cache for', manifest.value.filename)
      fileData.value = cachedData
      loadedFromCache.value = true
      syncProgress.value = { 
        fetched: manifest.value.expected_tx_hashes?.length || 0, 
        total: manifest.value.expected_tx_hashes?.length || 0, 
        bytes: cachedData.length,
        rate: 0
      }
      // Verify cached data
      await verifyFile()
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Parse chunk from transaction data
function parseChunkFromTxData(txData) {
  if (!txData || txData.length < 2) return null
  
  // Decode hex string to bytes
  const hexString = txData.startsWith('0x') ? txData.slice(2) : txData
  if (hexString.length % 2 !== 0) return null
  
  const data = new Uint8Array(hexString.length / 2)
  for (let i = 0; i < hexString.length; i += 2) {
    data[i / 2] = parseInt(hexString.substr(i, 2), 16)
  }
  
  // Check minimum length
  if (data.length < 13) return null
  
  // Check magic bytes "DOOM"
  const magic = String.fromCharCode(data[0], data[1], data[2], data[3])
  if (magic !== 'DOOM') return null
  
  // Parse chunk header (little-endian)
  const gameID = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24)
  const chunkIdx = data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24)
  const length = data[12]
  
  // Validate length
  if (length > 51 || data.length < 13 + length) return null
  
  // Extract chunk data
  const chunkData = data.slice(13, 13 + length)
  
  return {
    gameID,
    chunkIdx,
    length,
    data: chunkData
  }
}

async function syncChunks() {
  if (!manifest.value) {
    error.value = 'No program loaded. Please select and load a program first.'
    return
  }

  loading.value = true
  error.value = null
  
  // Try to load from cache first
  const cachedData = await loadFromCache(manifest.value)
  if (cachedData) {
    console.log('Using cached file data')
    fileData.value = cachedData
    loadedFromCache.value = true
    syncProgress.value = { 
      fetched: manifest.value.expected_tx_hashes?.length || 0, 
      total: manifest.value.expected_tx_hashes?.length || 0, 
      bytes: cachedData.length,
      rate: 0
    }
    // Verify cached data
    await verifyFile()
    loading.value = false
    return
  }
  
  loadedFromCache.value = false

  // No cache, sync from blockchain
  if (!manifest.value.expected_tx_hashes || manifest.value.expected_tx_hashes.length === 0) {
    error.value = 'Manifest has no expected transaction hashes. Cannot sync chunks.'
    loading.value = false
    return
  }

  syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
  syncStartTime.value = Date.now()
  estimatedTimeRemaining.value = null
  fileData.value = null
  verified.value = false

  try {
    const totalChunks = Math.ceil(manifest.value.total_size / manifest.value.chunk_size)
    const chunks = new Map()
    const expectedHashes = manifest.value.expected_tx_hashes
    
    // Set total to the exact number of expected transactions (this is our 100%)
    // This is the definitive count we know from the manifest - this is what we're syncing
    if (!expectedHashes || expectedHashes.length === 0) {
      error.value = 'Manifest has no expected transaction hashes. Cannot sync chunks.'
      loading.value = false
      return
    }
    
    syncProgress.value.total = expectedHashes.length
    syncProgress.value.fetched = 0 // Reset fetched count at start
    syncProgress.value.bytes = 0 // Reset bytes at start
    console.log(`Starting sync: ${syncProgress.value.total} transactions to fetch (100%)`)
    
    // Rate limiting: public endpoints get rate limited, custom endpoints don't
    const currentEndpoint = selectedRpcEndpoint.value === 'custom' ? customRpcEndpoint.value : selectedRpcEndpoint.value
    const isCustomEndpoint = selectedRpcEndpoint.value === 'custom' || 
                            (currentEndpoint && !currentEndpoint.includes('nimiqscan.com'))
    
     // Use developer delay override if set (takes precedence), otherwise calculate from speed override or defaults
     let delayBetweenRequests
     let maxRequestsPerSecond
     let speedSource
     
     if (devSyncDelay.value !== null && devSyncDelay.value >= 0) {
       // Direct delay override takes precedence
       delayBetweenRequests = devSyncDelay.value
       maxRequestsPerSecond = 1000 / delayBetweenRequests
       speedSource = 'developer delay override'
     } else {
       // Use developer speed override if set, otherwise use defaults
       maxRequestsPerSecond = devSyncSpeed.value !== null && devSyncSpeed.value > 0 
         ? devSyncSpeed.value 
         : (isCustomEndpoint ? 10 : 50) // 50 req/s for public, 10 for custom
       delayBetweenRequests = 1000 / maxRequestsPerSecond // milliseconds
       speedSource = devSyncSpeed.value !== null ? 'developer speed override' : (isCustomEndpoint ? 'custom endpoint' : 'public endpoint')
     }
     
     console.log(`Rate limiting: ${maxRequestsPerSecond.toFixed(1)} req/s (${speedSource}), delay: ${delayBetweenRequests.toFixed(2)}ms`)
    
    // Track request times for rate limiting
    const requestTimes = []
    
    // Fetch each transaction by hash
    for (let i = 0; i < expectedHashes.length; i++) {
      const txHash = expectedHashes[i]
      const requestStartTime = Date.now()
      
      try {
        const tx = await rpcClient.getTransactionByHash(txHash)
        
        const requestDuration = Date.now() - requestStartTime
        
        // Rate limiting: ensure we don't exceed maxRequestsPerSecond
        // Only apply delay if request was faster than the minimum delay between requests
        // This way we account for actual request time and only wait if needed
        // Apply rate limiting if: developer override is set (speed or delay), OR it's a public endpoint
        const shouldRateLimit = (devSyncSpeed.value !== null || devSyncDelay.value !== null) || !isCustomEndpoint
        if (shouldRateLimit && i < expectedHashes.length - 1) {
          const minDelay = delayBetweenRequests
          if (requestDuration < minDelay) {
            const waitTime = minDelay - requestDuration
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
        
        // Update progress after successful fetch
        // i is 0-indexed, so i+1 is the current transaction number (1, 2, 3...)
        syncProgress.value.fetched = i + 1
        updateEstimatedTime()
        
        // Log progress every 10% or every 100 transactions, whichever is more frequent
        if ((i + 1) % Math.max(1, Math.floor(expectedHashes.length / 10)) === 0 || (i + 1) % 100 === 0) {
          const currentPercent = ((i + 1) / expectedHashes.length * 100).toFixed(1)
          console.log(`Sync progress: ${i + 1}/${expectedHashes.length} (${currentPercent}%)`)
        }
        
        // Get transaction data (recipientData or data field)
        const txData = tx.recipientData || tx.data || ''
        
        if (!txData) {
          console.warn(`Transaction ${txHash} has no data field`)
          continue
        }
        
        // Parse chunk from transaction data
        const chunk = parseChunkFromTxData(txData)
        
        if (!chunk) {
          console.warn(`Failed to parse chunk from transaction ${txHash}`)
          continue
        }
        
        // Verify game ID matches
        if (chunk.gameID !== manifest.value.game_id) {
          console.warn(`Chunk game ID ${chunk.gameID} doesn't match manifest game ID ${manifest.value.game_id}`)
          continue
        }
        
        // Store chunk
        chunks.set(chunk.chunkIdx, chunk)
        
        // Calculate bytes from all chunks found so far
        let bytes = 0
        for (const c of chunks.values()) {
          bytes += c.length
        }
        syncProgress.value.bytes = bytes
        
      } catch (err) {
        console.warn(`Failed to fetch transaction ${txHash}:`, err)
        // Update progress even if fetch failed
        syncProgress.value.fetched = i + 1
        updateEstimatedTime()
      }
    }

    // At this point, syncProgress.fetched should equal syncProgress.total (all transactions fetched)
    console.log(`Sync complete: fetched ${syncProgress.value.fetched}/${syncProgress.value.total} transactions, found ${chunks.size} valid chunks`)
    
    // Ensure progress shows 100% at completion
    syncProgress.value.fetched = syncProgress.value.total
    
    if (chunks.size === 0) {
      error.value = 'No chunks found. Transactions may not be confirmed yet or RPC endpoint may be unavailable.'
      loading.value = false
      return
    }

    if (chunks.size < totalChunks) {
      error.value = `Only found ${chunks.size} of ${totalChunks} expected chunks. Some transactions may not be confirmed yet.`
      loading.value = false
      return
    }

    // Reconstruct file
    const sortedChunks = Array.from(chunks.values())
      .sort((a, b) => a.chunkIdx - b.chunkIdx)

    const reconstructed = new Uint8Array(manifest.value.total_size)
    let offset = 0
    for (const chunk of sortedChunks) {
      reconstructed.set(chunk.data.slice(0, chunk.length), offset)
      offset += chunk.length
    }

    fileData.value = reconstructed
    
    if (chunks.size === totalChunks) {
      // All chunks found, clear any previous error
      error.value = null
      
      // Automatically verify the file after successful sync
      await verifyFile()
      
      // Save to cache after successful verification
      if (verified.value) {
        await saveToCache(manifest.value, fileData.value)
      }
    }
  } catch (err) {
    error.value = err.message || 'Failed to sync chunks from blockchain'
    console.error('Sync error:', err)
  } finally {
    loading.value = false
  }
}

async function verifyFile() {
  if (!fileData.value || !manifest.value) return

  // Don't set loading to true if called automatically from syncChunks
  // (it's already set to true there)
  const wasLoading = loading.value
  if (!wasLoading) {
    loading.value = true
  }
  error.value = null

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData.value)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    verified.value = hashHex === manifest.value.sha256

    if (!verified.value) {
      error.value = `SHA256 mismatch! Expected: ${manifest.value.sha256}, Got: ${hashHex}`
      // Clear cache if verification fails
      await clearCache(manifest.value)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    // Only set loading to false if we set it to true
    if (!wasLoading) {
      loading.value = false
    }
  }
}

// Clear cache and force re-sync
async function clearCacheAndResync() {
  if (!manifest.value) return
  
  await clearCache(manifest.value)
  loadedFromCache.value = false
  fileData.value = null
  verified.value = false
  syncProgress.value = { fetched: 0, total: 0, bytes: 0 }
  
  // Re-sync from blockchain
  await syncChunks()
}

function downloadFile() {
  if (!fileData.value || !manifest.value || !verified.value) return

  // Create a blob from the file data
  const blob = new Blob([fileData.value], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  
  // Create a temporary anchor element and trigger download
  const a = document.createElement('a')
  a.href = url
  a.download = manifest.value.filename || 'downloaded-file.bin'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  // Clean up the object URL
  URL.revokeObjectURL(url)
}

// Helper function to load JS-DOS library dynamically with fallback
function loadDosLibrary() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof Dos !== 'undefined') {
      resolve()
      return
    }
    
    // Check if script is already being loaded
    if (document.querySelector('script[src*="js-dos"]')) {
      // Script tag exists, wait for it to load
      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (typeof Dos !== 'undefined') {
          clearInterval(checkInterval)
          resolve()
        } else if (Date.now() - startTime > 10000) {
          clearInterval(checkInterval)
          reject(new Error('JS-DOS library failed to load from script tag'))
        }
      }, 100)
      return
    }
    
    // Try multiple CDN sources (js-dos.com CDN seems to be down, using jsdelivr as primary)
    const cdnSources = [
      'https://cdn.jsdelivr.net/npm/js-dos@6.22.60/dist/js-dos.js',
      'https://unpkg.com/js-dos@6.22.60/dist/js-dos.js',
      'https://js-dos.com/cdn/6.22/js-dos.js' // Fallback (may be 404)
    ]
    
    let currentIndex = 0
    
    const tryLoadScript = (url) => {
      return new Promise((scriptResolve, scriptReject) => {
        const script = document.createElement('script')
        script.src = url
        script.async = true
        script.crossOrigin = 'anonymous'
        
        script.onload = () => {
          // Wait for Dos to be available
          const startTime = Date.now()
          const checkInterval = setInterval(() => {
            if (typeof Dos !== 'undefined') {
              clearInterval(checkInterval)
              scriptResolve()
            } else if (Date.now() - startTime > 5000) {
              clearInterval(checkInterval)
              scriptReject(new Error('JS-DOS library loaded but Dos object not found'))
            }
          }, 50)
        }
        
        script.onerror = () => {
          scriptReject(new Error(`Failed to load from ${url}`))
        }
        
        document.head.appendChild(script)
      })
    }
    
    // Try loading from each CDN source
    const attemptLoad = async () => {
      if (currentIndex >= cdnSources.length) {
        reject(new Error('Failed to load JS-DOS library from all CDN sources. Please check your internet connection.'))
        return
      }
      
      try {
        await tryLoadScript(cdnSources[currentIndex])
        resolve()
      } catch (err) {
        console.warn(`Failed to load JS-DOS from ${cdnSources[currentIndex]}:`, err.message)
        // Remove failed script
        const failedScript = document.querySelector(`script[src="${cdnSources[currentIndex]}"]`)
        if (failedScript) {
          failedScript.remove()
        }
        currentIndex++
        attemptLoad()
      }
    }
    
    attemptLoad()
  })
}

async function runGame() {
  if (!verified.value || !fileData.value || !manifest.value) return

  loading.value = true
  error.value = null

  try {
    // Load JS-DOS library dynamically
    await loadDosLibrary()
    // Check if file is a ZIP
    const isZip = manifest.value.filename.toLowerCase().endsWith('.zip') || 
                  (fileData.value.length >= 2 && fileData.value[0] === 0x50 && fileData.value[1] === 0x4B) // PK header

    let gameFiles = {}
    let gameExecutable = null

    if (isZip) {
      // Extract ZIP file
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(fileData.value)
      
      // Extract all files
      const allExecutables = []
      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const content = await file.async('uint8array')
          gameFiles[filename] = content
          
          // Collect all executables (.exe, .com, .bat)
          const lowerName = filename.toLowerCase()
          if (lowerName.endsWith('.exe') || lowerName.endsWith('.com') || lowerName.endsWith('.bat')) {
            allExecutables.push(filename)
          }
        }
      }
      
      // Check if manifest specifies the executable (highest priority)
      if (manifest.value.executable) {
        const specifiedExe = manifest.value.executable
        // Check if the specified executable exists in the ZIP
        const foundExe = allExecutables.find(exe => 
          exe.toLowerCase() === specifiedExe.toLowerCase() ||
          exe.toLowerCase().endsWith(specifiedExe.toLowerCase())
        )
        if (foundExe) {
          gameExecutable = foundExe
          console.log(`✓ Using manifest-specified executable: ${gameExecutable}`)
        } else {
          console.warn(`Manifest specifies executable "${specifiedExe}" but it was not found in ZIP. Available:`, allExecutables)
        }
      }
      
      // If no manifest-specified executable, use smart selection
      if (!gameExecutable && allExecutables.length > 0) {
        const manifestName = manifest.value.filename.toLowerCase().replace(/\.zip$/, '')
        const manifestBase = manifestName.replace(/\d+$/, '') // Remove trailing numbers (e.g., "keen1" -> "keen")
        
        // Priority order:
        // 1. Exact match with manifest name (e.g., "keen1.exe" for "keen1.zip")
        // 2. Base name match (e.g., "keen.exe" for "keen1.zip")
        // 3. Common game executable names (not utility files like catalog.exe, setup.exe, etc.)
        // 4. Any other executable
        
        const utilityNames = ['catalog', 'setup', 'install', 'readme', 'help', 'config', 'options']
        
        // Try to find best match
        let bestMatch = null
        let bestScore = -1
        
        for (const exe of allExecutables) {
          const exeLower = exe.toLowerCase().replace(/\.(exe|com|bat)$/, '')
          let score = 0
          
          // Exact match with manifest name (highest priority)
          if (exeLower === manifestName) {
            score = 100
          }
          // Base name match (high priority)
          else if (exeLower === manifestBase || exeLower.startsWith(manifestBase)) {
            score = 80
          }
          // Not a utility file (medium priority)
          else if (!utilityNames.some(util => exeLower.includes(util))) {
            score = 50
          }
          // Utility file (low priority)
          else {
            score = 10
          }
          
          if (score > bestScore) {
            bestScore = score
            bestMatch = exe
          }
        }
        
        gameExecutable = bestMatch || allExecutables[0]
        console.log(`Selected executable: ${gameExecutable} from ${allExecutables.length} candidates:`, allExecutables)
      }
    } else {
      // Single file - treat as game file
      gameFiles[manifest.value.filename] = fileData.value
      gameExecutable = manifest.value.filename
    }

    // Check if we have an IMG file
    const imgFile = Object.keys(gameFiles).find(f => f.toLowerCase().endsWith('.img'))
    
    if (imgFile && !gameExecutable) {
      // For IMG files, set default executable based on filename
      const imgLower = imgFile.toLowerCase()
      if (imgLower.includes('digger')) {
        gameExecutable = 'DIGGER.EXE'
      } else {
        gameExecutable = 'GAME.EXE' // Generic, will be found inside mounted IMG
      }
    }

    if (!gameExecutable) {
      // Try to find any executable
      const exeFiles = Object.keys(gameFiles).filter(f => 
        f.toLowerCase().endsWith('.exe') || 
        f.toLowerCase().endsWith('.com') || 
        f.toLowerCase().endsWith('.bat')
      )
      if (exeFiles.length > 0) {
        gameExecutable = exeFiles[0]
      } else if (!imgFile) {
        throw new Error('No game executable found. ZIP should contain .exe, .com, .bat, or .img files.')
      }
    }

    // Initialize JS-DOS
    if (!gameContainer.value) {
      throw new Error('Game container not found')
    }

    // Clear container and create a canvas element for JS-DOS
    gameContainer.value.innerHTML = ''
    
    // JS-DOS requires a canvas element to render to
    const canvas = document.createElement('canvas')
    canvas.id = 'jsdos-canvas'
    // Set canvas size for better scaling - 640x400 is 2x of 320x200
    // This will be scaled by DOSBox's scaler
    canvas.width = 640
    canvas.height = 400
    canvas.style.width = '100%'
    canvas.style.height = 'auto'
    canvas.style.display = 'block'
    canvas.style.maxWidth = '100%'
    canvas.style.imageRendering = 'pixelated' // Keep pixel art crisp
    gameContainer.value.appendChild(canvas)
    
    gameReady.value = true
    
    console.log('Initializing JS-DOS, Dos available:', typeof Dos !== 'undefined')
    console.log('Container element:', gameContainer.value)
    console.log('Canvas element created:', canvas)
    
    // Initialize JS-DOS using Dos API
    // Dos() returns a promise that resolves to a dosbox instance
    // JS-DOS uses a Command Interface (CI) for file operations
    console.log('Dos promise created, waiting for initialization...')
    
    let dosbox
    let ci = null
    
    // Initialize DOS using the .ready() callback pattern
    const initDos = async (options) => {
      // Use the canvas element we created
      const canvasElement = gameContainer.value.querySelector('#jsdos-canvas')
      if (!canvasElement || canvasElement.tagName !== 'CANVAS') {
        throw new Error('Canvas element not found or invalid. JS-DOS requires a canvas element.')
      }
      console.log('Initializing Dos with canvas element:', canvasElement)
      
      // JS-DOS uses .ready() callback that provides fs and main
      return new Promise((resolve, reject) => {
        const dosboxPromise = Dos(canvasElement, options)
        dosPromise.value = dosboxPromise // Store promise for proper termination
        
        dosboxPromise.ready((fs, main) => {
          console.log('JS-DOS ready callback called')
          console.log('fs:', fs)
          console.log('main:', main)
          console.log('fs methods:', fs ? Object.keys(fs) : 'null')
          
          // Store fs and main for later use
          dosbox = { fs, main, ready: dosboxPromise.ready.bind(dosboxPromise) }
          
          // Try to get CI from fs if available
          if (fs && typeof fs.fsWriteFile === 'function') {
            ci = fs
            console.log('Using fs as CI')
          } else if (fs && fs.ci) {
            ci = fs.ci
            console.log('CI found in fs.ci')
          }
          
          resolve({ dosbox, ci, fs, main })
        }).catch((err) => {
          console.error('JS-DOS initialization failed:', err)
          reject(err)
        })
      })
    }
    
    let fs, main
    try {
      // Try official js-dos.com CDN first
      const result = await initDos({
        wdosboxUrl: 'https://js-dos.com/cdn/6.22/wdosbox.js',
        wdosboxWasmUrl: 'https://js-dos.com/cdn/6.22/wdosbox.wasm',
        onprogress: (stage, total, loaded) => {
          console.log(`Loading DOSBox: ${stage} ${loaded}/${total}`)
        }
      })
      dosbox = result.dosbox
      ci = result.ci
      dosCi.value = result.ci // Store CI for termination
      fs = result.fs
      main = result.main
      console.log('Successfully initialized with js-dos.com CDN')
    } catch (err) {
      console.warn('js-dos.com CDN failed, trying unpkg:', err)
      // Fallback to unpkg
      try {
        const result = await initDos({
          wdosboxUrl: 'https://unpkg.com/js-dos@6.22.60/dist/wdosbox.js',
          wdosboxWasmUrl: 'https://unpkg.com/js-dos@6.22.60/dist/wdosbox.wasm',
          onprogress: (stage, total, loaded) => {
            console.log(`Loading DOSBox: ${stage} ${loaded}/${total}`)
          }
        })
        dosbox = result.dosbox
        ci = result.ci
        dosCi.value = result.ci // Store CI for termination
        fs = result.fs
        main = result.main
        console.log('Successfully initialized with unpkg CDN')
      } catch (err2) {
        console.error('Both CDNs failed:', err2)
        throw new Error(`Failed to initialize JS-DOS: ${err2?.message || String(err2)}`)
      }
    }
    
    // Create DOSBox configuration file for better screen resolution and scaling
    // This will be written after filesystem is ready
    const dosboxConfig = `[sdl]
fullscreen=false
fulldouble=false
fullresolution=desktop
windowresolution=1024x768
output=opengl
autolock=true
sensitivity=100
waitonerror=true
priority=higher,normal
mapperfile=mapper-jsdos.map
usescancodes=true

[render]
frameskip=0
aspect=true
scaler=normal3x
# Available scalers: none, normal2x, normal3x, advmame2x, advmame3x, advinterp2x, advinterp3x, hq2x, hq3x, 2xsai, super2xsai, supereagle, tv2x, tv3x, rgb2x, rgb3x, scan2x, scan3x
# normal3x will scale 320x200 to 960x600, which should fit better

[cpu]
core=auto
cputype=auto
cycles=auto
cycleup=10
cycledown=20

[mixer]
nosound=false
rate=22050
blocksize=2048
prebuffer=25

[midi]
mpu401=intelligent
mididevice=default
midiconfig=

[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
sbmixer=true
oplmode=auto
oplemu=default
oplrate=22050

[gus]
gus=false
gusbase=240
gusirq=5
gusdma=3
ultradir=C:\\ULTRASND

[speaker]
pcspeaker=true
pcrate=22050
tandy=auto
tandyrate=22050
disney=true

[joystick]
joysticktype=auto
timed=false
autofire=false
swap34=false
buttonwrap=false

[serial]
serial1=dummy
serial2=dummy
serial3=disabled
serial4=disabled

[parallel]
parallel1=printer
parallel2=disabled
parallel3=disabled

[dos]
xms=true
ems=true
umb=true
keyboardlayout=auto

[ipx]
ipx=false

[autoexec]
# Autoexec commands will be added by the game loading code
`

    // Log what we have available
    console.log('Initialization complete:')
    console.log('dosbox:', dosbox)
    console.log('fs:', fs)
    console.log('main:', main)
    console.log('ci:', ci)
    
    if (!fs || !main) {
      throw new Error('JS-DOS initialization incomplete: fs or main not available')
    }
    
    // Write DOSBox configuration file for better screen resolution and scaling
    try {
      console.log('Writing DOSBox configuration file...')
      if (fs && typeof fs.createFile === 'function') {
        fs.createFile('dosbox.conf', dosboxConfig)
        console.log('DOSBox config written via fs.createFile')
      } else if (fs && typeof fs.fsWriteFile === 'function') {
        await fs.fsWriteFile('dosbox.conf', dosboxConfig)
        console.log('DOSBox config written via fs.fsWriteFile')
      } else {
        console.warn('Could not write DOSBox config file - using defaults')
      }
    } catch (err) {
      console.warn('Error writing DOSBox config:', err)
      // Continue anyway - DOSBox will use defaults
    }
    
    // Check if we have an IMG file that needs mounting (imgFile already declared above)
    if (imgFile) {
      // Handle IMG disk image
      const imgContent = gameFiles[imgFile]
      const imgPath = imgFile.replace(/\\/g, '/').toUpperCase()
      
      console.log('Writing IMG file:', imgPath, 'Size:', imgContent.length)
      
      // Write IMG file to filesystem using fs from .ready() callback
      try {
        if (fs && typeof fs.createFile === 'function') {
          fs.createFile(imgPath, imgContent)
          console.log('IMG file written successfully via fs.createFile')
        } else if (fs && typeof fs.fsWriteFile === 'function') {
          await fs.fsWriteFile(imgPath, imgContent)
          console.log('IMG file written successfully via fs.fsWriteFile')
        } else {
          throw new Error(`No file writing method available for IMG file. fs methods: ${fs ? Object.keys(fs).join(', ') : 'null'}`)
        }
      } catch (err) {
        console.error('Error writing IMG file:', err)
        throw new Error(`Failed to write IMG file: ${err?.message || String(err)}`)
      }
      
      // Create AUTOEXEC.BAT to mount IMG and run executable
      if (!main) {
        throw new Error('main function not available from JS-DOS initialization')
      }
      
      const exeInImg = (gameExecutable.split('/').pop() || gameExecutable.split('\\').pop()).toUpperCase()
      console.log('Creating AUTOEXEC.BAT for IMG execution, executable:', exeInImg)
      
      // Create AUTOEXEC.BAT with mount and run commands
      // Parameters: -size 512,8,2,384 (from DiggerRem instructions)
      // Add resolution/scaler settings at the start
      const batchContent = `@echo off\nconfig -set render scaler normal3x\nconfig -set render aspect true\nimgmount c ${imgPath} -size 512,8,2,384\nc:\n${exeInImg}\n`
      
      // Write AUTOEXEC.BAT using fs
      if (fs && typeof fs.createFile === 'function') {
        fs.createFile('AUTOEXEC.BAT', batchContent)
      } else if (fs && typeof fs.fsWriteFile === 'function') {
        await fs.fsWriteFile('AUTOEXEC.BAT', batchContent)
      } else {
        throw new Error('No file writing method available for AUTOEXEC.BAT')
      }
      
      console.log('Created AUTOEXEC.BAT, calling main() to start DOSBox')
      // Call main() with config file - AUTOEXEC.BAT will set scaler/resolution
      main(['-conf', 'dosbox.conf', '-c', 'AUTOEXEC.BAT'])
      console.log('Called main() for IMG with config')
    } else {
      // Regular file mounting
      console.log('Mounting regular files, count:', Object.keys(gameFiles).length)
      
      // Mount all game files using Command Interface or dosbox
      // Log filesystem structure for first file only
      let loggedFsStructure = false
      for (const [filename, content] of Object.entries(gameFiles)) {
        // Normalize path (use forward slashes, uppercase for DOS)
        const normalizedPath = filename.replace(/\\/g, '/').toUpperCase()
        console.log('Writing file:', normalizedPath, 'Size:', content.length)
        
        if (!loggedFsStructure) {
          console.log('dosbox.fs structure:', dosbox?.fs)
          console.log('dosbox.fs methods:', dosbox?.fs ? Object.keys(dosbox.fs) : 'null')
          if (dosbox?.fs?.fs) {
            console.log('dosbox.fs.fs:', dosbox.fs.fs)
            console.log('dosbox.fs.fs methods:', Object.keys(dosbox.fs.fs))
            // Check for common filesystem methods
            console.log('dosbox.fs.fs.writeFile exists:', typeof dosbox.fs.fs.writeFile)
            console.log('dosbox.fs.fs.createFile exists:', typeof dosbox.fs.fs.createFile)
            console.log('dosbox.fs.fs.writeFileSync exists:', typeof dosbox.fs.fs.writeFileSync)
            console.log('dosbox.fs.fs.createDataFile exists:', typeof dosbox.fs.fs.createDataFile)
          }
          loggedFsStructure = true
        }
        
        try {
          // Use fs from .ready() callback
          if (fs && typeof fs.createFile === 'function') {
            // JS-DOS fs.createFile() method
            fs.createFile(normalizedPath, content)
            console.log('File written via fs.createFile')
          } else if (fs && typeof fs.fsWriteFile === 'function') {
            // CI fsWriteFile method
            await fs.fsWriteFile(normalizedPath, content)
            console.log('File written via fs.fsWriteFile')
          } else {
            throw new Error(`No file writing method available for ${normalizedPath}. fs methods: ${fs ? Object.keys(fs).join(', ') : 'null'}`)
          }
        } catch (err) {
          console.error('Error writing file:', normalizedPath, err)
          throw new Error(`Failed to write file ${normalizedPath}: ${err?.message || String(err)}`)
        }
      }

      // Run the game executable
      const command = gameExecutable.replace(/\\/g, '/').toUpperCase()
      console.log('Running executable:', command)
      
      if (!main) {
        throw new Error('main function not available from JS-DOS initialization')
      }
      
      try {
        // Create AUTOEXEC.BAT to auto-run the game
        // Add resolution/scaler settings at the start for better display
        console.log('Creating AUTOEXEC.BAT with command:', command)
        const batchContent = `@echo off\nconfig -set render scaler normal3x\nconfig -set render aspect true\n${command}\n`
        
        // Write AUTOEXEC.BAT using fs
        if (fs && typeof fs.createFile === 'function') {
          fs.createFile('AUTOEXEC.BAT', batchContent)
        } else if (fs && typeof fs.fsWriteFile === 'function') {
          await fs.fsWriteFile('AUTOEXEC.BAT', batchContent)
        } else {
          throw new Error('No file writing method available for AUTOEXEC.BAT')
        }
        
        console.log('Created AUTOEXEC.BAT, calling main() to start DOSBox')
        // Call main() with config file - AUTOEXEC.BAT will set scaler/resolution
        main(['-conf', 'dosbox.conf', '-c', 'AUTOEXEC.BAT'])
        console.log('Called main() - DOSBox should start and run AUTOEXEC.BAT with config')
      } catch (err) {
        console.error('Error running executable:', err)
        throw new Error(`Failed to run executable: ${err?.message || String(err)}`)
      }
    }

    dosRuntime.value = dosbox
    console.log('Game started successfully')

  } catch (err) {
    const errorMsg = err?.message || String(err) || 'Unknown error'
    error.value = `Failed to run game: ${errorMsg}`
    gameReady.value = false
    console.error('Game execution error:', err)
    console.error('Error stack:', err?.stack)
  } finally {
    loading.value = false
  }
}

async function stopGame() {
  console.log('Stopping game emulation - proper termination')
  
  // First, try to exit DOSBox using the Command Interface (most reliable method)
  let ci = dosCi.value
  
  // If CI is not stored, try to get it from main() promise
  if (!ci && dosRuntime.value && dosRuntime.value.main) {
    try {
      console.log('CI not stored, trying to get it from main()...')
      // In JS-DOS, calling main() without arguments returns a promise that resolves to CI
      const mainResult = dosRuntime.value.main()
      if (mainResult && typeof mainResult.then === 'function') {
        ci = await mainResult
        console.log('Got CI from main() promise')
      } else if (mainResult && typeof mainResult.exit === 'function') {
        ci = mainResult
        console.log('Got CI directly from main()')
      }
    } catch (e) {
      console.warn('Could not get CI from main():', e)
    }
  }
  
  // Try to exit using CI
  if (ci) {
    try {
      console.log('Attempting to exit DOSBox via CI.exit()...')
      if (typeof ci.exit === 'function') {
        ci.exit()
        console.log('✓ Called CI.exit() - DOSBox should terminate')
        // Wait a bit for termination to complete
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        console.log('CI.exit() not available, CI methods:', Object.keys(ci).filter(k => typeof ci[k] === 'function'))
      }
    } catch (e) {
      console.warn('Error calling CI.exit():', e)
    }
  }
  
  // Also try to exit via main function with exit command
  if (dosRuntime.value && dosRuntime.value.main) {
    try {
      // Try to exit DOSBox via command
      dosRuntime.value.main(['exit'])
      console.log('Sent exit command via main()')
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (e) {
      console.warn('Could not exit via main():', e)
    }
    
    // Also try to mute sound before stopping
    try {
      dosRuntime.value.main(['mixer', 'nosound'])
      console.log('Sent mixer nosound command')
    } catch (e) {
      console.warn('Could not mute sound:', e)
    }
  }
  
  // Try to send Ctrl+F9 to DOSBox (force quit)
  if (gameContainer.value) {
    const canvas = gameContainer.value.querySelector('#jsdos-canvas')
    if (canvas) {
      try {
        // Send Ctrl+F9 key combination to force quit DOSBox
        const ctrlF9Event = new KeyboardEvent('keydown', {
          key: 'F9',
          code: 'F9',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        })
        canvas.dispatchEvent(ctrlF9Event)
        canvas.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'F9',
          code: 'F9',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        }))
        console.log('Sent Ctrl+F9 to DOSBox')
        
        // Also try Alt+Pause to pause
        const altPauseEvent = new KeyboardEvent('keydown', {
          key: 'Pause',
          code: 'Pause',
          altKey: true,
          bubbles: true,
          cancelable: true
        })
        canvas.dispatchEvent(altPauseEvent)
      } catch (e) {
        console.warn('Could not send keyboard events:', e)
      }
    }
  }
  
  // Stop all audio contexts and nodes to prevent sound from continuing
  try {
    // First, find and stop all AudioNodes (sources of sound)
    const allAudioNodes = []
    
    // Try to find audio nodes in the canvas
    if (gameContainer.value) {
      const canvas = gameContainer.value.querySelector('canvas')
      if (canvas) {
        // Check for audio nodes attached to canvas
        for (const key in canvas) {
          if (canvas[key] && typeof canvas[key] === 'object') {
            if (canvas[key].constructor && canvas[key].constructor.name && 
                (canvas[key].constructor.name.includes('Audio') || 
                 canvas[key].constructor.name.includes('Node'))) {
              allAudioNodes.push(canvas[key])
            }
          }
        }
      }
    }
    
    // Stop all audio nodes
    allAudioNodes.forEach(node => {
      try {
        if (node && typeof node.stop === 'function') {
          node.stop()
          console.log('✓ Stopped audio node:', node.constructor.name)
        }
        if (node && typeof node.disconnect === 'function') {
          node.disconnect()
          console.log('✓ Disconnected audio node')
        }
      } catch (e) {
        console.warn('Error stopping audio node:', e)
      }
    })
    
    // Stop all Web Audio API contexts
    if (window.AudioContext || window.webkitAudioContext) {
      const audioContexts = []
      if (window.dosboxAudioContext) {
        audioContexts.push(window.dosboxAudioContext)
      }
      if (dosRuntime.value && dosRuntime.value.audioContext) {
        audioContexts.push(dosRuntime.value.audioContext)
      }
      // Try to find audio contexts in the canvas or container
      if (gameContainer.value) {
        const canvas = gameContainer.value.querySelector('canvas')
        if (canvas) {
          if (canvas._audioContext) {
            audioContexts.push(canvas._audioContext)
          }
          // Check all properties for AudioContext
          for (const key in canvas) {
            try {
              const obj = canvas[key]
              if (obj instanceof AudioContext || (typeof webkitAudioContext !== 'undefined' && obj instanceof webkitAudioContext)) {
                audioContexts.push(obj)
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }
      
      // Also check global scope for AudioContext instances
      for (const key in window) {
        try {
          const obj = window[key]
          if (obj instanceof AudioContext || (typeof webkitAudioContext !== 'undefined' && obj instanceof webkitAudioContext)) {
            audioContexts.push(obj)
          }
        } catch (e) {
          // Ignore
        }
      }
      
      audioContexts.forEach(ctx => {
        try {
          if (ctx && ctx.state !== 'closed') {
            // Get all active source nodes and stop them
            if (ctx.destination) {
              try {
                const sources = ctx.destination.inputs || []
                sources.forEach(source => {
                  try {
                    if (source && typeof source.stop === 'function') {
                      source.stop()
                    }
                    if (source && typeof source.disconnect === 'function') {
                      source.disconnect()
                    }
                  } catch (e) {
                    // Ignore
                  }
                })
              } catch (e) {
                // Ignore
              }
            }
            
            if (ctx && typeof ctx.suspend === 'function') {
              ctx.suspend()
              console.log('✓ Suspended AudioContext')
            }
            if (ctx && typeof ctx.close === 'function') {
              ctx.close()
              console.log('✓ Closed AudioContext')
            }
          }
        } catch (e) {
          console.warn('Error closing audio context:', e)
        }
      })
    }
    
    // Stop all HTML audio elements
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      try {
        audio.pause()
        audio.currentTime = 0
        audio.src = ''
        audio.load()
        console.log('✓ Stopped HTML audio element')
      } catch (e) {
        console.warn('Error stopping audio element:', e)
      }
    })
  } catch (err) {
    console.warn('Error stopping audio:', err)
  }
  
  // Try to terminate the Dos promise first (most reliable way)
  if (dosPromise.value) {
    try {
      console.log('Dos promise methods:', Object.keys(dosPromise.value))
      console.log('Dos promise type:', typeof dosPromise.value)
      
      // Try all possible termination methods
      if (typeof dosPromise.value.stop === 'function') {
        dosPromise.value.stop()
        console.log('Called stop() on Dos promise')
      }
      if (typeof dosPromise.value.terminate === 'function') {
        dosPromise.value.terminate()
        console.log('Called terminate() on Dos promise')
      }
      if (typeof dosPromise.value.destroy === 'function') {
        dosPromise.value.destroy()
        console.log('Called destroy() on Dos promise')
      }
      if (typeof dosPromise.value.close === 'function') {
        dosPromise.value.close()
        console.log('Called close() on Dos promise')
      }
      
      // Try to access internal instance or player
      if (dosPromise.value.instance) {
        try {
          if (typeof dosPromise.value.instance.stop === 'function') {
            dosPromise.value.instance.stop()
          }
          if (typeof dosPromise.value.instance.terminate === 'function') {
            dosPromise.value.instance.terminate()
          }
        } catch (e) {
          // Ignore
        }
      }
      if (dosPromise.value.player) {
        try {
          if (typeof dosPromise.value.player.stop === 'function') {
            dosPromise.value.player.stop()
            console.log('Called stop() on player')
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Try to access WASM instance through internal properties
      const internalProps = ['_instance', '_player', '_dosbox', '_emulator', '_wasm', 'instance', 'player', 'dosbox', 'emulator']
      for (const prop of internalProps) {
        try {
          const val = dosPromise.value[prop]
          if (val) {
            console.log(`Found ${prop} in dosPromise, type:`, typeof val)
            if (typeof val.terminate === 'function') {
              val.terminate()
              console.log(`✓ Called terminate() on dosPromise.${prop}`)
            }
            if (typeof val.stop === 'function') {
              val.stop()
              console.log(`✓ Called stop() on dosPromise.${prop}`)
            }
            // Check for Module inside
            if (val.Module && typeof val.Module.terminate === 'function') {
              val.Module.terminate()
              console.log(`✓ Called terminate() on dosPromise.${prop}.Module`)
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    } catch (err) {
      console.warn('Error terminating Dos promise:', err)
    }
  }
  
  // Try to stop DOSBox if possible
  if (dosRuntime.value) {
    try {
      // Try all possible stop methods
      if (dosRuntime.value.stop && typeof dosRuntime.value.stop === 'function') {
        dosRuntime.value.stop()
      }
      if (dosRuntime.value.exit && typeof dosRuntime.value.exit === 'function') {
        dosRuntime.value.exit()
      }
      if (dosRuntime.value.terminate && typeof dosRuntime.value.terminate === 'function') {
        dosRuntime.value.terminate()
      }
      if (dosRuntime.value.destroy && typeof dosRuntime.value.destroy === 'function') {
        dosRuntime.value.destroy()
      }
      
      // Try to access the underlying emulator instance
      if (dosRuntime.value.emulator) {
        try {
          if (typeof dosRuntime.value.emulator.stop === 'function') {
            dosRuntime.value.emulator.stop()
          }
          if (typeof dosRuntime.value.emulator.terminate === 'function') {
            dosRuntime.value.emulator.terminate()
          }
        } catch (e) {
          console.warn('Error stopping emulator:', e)
        }
      }
      
      // Try to access WASM instance
      if (dosRuntime.value.wasm) {
        try {
          if (typeof dosRuntime.value.wasm.terminate === 'function') {
            dosRuntime.value.wasm.terminate()
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Try to access fs.fs which contains the Emscripten WASM module
      if (dosRuntime.value.fs && dosRuntime.value.fs.fs) {
        try {
          const fsObj = dosRuntime.value.fs.fs
          const allKeys = Object.keys(fsObj)
          console.log('fs.fs all keys:', allKeys)
          console.log('fs.fs keys count:', allKeys.length)
          
          // Emscripten WASM modules have a Module property
          if (fsObj.Module) {
            console.log('Found Module in fs.fs, keys:', Object.keys(fsObj.Module))
            if (typeof fsObj.Module.terminate === 'function') {
              fsObj.Module.terminate()
              console.log('✓ Terminated Module.terminate()')
            }
            if (typeof fsObj.Module.destroy === 'function') {
              fsObj.Module.destroy()
              console.log('✓ Destroyed Module.destroy()')
            }
            // Try to access WASM instance directly
            if (fsObj.Module.asm) {
              console.log('Found Module.asm')
            }
            // Try to find and terminate WASM instance
            if (fsObj.Module.wasmMemory) {
              console.log('Found Module.wasmMemory')
            }
          }
          
          // Try to access Module directly if it's a property
          if (fsObj.asm) {
            console.log('Found asm in fs.fs')
          }
          
          // Try to find WASM instance
          if (fsObj.HEAP8 || fsObj.HEAP16 || fsObj.HEAP32) {
            console.log('Found HEAP in fs.fs - this is Emscripten WASM')
            // Try to find the actual WASM instance
            for (const key of allKeys) {
              if (key.toLowerCase().includes('wasm') || key.toLowerCase().includes('instance')) {
                try {
                  const val = fsObj[key]
                  if (val && typeof val === 'object') {
                    console.log(`Found ${key} in fs.fs:`, val)
                    if (typeof val.terminate === 'function') {
                      val.terminate()
                      console.log(`✓ Terminated ${key}`)
                    }
                  }
                } catch (e) {
                  // Ignore
                }
              }
            }
          }
          
          // Try to find any terminate/destroy/stop functions (but skip filesystem-specific ones)
          const skipFunctions = ['destroyNode', 'destroyFile', 'destroyDir', 'destroyLink'] // These are filesystem operations, not termination
          for (const key of allKeys) {
            if (skipFunctions.includes(key)) {
              continue // Skip filesystem destroy functions
            }
            if ((key.includes('terminate') || key.includes('destroy') || key.includes('stop')) && typeof fsObj[key] === 'function') {
              try {
                // Only call if it's a termination function, not a filesystem operation
                if (key === 'terminate' || key === 'stop' || key.includes('Module')) {
                  fsObj[key]()
                  console.log(`✓ Called fs.fs.${key}()`)
                }
              } catch (e) {
                console.warn(`Error calling fs.fs.${key}():`, e)
              }
            }
          }
        } catch (e) {
          console.warn('Error accessing fs.fs:', e)
        }
      }
      
      // Try to find Module in global scope (Emscripten sometimes puts it there)
      if (window.Module) {
        try {
          console.log('Found window.Module, keys:', Object.keys(window.Module).slice(0, 20))
          if (typeof window.Module.terminate === 'function') {
            window.Module.terminate()
            console.log('✓ Terminated window.Module')
          }
        } catch (e) {
          console.warn('Error with window.Module:', e)
        }
      }
    } catch (err) {
      console.warn('Error stopping DOSBox:', err)
    }
  }
  
  // Wait for WASM instance to terminate BEFORE removing canvas
  // This is critical - removing canvas too early can prevent proper termination
  const terminateWasm = async () => {
    console.log('=== Starting WASM termination process ===')
    let terminated = false
    
    // 1. Try through fs.fs.Module
    if (dosRuntime.value && dosRuntime.value.fs && dosRuntime.value.fs.fs) {
      try {
        const fsObj = dosRuntime.value.fs.fs
        console.log('Checking fs.fs for Module...')
        console.log('fs.fs keys that might contain Module:', Object.keys(fsObj).filter(k => k.toLowerCase().includes('module') || k.toLowerCase().includes('wasm')))
        
        // Check if Module exists as a property
        if (fsObj.Module) {
          console.log('✓ Found fs.fs.Module!', Object.keys(fsObj.Module))
          if (typeof fsObj.Module.terminate === 'function') {
            console.log('Terminating fs.fs.Module...')
            fsObj.Module.terminate()
            console.log('✓ Called fs.fs.Module.terminate()')
            terminated = true
            await new Promise(resolve => setTimeout(resolve, 500))
          } else {
            console.log('fs.fs.Module.terminate is not a function, available methods:', Object.keys(fsObj.Module).filter(k => typeof fsObj.Module[k] === 'function'))
          }
        } else {
          console.log('✗ fs.fs.Module not found')
        }
        
        // Also check if Module is accessible through other paths
        for (const key of Object.keys(fsObj)) {
          try {
            const val = fsObj[key]
            if (val && typeof val === 'object' && val.Module && typeof val.Module.terminate === 'function') {
              console.log(`✓ Found Module in fs.fs.${key}, terminating...`)
              val.Module.terminate()
              console.log(`✓ Called fs.fs.${key}.Module.terminate()`)
              terminated = true
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.warn('Error accessing fs.fs.Module:', e)
      }
    } else {
      console.log('✗ dosRuntime.value.fs.fs not available')
    }
    
    // 2. Try through canvas element
    if (gameContainer.value) {
      const canvas = gameContainer.value.querySelector('#jsdos-canvas')
      if (canvas) {
        console.log('Checking canvas for WASM instance...')
        try {
          const canvasKeys = Object.keys(canvas)
          console.log('Canvas keys that might contain WASM:', canvasKeys.filter(k => 
            k.toLowerCase().includes('module') || 
            k.toLowerCase().includes('wasm') || 
            k.toLowerCase().includes('audio') ||
            k.toLowerCase().includes('dos')
          ))
          
          // Check all properties of canvas for WASM instance
          for (const key in canvas) {
            try {
              const val = canvas[key]
              if (val && typeof val === 'object') {
                if (val.Module && typeof val.Module.terminate === 'function') {
                  console.log(`✓ Found Module in canvas.${key}, terminating...`)
                  val.Module.terminate()
                  console.log(`✓ Called canvas.${key}.Module.terminate()`)
                  terminated = true
                  await new Promise(resolve => setTimeout(resolve, 500))
                }
                // Also check for WASM instance directly
                if (val.asm || val.wasmMemory || (val.HEAP8 && val.HEAP16)) {
                  console.log(`✓ Found WASM-like object in canvas.${key}`)
                  if (typeof val.terminate === 'function') {
                    val.terminate()
                    console.log(`✓ Called canvas.${key}.terminate()`)
                    terminated = true
                    await new Promise(resolve => setTimeout(resolve, 500))
                  }
                }
              }
            } catch (e) {
              // Ignore
            }
          }
        } catch (e) {
          console.warn('Error checking canvas for WASM:', e)
        }
      } else {
        console.log('✗ Canvas not found')
      }
    }
    
    // 3. Try window.Module
    if (window.Module) {
      console.log('Found window.Module!', Object.keys(window.Module))
      if (typeof window.Module.terminate === 'function') {
        try {
          console.log('Terminating window.Module...')
          window.Module.terminate()
          console.log('✓ Called window.Module.terminate()')
          terminated = true
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (e) {
          console.warn('Error terminating window.Module:', e)
        }
      } else {
        console.log('window.Module.terminate is not a function')
      }
    } else {
      console.log('✗ window.Module not found')
    }
    
    // 4. Try to find WASM instance through Dos promise
    if (dosPromise.value) {
      console.log('Checking dosPromise for WASM instance...')
      try {
        const promiseKeys = Object.keys(dosPromise.value)
        console.log('dosPromise keys:', promiseKeys)
        
        // Check all properties of dosPromise for WASM instance
        for (const key in dosPromise.value) {
          try {
            const val = dosPromise.value[key]
            if (val && typeof val === 'object') {
              if (val.Module && typeof val.Module.terminate === 'function') {
                console.log(`✓ Found Module in dosPromise.${key}, terminating...`)
                val.Module.terminate()
                console.log(`✓ Called dosPromise.${key}.Module.terminate()`)
                terminated = true
                await new Promise(resolve => setTimeout(resolve, 500))
              }
              if (typeof val.terminate === 'function' && (val.asm || val.wasmMemory)) {
                console.log(`✓ Found WASM instance in dosPromise.${key}, terminating...`)
                val.terminate()
                console.log(`✓ Called dosPromise.${key}.terminate()`)
                terminated = true
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.warn('Error checking dosPromise for WASM:', e)
      }
    } else {
      console.log('✗ dosPromise.value not available')
    }
    
    console.log(`=== WASM termination complete. Terminated: ${terminated} ===`)
    return terminated
  }
  
  // Also try to find and stop ALL audio sources more aggressively
  const stopAllAudio = () => {
    console.log('=== Stopping all audio sources ===')
    
    // Find all audio elements
    const audioElements = document.querySelectorAll('audio, video')
    console.log(`Found ${audioElements.length} audio/video elements`)
    audioElements.forEach((el, idx) => {
      try {
        el.pause()
        el.currentTime = 0
        el.volume = 0
        el.muted = true
        el.src = ''
        el.load()
        console.log(`✓ Stopped audio element ${idx}`)
      } catch (e) {
        console.warn(`Error stopping audio element ${idx}:`, e)
      }
    })
    
    // Find all AudioContext instances
    const contexts = []
    // Check window
    for (const key in window) {
      try {
        const obj = window[key]
        if (obj instanceof AudioContext || (typeof webkitAudioContext !== 'undefined' && obj instanceof webkitAudioContext)) {
          contexts.push({ source: 'window', key, ctx: obj })
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Check document
    for (const key in document) {
      try {
        const obj = document[key]
        if (obj instanceof AudioContext || (typeof webkitAudioContext !== 'undefined' && obj instanceof webkitAudioContext)) {
          contexts.push({ source: 'document', key, ctx: obj })
        }
      } catch (e) {
        // Ignore
      }
    }
    
    console.log(`Found ${contexts.length} AudioContext instances:`, contexts.map(c => `${c.source}.${c.key}`))
    
    contexts.forEach(({ source, key, ctx }) => {
      try {
        if (ctx.state !== 'closed') {
          // Try to stop all source nodes
          if (ctx.destination) {
            try {
              const sources = ctx.destination.inputs || []
              sources.forEach((source, idx) => {
                try {
                  if (source && typeof source.stop === 'function') {
                    source.stop()
                    console.log(`✓ Stopped source node ${idx} in ${source}.${key}`)
                  }
                  if (source && typeof source.disconnect === 'function') {
                    source.disconnect()
                    console.log(`✓ Disconnected source node ${idx} in ${source}.${key}`)
                  }
                } catch (e) {
                  // Ignore
                }
              })
            } catch (e) {
              // Ignore
            }
          }
          
          ctx.suspend()
          ctx.close()
          console.log(`✓ Closed AudioContext ${source}.${key}`)
        }
      } catch (e) {
        console.warn(`Error closing AudioContext ${source}.${key}:`, e)
      }
    })
    
    console.log('=== Audio stopping complete ===')
  }
  
  // Stop all audio first
  stopAllAudio()
  
  // Terminate WASM first, then remove canvas
  const wasmTerminated = await terminateWasm()
  
  if (!wasmTerminated) {
    console.warn('⚠️ WASM instance was not found/terminated. Audio may continue.')
  }
  
  // Now remove the canvas after WASM has had time to terminate
  if (gameContainer.value) {
    // Get reference to old canvas before removing
    const oldCanvas = gameContainer.value.querySelector('#jsdos-canvas')
    
    // If old canvas existed, try to stop audio and remove references
    if (oldCanvas) {
      try {
        // Try to find and disconnect any audio nodes attached to canvas
        for (const key in oldCanvas) {
          try {
            const val = oldCanvas[key]
            if (val && typeof val === 'object') {
              if (val.constructor && val.constructor.name && 
                  (val.constructor.name.includes('Audio') || 
                   val.constructor.name.includes('Node'))) {
                if (typeof val.stop === 'function') {
                  val.stop()
                  console.log('✓ Stopped audio node from canvas')
                }
                if (typeof val.disconnect === 'function') {
                  val.disconnect()
                  console.log('✓ Disconnected audio node from canvas')
                }
              }
              // Also check for WASM instance
              if (val && typeof val === 'object' && (val.Module || val.asm || val.wasmMemory)) {
                console.log('Found potential WASM instance in canvas:', key)
                try {
                  if (val.Module && typeof val.Module.terminate === 'function') {
                    val.Module.terminate()
                    console.log('✓ Terminated WASM Module from canvas')
                  }
                } catch (e) {
                  // Ignore
                }
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.warn('Error processing canvas:', e)
      }
    }
    
    // Wait a bit more before removing canvas
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Now remove all child elements completely
    gameContainer.value.innerHTML = ''
    
    // Force a reflow to ensure DOM is updated
    void gameContainer.value.offsetHeight
    
    // Wait longer for any pending operations to complete
    setTimeout(() => {
      if (!gameContainer.value) return
      
      // Create a completely fresh black canvas
      const canvas = document.createElement('canvas')
      canvas.id = 'jsdos-canvas'
      canvas.width = 640
      canvas.height = 480
      canvas.style.width = '100%'
      canvas.style.height = 'auto'
      canvas.style.display = 'block'
      canvas.style.maxWidth = '100%'
      canvas.style.backgroundColor = '#000'
      
      // Clear the canvas
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      
      gameContainer.value.appendChild(canvas)
      console.log('✓ Created fresh black canvas')
    }, 500) // Additional wait after canvas removal
  }
  
  // Try to terminate any Web Workers that JS-DOS might be using
  try {
    // Web Workers are not directly accessible, but we can try to find them
    // through the Dos promise or runtime
    if (dosPromise.value && dosPromise.value._worker) {
      try {
        dosPromise.value._worker.terminate()
        console.log('✓ Terminated Web Worker from Dos promise')
      } catch (e) {
        console.warn('Error terminating Web Worker:', e)
      }
    }
    if (dosRuntime.value && dosRuntime.value._worker) {
      try {
        dosRuntime.value._worker.terminate()
        console.log('✓ Terminated Web Worker from dosRuntime')
      } catch (e) {
        console.warn('Error terminating Web Worker:', e)
      }
    }
  } catch (err) {
    console.warn('Error with Web Worker termination:', err)
  }
  
  // Reset game state
  gameReady.value = false
  dosRuntime.value = null
  dosPromise.value = null
  dosCi.value = null
  
  // Try to find and terminate any WASM instances
  try {
    // Look for WASM instances in global scope
    if (window.Module) {
      try {
        console.log('Found window.Module, methods:', Object.keys(window.Module).slice(0, 20))
        if (window.Module.terminate && typeof window.Module.terminate === 'function') {
          window.Module.terminate()
          console.log('Terminated window.Module')
        }
        if (window.Module.destroy && typeof window.Module.destroy === 'function') {
          window.Module.destroy()
          console.log('Destroyed window.Module')
        }
      } catch (e) {
        console.warn('Error with window.Module:', e)
      }
    }
    
    // Look for WASM instances attached to canvas
    if (gameContainer.value) {
      const canvas = gameContainer.value.querySelector('canvas')
      if (canvas) {
        // Check if canvas has WASM module attached
        if (canvas.Module) {
          try {
            if (canvas.Module.terminate) {
              canvas.Module.terminate()
              console.log('Terminated canvas.Module')
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    }
    
    // Try to find all AudioContext instances and close them - more aggressive
    if (window.AudioContext || window.webkitAudioContext) {
      // Get all audio contexts from the page
      const contexts = []
      
      // Check window properties
      for (const key in window) {
        try {
          const obj = window[key]
          if (obj instanceof AudioContext || obj instanceof webkitAudioContext) {
            contexts.push(obj)
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Check document properties
      for (const key in document) {
        try {
          const obj = document[key]
          if (obj instanceof AudioContext || (typeof webkitAudioContext !== 'undefined' && obj instanceof webkitAudioContext)) {
            contexts.push(obj)
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Check all elements for audio contexts
      document.querySelectorAll('*').forEach(el => {
        for (const key in el) {
          try {
            const obj = el[key]
            if (obj instanceof AudioContext || (typeof webkitAudioContext !== 'undefined' && obj instanceof webkitAudioContext)) {
              contexts.push(obj)
            }
          } catch (e) {
            // Ignore
          }
        }
      })
      
      // Close all found contexts
      contexts.forEach(ctx => {
        try {
          // Get all source nodes and stop them
          if (ctx.destination) {
            try {
              // Try to disconnect all sources
              const sources = ctx.destination.inputs || []
              sources.forEach(source => {
                try {
                  if (source && typeof source.stop === 'function') {
                    source.stop()
                  }
                  if (source && typeof source.disconnect === 'function') {
                    source.disconnect()
                  }
                } catch (e) {
                  // Ignore
                }
              })
            } catch (e) {
              // Ignore
            }
          }
          
          // Suspend and close
          if (ctx.state !== 'closed') {
            ctx.suspend()
            ctx.close()
            console.log('✓ Closed audio context')
          }
        } catch (e) {
          console.warn('Error closing audio context:', e)
        }
      })
      
      // Also try to create a new context and immediately close it to reset state
      try {
        const AudioContextClass = window.AudioContext || (typeof window.webkitAudioContext !== 'undefined' ? window.webkitAudioContext : null)
        if (AudioContextClass) {
          const tempCtx = new AudioContextClass()
          tempCtx.close()
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Force stop all audio by muting the page
    try {
      // Try to mute all audio elements
      document.querySelectorAll('audio, video').forEach(media => {
        try {
          media.pause()
          media.currentTime = 0
          media.volume = 0
          media.muted = true
          media.src = ''
          media.load()
        } catch (e) {
          // Ignore
        }
      })
    } catch (e) {
      console.warn('Error muting media:', e)
    }
  } catch (err) {
    console.warn('Error terminating WASM:', err)
  }
  
  console.log('Game stopped, returned to black screen')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

function formatHash(hash) {
  if (!hash) return ''
  // Show first 8 and last 8 characters with ellipsis in between
  if (hash.length > 20) {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
  }
  return hash
}

function formatAddress(address) {
  if (!address) return ''
  // Show first 8 and last 8 characters with ellipsis in between
  if (address.length > 20) {
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`
  }
  return address
}

// Developer mode functions
const localFileInput = ref(null)

async function handleLocalFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  if (!file.name.toLowerCase().endsWith('.zip')) {
    error.value = 'Please select a ZIP file'
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    localFileData.value = new Uint8Array(arrayBuffer)
    localFileName.value = file.name
    console.log('Loaded local file:', file.name, 'Size:', localFileData.value.length)
  } catch (err) {
    error.value = `Failed to load file: ${err.message}`
    console.error('Error loading local file:', err)
  } finally {
    loading.value = false
  }
}

async function runLocalGame() {
  if (!localFileData.value) {
    error.value = 'No local file loaded'
    return
  }
  
  // Stop any currently running game
  if (gameReady.value) {
    stopGame()
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Reset state
  error.value = null
  loading.value = true
  
  try {
    // Create a temporary manifest-like object for local files
    const tempManifest = {
      filename: localFileName.value,
      game_id: 0,
      total_size: localFileData.value.length,
      chunk_size: 51,
      network: 'local',
      sender_address: 'LOCAL',
      sha256: '' // Will be computed if needed
    }
    
    // Set fileData and verified to allow running
    fileData.value = localFileData.value
    verified.value = true
    manifest.value = tempManifest
    syncProgress.value = { 
      fetched: 0, 
      total: 0, 
      bytes: localFileData.value.length,
      rate: 0
    }
    
    // Now run the game using the existing runGame function
    await runGame()
  } catch (err) {
    error.value = `Failed to run local game: ${err.message}`
    console.error('Error running local game:', err)
  } finally {
    loading.value = false
  }
}

// Keyboard shortcut for developer mode (Ctrl+Shift+D)
function handleKeyDown(event) {
  if (event.ctrlKey && event.shiftKey && event.key === 'D') {
    event.preventDefault()
    developerMode.value = !developerMode.value
    console.log('Developer mode:', developerMode.value ? 'enabled' : 'disabled')
  }
}

onMounted(() => {
  // Add keyboard listener for developer mode
  window.addEventListener('keydown', handleKeyDown)
  
  // Auto-load manifests list on mount
  loadManifestsList()
})

onUnmounted(() => {
  // Cleanup keyboard listener
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
