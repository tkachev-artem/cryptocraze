// Server-Sent Events fallback для критических торговых операций
// Используется когда Socket.IO полностью блокируется

class SSETradingClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 50;
  private reconnectDelay = 1000;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  constructor(private baseUrl: string) {}

  connect() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const url = `${this.baseUrl}/api/sse/trading`;
    console.log('🔄 SSE ТОРГОВОЕ ПОДКЛЮЧЕНИЕ:', url);
    
    this.eventSource = new EventSource(url, { withCredentials: true });

    this.eventSource.onopen = () => {
      console.log('✅ SSE ТОРГОВОЕ СОЕДИНЕНИЕ УСТАНОВЛЕНО');
      this.reconnectAttempts = 0;
    };

    this.eventSource.onerror = (error) => {
      console.error('🔴 SSE ОШИБКА:', error);
      this.handleReconnect();
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type || 'message', data);
      } catch (err) {
        console.error('SSE Parse error:', err);
      }
    };

    // Торговые события
    this.eventSource.addEventListener('price_update', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('price_update', data);
      } catch (err) {
        console.error('SSE price_update error:', err);
      }
    });

    this.eventSource.addEventListener('trade_update', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('trade_update', data);
      } catch (err) {
        console.error('SSE trade_update error:', err);
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnects) {
      console.error('🔴 SSE: МАКСИМУМ ПОПЫТОК ПЕРЕПОДКЛЮЧЕНИЯ ДОСТИГНУТ');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 10000);
    
    console.log(`🔄 SSE ПЕРЕПОДКЛЮЧЕНИЕ #${this.reconnectAttempts} через ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  get connected() {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Глобальный SSE клиент для торговли
export const sseClient = new SSETradingClient(window.location.origin);

// Автоподключение при импорте
if (typeof window !== 'undefined') {
  sseClient.connect();
}