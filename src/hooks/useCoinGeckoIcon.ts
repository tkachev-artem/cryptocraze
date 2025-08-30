import { useEffect, useState } from 'react';
import { getCryptoIconFromCache, setCryptoIconToCache } from '../lib/cookieUtils';
import { API_BASE_URL } from '@/lib/api';

// Тип для возвращаемого значения
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

    // Сначала проверяем кэш
    const cachedIcon = getCryptoIconFromCache(coinId);
    if (cachedIcon) {
      setIconUrl(cachedIcon);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setIconUrl(null);
    
    fetch(`${API_BASE_URL}/coingecko/icon/${coinId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data: unknown) => {
        if (!cancelled) {
          const iconUrl = (data as { icon?: string }).icon ?? null;
          setIconUrl(iconUrl);
          setLoading(false);
          
          // Сохраняем в кэш если получили иконку
          if (iconUrl) {
            setCryptoIconToCache(coinId, iconUrl);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Не удалось загрузить иконку');
          setIconUrl(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [coinId]);

  return { iconUrl, loading, error };
};