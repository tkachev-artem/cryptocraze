import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { fetchBinanceStats } from '@/app/binanceSlice'
import useLivePrices from './useLivePrices'

type UseLivePricesWithFallbackOptions = {
  /** Включить принудительные обновления каждую секунду через REST API */
  enableSecondUpdates?: boolean
  /** Интервал обновлений в миллисекундах (по умолчанию 1000мс = 1 секунда) */
  updateInterval?: number
  /** Максимальная задержка без обновлений от socket после которой включается fallback (в мс) */
  socketTimeout?: number
}

/**
 * Хук для получения live цен с fallback через REST API.
 * Использует socket соединение как основной источник данных,
 * но может принудительно запрашивать данные через REST API с заданным интервалом.
 */
export const useLivePricesWithFallback = (
  symbols: string[],
  options: UseLivePricesWithFallbackOptions = {}
) => {
  const {
    enableSecondUpdates = false,
    updateInterval = 1000, // 1 секунда
    socketTimeout = 3000 // 3 секунды без socket обновлений
  } = options

  const dispatch = useAppDispatch()
  
  // Мемоизированный массив символов для стабильных зависимостей
  const memoizedSymbols = useMemo(() => 
    symbols.map(s => s.toUpperCase()).sort()
  , [symbols])
  
  const { prices: socketPrices, isConnected } = useLivePrices(symbols)
  const [restPrices, setRestPrices] = useState<Record<string, {
    symbol: string;
    price: number;
    volume24h: number;
    priceChange24h: number;
    timestamp: number;
  }>>({})
  const [, setLastSocketUpdate] = useState<Record<string, number>>({})
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(true)
  const lastSocketUpdateRef = useRef<Record<string, number>>({})
  const socketPricesRef = useRef<Record<string, {
    symbol: string;
    price: number;
    volume24h?: number;
    priceChange24h?: number;
    timestamp?: number;
  }>>({})

  // Отслеживание обновлений от socket
  useEffect(() => {
    const now = Date.now()
    const updates: Record<string, number> = {}
    for (const upperSymbol of memoizedSymbols) {
      if (upperSymbol in socketPrices) {
        updates[upperSymbol] = now
      }
    }
    
    setLastSocketUpdate(prev => {
      const newValue = { ...prev, ...updates }
      lastSocketUpdateRef.current = newValue
      return newValue
    })
  }, [socketPrices, memoizedSymbols])

  // Обновляем ref с актуальными socket ценами
  useEffect(() => {
    // Convert socketPrices to match our ref type
    const convertedPrices: Record<string, {
      symbol: string;
      price: number;
      volume24h?: number;
      priceChange24h?: number;
      timestamp?: number;
    }> = {};
    
    Object.entries(socketPrices).forEach(([symbol, data]) => {
      if (data && data.symbol) {
        convertedPrices[symbol] = {
          symbol: data.symbol,
          price: data.price,
          volume24h: data.volume24h,
          priceChange24h: data.priceChange24h,
          timestamp: data.timestamp,
        };
      }
    });
    
    socketPricesRef.current = convertedPrices;
  }, [socketPrices])

  // Мемоизированная функция для загрузки данных через REST API
  const fetchRestData = useCallback(async (symbol: string): Promise<void> => {
    if (!isActiveRef.current) return
    
    try {
      const result = await dispatch(fetchBinanceStats(symbol)).unwrap()
      
      const upperSymbol = symbol.toUpperCase()
      setRestPrices(prev => ({
        ...prev,
        [upperSymbol]: {
          symbol: upperSymbol,
          price: result.lastPrice,
          volume24h: result.volume,
          priceChange24h: result.priceChangePercent,
          timestamp: Date.now()
        }
      }))
    } catch (error) {
      console.warn(`Ошибка получения данных для ${symbol}:`, error)
    }
  }, [dispatch])

  // Основной цикл обновлений  
  useEffect(() => {
    if (!enableSecondUpdates || memoizedSymbols.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return

      const now = Date.now()
      
      // Проверяем каждый символ
      for (const upperSymbol of memoizedSymbols) {
        const lastUpdate = lastSocketUpdateRef.current[upperSymbol] ?? 0
        const timeSinceLastSocket = now - lastUpdate
        
        // Загружаем через REST если:
        // 1. Socket не подключен ИЛИ
        // 2. Давно не было обновлений от socket ИЛИ
        // 3. Нет данных в socket
        const shouldUseRest = 
          !isConnected || 
          timeSinceLastSocket > socketTimeout ||
          !socketPricesRef.current[upperSymbol]

        if (shouldUseRest) {
          void fetchRestData(upperSymbol).catch((err: unknown) => { console.warn('Fetch error:', err); })
        }
      }
    }, updateInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [
    memoizedSymbols, 
    enableSecondUpdates, 
    updateInterval, 
    socketTimeout, 
    isConnected, 
    fetchRestData
  ])

  // Cleanup при размонтировании
  useEffect(() => {
    isActiveRef.current = true
    return () => {
      isActiveRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // Объединяем данные с приоритетом socket данных
  const combinedPrices = { ...restPrices, ...socketPrices }

  return {
    prices: combinedPrices,
    isConnected,
    /** Использует ли сейчас данные от socket */
    usingSocket: isConnected && Object.keys(socketPrices).length > 0,
    /** Использует ли сейчас REST fallback */
    usingRest: Object.keys(restPrices).length > 0,
  }
}

export default useLivePricesWithFallback