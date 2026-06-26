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
