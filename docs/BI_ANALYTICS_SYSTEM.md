# CryptoCraze BI Analytics System

## Overview

This document describes the comprehensive Business Intelligence (BI) analytics system designed for CryptoCraze. The system provides real-time insights into user acquisition, engagement, retention, monetization, and ad performance following industry best practices.

## Architecture

### Database Schema

The analytics system extends the existing CryptoCraze database with the following new tables:

#### 1. Enhanced Analytics Tables

- **user_sessions**: Tracks detailed user session data for engagement metrics
- **user_acquisition**: Records user acquisition funnel and attribution data
- **ad_events**: Logs all advertising-related events with revenue tracking
- **daily_metrics**: Pre-aggregated daily metrics for fast BI queries
- **user_cohorts**: Maintains cohort data for retention analysis

#### 2. Existing Tables Enhanced

- **analytics**: Enhanced with proper indexing for better query performance
- **users**: Leveraged for user lifecycle tracking
- **deals**: Used for trading behavior analysis
- **premium_subscriptions**: Integrated for monetization metrics

### Service Layer

#### AnalyticsService (`/server/services/analyticsService.ts`)

Core service providing:
- User acquisition metrics calculation
- Engagement metrics (DAU, WAU, MAU, session duration)
- Retention analysis with cohort tracking
- Monetization metrics (ARPU, ARPPU, conversion rates)
- Ad performance analytics
- User dashboard metrics and charts

#### AnalyticsQueueService (`/server/services/analyticsQueueService.ts`)

Batch processing service featuring:
- Redis-based event queuing
- High-priority event processing
- Failed event retry logic
- Batch optimization for database writes
- Queue monitoring and management

## API Endpoints

### BI Dashboard Endpoints (Admin Only)

All BI endpoints require admin authentication and follow the pattern `/api/analytics/bi/{metric-type}`.

#### User Acquisition Metrics
```
GET /api/analytics/bi/user-acquisition
```

