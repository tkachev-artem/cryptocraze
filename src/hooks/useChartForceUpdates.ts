import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/app/hooks'
import { fetchBinanceStats } from '@/app/binanceSlice'

type UseChartForceUpdatesOptions = {
  /** Символ для обновления (например BTCUSDT) */
  symbol: string
  /** Включен ли принудительный режим */
  enabled?: boolean
  /** Интервал в миллисекундах (по умолчанию 1000мс) */
  interval?: number
}

/**
 * Специальный хук для ПРИНУДИТЕЛЬНОГО обновления данных графиков каждую секунду.
 * Работает параллельно с Socket и гарантирует обновления даже если Socket не работает.
 */
export const useChartForceUpdates = (options: UseChartForceUpdatesOptions) => {
  const {
    symbol,
    enabled = true,
    interval = 1000 // 1 секунда
  } = options

  const dispatch = useAppDispatch()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(true)

  useEffect(() => {
    isActiveRef.current = true
    
    if (!enabled || !symbol) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    console.log(`🔥 ПРИНУДИТЕЛЬНЫЕ обновления графика для ${symbol} каждые ${interval.toString()}мс`)

    // Немедленное первое обновление
    void dispatch(fetchBinanceStats(symbol)).catch((err: unknown) => {
      console.warn(`Ошибка принудительного обновления ${symbol}:`, err)
    })

    // Установка интервала для периодических обновлений
    intervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return

      void dispatch(fetchBinanceStats(symbol)).unwrap().then(() => {
        console.log(`✅ График обновлен: ${symbol} в ${new Date().toLocaleTimeString()}`)
      }).catch((error: unknown) => {
        console.warn(`❌ Ошибка обновления графика ${symbol}:`, error)
      })
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [symbol, enabled, interval, dispatch])

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return {
    /** Активен ли принудительный режим */
    isForceUpdating: enabled && !!symbol
  }
}

export default useChartForceUpdates