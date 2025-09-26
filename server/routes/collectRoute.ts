import { Router } from 'express';
import { clickhouseAnalyticsService } from '../services/clickhouseAnalyticsService.js';

const collectRouter = Router();

// Simple health for collector
collectRouter.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

/**
 * POST /api/collect
 * Body: { events: Array<{ event_id?, user_id?, anon_id?, session_id?, event_type, event_data?, timestamp? }> }
 * - Accepts batched analytics events from client
 * - Writes to ClickHouse user_events
 */
collectRouter.post('/', async (req, res) => {
  try {
    const client = clickhouseAnalyticsService.getClient();
    if (!client) {
      return res.status(503).json({ error: 'Analytics disabled' });
    }

    const events = Array.isArray((req as any).body?.events) ? (req as any).body.events : [];
    if (!events.length) {
      return res.status(400).json({ error: 'No events provided' });
    }

    // Normalize rows
    const rows = events.map((raw: any) => {
      // Support both snake_case and camelCase payloads
      const e = raw || {};
      const eventType = e.event_type || e.eventType;
      const eventData = e.event_data || e.eventData || {};
      const sessionId = e.session_id || e.sessionId || 'no-session';
      const userId = e.user_id || e.userId || e.anon_id || e.anonId || 'unknown';
      const ts = e.timestamp != null ? e.timestamp : Date.now();
      const isoTs = typeof ts === 'number' ? new Date(ts).toISOString() : new Date(ts).toISOString();
      return {
        event_id: String(e.event_id || e.eventId || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        user_id: String(userId),
        event_type: String(eventType || 'unknown'),
        event_data: JSON.stringify(eventData),
        session_id: String(sessionId),
        timestamp: isoTs.replace('Z', ''),
      };
    });

    await (client as any).insert({
      table: 'cryptocraze_analytics.user_events',
      values: rows,
      format: 'JSONEachRow'
    });

    res.json({ success: true, inserted: rows.length });
  } catch (error: any) {
    console.error('[Collect] Error:', error);
    res.status(500).json({ error: 'Failed to collect events' });
  }
});

export default collectRouter;


