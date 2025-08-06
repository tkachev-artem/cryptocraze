# Binance API Интеграция

Этот документ описывает интеграцию с Binance API для получения данных о криптовалютах в реальном времени.

## Основные функции

### 1. Получение свечей для графика

```typescript
import { getCandlestickData } from '../lib/binanceApi';

const candlesticks = await getCandlestickData('BTCUSDT', '1h', 50);
```

**Параметры:**
- `symbol` (string) - торговая пара (например, 'BTCUSDT')
- `interval` (string) - интервал свечей ('1m', '5m', '15m', '1h', '4h', '1d')
- `limit` (number) - количество свечей (максимум 1000)

**Возвращает:** массив объектов с данными свечей

### 2. Получение текущей цены

```typescript
import { getCurrentPrice } from '../lib/binanceApi';

const price = await getCurrentPrice('BTCUSDT');
```

**Параметры:**
- `symbol` (string) - торговая пара

**Возвращает:** строку с текущей ценой

### 3. Получение 24ч статистики

```typescript
import { getStats } from '../lib/binanceApi';

const stats = await getStats('BTCUSDT');
```

**Параметры:**
- `symbol` (string) - торговая пара

**Возвращает:** объект со статистикой (изменение цены, объем, максимум/минимум и т.д.)

### 4. Получение данных для графика

```typescript
import { fetchChartData } from '../lib/binanceApi';

const chartData = await fetchChartData('BTCUSDT', '1h', 100);
```

**Параметры:**
- `symbol` (string) - торговая пара
- `interval` (string) - интервал
- `limit` (number) - количество точек

**Возвращает:** массив точек для отображения на графике

### 5. Получение всех торговых данных

```typescript
import { fetchTradingData } from '../lib/binanceApi';

const tradingData = await fetchTradingData('BTCUSDT');
```

**Возвращает:** объект с текущей ценой, статистикой и данными графика

## Использование в React компонентах

### С хуками React Query

```typescript
import { useBinancePrice, useBinanceStats, useBinanceChartData } from '../hooks/useBinanceData';

function TradingComponent() {
  const { data: price } = useBinancePrice('BTCUSDT');
  const { data: stats } = useBinanceStats('BTCUSDT');
  const { data: chartData } = useBinanceChartData('BTCUSDT', '1h');

  return (
    <div>
      <div>Текущая цена: ${price}</div>
      <div>Изменение: {stats?.priceChangePercent}%</div>
      {/* График с chartData */}
    </div>
  );
}
```

### Мониторинг цены в реальном времени

```typescript
import { startPriceMonitoring } from '../examples/binanceApiExamples';

function PriceMonitor() {
  const [price, setPrice] = useState<string>('');

  useEffect(() => {
    const stopMonitoring = startPriceMonitoring('BTCUSDT', (newPrice) => {
      setPrice(newPrice);
    });

    return stopMonitoring; // Очистка при размонтировании
  }, []);

  return <div>Текущая цена: ${price}</div>;
}
```

## Типы данных

### CandlestickData
```typescript
type CandlestickData = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
};
```

### ChartDataPoint
```typescript
type ChartDataPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
```

### StatsData
```typescript
type StatsData = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
};
```

## Обработка ошибок

Все функции API включают обработку ошибок:

```typescript
try {
  const price = await getCurrentPrice('BTCUSDT');
  console.log('Цена:', price);
} catch (error) {
  console.error('Ошибка получения цены:', error);
  // Показать пользователю сообщение об ошибке
}
```

## Примеры использования

Смотрите файл `src/examples/binanceApiExamples.ts` для полных примеров использования всех функций API.

## Настройка

API настроен для работы с локальным сервером на `http://localhost:8000`. Убедитесь, что ваш бэкенд сервер запущен и доступен по этому адресу.

### Endpoints

- `GET /api/binance/candlestick/{symbol}` - получение свечей
- `GET /api/binance/price/{symbol}` - получение текущей цены
- `GET /api/binance/stats/{symbol}` - получение статистики

## Производительность

- Цены обновляются каждую секунду для максимальной живости
- Статистика обновляется каждые 10 секунд
- Данные графика обновляются каждые 5 секунд

Эти интервалы можно настроить в хуках `useBinanceData.ts`.

## Живые обновления

### LivePriceTicker компонент

Для отображения живой цены с анимацией используйте компонент `LivePriceTicker`:

```typescript
import { LivePriceTicker } from '../components/LivePriceTicker';

function TradingPage() {
  return (
    <div>
      <LivePriceTicker symbol="BTCUSDT" />
    </div>
  );
}
```

### Особенности живого графика

- **Анимация изменения цены**: Цвет и размер текста меняются при изменении цены
- **Индикатор направления**: Стрелки показывают направление движения цены
- **Плавные переходы**: CSS анимации для плавного изменения цветов
- **Индикатор активности**: Мигающая точка показывает, что данные обновляются в реальном времени
- **RequestAnimationFrame**: Используется для плавной отрисовки графика

### Настройка частоты обновлений

```typescript
// В useBinanceData.ts
export const useBinancePrice = (symbol: string) => {
  return useQuery<string>({
    queryKey: ['binance-price', symbol],
    queryFn: () => getCurrentPrice(symbol),
    refetchInterval: 1000, // Обновление каждую секунду
    enabled: !!symbol,
  });
};
``` 