# Масштабируемая архитектура для 10K+ пользователей

## 🎯 Проблема
Текущее решение с Socket.io broadcast не выдержит 10,000 одновременных пользователей из-за:
- Экспоненциального роста трафика (каждое обновление * количество клиентов)
- Высокой нагрузки на сервер при broadcast
- Проблем с памятью и CPU

## 🚀 Оптимизированная архитектура

### 1. **Server-Sent Events (SSE) вместо Socket.io**

```typescript
// src/lib/sseClient.ts
class SSEPriceClient {
  private eventSource: EventSource | null = null;
  private subscribers = new Map<string, Set<(data: PriceData) => void>>();
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;

  connect() {
    // Подключаемся только к нужным символам
    const symbols = Array.from(this.subscribers.keys());
    const url = `${API_BASE_URL}/sse/prices?symbols=${symbols.join(',')}`;
    
    this.eventSource = new EventSource(url, { withCredentials: true });
    
    this.eventSource.onmessage = (event) => {
      const data: PriceData = JSON.parse(event.data);
      const callbacks = this.subscribers.get(data.symbol);
      callbacks?.forEach(callback => callback(data));
    };

    this.eventSource.onerror = () => {
      this.reconnect();
    };
  }

  subscribe(symbol: string, callback: (data: PriceData) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    this.subscribers.get(symbol)!.add(callback);
    
    // Переподключаемся с новым списком символов
    if (this.eventSource) {
      this.eventSource.close();
      this.connect();
    }
  }
}
```

### 2. **Бэкенд оптимизация**

```javascript
// backend/routes/sse.js
app.get('/sse/prices', (req, res) => {
  const symbols = req.query.symbols?.split(',') || [];
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Уникальный ID клиента
  const clientId = generateUniqueId();
  
  // Добавляем клиента в комнаты символов
  symbols.forEach(symbol => {
    addClientToSymbolRoom(symbol, clientId, res);
  });

  req.on('close', () => {
    // Удаляем клиента из всех комнат
    removeClientFromAllRooms(clientId);
  });
});

// Оптимизированная отправка только подписанным клиентам
function broadcastPriceUpdate(symbol, priceData) {
  const clients = getClientsForSymbol(symbol);
  const message = `data: ${JSON.stringify(priceData)}\n\n`;
  
  clients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      removeClient(client);
    }
  });
}
```

### 3. **Клиентская оптимизация**

```typescript
// src/hooks/useOptimizedLivePrices.ts
export const useOptimizedLivePrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  
  // Дебаунсинг обновлений
  const debouncedSetPrices = useMemo(
    () => debounce((newPrices: Record<string, PriceData>) => {
      setPrices(prev => ({ ...prev, ...newPrices }));
    }, 100),
    []
  );

  // Батчинг обновлений
  const priceBuffer = useRef<Record<string, PriceData>>({});
  const flushBuffer = useCallback(() => {
    if (Object.keys(priceBuffer.current).length > 0) {
      debouncedSetPrices(priceBuffer.current);
      priceBuffer.current = {};
    }
  }, [debouncedSetPrices]);

  useEffect(() => {
    const interval = setInterval(flushBuffer, 200); // Флашим каждые 200мс
    return () => clearInterval(interval);
  }, [flushBuffer]);

  // Подписка через SSE
  useEffect(() => {
    const client = SSEPriceClient.getInstance();
    
    const handlePriceUpdate = (data: PriceData) => {
      // Добавляем в буфер вместо мгновенного обновления
      priceBuffer.current[data.symbol] = data;
    };

    symbols.forEach(symbol => {
      client.subscribe(symbol, handlePriceUpdate);
    });

    return () => {
      symbols.forEach(symbol => {
        client.unsubscribe(symbol, handlePriceUpdate);
      });
    };
  }, [symbols]);

  return { prices, isConnected };
};
```

### 4. **Кэширование и CDN**

```typescript
// src/lib/priceCache.ts
class PriceCache {
  private cache = new Map<string, { data: PriceData; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 секунд

  set(symbol: string, data: PriceData) {
    this.cache.set(symbol, { data, timestamp: Date.now() });
  }

  get(symbol: string): PriceData | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(symbol);
      return null;
    }
    
    return cached.data;
  }
}
```

## 📊 Сравнение производительности

### Текущее решение (Socket.io broadcast):
- **Трафик**: 1 обновление → 10K сообщений
- **RAM сервера**: ~80MB только на соединения
- **CPU**: Высокая нагрузка на broadcast
- **Масштабируемость**: ❌ Не выдержит 10K

### Оптимизированное решение (SSE + комнаты):
- **Трафик**: 1 обновление → только подписанным клиентам
- **RAM сервера**: ~20MB на соединения + комнаты
- **CPU**: Минимальная нагрузка
- **Масштабируемость**: ✅ Выдержит 50K+

## 🛠 План миграции

### Этап 1: Подготовка бэкенда
1. Добавить SSE endpoint
2. Реализовать систему комнат по символам
3. Оптимизировать Binance WebSocket интеграцию

### Этап 2: Клиентская оптимизация
1. Создать SSE клиент
2. Добавить дебаунсинг и батчинг
3. Реализовать умное кэширование

### Этап 3: A/B тестирование
1. Запустить SSE для 10% пользователей
2. Сравнить производительность
3. Постепенный rollout

### Этап 4: Мониторинг
1. Метрики соединений
2. Латенси обновлений
3. Потребление ресурсов

## 🎯 Ожидаемые результаты

- **Снижение нагрузки на сервер**: в 10-50 раз
- **Уменьшение трафика**: в 5-10 раз
- **Стабильность**: поддержка 10K+ пользователей
- **Масштабируемость**: горизонтальное масштабирование