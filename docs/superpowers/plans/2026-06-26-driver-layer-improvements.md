# Driver Layer Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize Nimiq blockchain config and NimiqRPC into a `drivers/` layer, add localStorage persistence for user settings, commit the audio mute fix, and add `formatPrice()`.

**Architecture:** Move `NimiqRPC` from `nimiq-rpc.js` into `drivers/nimiq.js` alongside a factory function. All hardcoded addresses/endpoints move to `drivers/types.js`. `App.vue` switches to importing from `drivers/index.js` and gains localStorage read/write for 5 settings keys. Existing composables (`useCatalog`, `useCartridge`, etc.) are untouched — they still receive a `NimiqRPC` instance via the `rpcClient` ref.

**Tech Stack:** Vue 3 (Composition API), Vite 8, vanilla localStorage, no new dependencies.

## Global Constraints

- Vue 3 Composition API only — no Options API
- No new npm dependencies
- Do not modify `useCatalog.js`, `useCartridge.js`, `useReconstructor.js`, `useGbEmulator.js`, `useNesEmulator.js`
- No Solana/Sui drivers, no Vue Router, no protocol switcher UI
- `nimiq-rpc.js` must continue to export `NimiqRPC` (backwards-compat shim)
- All Nimiq addresses preserved verbatim: publisher `NQ89 4GDH 0J4U C2FY TU0Y TP1X J1H7 3HX3 PVSE`, Main catalog `NQ15 NXMP 11A0 TMKP G1Q8 4ABD U16C XD6Q D948`, Test catalog `NQ32 0VD4 26TR 1394 KXBJ 862C NFKG 61M5 GFJ0`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `web/src/drivers/types.js` | **Create** | Nimiq protocol config: RPC endpoints, catalogs, publisher address, defaults |
| `web/src/drivers/nimiq.js` | **Create** | `NimiqRPC` class (moved) + `createNimiqDriver()` factory |
| `web/src/drivers/index.js` | **Create** | Single re-export entry point for all driver exports |
| `web/src/nimiq-rpc.js` | **Modify** | Becomes one-line re-export shim |
| `web/src/App.vue` | **Modify** | Import from drivers, replace hardcoded config, add localStorage |
| `web/src/utils.js` | **Modify** | Add `formatPrice()` |
| `web/src/composables/useDosEmulator.js` | **Modify** | Commit audio mute fix (already written in working tree) |

---

## Task 1: Create driver files

**Files:**
- Create: `web/src/drivers/types.js`
- Create: `web/src/drivers/nimiq.js`
- Create: `web/src/drivers/index.js`
- Modify: `web/src/nimiq-rpc.js`

**Interfaces:**
- Produces:
  - `NIMIQ_CONFIG` — object with `rpcEndpoints`, `catalogs`, `defaultRpc`, `defaultCatalog`, `publisherAddress`
  - `getDefaultRpcUrl()` → `string`
  - `getDefaultCatalog()` → `string`
  - `getVisibleCatalogs(developerMode: boolean)` → `Array<{name: string, address: string, devOnly?: boolean}>`
  - `createNimiqDriver(rpcUrl: string)` → `{ protocolId: string, rpcUrl: string, rpc: NimiqRPC }`
  - `NimiqRPC` re-exported from `drivers/index.js` (and still from `nimiq-rpc.js`)

- [ ] **Step 1: Create `web/src/drivers/types.js`**

```js
export const NIMIQ_CONFIG = {
  id: 'nimiq',
  name: 'Nimiq',
  rpcEndpoints: [
    { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
    { name: 'Custom...', url: 'custom' }
  ],
  catalogs: [
    { name: 'Test', address: 'NQ32 0VD4 26TR 1394 KXBJ 862C NFKG 61M5 GFJ0', devOnly: true },
    { name: 'Main', address: 'NQ15 NXMP 11A0 TMKP G1Q8 4ABD U16C XD6Q D948' },
    { name: 'Custom...', address: 'custom' }
  ],
  defaultRpc: 'https://rpc-mainnet.nimiqscan.com',
  defaultCatalog: 'Main',
  publisherAddress: 'NQ89 4GDH 0J4U C2FY TU0Y TP1X J1H7 3HX3 PVSE'
}

export function getDefaultRpcUrl() {
  return NIMIQ_CONFIG.defaultRpc
}

export function getDefaultCatalog() {
  return NIMIQ_CONFIG.defaultCatalog
}

export function getVisibleCatalogs(developerMode) {
  if (developerMode) return NIMIQ_CONFIG.catalogs
  return NIMIQ_CONFIG.catalogs.filter(c => !c.devOnly)
}
```

- [ ] **Step 2: Create `web/src/drivers/nimiq.js`**

