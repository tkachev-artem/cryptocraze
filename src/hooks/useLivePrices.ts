import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureSocketConnected } from '@/lib/socket'

export type PriceData = {
  symbol?: string
  price: number
  volume24h: number
  priceChange24h: number
  timestamp: number
}

type PricesState = Record<string, PriceData>

// Global subscription ref-count across all hook consumers
const subscriptionRefCount = new Map<string, number>()

// Дедупликация глобальной пересубписки после реконнекта (общая на все инстансы)
let lastResubscribeSocketId: string | null = null

const applySubscribe = (symbols: string[]) => {
  if (symbols.length === 0) return
  const socket = ensureSocketConnected()
  const actuallyAdd: string[] = []
  for (const sym of symbols) {
    const current = subscriptionRefCount.get(sym) ?? 0
    if (current === 0) {
      actuallyAdd.push(sym)
    }
    subscriptionRefCount.set(sym, current + 1)
  }
  if (actuallyAdd.length > 0) {
    socket.emit('subscribe', { symbols: actuallyAdd })
  }
}

const applyUnsubscribe = (symbols: string[]) => {
  if (symbols.length === 0) return
  const socket = ensureSocketConnected()
  const actuallyRemove: string[] = []
  for (const sym of symbols) {
    const current = subscriptionRefCount.get(sym) ?? 0
    if (current <= 1) {
      subscriptionRefCount.delete(sym)
      actuallyRemove.push(sym)
    } else {
      subscriptionRefCount.set(sym, current - 1)
    }
  }
  if (actuallyRemove.length > 0) {
    socket.emit('unsubscribe', { symbols: actuallyRemove })
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
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [prices, setPrices] = useState<PricesState>({})

  const symbols = useMemo(() => normalizeSymbols(inputSymbols), [inputSymbols])
  const subscribedRef = useRef<Set<string>>(new Set())

  // rAF коалесинг: аккумулируем входящие обновления в рамках кадра
  const batchRef = useRef<PricesState>({})
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const socket = ensureSocketConnected()

    const flushInNextFrame = () => {
      if (rafIdRef.current !== null) return
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null
        const batch = batchRef.current
        if (Object.keys(batch).length === 0) return
        // Применяем накопленные изменения за один setState
        setPrices((prev) => {
          // Проверяем, есть ли реальные изменения
          let hasChanges = false;
          for (const [symbol, newData] of Object.entries(batch)) {
            const oldData = prev[symbol];
            if (!oldData || oldData.price !== newData.price || oldData.change !== newData.change) {
              hasChanges = true;
              break;
            }
          }
          
          // Возвращаем новый объект только если есть изменения
          return hasChanges ? { ...prev, ...batch } : prev;
        })
        batchRef.current = {}
      })
    }

    const handleConnect = () => {
      setIsConnected(true)
      // Выполняем глобальную пересубписку строго один раз на соединение
      const currentSocketId = (socket as unknown as { id?: string }).id ?? null
      if (currentSocketId && currentSocketId !== lastResubscribeSocketId) {
        lastResubscribeSocketId = currentSocketId
        const all = Array.from(subscriptionRefCount.keys())
        if (all.length > 0) {
          socket.emit('subscribe', { symbols: all })
        }
      }
    }
    const handleDisconnect = () => { setIsConnected(false); }
    const handlePriceUpdate = (payload: PriceData) => {
      if (!payload.symbol) return
      const symbol = payload.symbol.toUpperCase()
      batchRef.current[symbol] = { ...payload, symbol }
      flushInNextFrame()
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('priceUpdate', handlePriceUpdate)

    // Инициализируем видимое состояние соединения
    if (socket.connected) setIsConnected(true)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('priceUpdate', handlePriceUpdate)
      const rafId = rafIdRef.current
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafIdRef.current = null
      }
      batchRef.current = {}
    }
  }, [])

  useEffect(() => {
    ensureSocketConnected()

    const instanceSet = subscribedRef.current
    const desired = new Set(symbols)

    const toSubscribe: string[] = []
    const toUnsubscribe: string[] = []

    for (const sym of desired) {
      if (!instanceSet.has(sym)) toSubscribe.push(sym)
    }
    for (const sym of instanceSet) {
      if (!desired.has(sym)) toUnsubscribe.push(sym)
    }

    if (toSubscribe.length > 0) {
      applySubscribe(toSubscribe)
      toSubscribe.forEach((s) => instanceSet.add(s))
    }

    if (toUnsubscribe.length > 0) {
      applyUnsubscribe(toUnsubscribe)
      toUnsubscribe.forEach((s) => instanceSet.delete(s))
    }
  }, [symbols])

  // Unmount cleanup: отписываем только символы текущего экземпляра, соединение общее и не закрываем его
  useEffect(() => {
    const instanceSet = subscribedRef.current
    return () => {
      const currentAll = Array.from(instanceSet)
      if (currentAll.length > 0) {
        applyUnsubscribe(currentAll)
        instanceSet.clear()
      }
    }
  }, [])

  return { prices, isConnected }
}

// Экспортируем обертки для шаринга рефкаунта подписок с другими компонентами (например, графиком)
export const subscribeSymbols = (symbols: string[]): void => {
  const list = normalizeSymbols(symbols)
  if (list.length === 0) return
  applySubscribe(list)
}

export const unsubscribeSymbols = (symbols: string[]): void => {
  const list = normalizeSymbols(symbols)
  if (list.length === 0) return
  applyUnsubscribe(list)
}

export default useLivePrices

