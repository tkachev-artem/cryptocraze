export type Candle = {
  time: number // seconds since epoch (Lightweight Charts expects seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type Interval = '1m' | '5m' | '15m' | '1h'

export const intervalToSec = (interval: Interval): number => {
  if (interval === '1m') return 60
  if (interval === '5m') return 5 * 60
  if (interval === '15m') return 15 * 60
  return 60 * 60
}

export const bucketStart = (tsMs: number, intervalSec: number): number => {
  const tsSec = Math.floor(tsMs / 1000)
  return Math.floor(tsSec / intervalSec) * intervalSec
}

export type Tick = {
  price: number
  timestamp: number // ms
}

/**
 * Обновляет свечи на основе тика. Возвращает кортеж [candles, changedIndex]
 * Реализует логику: если тик в текущем бакете — обновить high/low/close; иначе создать новую свечу.
 */
export function mergeTickIntoCandles(
  candles: Candle[],
  tick: Tick,
  intervalSec: number,
  maxLen: number
): [Candle[], number] {
  if (candles.length === 0) {
    const start = bucketStart(tick.timestamp, intervalSec)
    const c: Candle = { time: start, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: 0 }
    return [[c], 0]
  }
  const last = candles[candles.length - 1]
  const bucket = bucketStart(tick.timestamp, intervalSec)
  if (bucket <= last.time) {
    // обновляем последнюю свечу
    const updated: Candle = {
      ...last,
      high: Math.max(last.high, tick.price),
      low: Math.min(last.low, tick.price),
      close: tick.price,
    }
    const next = candles.slice(0, -1)
    next.push(updated)
    return [next, next.length - 1]
  }
  // новая свеча
  const newCandle: Candle = {
    time: bucket,
    open: last.close,
    high: tick.price,
    low: tick.price,
    close: tick.price,
    volume: 0,
  }
  const out = [...candles, newCandle]
  // обрезаем буфер
  const trimmed = out.length > maxLen ? out.slice(out.length - maxLen) : out
  return [trimmed, trimmed.length - 1]
}

