import { useEffect, useRef, useState } from 'react'
import { ensureSocketConnected } from '@/lib/socket'
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
  const [isConnected, setIsConnected] = useState(false)
  const [, setVersion] = useState(0) // редкий триггер
  const candlesRef = useRef<Candle[]>([])
  const lastPriceRef = useRef<number | undefined>(undefined)
  const rafRef = useRef<number | null>(null)
  const pendingTickRef = useRef<{ price: number; ts: number } | null>(null)
  const subscribedRef = useRef(false)

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

  // Socket подписка + батчинг в rAF
  useEffect(() => {
    const socket = ensureSocketConnected()
    const upper = symbol.toUpperCase()
    const intervalSec = intervalToSec(interval)

    const emitSubscribe = () => socket.emit('subscribe', { symbols: [upper] })
    const emitUnsubscribe = () => socket.emit('unsubscribe', { symbols: [upper] })

    const handleConnect = () => {
      setIsConnected(true)
      emitSubscribe()
    }
    const handleDisconnect = () => { setIsConnected(false); }

    const scheduleApply = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const pending = pendingTickRef.current
        if (!pending) return
        pendingTickRef.current = null
        const { price, ts } = pending
        lastPriceRef.current = price
        const [next] = mergeTickIntoCandles(candlesRef.current, { price, timestamp: ts }, intervalSec, limit)
        candlesRef.current = next
        // редкий триггер для потребителей данных, не каждый тик
        setVersion(v => v + 1)
      })
    }

    const handlePriceUpdate = (payload: { symbol?: string; price: number; timestamp: number }) => {
      if (!payload.symbol || payload.symbol.toUpperCase() !== upper) return
      const ts = Number(payload.timestamp)
      const price = Number(payload.price)
      if (!Number.isFinite(ts) || !Number.isFinite(price)) return
      pendingTickRef.current = { price, ts }
      scheduleApply()
    }

    if (!subscribedRef.current) {
      socket.on('connect', handleConnect)
      socket.on('disconnect', handleDisconnect)
      socket.on('priceUpdate', handlePriceUpdate)
      emitSubscribe()
      subscribedRef.current = true
    }

    return () => {
      if (subscribedRef.current) {
        emitUnsubscribe()
        socket.off('connect', handleConnect)
        socket.off('disconnect', handleDisconnect)
        socket.off('priceUpdate', handlePriceUpdate)
        subscribedRef.current = false
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [symbol, interval, limit])

  return { candles: candlesRef.current, isConnected, lastPrice: lastPriceRef.current }
}

export default useLiveCandles

