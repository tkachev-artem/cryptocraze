import { useEffect, useMemo, useRef, useState } from 'react'

export type LiveStats = {
  symbol?: string
  priceChange: number
  priceChangePercent: number
  lastPrice: number
  highPrice: number
  lowPrice: number
  openPrice: number
  volume: number
  bidPrice?: number
  askPrice?: number
  count?: number
  timestamp?: number
}

type StatsMap = Record<string, LiveStats>

// Socket.IO removed - stats are fetched via REST API polling
const subscribeStats = (symbols: string[]) => {
  console.log('🚫 Socket.IO removed - using REST API for stats')
}

const unsubscribeStats = (symbols: string[]) => {
  console.log('🚫 Socket.IO removed - using REST API for stats')
}

const normalize = (symbols: string[]): string[] => {
  if (!Array.isArray(symbols) || symbols.length === 0) return []
  const out = new Set<string>()
  for (const s of symbols) {
    if (!s) continue
    out.add(String(s).trim().toUpperCase())
  }
  return Array.from(out)
}

export const useLiveStats = (inputSymbols: string[]): { stats: StatsMap; isConnected: boolean } => {
  const [isConnected, setIsConnected] = useState(true) // Always connected for REST API
  const [stats, setStats] = useState<StatsMap>({})
  const symbols = useMemo(() => normalize(inputSymbols), [inputSymbols])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch stats from REST API
  const fetchStats = async (symbolList: string[]) => {
    if (symbolList.length === 0) return
    
    try {
      const response = await fetch(`/api/stats?symbols=${symbolList.join(',')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.warn('Failed to fetch stats:', response.status)
        return
      }
      
      const data = await response.json()
      if (Array.isArray(data)) {
        const newStats: StatsMap = {}
        for (const item of data) {
          if (item.symbol) {
            newStats[item.symbol.toUpperCase()] = {
              symbol: item.symbol.toUpperCase(),
              priceChange: item.priceChange || 0,
              priceChangePercent: item.priceChangePercent || 0,
              lastPrice: item.lastPrice || 0,
              highPrice: item.highPrice || 0,
              lowPrice: item.lowPrice || 0,
              openPrice: item.openPrice || 0,
              volume: item.volume || 0,
              bidPrice: item.bidPrice,
              askPrice: item.askPrice,
              count: item.count,
              timestamp: Date.now(),
            }
          }
        }
        setStats(prev => ({ ...prev, ...newStats }))
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Set up polling for the requested symbols
  useEffect(() => {
    if (symbols.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Fetch initial data
    fetchStats(symbols)

    // Set up polling every 3 seconds
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      fetchStats(symbols)
    }, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [symbols])

  return { stats, isConnected }
}

export default useLiveStats

