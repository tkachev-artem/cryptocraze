import { useMemo } from 'react'
import type { KeyboardEventHandler } from 'react'
import useLivePrices from '@/hooks/useLivePrices'
import LiveBadge from './LiveBadge'
import { useTranslation } from '@/lib/i18n'
import type { PriceData } from '@/hooks/useLivePrices'

type PriceTickerProps = {
  symbols?: string[]
}

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) return '-'
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatTime = (ts: number): string => {
  if (!Number.isFinite(ts) || ts <= 0) return '-'
  const d = new Date(ts)
  return d.toLocaleTimeString()
}

const PriceTicker: React.FC<PriceTickerProps> = ({ symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] }) => {
  const { prices, isConnected } = useLivePrices(symbols)
  const { t } = useTranslation()

  const orderedSymbols = useMemo(() => {
    const set = new Set(symbols.map((s) => s.toUpperCase()))
    return Array.from(set)
  }, [symbols])

  return (
    <section aria-label={t('priceTicker.aria')} className="w-full">
      <div className="mb-3">
        <LiveBadge isConnected={isConnected} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {orderedSymbols.map((sym) => {
          const pricesMaybe = prices as Record<string, PriceData | undefined>
          const data = pricesMaybe[sym]
          const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
            }
          }
          return (
            <div
              key={sym}
              tabIndex={0}
              role="article"
              aria-label={t('priceTicker.cardAria', { symbol: sym })}
              onKeyDown={handleKeyDown}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0C54EA] focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{sym}</h3>
                <span className="text-lg font-bold text-gray-900">{formatPrice(data ? data.price : NaN)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <span>
                  {t('priceTicker.updated')} {formatTime(data ? data.timestamp : 0)}
                </span>
                {data && typeof data.priceChange24h === 'number' && Number.isFinite(data.priceChange24h) && (
                  <span
                    className={data.priceChange24h >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}
                  >
                    {data.priceChange24h.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PriceTicker

