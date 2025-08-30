// Production configuration and feature flags

export const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'CryptoCraze',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    env: import.meta.env.VITE_APP_ENV || 'development',
  },
  
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : '/api'),
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
  
  socket: {
    path: import.meta.env.VITE_SOCKET_PATH || '/socket.io',
    transports: import.meta.env.VITE_SOCKET_TRANSPORTS?.split(',') || ['polling'],
    upgrade: import.meta.env.VITE_SOCKET_UPGRADE === 'true',
  },
  
  features: {
    charts: import.meta.env.VITE_ENABLE_CHARTS === 'true',
    proMode: import.meta.env.VITE_ENABLE_PRO_MODE === 'true',
    tasks: import.meta.env.VITE_ENABLE_TASKS === 'true',
    notifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  },
  
  performance: {
    chartUpdateInterval: parseInt(import.meta.env.VITE_CHART_UPDATE_INTERVAL || '1000', 10),
    priceUpdateInterval: parseInt(import.meta.env.VITE_PRICE_UPDATE_INTERVAL || '1000', 10),
    taskRefreshInterval: parseInt(import.meta.env.VITE_TASK_REFRESH_INTERVAL || '60000', 10),
  },
  
  cache: {
    cryptoIconsCacheDays: parseInt(import.meta.env.VITE_CRYPTO_ICONS_CACHE_DAYS || '7', 10),
    taskCacheMinutes: parseInt(import.meta.env.VITE_TASK_CACHE_MINUTES || '5', 10),
    languageCacheDays: parseInt(import.meta.env.VITE_LANGUAGE_CACHE_DAYS || '365', 10),
  },
  
  security: {
    httpsUpgrade: import.meta.env.VITE_ENABLE_HTTPS_UPGRADE === 'true',
    csp: import.meta.env.VITE_ENABLE_CSP === 'true',
    hsts: import.meta.env.VITE_ENABLE_HSTS === 'true',
  },
  
  logging: {
    level: import.meta.env.VITE_LOG_LEVEL || (import.meta.env.DEV ? '3' : '1'),
    errorReporting: import.meta.env.VITE_ERROR_REPORTING_ENABLED === 'true',
    dsn: import.meta.env.VITE_ERROR_REPORTING_DSN || '',
  },
  
  language: {
    default: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  },
  
  // Development/Production specific settings
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

export default config;