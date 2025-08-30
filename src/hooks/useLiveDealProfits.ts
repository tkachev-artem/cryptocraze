import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureSocketConnected } from '@/lib/socket'

export type DealProfit = { dealId: number; profit: string }
export type DealProfitMap = Record<number, DealProfit>

const refCount = new Map<number, number>()

const subscribeDeals = (dealIds: number[]) => {
  if (!dealIds.length) return
  const socket = ensureSocketConnected()
  const toAdd: number[] = []
  for (const id of dealIds) {
    const cur = refCount.get(id) ?? 0
    if (cur === 0) toAdd.push(id)
    refCount.set(id, cur + 1)
  }
  if (toAdd.length) socket.emit('subscribeDeals', { dealIds: toAdd })
}

const unsubscribeDeals = (dealIds: number[]) => {
  if (!dealIds.length) return
  const socket = ensureSocketConnected()
  const toRemove: number[] = []
  for (const id of dealIds) {
    const cur = refCount.get(id) ?? 0
    if (cur <= 1) {
      refCount.delete(id)
      toRemove.push(id)
    } else {
      refCount.set(id, cur - 1)
    }
  }
  if (toRemove.length) socket.emit('unsubscribeDeals', { dealIds: toRemove })
}

export const useLiveDealProfits = (inputDealIds: number[]) => {
  const [isConnected, setIsConnected] = useState(false)
  const [profits, setProfits] = useState<DealProfitMap>({})
  const dealIds = useMemo(() => Array.from(new Set(inputDealIds.filter((n) => Number.isFinite(n)))), [inputDealIds])
  const subscribedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    const socket = ensureSocketConnected()
    const onConnect = () => {
      setIsConnected(true)
      const all = Array.from(refCount.keys())
      if (all.length) socket.emit('subscribeDeals', { dealIds: all })
    }
    const onDisconnect = () => { setIsConnected(false); }
    const onDealProfit = (payload: DealProfit) => {
      if (typeof payload.dealId !== 'number') return
      setProfits(prev => ({ ...prev, [payload.dealId]: payload }))
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('dealProfitUpdate', onDealProfit)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('dealProfitUpdate', onDealProfit)
    }
  }, [])

  useEffect(() => {
    ensureSocketConnected()
    const set = subscribedRef.current
    const desired = new Set(dealIds)
    const toSub: number[] = []
    const toUnsub: number[] = []
    for (const id of desired) if (!set.has(id)) toSub.push(id)
    for (const id of set) if (!desired.has(id)) toUnsub.push(id)
    if (toSub.length) {
      subscribeDeals(toSub)
      toSub.forEach(id => set.add(id))
    }
    if (toUnsub.length) {
      unsubscribeDeals(toUnsub)
      toUnsub.forEach(id => set.delete(id))
    }
  }, [dealIds])

  useEffect(() => () => {
    const set = subscribedRef.current
    const all = Array.from(set)
    if (all.length) unsubscribeDeals(all)
    set.clear()
  }, [])

  return { profits, isConnected }
}

export default useLiveDealProfits