Copy the entire contents of `web/src/nimiq-rpc.js` (the `NimiqRPC` class, all methods) and add the factory at the bottom:

```js
// [paste full NimiqRPC class from nimiq-rpc.js verbatim here]

export function createNimiqDriver(rpcUrl) {
  return {
    protocolId: 'nimiq',
    rpcUrl,
    rpc: new NimiqRPC(rpcUrl)
  }
}
```

The full `NimiqRPC` class to copy from `nimiq-rpc.js` starts at line 2 (`export class NimiqRPC {`) and ends at line 363 (`}`). Copy it verbatim — do not modify any method.

- [ ] **Step 3: Create `web/src/drivers/index.js`**

```js
export { NimiqRPC, createNimiqDriver } from './nimiq.js'
export { NIMIQ_CONFIG, getDefaultRpcUrl, getDefaultCatalog, getVisibleCatalogs } from './types.js'
```

- [ ] **Step 4: Reduce `web/src/nimiq-rpc.js` to a re-export shim**

Replace the entire file contents with:

```js
export { NimiqRPC } from './drivers/nimiq.js'
```

- [ ] **Step 5: Verify build passes**

```bash
cd web && npm run build
```

Expected: build completes with no errors. `NimiqRPC` is still resolvable from `nimiq-rpc.js` via the shim.

- [ ] **Step 6: Commit**

```bash
git add web/src/drivers/types.js web/src/drivers/nimiq.js web/src/drivers/index.js web/src/nimiq-rpc.js
git commit -m "feat: add drivers/ layer — move NimiqRPC to drivers/nimiq.js, centralize config in drivers/types.js"
```

---

## Task 2: Wire driver config and localStorage into App.vue

**Files:**
- Modify: `web/src/App.vue`

**Interfaces:**
- Consumes from Task 1:
  - `createNimiqDriver(rpcUrl: string)` → `{ rpc: NimiqRPC }`
  - `NIMIQ_CONFIG.rpcEndpoints`, `NIMIQ_CONFIG.catalogs`, `NIMIQ_CONFIG.publisherAddress`
  - `getDefaultRpcUrl()` → `string`
  - `getDefaultCatalog()` → `string`

- [ ] **Step 1: Update imports at the top of `<script setup>` in `App.vue`**

Replace:
```js
import { NimiqRPC } from './nimiq-rpc.js'
```

With:
```js
import { createNimiqDriver, NIMIQ_CONFIG } from './drivers/index.js'
```

- [ ] **Step 2: Add localStorage key constants immediately after the imports**

```js
const LS_RPC_URL = 'nimiq-doom-rpc-url'
const LS_CUSTOM_RPC = 'nimiq-doom-custom-rpc'
const LS_CATALOG = 'nimiq-doom-catalog'
const LS_CUSTOM_CATALOG = 'nimiq-doom-custom-catalog'
const LS_DEV_MODE = 'nimiq-doom-developer-mode'
```

- [ ] **Step 3: Replace hardcoded RPC config block**

Remove these lines (currently lines 207–215):
```js
// RPC Configuration
const rpcEndpoints = ref([
  { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
  { name: 'Custom...', url: 'custom' }
])

const selectedRpcEndpoint = ref('https://rpc-mainnet.nimiqscan.com')
const customRpcEndpoint = ref('')
const rpcClient = ref(new NimiqRPC(selectedRpcEndpoint.value))
```

Replace with:
```js
// RPC Configuration
const rpcEndpoints = NIMIQ_CONFIG.rpcEndpoints
const selectedRpcEndpoint = ref(localStorage.getItem(LS_RPC_URL) || NIMIQ_CONFIG.defaultRpc)
const customRpcEndpoint = ref(localStorage.getItem(LS_CUSTOM_RPC) || '')
const _initRpcUrl = selectedRpcEndpoint.value === 'custom'
  ? customRpcEndpoint.value || NIMIQ_CONFIG.defaultRpc
  : selectedRpcEndpoint.value
const rpcClient = ref(createNimiqDriver(_initRpcUrl).rpc)
```

- [ ] **Step 4: Replace hardcoded catalog config block**

Remove these lines (currently lines 217–224):
```js
// Configuration - Multiple catalogs
const catalogs = ref([
  { name: 'Test', address: 'NQ32 0VD4 26TR 1394 KXBJ 862C NFKG 61M5 GFJ0', devOnly: true },
  { name: 'Main', address: 'NQ15 NXMP 11A0 TMKP G1Q8 4ABD U16C XD6Q D948' },
  { name: 'Custom...', address: 'custom' }
])
const selectedCatalogName = ref('Main') // Default to Main (public catalog)
const customCatalogAddress = ref('')
```

