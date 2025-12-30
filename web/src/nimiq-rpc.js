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
}
