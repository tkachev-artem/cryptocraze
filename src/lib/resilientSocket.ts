// Socket.IO completely removed for stability - using pure REST API only
export type Socket = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
  emit: (event: string, data?: any) => void;
  id?: string;
}

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

// Socket.IO removed - return stub socket
export const createResilientSocket = (config: Partial<SocketConfig> = {}): Socket => {
  console.log('🚫 Socket.IO removed - using REST API only');
  
  const socket: Socket = {
    connected: false,
    id: 'stub-socket',
    connect: () => console.log('🚫 Socket.IO removed - using REST API only'),
    disconnect: () => console.log('🚫 Socket.IO removed - using REST API only'),
    on: () => console.log('🚫 Socket.IO removed - using REST API only'),
    off: () => console.log('🚫 Socket.IO removed - using REST API only'),
    emit: () => console.log('🚫 Socket.IO removed - using REST API only')
  };

  return socket;
};

// Глобальный экземпляр Socket
export const resilientSocket = createResilientSocket();

// Socket.IO removed - return stub socket immediately
export const ensureSocketConnection = (): Promise<Socket> => {
  console.log('🚫 Socket.IO removed - using REST API only');
  return Promise.resolve(resilientSocket);
};

// Socket.IO removed - always return false
export const checkSocketHealth = (): boolean => {
  return false;
};

// Socket.IO removed - nothing to disconnect
export const disconnectSocket = (): void => {
  console.log('🚫 Socket.IO removed - nothing to disconnect');
};

// Socket.IO removed - return stub unsubscribe function
export const subscribeToSocketEvent = (
  event: string,
  handler: (data: unknown) => void,
  options: { autoConnect?: boolean } = {}
): Promise<() => void> => {
  console.log('🚫 Socket.IO removed - using REST API only');
  return Promise.resolve(() => {});
};

// Экспорт для обратной совместимости
export { resilientSocket as socket };
export default resilientSocket;