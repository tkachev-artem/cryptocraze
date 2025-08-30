import type React from 'react';
import { useState } from 'react'
import ChartToolbar from '@/components/ChartToolbar'
import LiveCandlesChart from '@/components/LiveCandlesChart'

type Interval = '1m' | '5m' | '15m' | '1h'

const LiveChart: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('BTCUSDT')
  const [interval, setInterval] = useState<Interval>('1m')

  return (
    <main className="min-h-dvh w-full bg-[#F1F7FF] p-4">
      <div className="mx-auto max-w-4xl w-full space-y-4">
        <ChartToolbar
          symbol={symbol}
          interval={interval}
          onChangeSymbol={setSymbol}
          onChangeInterval={setInterval}
          className="justify-between"
        />
        <LiveCandlesChart symbol={symbol} interval={interval} />
      </div>
    </main>
  )
}

export default LiveChart

