import { useEffect, useState } from 'react';

// Тип для возвращаемого значения
interface UseCoinGeckoIconResult {
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
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIconUrl(null);
    fetch(`http://localhost:8000/api/coingecko/icon/${coinId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        console.log('Ответ backend:', data, 'coinId:', coinId);
        if (!cancelled) {
          setIconUrl(data?.icon || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.log('Ошибка запроса:', err, 'coinId:', coinId);
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