Replace with:
```js
// Catalog Configuration
const catalogs = NIMIQ_CONFIG.catalogs
const selectedCatalogName = ref(localStorage.getItem(LS_CATALOG) || NIMIQ_CONFIG.defaultCatalog)
const customCatalogAddress = ref(localStorage.getItem(LS_CUSTOM_CATALOG) || '')
```

- [ ] **Step 5: Replace hardcoded developer mode and publisher address**

Remove:
```js
// Developer Mode
const developerMode = ref(false)
```

Replace with:
```js
// Developer Mode
const developerMode = ref(localStorage.getItem(LS_DEV_MODE) === 'true')
```

Remove:
```js
const publisherAddress = ref('NQ89 4GDH 0J4U C2FY TU0Y TP1X J1H7 3HX3 PVSE') // Trusted publisher address
```

Replace with:
```js
const publisherAddress = ref(NIMIQ_CONFIG.publisherAddress)
```

- [ ] **Step 6: Update `visibleCatalogs` computed to use plain array**

The current computed references `catalogs.value` — since `catalogs` is now a plain array (not a ref), update both occurrences:

Remove:
```js
const visibleCatalogs = computed(() => {
  if (developerMode.value) {
    return catalogs.value
  }
  return catalogs.value.filter(c => !c.devOnly)
})
```

Replace with:
```js
const visibleCatalogs = computed(() => {
  if (developerMode.value) return catalogs
  return catalogs.filter(c => !c.devOnly)
})
```

- [ ] **Step 7: Update `catalogAddress` computed to use plain array**

Remove:
```js
const catalogAddress = computed(() => {
  if (selectedCatalogName.value === 'Custom...') {
    return customCatalogAddress.value || null
  }
  const catalog = catalogs.value.find(c => c.name === selectedCatalogName.value)
  return catalog ? catalog.address : catalogs.value.find(c => c.name === 'Main')?.address
})
```

Replace with:
```js
const catalogAddress = computed(() => {
  if (selectedCatalogName.value === 'Custom...') {
    return customCatalogAddress.value || null
  }
  const catalog = catalogs.find(c => c.name === selectedCatalogName.value)
  return catalog ? catalog.address : catalogs.find(c => c.name === 'Main')?.address
})
```

- [ ] **Step 8: Add localStorage write to `developerMode` watcher**

The existing `watch(developerMode, ...)` block currently only switches away from Test catalog. Add a localStorage save at the top:

```js
watch(developerMode, (newVal) => {
  localStorage.setItem(LS_DEV_MODE, newVal ? 'true' : 'false')
  if (!newVal && selectedCatalogName.value === 'Test') {
    selectedCatalogName.value = 'Main'
    console.log('Switched from Test to Main catalog (developer mode disabled)')
  }
})
```

- [ ] **Step 9: Add localStorage writes to RPC handlers**

Update `onRpcEndpointChange`:
```js
function onRpcEndpointChange(newEndpoint) {
  selectedRpcEndpoint.value = newEndpoint
  if (newEndpoint !== 'custom') {
    localStorage.setItem(LS_RPC_URL, newEndpoint)
    rpcClient.value = createNimiqDriver(newEndpoint).rpc
  }
}
```

Update `onCustomRpcEndpointChange`:
```js
function onCustomRpcEndpointChange(newUrl) {
  customRpcEndpoint.value = newUrl
  localStorage.setItem(LS_CUSTOM_RPC, newUrl || '')
  if (newUrl) {
    selectedRpcEndpoint.value = newUrl
    rpcClient.value = createNimiqDriver(newUrl).rpc
  }
}
```

- [ ] **Step 10: Add localStorage writes to catalog handlers**

Update `onCatalogChange`:
```js
function onCatalogChange(catalogName) {
  selectedCatalogName.value = catalogName
  localStorage.setItem(LS_CATALOG, catalogName)
  selectedPlatform.value = null
  selectedGame.value = null
  selectedVersion.value = null
  fileData.value = null
  verified.value = false
  runJson.value = null
  if (catalogName !== 'Custom...' || customCatalogAddress.value) {
    loadCatalog()
  }
}
```

Update `onCustomCatalogChange`:
```js
function onCustomCatalogChange(address) {
  customCatalogAddress.value = address
  localStorage.setItem(LS_CUSTOM_CATALOG, address || '')
  selectedGame.value = null
  selectedVersion.value = null
  fileData.value = null
  verified.value = false
  runJson.value = null
  if (address) {
    loadCatalog()
  }
}
```

- [ ] **Step 11: Verify build passes**

```bash
cd web && npm run build
```

Expected: build completes with no errors or warnings about undefined variables.

- [ ] **Step 12: Verify localStorage in browser**

```bash
cd web && npm run dev
```

