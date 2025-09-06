// Socket.IO completely removed for stability - using pure REST API only
export type Socket = {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
  emit: (event: string, data?: any) => void;
}

// База: prefer VITE_API_SERVER/VITE_API_BASE_URL/VITE_API_PROXY_TARGET (если абсолютный URL), иначе same-origin
const resolveBaseOrigin = (): string => {
  const env = import.meta.env as { VITE_API_SERVER?: string; VITE_API_BASE_URL?: string; VITE_API_PROXY_TARGET?: string }
  const candidate = env.VITE_API_SERVER ?? env.VITE_API_BASE_URL ?? env.VITE_API_PROXY_TARGET
  if (candidate && /^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate)
      return url.origin
    } catch {
      // ignore → fallback
    }
  }
  // For Docker production, use same-origin (relative) instead of hardcoded localhost
  return window.location.origin
}

const SERVER_ORIGIN = resolveBaseOrigin()
const SOCKET_PATH = (import.meta.env as { VITE_SOCKET_PATH?: string }).VITE_SOCKET_PATH ?? '/socket.io'

type Env = {
  MODE?: string
  VITE_SOCKET_TRANSPORTS?: string // csv: "websocket" | "polling,websocket"
  VITE_SOCKET_UPGRADE?: string // 'true' | 'false'
  VITE_SOCKET_TIMEOUT?: string // ms
  VITE_SOCKET_RECONNECTION_ATTEMPTS?: string
  VITE_SOCKET_RECONNECTION_DELAY?: string
  VITE_SOCKET_RECONNECTION_DELAY_MAX?: string
}

const env = import.meta.env as unknown as Env
const NODE_ENV = (import.meta.env as { MODE?: string }).MODE || 'development'

// Enhanced transport configuration for Docker stability
const getTransports = (): string[] => {
  const env = import.meta.env as { VITE_SOCKET_TRANSPORTS?: string }
  const configuredTransports = env.VITE_SOCKET_TRANSPORTS?.split(',') || ['polling', 'websocket']
  
  // For Docker production, prefer polling first for stability
  if (NODE_ENV === 'production' || window.location.hostname === 'localhost') {
    console.log('🔄 Using polling-first transport configuration for Docker stability')
    return ['polling', 'websocket']
  }
  
  console.log('🔄 Using configured transports:', configuredTransports)
  return configuredTransports as string[]
}

const transports = getTransports()
const upgrade = NODE_ENV !== 'production' // Enable upgrades in development, disable in production
const timeout = env.VITE_SOCKET_TIMEOUT ? Number(env.VITE_SOCKET_TIMEOUT) : 30000 // 30 сек для торговли
const reconnectionAttempts = env.VITE_SOCKET_RECONNECTION_ATTEMPTS ? Number(env.VITE_SOCKET_RECONNECTION_ATTEMPTS) : 100 // Много попыток для торговли
const reconnectionDelay = env.VITE_SOCKET_RECONNECTION_DELAY ? Number(env.VITE_SOCKET_RECONNECTION_DELAY) : 1000 // 1 сек задержка
const reconnectionDelayMax = env.VITE_SOCKET_RECONNECTION_DELAY_MAX ? Number(env.VITE_SOCKET_RECONNECTION_DELAY_MAX) : 10000 // макс 10 сек

let isConnecting = false

// Create a stub socket that doesn't actually connect
export const socket: Socket = {
  connected: false,
  connect: () => {
    console.log('🚫 Socket.IO removed - using REST API only');
  },
  disconnect: () => {
    console.log('🚫 Socket.IO removed - using REST API only');
  },
  on: (event: string, callback: Function) => {
    console.log('🚫 Socket.IO removed - using REST API only');
  },
  off: (event: string, callback?: Function) => {
    console.log('🚫 Socket.IO removed - using REST API only');
  },
  emit: (event: string, data?: any) => {
    console.log('🚫 Socket.IO removed - using REST API only');
  }
}

// КРИТИЧЕСКИЙ МЕХАНИЗМ ПЕРЕПОДКЛЮЧЕНИЯ ДЛЯ ТОРГОВЛИ
let connectionFailures = 0
let lastReconnectTime = 0
const MAX_FAILURES = 5
const FAILURE_RESET_TIME = 60000 // 1 минута

socket.on('connect', () => { 
  isConnecting = false 
  connectionFailures = 0
  console.log('🟢 ТОРГОВОЕ СОЕДИНЕНИЕ ВОССТАНОВЛЕНО')
})

socket.on('connect_error', (error) => { 
  isConnecting = false
  connectionFailures++
  const now = Date.now()
  
  console.error('🔴 КРИТИЧЕСКАЯ ОШИБКА ТОРГОВОГО СОЕДИНЕНИЯ:', error.message)
  
  // Сброс счетчика ошибок через минуту
  if (now - lastReconnectTime > FAILURE_RESET_TIME) {
    connectionFailures = 0
  }
  lastReconnectTime = now
  
  // Если слишком много ошибок - переключаемся на polling only
  if (connectionFailures >= MAX_FAILURES) {
    console.warn('⚠️ ПЕРЕКЛЮЧЕНИЕ НА РЕЗЕРВНЫЙ РЕЖИМ ТОРГОВЛИ (polling only)')
    socket.io.opts.transports = ['polling']
  }
})

socket.on('disconnect', (reason) => {
  console.warn('🔌 ТОРГОВОЕ СОЕДИНЕНИЕ РАЗОРВАНО:', reason)
  if (reason === 'io server disconnect') {
    // Сервер принудительно отключил - переподключаемся
    socket.connect()
  }
})

// Socket.IO removed - return stub socket
export const ensureSocketConnected = (): Socket => {
  console.log('🚫 Socket.IO removed - using REST API only');
  return socket;
}

// Socket.IO removed - all operations use REST API
export const executeTradingOperationWithFallback = async (operation: () => Promise<any>) => {
  console.log('📡 Using REST API for trading operations');
  return await operation();
}

export default socket


