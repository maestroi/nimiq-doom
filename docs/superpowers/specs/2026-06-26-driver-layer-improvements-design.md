# Driver Layer Improvements — Design Spec
**Date:** 2026-06-26  
**Status:** Approved

## Overview

Port the key architectural improvements from retro-crypto into nimiq-doom while keeping the app Nimiq-only. The changes are additive and surgical: no composable rewrites, no Vue Router, no multi-chain UI.

## Scope

1. Commit the pending audio mute fix in `useDosEmulator.js`
2. Create a `drivers/` layer to centralize blockchain config and NimiqRPC
3. Reduce `nimiq-rpc.js` to a re-export shim
4. Add localStorage persistence for RPC/catalog selections in `App.vue`
5. Add `formatPrice()` utility to `utils.js`

## Section 1 — Driver Files

### `web/src/drivers/types.js`
Single source of truth for all Nimiq protocol config. Exports `NIMIQ_CONFIG` object:

```js
{
  id: 'nimiq',
  name: 'Nimiq',
  rpcEndpoints: [
    { name: 'NimiqScan Mainnet', url: 'https://rpc-mainnet.nimiqscan.com' },
    { name: 'Custom...', url: 'custom' }
  ],
  catalogs: [
    { name: 'Test', address: 'NQ32 0VD4 ...', devOnly: true },
    { name: 'Main', address: 'NQ15 NXMP ...' },
    { name: 'Custom...', address: 'custom' }
  ],
  defaultRpc: 'https://rpc-mainnet.nimiqscan.com',
  defaultCatalog: 'Main',
  publisherAddress: 'NQ89 4GDH ...'
}
```

Also exports helpers:
- `getDefaultRpcUrl()` → string
- `getDefaultCatalog()` → string
- `getVisibleCatalogs(developerMode)` → filtered catalog array

### `web/src/drivers/nimiq.js`
- `NimiqRPC` class moved verbatim from `nimiq-rpc.js`
- `createNimiqDriver(rpcUrl)` factory returns `{ protocolId: 'nimiq', rpcUrl, rpc: new NimiqRPC(rpcUrl) }`
- Composables receive `driver.rpc` exactly as they currently receive a raw `NimiqRPC` instance

### `web/src/drivers/index.js`
Single import point. Re-exports:
- `createNimiqDriver` from `./nimiq.js`
- `NIMIQ_CONFIG`, `getDefaultRpcUrl`, `getDefaultCatalog`, `getVisibleCatalogs` from `./types.js`

### `web/src/nimiq-rpc.js` (modified)
Becomes a one-line re-export shim:
```js
export { NimiqRPC } from './drivers/nimiq.js'
```
All existing imports of `NimiqRPC` from `nimiq-rpc.js` continue to work without changes.

## Section 2 — localStorage Persistence

Wired in `App.vue`'s existing setup block. No new composable.

**Storage keys:**
| Key | Purpose |
|-----|---------|
| `nimiq-doom-rpc-url` | Selected RPC endpoint URL |
| `nimiq-doom-custom-rpc` | User-entered custom RPC URL |
| `nimiq-doom-catalog` | Selected catalog name (e.g. `'Main'`) |
| `nimiq-doom-custom-catalog` | User-entered custom catalog address |
| `nimiq-doom-developer-mode` | Dev mode toggle boolean |

**Read on mount:** `onMounted` reads all five keys and initializes the corresponding refs before calling `loadCatalog()`.

**Write on change:** Each existing setter (`onRpcEndpointChange`, `onCustomRpcEndpointChange`, `onCatalogChange`, `onCustomCatalogChange`) calls `localStorage.setItem` after updating state. Developer mode watch saves on toggle.

**RPC/catalog config source:** App.vue imports `NIMIQ_CONFIG` from `drivers/index.js` and uses `NIMIQ_CONFIG.rpcEndpoints` and `NIMIQ_CONFIG.catalogs` for dropdowns, replacing the currently hardcoded arrays in the Header props.

## Section 3 — Audio Fix + formatPrice

### Audio mute fix (`useDosEmulator.js`)
The uncommitted diff is correct and complete. Commit as-is. Before removing the iframe in `stopGame()`, mute the JS-DOS CI instance to prevent Web Audio from persisting after teardown:

```js
const ci = dosMainCi.value || dosCi.value
try {
  if (ci && typeof ci.mute === 'function') ci.mute()
} catch (e) {
  console.warn('JS-DOS mute during stop:', e)
}
```

### `formatPrice()` (`utils.js`)
Converts Luna (Nimiq's base unit) to a human-readable NIM string:

```js
export function formatPrice(luna) {
  if (luna == null) return ''
  const nim = luna / 1e5
  return `${nim.toLocaleString(undefined, { maximumFractionDigits: 5 })} NIM`
}
```

## Files Changed

| File | Change |
|------|--------|
| `web/src/drivers/types.js` | **New** — Nimiq protocol config |
| `web/src/drivers/nimiq.js` | **New** — NimiqRPC + createNimiqDriver factory |
| `web/src/drivers/index.js` | **New** — re-export entry point |
| `web/src/nimiq-rpc.js` | **Modified** — becomes re-export shim |
| `web/src/App.vue` | **Modified** — localStorage persistence + driver config |
| `web/src/utils.js` | **Modified** — add formatPrice() |
| `web/src/composables/useDosEmulator.js` | **Modified** — commit audio mute fix |

## What Does NOT Change

- `useCatalog.js`, `useCartridge.js`, `useReconstructor.js`, `useGbEmulator.js`, `useNesEmulator.js` — untouched
- No Vue Router
- No multi-chain UI or protocol switcher
- No Solana/Sui drivers
- nimiq-doom's synthwave retro aesthetic is preserved
