import { API_BASE_URL } from './api';

// Утилита для API запросов без кэширования
export const fetchWithoutCache = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const timestamp = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  const urlWithTimestamp = `${url}${separator}_t=${timestamp}`;
  
  const noCacheHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers
  };

  return fetch(urlWithTimestamp, {
    ...options,
    cache: 'no-store',
    headers: noCacheHeaders
  });
};

// Специальная функция для получения данных пользователя без кэша
export const fetchUserDataNoCache = async (): Promise<Response> => {
  console.log('[noCacheApi] Fetching user data without cache');
  return fetchWithoutCache(`${API_BASE_URL}/auth/user`, {
    credentials: 'include'
  });
};