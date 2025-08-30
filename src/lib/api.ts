type ImportMeta = {
  env: Record<string, string | undefined>
}

const env = (import.meta as ImportMeta).env

// Prefer single switch var VITE_API_SERVER; keep backward compatibility with VITE_API_BASE_URL
const configuredServer: string | undefined = env.VITE_API_SERVER ?? env.VITE_API_BASE_URL

export const API_BASE_URL: string = configuredServer && configuredServer.length > 0 ? configuredServer : '/api'

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type FetchCandlesParams = {
  symbol: string
  interval: '1m' | '5m' | '15m' | '1h'
  limit?: number
}

export async function fetchCandles(params: FetchCandlesParams): Promise<Candle[]> {
  const { symbol, interval, limit = 300 } = params
  const base = API_BASE_URL
  const url = `${base}/candles?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(String(limit))}`
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return []
    const json = await res.json() as unknown
    // Ожидаем массив свечей, приводим типы
    if (!Array.isArray(json)) return []
    return json
      .map((c: unknown) => {
        if (typeof c !== 'object' || c === null) return null
        const candle = c as Record<string, unknown>
        return {
          time: Number(candle.time ?? candle.t ?? 0),
          open: Number(candle.open ?? candle.o ?? 0),
          high: Number(candle.high ?? candle.h ?? 0),
          low: Number(candle.low ?? candle.l ?? 0),
          close: Number(candle.close ?? candle.c ?? 0),
          volume: Number(candle.volume ?? candle.v ?? 0),
        }
      })
      .filter((c): c is Candle => c !== null && Number.isFinite(c.time))
      .filter((c: Candle) => Number.isFinite(c.time))
  } catch {
    return []
  }
}

