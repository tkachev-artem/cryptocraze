import type React from 'react';
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { ensureSocketConnected } from '@/lib/socket'
import type { PriceData } from '@/hooks/useLivePrices'
import { subscribeSymbols, unsubscribeSymbols } from '@/hooks/useLivePrices'
import { useViewportSize } from '@/hooks/useViewportSize'

type LiveLineChartProps = {
  symbol: string
  height?: number
}

const LiveLineChart: React.FC<LiveLineChartProps> = ({ symbol }) => {
  const { t } = useTranslation();
  const { height: viewportHeight } = useViewportSize();
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)

  const sym = useMemo(() => String(symbol).trim().toUpperCase(), [symbol])

  useEffect(() => {
    const socket = ensureSocketConnected()
    subscribeSymbols([sym])

    const handlePriceUpdate = (payload: PriceData) => {
      if (!payload.symbol) return
      if (payload.symbol.toUpperCase() !== sym) return
      
      // Обновляем состояние мгновенно
      const newPrice = payload.price
      const updateTime = new Date(payload.timestamp)
      
      if (previousPrice !== null) {
        setPriceChange(((newPrice - previousPrice) / previousPrice) * 100)
      }
      
      setPreviousPrice(currentPrice)
      setCurrentPrice(newPrice)
      setLastUpdate(updateTime)
    }

    socket.on('priceUpdate', handlePriceUpdate)

    return () => {
      socket.off('priceUpdate', handlePriceUpdate)
      unsubscribeSymbols([sym])
    }
  }, [sym, currentPrice, previousPrice])

  const formatPrice = (price: number | null): string => {
    if (price === null) return '—'
    return price.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    })
  }

  const formatTime = (date: Date | null): string => {
    if (!date) return '—'
    return date.toLocaleTimeString()
  }

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}%`
  }

  return (
    <section
      aria-label={`Live price ${sym}`}
      className="w-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
    >
      {/* Заголовок с символом */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">{sym}</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(currentPrice)}
          </div>
          {Math.abs(priceChange) > 0.01 && (
            <div className={`text-sm font-medium ${
              priceChange >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'
            }`}>
              {formatChange(priceChange)}
            </div>
          )}
        </div>
      </div>
      
      {/* Информация об обновлении */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{t('ui.chart.lastUpdate')}</span>
        <span className="font-medium">{formatTime(lastUpdate)}</span>
      </div>
      
      {/* Индикатор статуса */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#2EBD85] animate-pulse" />
          <span className="text-xs text-gray-600">{t('ui.chart.realTimeUpdates')}</span>
        </div>
      </div>
      
      {/* Placeholder для будущего графика */}
      <div 
        className="mt-4 w-full bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-500 text-sm"
        style={{ height: Math.max(100, Math.min(400, Math.floor(viewportHeight * 0.3))) }}
      >
        {t('ui.chart.chartPlaceholder')}
      </div>
    </section>
  )
}

export default LiveLineChart

