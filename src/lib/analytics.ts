import config from './config';

type AnalyticsEvent = {
  user_id?: string;
  anon_id?: string;
  session_id?: string;
  event_type: string;
  event_data?: Record<string, any>;
  timestamp?: string | number | Date;
};

const LS_ANON = 'cc_anon_id';
const LS_SESSION = 'cc_session_id';
const SESSION_TTL_MS = 30 * 60 * 1000;
let lastActivity = Date.now();

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getAnonId = (): string => {
  let id = localStorage.getItem(LS_ANON);
  if (!id) {
    id = generateId();
    localStorage.setItem(LS_ANON, id);
    document.cookie = `${LS_ANON}=${id}; path=/; max-age=${365 * 24 * 3600}`;
  }
  return id;
};

export const getSessionId = (): string => {
  const raw = localStorage.getItem(LS_SESSION);
  const now = Date.now();
  if (raw) {
    try {
      const { id, ts } = JSON.parse(raw);
      if (now - (ts || 0) < SESSION_TTL_MS) {
        return id;
      }
    } catch {}
  }
  const id = generateId();
  localStorage.setItem(LS_SESSION, JSON.stringify({ id, ts: now }));
  return id;
};

const queue: AnalyticsEvent[] = [];
let flushTimer: number | null = null;

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = window.setTimeout(flush, 3000);
};

export const track = (ev: AnalyticsEvent) => {
  queue.push({
    anon_id: getAnonId(),
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
    ...ev,
  });
  scheduleFlush();
};

export const flush = async () => {
  if (!queue.length) return;
  const events = queue.splice(0, queue.length);
  try {
    await fetch(`${config.api.baseUrl}/collect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      credentials: 'include',
      keepalive: true as any,
    });
  } catch (e) {
    // return events back on failure
    queue.unshift(...events);
  } finally {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }
};

export const initAnalytics = () => {
  // First open
  if (!localStorage.getItem('cc_first_open_sent')) {
    track({ event_type: 'first_open', event_data: getLandingData() });
    localStorage.setItem('cc_first_open_sent', '1');
  }
  // Landing (first touch UTM)
  if (!localStorage.getItem('cc_landing_sent')) {
    track({ event_type: 'landing', event_data: getLandingData() });
    localStorage.setItem('cc_landing_sent', '1');
  }

  // Page view on load
  track({ event_type: 'page_view', event_data: { path: location.pathname, title: document.title, spa: true } });

  // Before unload, flush
  window.addEventListener('beforeunload', () => {
    try { navigator.sendBeacon?.(`${config.api.baseUrl}/collect`, JSON.stringify({ events: queue })); } catch {}
  });
};

const getLandingData = () => {
  const params = new URLSearchParams(location.search);
  const utm = ['source', 'medium', 'campaign', 'term', 'content'].reduce((acc: any, k) => {
    const v = params.get(`utm_${k}`);
    if (v) acc[k] = v;
    return acc;
  }, {} as Record<string, string>);
  return {
    referrer: document.referrer || undefined,
    utm: Object.keys(utm).length ? utm : undefined,
    country: undefined,
    ua: navigator.userAgent,
  };
};


