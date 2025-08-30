// Утилиты для работы с куки

export const setCookie = (name: string, value: string, days = 365): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

export const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (const c of ca) {
    const trimmed = c.trim();
    if (trimmed.startsWith(nameEQ)) return trimmed.substring(nameEQ.length);
  }
  return null;
};

export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

// Функции для кэширования иконок криптовалют
export const getCryptoIconFromCache = (coinId: string): string | null => {
  const cache = getCookie(CRYPTO_ICONS_CACHE_NAME);
  if (!cache) return null;
  
  try {
    const parsed = JSON.parse(cache) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const iconsCache = parsed as Record<string, { url: string; timestamp: number }>;
    const iconData = iconsCache[coinId];
    
    if (!iconData?.url) return null;
    
    // Проверяем, не истек ли срок действия кэша
    const now = Date.now();
    const cacheAge = now - iconData.timestamp;
    const maxAge = CRYPTO_ICONS_CACHE_EXPIRY * 24 * 60 * 60 * 1000; // 7 дней в миллисекундах
    
    if (cacheAge > maxAge) {
      // Удаляем устаревшую запись
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [coinId]: _, ...remaining } = iconsCache;
      setCookie(CRYPTO_ICONS_CACHE_NAME, JSON.stringify(remaining), CRYPTO_ICONS_CACHE_EXPIRY);
      return null;
    }
    
    return iconData.url;
  } catch {
    return null;
  }
};

export const setCryptoIconToCache = (coinId: string, iconUrl: string): void => {
  const cache = getCookie(CRYPTO_ICONS_CACHE_NAME);
  let iconsCache: Record<string, { url: string; timestamp: number }> = {};
  
  if (cache) {
    try {
      const parsed = JSON.parse(cache) as unknown;
      if (typeof parsed === 'object' && parsed !== null) {
        iconsCache = parsed as Record<string, { url: string; timestamp: number }>;
      }
    } catch {
      iconsCache = {};
    }
  }
  
  iconsCache[coinId] = {
    url: iconUrl,
    timestamp: Date.now()
  };
  
  setCookie(CRYPTO_ICONS_CACHE_NAME, JSON.stringify(iconsCache), CRYPTO_ICONS_CACHE_EXPIRY);
};

// Константы для языка
export const LANGUAGE_COOKIE_NAME = 'preferredLanguage';
export const DEFAULT_LANGUAGE = 'en';

// Константы для кэширования иконок
export const CRYPTO_ICONS_CACHE_NAME = 'cryptoIconsCache';
export const CRYPTO_ICONS_CACHE_EXPIRY = 7; // 7 дней 