import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

// Типы для Socket событий
export type SocketConfig = {
  autoConnect: boolean;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  timeout: number;
  forceNew: boolean;
}

// Улучшенная конфигурация Socket.IO
const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10, // Уменьшил с 20 до 10
  reconnectionDelay: 1000,  // Увеличил базовую задержку
  reconnectionDelayMax: 5000,
  timeout: 10000, // Таймаут подключения 10 секунд
  forceNew: false,
};

// Определение базового origin для Socket подключения
const resolveSocketOrigin = (): string => {
  const env = import.meta.env as { 
    VITE_API_SERVER?: string; 
    VITE_API_BASE_URL?: string; 
    VITE_API_PROXY_TARGET?: string;
    VITE_SOCKET_SERVER?: string;
  };
  
  // Приоритет для socket сервера
  const candidate = env.VITE_SOCKET_SERVER ?? env.VITE_API_SERVER ?? env.VITE_API_BASE_URL ?? env.VITE_API_PROXY_TARGET;
  
  if (candidate && /^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      return url.origin;
    } catch {
      console.warn('Неверный URL для socket сервера:', candidate);
    }
  }
  
  return window.location.origin;
};

const SOCKET_ORIGIN = resolveSocketOrigin();
const SOCKET_PATH = (import.meta.env as { VITE_SOCKET_PATH?: string }).VITE_SOCKET_PATH ?? '/socket.io';

// Состояние подключения
const connectionState = {
  isConnecting: false,
  isHealthy: false,
  lastConnectAttempt: 0,
  connectAttempts: 0,
  maxConnectAttempts: 5,
};

// Создание улучшенного Socket подключения
export const createResilientSocket = (config: Partial<SocketConfig> = {}): Socket => {
  const socketConfig = { ...DEFAULT_SOCKET_CONFIG, ...config };
  
  console.log(`Создание Socket подключения к: ${String(SOCKET_ORIGIN)}${String(SOCKET_PATH)}`);
  
  const socket: Socket = io(SOCKET_ORIGIN, {
    path: SOCKET_PATH,
    ...socketConfig,
    // FORCE POLLING-ONLY для Cloudflare tunnel совместимости
    transports: ['polling'], // ПРИНУДИТЕЛЬНО только polling - Cloudflare блокирует WebSocket
    upgrade: false,
    // Дополнительные настройки для надежности
    randomizationFactor: 0.5,
  });

  // Обработчики событий подключения
  socket.on('connect', () => {
    console.log('✅ Socket подключен:', String(socket.id));
    connectionState.isConnecting = false;
    connectionState.isHealthy = true;
    connectionState.connectAttempts = 0;
  });

  socket.on('connect_error', (error) => {
    console.warn('❌ Ошибка подключения Socket:', error.message);
    connectionState.isConnecting = false;
    connectionState.isHealthy = false;
    connectionState.connectAttempts++;
    
    // Если слишком много попыток, временно остановим
    if (connectionState.connectAttempts >= connectionState.maxConnectAttempts) {
      console.log('🔄 Достигнут лимит попыток подключения, пауза...');
      setTimeout(() => {
        connectionState.connectAttempts = 0;
        console.log('🔄 Сброс счетчика попыток подключения');
      }, 30000); // Пауза 30 секунд
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket отключен:', reason);
    connectionState.isHealthy = false;
    
    // Автоматическое переподключение только для определенных причин
    if (reason === 'io server disconnect') {
      // Сервер принудительно отключил - не переподключаемся автоматически
      console.log('🛑 Сервер принудительно отключил Socket');
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket переподключен после ${String(attemptNumber)} попыток`);
    connectionState.isHealthy = true;
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Попытка переподключения #${String(attemptNumber)}`);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Не удалось переподключить Socket после всех попыток');
    connectionState.isHealthy = false;
  });

  return socket;
};

// Глобальный экземпляр Socket
export const resilientSocket = createResilientSocket();

// Функция для безопасного подключения
export const ensureSocketConnection = (): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    // Если уже подключен
    if (resilientSocket.connected) {
      resolve(resilientSocket);
      return;
    }

    // Если уже подключается
    if (connectionState.isConnecting) {
      // Ждем результата текущей попытки
      const timeout = setTimeout(() => {
        reject(new Error('Таймаут ожидания подключения Socket'));
      }, 15000);

      const onConnect = () => {
        clearTimeout(timeout);
        resilientSocket.off('connect', onConnect);
        resilientSocket.off('connect_error', onError);
        resolve(resilientSocket);
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        resilientSocket.off('connect', onConnect);
        resilientSocket.off('connect_error', onError);
        reject(error);
      };

      resilientSocket.once('connect', onConnect);
      resilientSocket.once('connect_error', onError);
      return;
    }

    // Проверяем лимит попыток
    if (connectionState.connectAttempts >= connectionState.maxConnectAttempts) {
      reject(new Error('Превышен лимит попыток подключения Socket'));
      return;
    }

    // Начинаем новое подключение
    connectionState.isConnecting = true;
    connectionState.lastConnectAttempt = Date.now();

    const timeout = setTimeout(() => {
      connectionState.isConnecting = false;
      reject(new Error('Таймаут подключения Socket'));
    }, 15000);

    const onConnect = () => {
      clearTimeout(timeout);
      resilientSocket.off('connect', onConnect);
      resilientSocket.off('connect_error', onError);
      resolve(resilientSocket);
    };

    const onError = (error: Error) => {
      clearTimeout(timeout);
      connectionState.isConnecting = false;
      resilientSocket.off('connect', onConnect);
      resilientSocket.off('connect_error', onError);
      reject(error);
    };

    resilientSocket.once('connect', onConnect);
    resilientSocket.once('connect_error', onError);
    
    resilientSocket.connect();
  });
};

// Функция для проверки здоровья подключения
export const checkSocketHealth = (): boolean => {
  return resilientSocket.connected && connectionState.isHealthy;
};

// Функция для мягкого отключения
export const disconnectSocket = (): void => {
  if (resilientSocket.connected) {
    console.log('🔌 Отключение Socket...');
    resilientSocket.disconnect();
  }
  connectionState.isConnecting = false;
  connectionState.isHealthy = false;
};

// Утилита для подписки на события с автоматическим подключением
export const subscribeToSocketEvent = (
  event: string,
  handler: (data: unknown) => void,
  options: { autoConnect?: boolean } = {}
): Promise<() => void> => {
  const { autoConnect = true } = options;

  return new Promise((resolve, reject) => {
    const subscribe = () => {
      resilientSocket.on(event, handler);
      const unsubscribe = () => {
        resilientSocket.off(event, handler);
      };
      resolve(unsubscribe);
    };

    if (autoConnect && !resilientSocket.connected) {
      ensureSocketConnection()
        .then(subscribe)
        .catch(reject);
    } else {
      subscribe();
    }
  });
};

// Экспорт для обратной совместимости
export { resilientSocket as socket };
export default resilientSocket;