1. Open the app in browser
2. Open DevTools → Application → Local Storage
3. Change the RPC endpoint dropdown — verify `nimiq-doom-rpc-url` appears in localStorage
4. Reload the page — verify the dropdown still shows the saved endpoint
5. Toggle developer mode (Ctrl+Shift+D) — verify `nimiq-doom-developer-mode` is `true` in localStorage
6. Reload — verify dev mode is still enabled

- [ ] **Step 13: Commit**

```bash
git add web/src/App.vue
git commit -m "feat: wire NIMIQ_CONFIG from drivers/ into App.vue, add localStorage persistence for RPC/catalog/devmode"
```

---

## Task 3: Commit audio mute fix

**Files:**
- Modify: `web/src/composables/useDosEmulator.js` (change already in working tree)

**Interfaces:**
- No interface changes — `stopGame(containerElement)` signature unchanged

- [ ] **Step 1: Verify the change is present**

```bash
git diff web/src/composables/useDosEmulator.js
```

Expected output includes:
```diff
+    const ci = dosMainCi.value || dosCi.value
+    try {
+      if (ci && typeof ci.mute === 'function') {
+        ci.mute()
+      }
+    } catch (e) {
+      console.warn('JS-DOS mute during stop:', e)
+    }
```

If the diff is empty, the fix needs to be applied manually. In `stopGame()` (around line 814 of `useDosEmulator.js`), insert immediately before the `if (emulatorIframe.value)` block:

```js
// JS-DOS 6.x can keep Web Audio playing after the iframe is removed; mute first.
const ci = dosMainCi.value || dosCi.value
try {
  if (ci && typeof ci.mute === 'function') {
    ci.mute()
  }
} catch (e) {
  console.warn('JS-DOS mute during stop:', e)
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd web && npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/composables/useDosEmulator.js
git commit -m "fix: mute JS-DOS audio before iframe removal to prevent lingering Web Audio after game stop"
```

---

## Task 4: Add formatPrice() to utils.js

**Files:**
- Modify: `web/src/utils.js`

**Interfaces:**
- Produces: `formatPrice(luna: number | null | undefined) → string`
  - `formatPrice(0)` → `'0 NIM'`
  - `formatPrice(100000)` → `'1 NIM'`
  - `formatPrice(12345)` → `'0.12345 NIM'`
  - `formatPrice(null)` → `''`

- [ ] **Step 1: Add `formatPrice` to `web/src/utils.js`**

Append after the last export in the file (after `getPlatformInfo`):

```js
/**
 * Format a Luna value (Nimiq base unit) as a human-readable NIM string.
 * 1 NIM = 100,000 Luna.
 * @param {number|null|undefined} luna
 * @returns {string}
 */
export function formatPrice(luna) {
  if (luna == null) return ''
  const nim = luna / 1e5
  return `${nim.toLocaleString(undefined, { maximumFractionDigits: 5 })} NIM`
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd web && npm run build
```

Expected: no errors.

- [ ] **Step 3: Verify the function in browser console**

```bash
cd web && npm run dev
```

Open DevTools console and run:
```js
import('/src/utils.js').then(m => {
  console.log(m.formatPrice(0))       // "0 NIM"
  console.log(m.formatPrice(100000))  // "1 NIM"
  console.log(m.formatPrice(12345))   // "0.12345 NIM"
  console.log(m.formatPrice(null))    // ""
})
```

- [ ] **Step 4: Commit**

```bash
git add web/src/utils.js
git commit -m "feat: add formatPrice() utility — converts Luna to human-readable NIM string"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Audio mute fix → Task 3
- [x] `drivers/types.js` → Task 1 Step 1
- [x] `drivers/nimiq.js` (NimiqRPC moved + factory) → Task 1 Step 2
- [x] `drivers/index.js` → Task 1 Step 3
- [x] `nimiq-rpc.js` shim → Task 1 Step 4
- [x] App.vue uses NIMIQ_CONFIG → Task 2 Steps 1–8
- [x] localStorage persistence (5 keys) → Task 2 Steps 5, 8–10
- [x] `formatPrice()` → Task 4
- [x] Composables untouched → no tasks modify them

**Placeholder scan:** None found — all steps have exact code.

**Type consistency:**
- `createNimiqDriver(url).rpc` used in Task 2 steps 3, 9 — matches factory signature from Task 1 step 2 ✓
- `NIMIQ_CONFIG.rpcEndpoints`, `.catalogs`, `.publisherAddress`, `.defaultRpc`, `.defaultCatalog` used in Task 2 — all defined in Task 1 step 1 ✓
- `catalogs` used as plain array in Task 2 steps 6–7 — matches Task 2 step 4 which removes the `ref()` wrapper ✓
- `LS_*` constants used throughout Task 2 — all defined in Task 2 step 2 ✓
