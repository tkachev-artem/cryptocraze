import { useEffect, useMemo, useRef, useState } from 'react'

export type PriceData = {
  symbol?: string
  price: number
  volume24h: number
  priceChange24h: number
  timestamp: number
}

type PricesState = Record<string, PriceData>

// Global polling interval for all live price hooks
let globalPollingInterval: NodeJS.Timeout | null = null
const activeSymbols = new Set<string>()
const priceUpdateCallbacks = new Set<(prices: PricesState) => void>()

// REST API polling for live prices
const fetchPricesFromAPI = async (symbols: string[]): Promise<PricesState> => {
  if (symbols.length === 0) return {}
  
  try {
    const response = await fetch(`/api/prices?symbols=${symbols.join(',')}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch prices: ${response.status}`)
    }
    
    const data = await response.json()
    const pricesState: PricesState = {}
    
    // Handle new API format: {"success": true, "data": {"BTCUSDT": {...}}}
    if (data.success && data.data && typeof data.data === 'object') {
      for (const [symbol, item] of Object.entries(data.data) as [string, any][]) {
        if (item && typeof item === 'object') {
          pricesState[symbol.toUpperCase()] = {
            symbol: symbol.toUpperCase(),
            price: item.price || 0,
            volume24h: item.volume24h || 0,
            priceChange24h: item.change || 0, // API uses 'change' not 'priceChange24h'
            timestamp: Date.now(),
          }
        }
      }
    }
    
    return pricesState
  } catch (error) {
    console.error('Failed to fetch prices from REST API:', error)
    return {}
  }
}

const startGlobalPolling = () => {
  if (globalPollingInterval || activeSymbols.size === 0) return
  
  console.log('📡 Starting REST API polling for live prices')
  globalPollingInterval = setInterval(async () => {
    if (activeSymbols.size === 0) {
      stopGlobalPolling()
      return
    }
    
    const symbols = Array.from(activeSymbols)
    const prices = await fetchPricesFromAPI(symbols)
    
    // Notify all subscribers
    priceUpdateCallbacks.forEach(callback => {
      callback(prices)
    })
  }, 2000) // Poll every 2 seconds
}

const stopGlobalPolling = () => {
  if (globalPollingInterval) {
    clearInterval(globalPollingInterval)
    globalPollingInterval = null
    console.log('📡 Stopped REST API polling for live prices')
  }
}

const normalizeSymbols = (symbols: string[]): string[] => {
  if (symbols.length === 0) return []
  const upperSet = new Set<string>()
  for (const s of symbols) {
    if (!s) continue
    upperSet.add(String(s).trim().toUpperCase())
  }
  return Array.from(upperSet)
}

export const useLivePrices = (inputSymbols: string[]): { prices: PricesState; isConnected: boolean } => {
  const [isConnected, setIsConnected] = useState<boolean>(true) // Always connected for REST API
  const [prices, setPrices] = useState<PricesState>({})

  const symbols = useMemo(() => normalizeSymbols(inputSymbols), [inputSymbols])
  const subscribedRef = useRef<Set<string>>(new Set())

  // Handle price updates from global polling
  const handlePriceUpdates = useRef((newPrices: PricesState) => {
    setPrices(prev => {
      const updatedPrices = { ...prev }
      let hasChanges = false
      
      // Only update prices for symbols we're subscribed to
      for (const symbol of subscribedRef.current) {
        if (newPrices[symbol]) {
          const oldData = prev[symbol]
          const newData = newPrices[symbol]
          if (!oldData || oldData.price !== newData.price || oldData.priceChange24h !== newData.priceChange24h) {
            updatedPrices[symbol] = newData
            hasChanges = true
          }
        }
      }
      
      return hasChanges ? updatedPrices : prev
    })
  }).current

  // Subscribe to global polling updates
  useEffect(() => {
    priceUpdateCallbacks.add(handlePriceUpdates)
    return () => {
      priceUpdateCallbacks.delete(handlePriceUpdates)
    }
  }, [handlePriceUpdates])

  // Manage symbol subscriptions
  useEffect(() => {
    const instanceSet = subscribedRef.current
    const desired = new Set(symbols)

    const toSubscribe: string[] = []
    const toUnsubscribe: string[] = []

    for (const sym of desired) {
      if (!instanceSet.has(sym)) {
        toSubscribe.push(sym)
        instanceSet.add(sym)
        activeSymbols.add(sym)
      }
    }
    for (const sym of instanceSet) {
      if (!desired.has(sym)) {
        toUnsubscribe.push(sym)
        instanceSet.delete(sym)
        // Only remove from global if no other instances need it
        let stillNeeded = false
        priceUpdateCallbacks.forEach(() => {
          // This is a simplified check - in a real implementation,
          // we'd need to track per-instance subscriptions more carefully
        })
        if (!stillNeeded) {
          activeSymbols.delete(sym)
        }
      }
    }

    // Start polling if we have active symbols
    if (activeSymbols.size > 0) {
      startGlobalPolling()
    }

    // Fetch initial data for new symbols
    if (toSubscribe.length > 0) {
      fetchPricesFromAPI(toSubscribe).then(initialPrices => {
        setPrices(prev => ({ ...prev, ...initialPrices }))
      })
    }
  }, [symbols])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentSymbols = Array.from(subscribedRef.current)
      for (const sym of currentSymbols) {
        activeSymbols.delete(sym)
      }
      subscribedRef.current.clear()
      
      // Stop polling if no more active symbols
      if (activeSymbols.size === 0) {
        stopGlobalPolling()
      }
    }
  }, [])

  return { prices, isConnected }
}

// REST API polling - simplified subscription management
export const subscribeSymbols = (symbols: string[]): void => {
  const list = normalizeSymbols(symbols)
  if (list.length === 0) return
  
  for (const sym of list) {
    activeSymbols.add(sym)
  }
  
  if (activeSymbols.size > 0) {
    startGlobalPolling()
  }
}

export const unsubscribeSymbols = (symbols: string[]): void => {
  const list = normalizeSymbols(symbols)
  if (list.length === 0) return
  
  for (const sym of list) {
    activeSymbols.delete(sym)
  }
  
  if (activeSymbols.size === 0) {
    stopGlobalPolling()
  }
}

export default useLivePrices

