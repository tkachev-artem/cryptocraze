import type React from 'react';
import { useEffect, useMemo, useRef } from 'react'
import { createChart, type IChartApi, type CandlestickSeriesPartialOptions, type ISeriesApi, type Time } from 'lightweight-charts'
import LiveBadge from '@/components/LiveBadge'
import { useLiveCandles } from '@/hooks/useLiveCandles'

type Interval = '1m' | '5m' | '15m' | '1h'

type LiveCandlesChartProps = {
  symbol: string
  interval: Interval
  className?: string
}

const seriesOptions: CandlestickSeriesPartialOptions = {
  upColor: '#2EBD85',
  downColor: '#F6465D',
  borderVisible: false,
  wickUpColor: '#2EBD85',
  wickDownColor: '#F6465D',
}

const LiveCandlesChart: React.FC<LiveCandlesChartProps> = ({ symbol, interval, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const { candles, isConnected, lastPrice } = useLiveCandles({ symbol, interval, limit: 300 })

  const title = useMemo(() => `График цены ${symbol} (${interval})`, [symbol, interval])

  // Создание/дестрой графика
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, {
      layout: { background: { color: 'transparent' }, textColor: '#111827' },
      grid: { vertLines: { color: '#E5E7EB' }, horzLines: { color: '#E5E7EB' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#E5E7EB' },
      timeScale: { borderColor: '#E5E7EB' },
      autoSize: true,
    })
    chartRef.current = chart
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    seriesRef.current = (chart as any).addCandlestickSeries(seriesOptions)

    return () => {
      seriesRef.current = null
      chartRef.current?.remove()
      chartRef.current = null
    }
  }, [])

  // Инициализируем снапшот
  useEffect(() => {
    if (!seriesRef.current) return
    const data = candles.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close }))
    seriesRef.current.setData(data)
  }, [candles])

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el || !chartRef.current) return
    const ro = new ResizeObserver(() => { chartRef.current?.applyOptions({ width: el.clientWidth, height: el.clientHeight }) })
    ro.observe(el)
    return () => { ro.disconnect(); }
  }, [])

  // Обновление цены в заголовке (минимальные перерисовки)
  const priceText = useMemo(() => (Number.isFinite(lastPrice) ? Number(lastPrice).toLocaleString() : '-'), [lastPrice])

  return (
    <section
      role="region"
      aria-label={title}
      tabIndex={0}
      className={`relative w-full h-[420px] rounded-xl bg-white ring-1 ring-gray-200 p-3 ${className ?? ''}`}
    >
      <header className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-gray-900">{symbol}</h2>
          <span className="text-xs font-medium text-gray-500">{interval}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900" aria-label="Текущая цена">{priceText}</span>
          <LiveBadge isConnected={isConnected} />
        </div>
      </header>
      <div ref={containerRef} className="w-full h-[360px]" />
    </section>
  )
}

export default LiveCandlesChart

