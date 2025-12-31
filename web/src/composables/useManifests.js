import { ref } from 'vue'

const MANIFESTS_BASE = import.meta.env.BASE_URL + 'manifests/'

export function useManifests() {
  const manifests = ref([])
  const selectedManifestName = ref(null)
  const manifest = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function loadManifestsList() {
    loading.value = true
    error.value = null
    try {
      const indexResponse = await fetch(`${MANIFESTS_BASE}manifests-index.json`)
      
      if (indexResponse.ok) {
        const indexData = await indexResponse.json()
        manifests.value = indexData
        console.log(`Loaded ${indexData.length} manifest(s) from index`)
      } else {
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
      manifest.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${MANIFESTS_BASE}${selectedManifestName.value}.json`)
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`)
      }
      manifest.value = await response.json()
      
      // Return manifest for external use (e.g., cache loading)
      return manifest.value
    } catch (err) {
      error.value = err.message
      console.error('Error loading manifest:', err)
      manifest.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    manifests,
    selectedManifestName,
    manifest,
    loading,
    error,
    loadManifestsList,
    loadManifest
  }
}
