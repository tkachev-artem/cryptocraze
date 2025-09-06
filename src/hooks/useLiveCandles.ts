import { useEffect, useRef, useState } from 'react'
import { fetchCandles, type Candle as ApiCandle } from '@/lib/api'
import { intervalToSec, mergeTickIntoCandles, type Candle, type Interval } from '@/charts/candleMath'

type UseLiveCandlesParams = {
  symbol: string
  interval: Interval
  limit?: number
}

type UseLiveCandlesResult = {
  candles: readonly Candle[]
  isConnected: boolean
  lastPrice?: number
}

export const useLiveCandles = ({ symbol, interval, limit = 300 }: UseLiveCandlesParams): UseLiveCandlesResult => {
  const [isConnected, setIsConnected] = useState(true) // Always connected for REST API
  const [, setVersion] = useState(0) // Trigger for re-renders
  const candlesRef = useRef<Candle[]>([])
  const lastPriceRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Инициализация снапшота
  useEffect(() => {
    let aborted = false
    const load = async () => {
      const snapshot: ApiCandle[] = await fetchCandles({ symbol, interval, limit })
      if (aborted) return
      // приводим time к seconds
      const prepared: Candle[] = snapshot
        .map(c => ({ ...c, time: Math.floor(c.time) }))
        .filter(c => Number.isFinite(c.time))
      candlesRef.current = prepared
      setVersion(v => v + 1)
    }
    void load()
    return () => { aborted = true }
  }, [symbol, interval, limit])

  // REST API polling for price updates
  useEffect(() => {
    const upper = symbol.toUpperCase()
    const intervalSec = intervalToSec(interval)

    const fetchLatestPrice = async () => {
      try {
        const response = await fetch(`/api/prices?symbols=${upper}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        
        if (!response.ok) return
        
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const priceData = data[0]
          const price = Number(priceData.price)
          const ts = Date.now()
          
          if (!Number.isFinite(price)) return
          
          lastPriceRef.current = price
          const [next] = mergeTickIntoCandles(candlesRef.current, { price, timestamp: ts }, intervalSec, limit)
          candlesRef.current = next
          setVersion(v => v + 1)
        }
      } catch (error) {
        console.error('Failed to fetch latest price for candles:', error)
      }
    }

    // Start polling for price updates every 2 seconds
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchLatestPrice, 2000)
    
    // Fetch immediately
    fetchLatestPrice()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [symbol, interval, limit])

  return { candles: candlesRef.current, isConnected, lastPrice: lastPriceRef.current }
}

export default useLiveCandles

