import type React from 'react'
import PriceTicker from '@/components/PriceTicker'
import LiveLineChart from '@/components/LiveLineChart'
import { useTranslation } from '@/lib/i18n'

const Live: React.FC = () => {
  const { t } = useTranslation()
  return (
    <main className="min-h-dvh bg-[#F1F7FF] p-4">
      <header className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">{t('live.title')}</h1>
        <p className="text-sm text-gray-600">{t('live.subtitle')}</p>
      </header>
      <div className="grid grid-cols-1 gap-4">
        <PriceTicker symbols={["BTCUSDT","ETHUSDT","SOLUSDT"]} />
        <LiveLineChart symbol="BTCUSDT" />
      </div>
    </main>
  )
}

export default Live

