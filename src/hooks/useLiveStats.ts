import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureSocketConnected } from '@/lib/socket'

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

// Глобальный refcount, чтобы несколько компонентов могли шарить подписки
const statsRefCount = new Map<string, number>()

const subscribeStats = (symbols: string[]) => {
  if (!symbols.length) return
  const socket = ensureSocketConnected()
  const toAdd: string[] = []
  for (const s of symbols) {
    const cur = statsRefCount.get(s) ?? 0
    if (cur === 0) toAdd.push(s)
    statsRefCount.set(s, cur + 1)
  }
  if (toAdd.length > 0) socket.emit('subscribeStats', { symbols: toAdd })
}

const unsubscribeStats = (symbols: string[]) => {
  if (!symbols.length) return
  const socket = ensureSocketConnected()
  const toRemove: string[] = []
  for (const s of symbols) {
    const cur = statsRefCount.get(s) ?? 0
    if (cur <= 1) {
      statsRefCount.delete(s)
      toRemove.push(s)
    } else {
      statsRefCount.set(s, cur - 1)
    }
  }
  if (toRemove.length > 0) socket.emit('unsubscribeStats', { symbols: toRemove })
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
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<StatsMap>({})
  const symbols = useMemo(() => normalize(inputSymbols), [inputSymbols])
  const subscribedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const socket = ensureSocketConnected()

    const onConnect = () => {
      setIsConnected(true)
      const all = Array.from(statsRefCount.keys())
      if (all.length) socket.emit('subscribeStats', { symbols: all })
    }
    const onDisconnect = () => { setIsConnected(false); }
    const onStatsUpdate = (payload: LiveStats) => {
      if (!payload.symbol) return
      const sym = payload.symbol.toUpperCase()
      setStats(prev => ({ ...prev, [sym]: { ...payload, symbol: sym } }))
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('statsUpdate', onStatsUpdate)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('statsUpdate', onStatsUpdate)
    }
  }, [])

  useEffect(() => {
    ensureSocketConnected()
    const set = subscribedRef.current
    const desired = new Set(symbols)
    const toSub: string[] = []
    const toUnsub: string[] = []
    for (const s of desired) if (!set.has(s)) toSub.push(s)
    for (const s of set) if (!desired.has(s)) toUnsub.push(s)
    if (toSub.length) {
      subscribeStats(toSub)
      toSub.forEach(s => set.add(s))
    }
    if (toUnsub.length) {
      unsubscribeStats(toUnsub)
      toUnsub.forEach(s => set.delete(s))
    }
  }, [symbols])

  useEffect(() => () => {
    const set = subscribedRef.current
    const all = Array.from(set)
    if (all.length) unsubscribeStats(all)
    set.clear()
  }, [])

  return { stats, isConnected }
}

export default useLiveStats

