import React, { createContext, useContext, useMemo, useRef, useState, useEffect } from 'react';
import { config } from '../../lib/config';

// Keep types broad for now; can be refined when API is finalized
type OverviewData = any;

type AdminAnalyticsContextType = {
  overview: OverviewData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AdminAnalyticsContext = createContext<AdminAnalyticsContextType | undefined>(undefined);

const CACHE_TTL_MS = 60_000; // 1 min

export const AdminAnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cacheRef = useRef<{ ts: number; overview: OverviewData | null } | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    const now = Date.now();
    if (cacheRef.current && (now - cacheRef.current.ts) < CACHE_TTL_MS && cacheRef.current.overview) {
      setOverview(cacheRef.current.overview);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.api.baseUrl}/admin/dashboard/overview-v2`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load overview: ${res.status}`);
      const json = await res.json();
      cacheRef.current = { ts: now, overview: json };
      setOverview(json);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOverview(); }, []);

  const value = useMemo(() => ({ overview, loading, error, refresh: loadOverview }), [overview, loading, error]);
  return (
    <AdminAnalyticsContext.Provider value={value}>
      {children}
    </AdminAnalyticsContext.Provider>
  );
};

export const useAdminAnalytics = (): AdminAnalyticsContextType => {
  const ctx = useContext(AdminAnalyticsContext);
  if (!ctx) throw new Error('useAdminAnalytics must be used within AdminAnalyticsProvider');
  return ctx;
};
