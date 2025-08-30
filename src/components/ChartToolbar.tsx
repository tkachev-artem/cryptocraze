import type React from 'react'
import { useTranslation } from '@/lib/i18n'

type Interval = '1m' | '5m' | '15m' | '1h'

type ChartToolbarProps = {
  symbol: string
  interval: Interval
  onChangeSymbol: (next: string) => void
  onChangeInterval: (next: Interval) => void
  className?: string
}

const intervals: Interval[] = ['1m', '5m', '15m', '1h']

const ChartToolbar: React.FC<ChartToolbarProps> = ({ symbol, interval, onChangeSymbol, onChangeInterval, className }) => {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`} role="toolbar" aria-label="Панель управления графиком">
      <input
        aria-label="Символ"
        tabIndex={0}
        value={symbol}
        onChange={(e) => { onChangeSymbol(e.target.value.toUpperCase()); }}
        className="h-9 px-3 rounded border border-gray-300 outline-none focus:ring-2 focus:ring-[#0C54EA]"
        placeholder={t('placeholders.symbol')}
      />
      <div className="flex items-center gap-1" role="group" aria-label="Выбор таймфрейма">
        {intervals.map((it) => (
          <button
            key={it}
            type="button"
            tabIndex={0}
            onClick={() => { onChangeInterval(it); }}
            className={`h-9 px-3 rounded text-sm font-medium border ${
              it === interval ? 'bg-[#0C54EA] text-white border-[#0C54EA]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            aria-pressed={it === interval}
            aria-label={`Интервал ${it}`}
          >
            {it}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ChartToolbar

