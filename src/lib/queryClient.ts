import { QueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export const apiFetch = async (path: string, init?: RequestInit) => {
  const buildUrl = (p: string) => {
    if (/^https?:\/\//.test(p)) return p;
    if (p.startsWith('/api')) return `${API_BASE_URL}${p.slice(4)}`;
    if (p.startsWith('/')) return `${API_BASE_URL}${p}`;
    return `${API_BASE_URL}/${p}`;
  };
  const url = buildUrl(path);
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${String(res.status)}: ${text || res.statusText}`);
  }
  return res.json() as unknown;
};

export const apiRequest = apiFetch;