**Query Parameters:**
- `startDate` (required): ISO date string
- `endDate` (required): ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "userAcquisition": {
      "installs": 1250,
      "signupRate": 85.2,
      "tradeOpenRate": 67.8,
      "installsBySource": [
        { "source": "organic", "count": 750 },
        { "source": "google_ads", "count": 300 },
        { "source": "facebook_ads", "count": 200 }
      ],
      "dailyInstalls": [
        { "date": "2025-01-01", "count": 45 },
        { "date": "2025-01-02", "count": 52 }
      ]
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Engagement Metrics
```
GET /api/analytics/bi/engagement
```

**Response:**
```json
{
  "success": true,
  "data": {
    "engagement": {
      "dailyActiveUsers": 8450,
      "weeklyActiveUsers": 32100,
      "monthlyActiveUsers": 95600,
      "avgSessionsPerUser": 3.2,
      "avgSessionDuration": 12.5,
      "tradesPerUser": 1.8,
      "avgVirtualBalanceUsed": "1250.00",
      "screenOpensByType": [
        { "screen": "trading", "count": 15600 },
        { "screen": "profile", "count": 8900 }
      ]
    }
  }
}
```

#### Retention Metrics
```
GET /api/analytics/bi/retention
```

**Query Parameters:**
- `cohortStartDate` (required): Start of cohort period
- `cohortEndDate` (required): End of cohort period

**Response:**
```json
{
  "success": true,
  "data": {
    "retention": {
      "d1": 72.5,
      "d3": 45.2,
      "d7": 32.1,
      "d30": 18.9,
      "churnRate": 81.1,
      "cohortAnalysis": [
        {
          "cohortDate": "2025-01-01",
          "usersCount": 100,
          "retentionByDay": [
            { "day": 1, "retained": 72, "percentage": 72.0 },
            { "day": 7, "retained": 32, "percentage": 32.0 }
          ]
        }
      ]
    }
  }
}
```

#### Monetization Metrics
```
GET /api/analytics/bi/monetization
```

**Response:**
```json
{
  "success": true,
  "data": {
    "monetization": {
      "totalRevenue": "12450.50",
      "arpu": "1.25",
      "arppu": "15.60",
      "conversionToPaid": 8.2,
      "premiumSubscriptions": 156,
      "revenueBySource": [
        { "source": "month", "amount": "8200.00" },
        { "source": "year", "amount": "4250.50" }
      ]
    }
  }
}
```

#### Ad Performance Metrics
```
GET /api/analytics/bi/ad-performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "adPerformance": {
      "impressions": 125600,
      "clicks": 3780,
      "ctr": 3.01,
      "rewards": 2890,
      "revenue": "890.45",
      "cpi": "0.007",
      "cpa": "0.31",
      "roas": 2.15,
      "performanceByNetwork": [
        { "network": "admob", "impressions": 89200, "revenue": "645.20" },
        { "network": "facebook", "impressions": 36400, "revenue": "245.25" }
      ]
    }
  }
}
```

#### Combined Overview
```
GET /api/analytics/bi/overview
```

Returns all metrics combined in a single response for dashboard overview screens.

### User Dashboard Endpoints

#### Complete User Dashboard
```
GET /api/analytics/user/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrades": 156,
    "successfulTradesPercentage": 68.5,
    "totalProfit": "1250.75",
    "maxProfit": "450.20",
    "maxLoss": "-230.50",
    "averageTradeAmount": "125.30",
    "topDeals": [...],
    "profitLossChart": [...],
    "tradingPerformance": {...},
    "realtimeStats": {...}
  }
}
```

#### Top Deals
```
GET /api/analytics/user/top-deals?limit=5
```

#### Profit/Loss Chart
```
GET /api/analytics/user/profit-loss-chart?days=30
```

### Enhanced Event Recording

#### Single Event with Queue
```
POST /api/analytics/event/enhanced
```

**Body:**
```json
{
  "eventType": "trade_opened",
  "eventData": {
    "symbol": "BTCUSDT",
    "amount": 100,
    "direction": "up"
  },
  "sessionId": "sess_123",
  "priority": "high"
}
```

#### Batch Events
```
POST /api/analytics/events/batch
```

**Body:**
```json
{
  "events": [
    {
      "eventType": "screen_view",
      "eventData": { "screen": "trading" },
      "sessionId": "sess_123"
    },
    {
      "eventType": "button_click",
      "eventData": { "button": "buy", "symbol": "BTCUSDT" },
      "sessionId": "sess_123"
    }
  ]
}
```

### Queue Management (Admin Only)

#### Queue Statistics
```
GET /api/analytics/queue/stats
```

#### Replay Failed Events
```
POST /api/analytics/queue/replay-failed
```

## Performance Optimizations

### Database Indexing

Strategic indexes have been added for optimal query performance:

```sql
-- Analytics table indexes
CREATE INDEX idx_analytics_user_id ON analytics(user_id);
CREATE INDEX idx_analytics_event_type ON analytics(event_type);
CREATE INDEX idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX idx_analytics_session_id ON analytics(session_id);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_start_time ON user_sessions(start_time);

-- User acquisition indexes
CREATE INDEX idx_user_acquisition_install_date ON user_acquisition(install_date);
CREATE INDEX idx_user_acquisition_source ON user_acquisition(acquisition_source);

-- Ad events indexes
CREATE INDEX idx_ad_events_timestamp ON ad_events(timestamp);
CREATE INDEX idx_ad_events_type ON ad_events(ad_type, event_type);
```

### Caching Strategy

Redis caching is implemented for:
- BI metrics (5-minute TTL)
- User dashboard data (1-minute TTL)
- Queue statistics (30-second TTL)

Cache keys follow the pattern:
- `user_acquisition_{startDate}_{endDate}`
- `engagement_{startDate}_{endDate}`
- `user_dashboard_{userId}`

### Batch Processing

Events are processed in batches to reduce database load:
- Normal events: Batch size 50, process every 30 seconds
- High priority events: Batch size 10, process every 2 seconds
- Failed events are retried with exponential backoff

## Event Types

### Standard Analytics Events

| Event Type | Description | Priority | Data Fields |
|------------|-------------|----------|-------------|
| `user_install` | App installation | High | `device_info`, `attribution_data` |
| `user_signup` | User registration | High | `signup_method`, `utm_data` |
| `session_start` | Session beginning | Normal | `device_info`, `app_version` |
| `session_end` | Session completion | Normal | `duration`, `screens_opened` |
| `screen_view` | Screen navigation | Low | `screen_name`, `previous_screen` |
| `trade_opened` | Trade creation | Normal | `symbol`, `amount`, `direction` |
| `trade_closed` | Trade completion | Normal | `profit`, `duration`, `close_reason` |
| `ad_impression` | Ad displayed | Normal | `ad_type`, `ad_network`, `ad_unit_id` |
| `ad_click` | Ad clicked | High | `ad_type`, `ad_network` |
| `ad_reward` | Ad reward claimed | High | `reward_type`, `reward_amount` |
| `premium_purchase` | Premium subscription | High | `plan_type`, `amount` |

### Special Session Events

Session events are handled specially for accurate engagement tracking:

```javascript
// Session start
await analyticsQueueService.queueEvent({
  eventType: 'session_start',
  eventData: {
    deviceInfo: {
      platform: 'ios',
      version: '1.2.0',
      device: 'iPhone 12'
    }
  },
  sessionId: 'sess_' + Date.now(),
  priority: 'normal'
});

// Session update (periodic during session)
await analyticsQueueService.queueEvent({
  eventType: 'session_update',
  eventData: {
    screensOpened: 5,
    tradesOpened: 2,
    adsWatched: 1,
    virtualBalanceUsed: '150.00'
  },
  sessionId: sessionId,
  priority: 'normal'
});

// Session end
await analyticsQueueService.queueEvent({
  eventType: 'session_end',
  eventData: {
    duration: 1800, // 30 minutes
    screensOpened: 8,
    tradesOpened: 3,
    adsWatched: 2
  },
  sessionId: sessionId,
  priority: 'normal'
});
```

## Retention Analysis

### Cohort Tracking

The system automatically tracks user cohorts for retention analysis:

1. **Cohort Creation**: Users are grouped by install date
2. **Daily Tracking**: System records daily activity for each user
3. **Retention Calculation**: D1, D3, D7, D30 retention rates calculated
4. **Churn Analysis**: Identifies users who haven't been active recently

### Implementation Details

```sql
-- Example cohort query
SELECT 
  cohort_date,
  COUNT(DISTINCT user_id) as cohort_size,
  AVG(CASE WHEN days_since_install = 1 THEN is_active::int END) * 100 as d1_retention,
  AVG(CASE WHEN days_since_install = 7 THEN is_active::int END) * 100 as d7_retention
FROM user_cohorts
WHERE cohort_date >= '2025-01-01'
GROUP BY cohort_date
ORDER BY cohort_date;
```

## Monitoring and Maintenance

### Queue Health Monitoring

Monitor queue performance with:

```bash
# Check queue stats
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "https://api.cryptocraze.com/api/analytics/queue/stats"

# Response includes:
{
  "success": true,
  "data": {
    "mainQueueLength": 25,
    "highPriorityQueueLength": 3,
    "failedEventsCount": 0,
    "isProcessing": true
  }
}
```

### Daily Metrics Generation

Set up a cron job to generate daily metrics:

```javascript
// Run daily at 01:00 UTC
const cron = require('node-cron');

cron.schedule('0 1 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  await analyticsService.generateDailyMetrics(yesterday);
});
```

### Database Maintenance

Regular maintenance tasks:

```sql
-- Clean old analytics events (older than 90 days)
DELETE FROM analytics 
WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';

-- Clean old ad events (older than 60 days)
DELETE FROM ad_events 
WHERE timestamp < CURRENT_DATE - INTERVAL '60 days';

-- Update table statistics for query optimization
ANALYZE analytics;
ANALYZE user_sessions;
ANALYZE ad_events;
```

## Security Considerations

### Access Control

- **BI Endpoints**: Admin-only access with proper authentication
- **User Dashboard**: User-specific data with proper authorization
- **Event Recording**: Rate limiting to prevent abuse

### Data Privacy

- **PII Protection**: User identifiers are hashed where possible
- **Data Retention**: Automatic cleanup of old detailed events
- **GDPR Compliance**: User data deletion cascades through analytics tables

### Rate Limiting

Event recording endpoints have rate limits:
- Single events: 60 requests/minute per IP
- Batch events: 10 requests/minute per IP
- BI queries: 30 requests/minute per admin user

## Integration Examples

### Frontend Integration

```typescript
// React hook for analytics
const useAnalytics = () => {
  const recordEvent = async (eventType: string, eventData: any) => {
    try {
      await fetch('/api/analytics/event/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventData,
          sessionId: getSessionId(),
          priority: 'normal'
        })
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  return { recordEvent };
};

// Usage
const { recordEvent } = useAnalytics();

// Record trade opened
recordEvent('trade_opened', {
  symbol: 'BTCUSDT',
  amount: 100,
  direction: 'up',
  multiplier: 10
});
```

### Backend Integration

```typescript
// In trade service
import { analyticsQueueService } from './services/analyticsQueueService';

export const openTrade = async (tradeData) => {
  // Open trade logic...
  
  // Record analytics event
  await analyticsQueueService.queueEvent({
    userId: tradeData.userId,
    eventType: 'trade_opened',
    eventData: {
      symbol: tradeData.symbol,
      amount: tradeData.amount,
      direction: tradeData.direction,
      multiplier: tradeData.multiplier
    },
    sessionId: tradeData.sessionId,
    priority: 'normal'
  });
};
```

## Troubleshooting

### Common Issues

1. **High Queue Length**
   - Check Redis memory usage
   - Verify database connection
   - Monitor batch processing logs

2. **Missing User Data**
   - Ensure user acquisition records exist
   - Check foreign key constraints
   - Verify session tracking

3. **Slow BI Queries**
   - Check index usage with EXPLAIN
   - Consider increasing cache TTL
   - Review query date ranges

### Debug Queries

```sql
-- Check analytics event distribution
SELECT event_type, COUNT(*), DATE(timestamp)
FROM analytics
WHERE timestamp > CURRENT_DATE - INTERVAL '7 days'
GROUP BY event_type, DATE(timestamp)
ORDER BY DATE(timestamp) DESC, COUNT(*) DESC;

-- Monitor session quality
SELECT 
  DATE(start_time) as date,
  COUNT(*) as total_sessions,
  AVG(duration) as avg_duration,
  COUNT(CASE WHEN end_time IS NULL THEN 1 END) as incomplete_sessions
FROM user_sessions
WHERE start_time > CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(start_time)
ORDER BY date DESC;

-- Ad performance check
SELECT 
  ad_network,
  event_type,
  COUNT(*) as events,
  SUM(COALESCE(revenue, 0)) as total_revenue
FROM ad_events
WHERE timestamp > CURRENT_DATE - INTERVAL '1 day'
GROUP BY ad_network, event_type
ORDER BY total_revenue DESC;
```

## Future Enhancements

### Planned Features

1. **Real-time Dashboards**: WebSocket-powered live BI dashboards
2. **ML Analytics**: Predictive user behavior models
3. **A/B Testing**: Integrated experiment tracking
4. **Custom Reports**: User-configurable BI reports
5. **Data Export**: CSV/JSON export for external BI tools

### Scalability Improvements

1. **Database Sharding**: Partition large analytics tables
2. **Time Series Database**: Consider InfluxDB for high-frequency events
3. **Data Warehousing**: ETL pipeline to dedicated analytics database
4. **Microservices**: Split analytics into dedicated service

This comprehensive BI analytics system provides CryptoCraze with enterprise-level insights while maintaining high performance and scalability.