// Nimiq RPC Client for browser
export class NimiqRPC {
  constructor(url) {
    this.url = url
    this.id = 1
  }

  async call(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.id++,
      method: method,
      params: params
    }

    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    // Handle nested data structure (some RPC endpoints wrap in {data: ...})
    if (data.result && typeof data.result === 'object' && 'data' in data.result) {
      return data.result.data
    }

    return data.result
  }

  async getTransactionByHash(txHash) {
    const result = await this.call('getTransactionByHash', { hash: txHash })
    
    // Handle different response formats
    if (typeof result === 'string') {
      // Direct string response
      return { hash: result }
    }
    
    if (result && typeof result === 'object') {
      // Object response - normalize field names
      return {
        hash: result.hash || result.Hash || txHash,
        blockNumber: result.blockNumber || result.BlockNumber || result.block_number || 0,
        height: result.height || result.Height || result.blockNumber || result.BlockNumber || 0,
        recipientData: result.recipientData || result.RecipientData || result.recipient_data || result.senderData || result.SenderData || result.sender_data || '',
        data: result.data || result.Data || result.recipientData || result.RecipientData || '',
        from: result.from || result.From || '',
        to: result.to || result.To || '',
        value: result.value || result.Value || 0,
        fee: result.fee || result.Fee || 0
      }
    }
    
    return result
  }

  /**
   * Get transactions by address with paging support
   * @param {string} address - Nimiq address (NQ...)
   * @param {number} max - Maximum number of transactions per page
   * @param {string} startAt - Optional transaction hash to start at (for paging)
   * @returns {Promise<Array>} Array of normalized transaction objects
   */
  async getTransactionsByAddress(address, max = 500, startAt = null) {
    if (!address) {
      throw new Error('Address is required for getTransactionsByAddress')
    }
    
    // Remove spaces from address (Nimiq addresses are often formatted with spaces)
    const cleanAddress = address.replace(/\s/g, '')
    
    // Validate address format - Nimiq addresses can be:
    // - Base32: "NQ" + 34 base32 chars = 36 chars total
    // - Hex: "NQ" + 40 hex chars = 42 chars total
    if (!cleanAddress.startsWith('NQ')) {
      throw new Error(`Invalid Nimiq address format: must start with NQ, got ${address}`)
    }
    
    const addressPart = cleanAddress.slice(2)
    if (addressPart.length !== 34 && addressPart.length !== 40) {
      console.warn(`Unexpected address length: ${addressPart.length} chars after NQ (expected 34 base32 or 40 hex)`)
      // Continue anyway - let RPC server validate
    }
    
    const params = { address: cleanAddress, max }
    if (startAt) {
      params.start_at = startAt  // Note: Nimiq RPC uses snake_case
    }
    
    console.log('Calling getTransactionsByAddress with params:', { address: cleanAddress, max, startAt })
    const result = await this.call('getTransactionsByAddress', params)
    
    // Handle array of transactions
    if (Array.isArray(result)) {
      return result.map(tx => this.normalizeTransaction(tx))
    }
    
    // Handle wrapped response
    if (result && Array.isArray(result.transactions)) {
      return result.transactions.map(tx => this.normalizeTransaction(tx))
    }
    
    return []
  }

  /**
   * Normalize transaction object from various RPC response formats
   */
  normalizeTransaction(tx) {
    if (!tx || typeof tx !== 'object') {
      return null
    }
    
    return {
      hash: tx.hash || tx.Hash || '',
      blockNumber: tx.blockNumber || tx.BlockNumber || tx.block_number || 0,
      height: tx.height || tx.Height || tx.blockNumber || tx.BlockNumber || 0,
      recipientData: tx.recipientData || tx.RecipientData || tx.recipient_data || tx.senderData || tx.SenderData || tx.sender_data || '',
      data: tx.data || tx.Data || tx.recipientData || tx.RecipientData || '',
      from: tx.from || tx.From || '',
      to: tx.to || tx.To || '',
      value: tx.value || tx.Value || 0,
      fee: tx.fee || tx.Fee || 0
    }
  }

  /**
   * Paging helper for getTransactionsByAddress
   * Fetches all transactions by calling getTransactionsByAddress repeatedly
   * RPC returns transactions in descending order (newest first)
   * startAt is exclusive - returns transactions BEFORE (older than) that hash
   */
  async getAllTransactionsByAddress(address, max = 500, onProgress = null) {
    const allTransactions = []
    let startAt = null
    let page = 0
    const seenHashes = new Set() // Track seen hashes to deduplicate
    let consecutiveDuplicatePages = 0
    
    while (true) {
      const transactions = await this.getTransactionsByAddress(address, max, startAt)
      
      console.log(`Page ${page + 1}: received ${transactions.length} transactions, startAt=${startAt}`)
      
      if (transactions.length === 0) {
        console.log('Empty page received, pagination complete')
        break
      }
      
      // Log first and last hash for debugging
      if (transactions.length > 0) {
        console.log(`  First hash: ${transactions[0].hash}`)
        console.log(`  Last hash: ${transactions[transactions.length - 1].hash}`)
      }
      
      // Filter out any transactions we've already seen
      const newTransactions = transactions.filter(tx => !seenHashes.has(tx.hash))
      
      console.log(`  New transactions: ${newTransactions.length} (${transactions.length - newTransactions.length} duplicates)`)
      
      // Add new transaction hashes to seen set
      for (const tx of newTransactions) {
        seenHashes.add(tx.hash)
      }
      
      if (newTransactions.length > 0) {
        allTransactions.push(...newTransactions)
        consecutiveDuplicatePages = 0
      } else {
        consecutiveDuplicatePages++
        // If we get 3 consecutive pages of all duplicates, something is wrong - stop
        if (consecutiveDuplicatePages >= 3) {
          console.warn('3 consecutive pages of duplicates, stopping pagination')
          break
        }
      }
      
      // Update progress callback if provided
      if (onProgress) {
        onProgress({
          page: page + 1,
          totalFetched: allTransactions.length,
          pageSize: newTransactions.length
        })
      }
      
      // Use the oldest transaction hash (last in descending list) as next startAt
      const lastHash = transactions[transactions.length - 1].hash
      
      // If startAt hasn't changed, we're stuck - try with first hash instead
      if (startAt === lastHash) {
        console.warn('startAt unchanged, trying with first hash')
        startAt = transactions[0].hash
      } else {
        startAt = lastHash
      }
      
      page++
      
      // If original response had fewer than max, we've reached the end
      if (transactions.length < max) {
        console.log(`Got ${transactions.length} < ${max}, pagination complete`)
        break
      }
      
      // Maximum pages safety limit
      if (page >= 100) {
        console.warn('Reached maximum page limit (100), stopping')
        break
      }
    }
    
    console.log(`getAllTransactionsByAddress complete: ${allTransactions.length} total transactions in ${page + 1} pages`)
    return allTransactions
  }
}
