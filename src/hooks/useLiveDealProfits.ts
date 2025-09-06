import { useEffect, useMemo, useRef, useState } from 'react'

export type DealProfit = { dealId: number; profit: string }
export type DealProfitMap = Record<number, DealProfit>

// Socket.IO removed - deal profits are fetched via REST API polling
const subscribeDeals = (dealIds: number[]) => {
  console.log('🚫 Socket.IO removed - using REST API for deal profits')
}

const unsubscribeDeals = (dealIds: number[]) => {
  console.log('🚫 Socket.IO removed - using REST API for deal profits')
}

export const useLiveDealProfits = (inputDealIds: number[]) => {
  const [isConnected, setIsConnected] = useState(true) // Always connected for REST API
  const [profits, setProfits] = useState<DealProfitMap>({})
  const dealIds = useMemo(() => Array.from(new Set(inputDealIds.filter((n) => Number.isFinite(n)))), [inputDealIds])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch deal profits from REST API
  const fetchDealProfits = async (dealIdList: number[]) => {
    if (dealIdList.length === 0) return
    
    try {
      const response = await fetch(`/api/deals/profits?ids=${dealIdList.join(',')}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      
      if (!response.ok) {
        console.warn('Failed to fetch deal profits:', response.status)
        return
      }
      
      const data = await response.json()
      if (Array.isArray(data)) {
        const newProfits: DealProfitMap = {}
        for (const item of data) {
          if (typeof item.dealId === 'number') {
            newProfits[item.dealId] = {
              dealId: item.dealId,
              profit: item.profit || '0',
            }
          }
        }
        setProfits(prev => ({ ...prev, ...newProfits }))
      }
    } catch (error) {
      console.error('Failed to fetch deal profits:', error)
    }
  }

  // Set up polling for the requested deal IDs
  useEffect(() => {
    if (dealIds.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Fetch initial data
    fetchDealProfits(dealIds)

    // Set up polling every 5 seconds
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      fetchDealProfits(dealIds)
    }, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [dealIds])

  return { profits, isConnected }
}

export default useLiveDealProfits

