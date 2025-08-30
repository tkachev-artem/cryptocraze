import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
export type { Socket } from 'socket.io-client'

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

// FORCE POLLING-ONLY для Cloudflare tunnel совместимости  
// Cloudflare tunnel блокирует WebSocket соединения, поэтому принудительно используем только polling
// ПРИНУДИТЕЛЬНО только polling - никаких WebSocket!
const transports: ('polling')[] = ['polling']

// FORCE upgrade=false для polling-only режима
const upgrade = false
const timeout = env.VITE_SOCKET_TIMEOUT ? Number(env.VITE_SOCKET_TIMEOUT) : 10000
const reconnectionAttempts = env.VITE_SOCKET_RECONNECTION_ATTEMPTS ? Number(env.VITE_SOCKET_RECONNECTION_ATTEMPTS) : 20
const reconnectionDelay = env.VITE_SOCKET_RECONNECTION_DELAY ? Number(env.VITE_SOCKET_RECONNECTION_DELAY) : 500
const reconnectionDelayMax = env.VITE_SOCKET_RECONNECTION_DELAY_MAX ? Number(env.VITE_SOCKET_RECONNECTION_DELAY_MAX) : 4000

let isConnecting = false

export const socket: Socket = io(SERVER_ORIGIN, {
  path: SOCKET_PATH,
  autoConnect: false,
  timeout,
  reconnection: true,
  reconnectionAttempts,
  reconnectionDelay,
  reconnectionDelayMax,
  randomizationFactor: 0.5, // джиттер для снижения нагрузки при массовом реконнекте
  transports,
  upgrade,
})

socket.on('connect', () => { isConnecting = false })
socket.on('connect_error', () => { isConnecting = false })

export const ensureSocketConnected = (): Socket => {
  if (socket.connected) return socket
  if (!isConnecting) {
    isConnecting = true
    socket.connect()
  }
  return socket
}

export default socket


