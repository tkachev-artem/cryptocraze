import { useEffect, useState } from 'react';
import { getCryptoIconFromCache, setCryptoIconToCache } from '../lib/cookieUtils';
import { API_BASE_URL } from '@/lib/api';

type UseCoinGeckoIconResult = {
  iconUrl: string | null;
  loading: boolean;
  error: string | null;
}

export const useCoinGeckoIcon = (coinId: string): UseCoinGeckoIconResult => {
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coinId) {
      setIconUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Проверяем кэш
    const cachedIcon = getCryptoIconFromCache(coinId);
    if (cachedIcon) {
      setIconUrl(cachedIcon);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setIconUrl(null);
    
    // Оптимизация: добавляем таймаут для медленного интернета
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 3000); // 3 секунды таймаут
    
    fetch(`${API_BASE_URL}/coingecko/icon/${coinId}`, {
      signal: controller.signal,
      cache: 'force-cache' // Используем кэш браузера агрессивно
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data: unknown) => {
        if (!cancelled) {
          const iconUrl = (data as { icon?: string }).icon ?? null;
          setIconUrl(iconUrl);
          setLoading(false);
          
          if (iconUrl) {
            setCryptoIconToCache(coinId, iconUrl);
          }
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!cancelled && err.name !== 'AbortError') {
          setError('Не удалось загрузить иконку');
          setIconUrl(null);
          setLoading(false);
        }
      });
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [coinId]);

  return { iconUrl, loading, error };
};