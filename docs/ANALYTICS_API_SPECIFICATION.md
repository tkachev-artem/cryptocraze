# CryptoCraze Analytics API Specification

## Base URL
```
https://api.cryptocraze.com
```

## Authentication
All endpoints require proper authentication:
- **User endpoints**: JWT token via Authorization header
- **Admin endpoints**: JWT token with admin role
- **Public endpoints**: No authentication required (limited)

## Rate Limits
- **Event recording**: 60 requests/minute per IP
- **Batch events**: 10 requests/minute per IP  
- **BI queries**: 30 requests/minute per admin user
- **User dashboard**: 100 requests/minute per user

## Response Format
All responses follow this standard format:

```json
{
  "success": boolean,
  "data": any,
  "message"?: string,
  "timestamp": string,
  "error"?: {
    "code": string,
    "message": string,
    "details"?: any
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily down |

---

## BI Dashboard Endpoints (Admin Only)

### 1. User Acquisition Metrics

**GET** `/api/analytics/bi/user-acquisition`

Provides comprehensive user acquisition funnel metrics.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | ✅ | ISO date string (e.g., "2025-01-01") |
| `endDate` | string | ✅ | ISO date string (e.g., "2025-01-31") |

#### Response Schema
```json
{
  "success": true,
  "data": {
    "userAcquisition": {
      "installs": 1250,
      "signupRate": 85.2,
      "tradeOpenRate": 67.8,
      "installsBySource": [
        {
          "source": "organic",
          "count": 750
        },
        {
          "source": "google_ads", 
          "count": 300
        }
      ],
      "dailyInstalls": [
        {
          "date": "2025-01-01",
          "count": 45
        }
      ]
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Field Descriptions
- `installs`: Total app installations in period
- `signupRate`: Percentage of installs that completed signup
- `tradeOpenRate`: Percentage of signups that opened first trade
- `installsBySource`: Breakdown by acquisition channel
- `dailyInstalls`: Daily installation counts

### 2. Engagement Metrics

**GET** `/api/analytics/bi/engagement`

Measures user engagement and activity patterns.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | ✅ | ISO date string |
| `endDate` | string | ✅ | ISO date string |

#### Response Schema
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
        {
          "screen": "trading",
          "count": 15600
        },
        {
          "screen": "profile",
          "count": 8900
        }
      ]
    }
  }
}
```

#### Field Descriptions
- `dailyActiveUsers`: Unique users active in period
- `weeklyActiveUsers`: Unique users active in last 7 days from endDate
- `monthlyActiveUsers`: Unique users active in last 30 days from endDate
- `avgSessionsPerUser`: Average sessions per active user
- `avgSessionDuration`: Average session length in minutes
- `tradesPerUser`: Average trades per active user
- `avgVirtualBalanceUsed`: Average virtual currency used
- `screenOpensByType`: Screen navigation breakdown

### 3. Retention Metrics

**GET** `/api/analytics/bi/retention`

Comprehensive retention analysis with cohort data.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cohortStartDate` | string | ✅ | Start of cohort period |
| `cohortEndDate` | string | ✅ | End of cohort period |

#### Response Schema
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
            {
              "day": 1,
              "retained": 72,
              "percentage": 72.0
            },
            {
              "day": 7,
              "retained": 32,
              "percentage": 32.0
            }
          ]
        }
      ]
    }
  }
}
```

#### Field Descriptions
- `d1`, `d3`, `d7`, `d30`: Retention percentages for day 1, 3, 7, 30
- `churnRate`: Percentage of users inactive in last 7 days
- `cohortAnalysis`: Detailed cohort breakdown by install date
- `retentionByDay`: Day-by-day retention for each cohort

### 4. Monetization Metrics

**GET** `/api/analytics/bi/monetization`

Revenue and monetization performance metrics.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | ✅ | ISO date string |
| `endDate` | string | ✅ | ISO date string |

#### Response Schema
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
        {
          "source": "month",
          "amount": "8200.00"
        },
        {
          "source": "year",
          "amount": "4250.50"
        }
      ]
    }
  }
}
```

#### Field Descriptions
- `totalRevenue`: Total revenue in period (USD)
- `arpu`: Average Revenue Per User
- `arppu`: Average Revenue Per Paying User
- `conversionToPaid`: Percentage of users who made purchases
- `premiumSubscriptions`: Number of premium subscriptions
- `revenueBySource`: Revenue breakdown by subscription type

### 5. Ad Performance Metrics

**GET** `/api/analytics/bi/ad-performance`

Advertising performance and revenue metrics.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | ✅ | ISO date string |
| `endDate` | string | ✅ | ISO date string |

#### Response Schema
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
        {
          "network": "admob",
          "impressions": 89200,
          "revenue": "645.20"
        },
        {
          "network": "facebook",
          "impressions": 36400,
          "revenue": "245.25"
        }
      ]
    }
  }
}
```

#### Field Descriptions
- `impressions`: Total ad impressions
- `clicks`: Total ad clicks
- `ctr`: Click-through rate percentage
- `rewards`: Total rewarded ad completions
- `revenue`: Total ad revenue (USD)
- `cpi`: Cost Per Install
- `cpa`: Cost Per Action  
- `roas`: Return On Ad Spend ratio
- `performanceByNetwork`: Breakdown by ad network

### 6. Combined Overview

**GET** `/api/analytics/bi/overview`

All BI metrics in a single response for dashboard overviews.

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | ✅ | ISO date string |
| `endDate` | string | ✅ | ISO date string |

#### Response Schema
```json
{
  "success": true,
  "data": {
    "userAcquisition": { /* UserAcquisitionMetrics */ },
    "engagement": { /* EngagementMetrics */ },
    "retention": { /* RetentionMetrics */ },
    "monetization": { /* MonetizationMetrics */ },
    "adPerformance": { /* AdPerformanceMetrics */ }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## User Dashboard Endpoints

### 1. Complete User Dashboard

**GET** `/api/analytics/user/dashboard`

Comprehensive trading performance metrics for authenticated user.

#### Response Schema
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
    "topDeals": [
      {
        "id": 123,
        "symbol": "BTCUSDT",
        "direction": "up",
        "profit": "450.20",
        "profitPercentage": 45.02,
        "openPrice": "50000.00",
        "closePrice": "52250.00",
        "openedAt": "2025-01-15T09:00:00.000Z",
        "closedAt": "2025-01-15T10:30:00.000Z",
        "duration": 90
      }
    ],
    "profitLossChart": [
      {
        "date": "2025-01-15",
        "profit": "150.50",
        "loss": "75.25",
        "netProfit": "75.25",
        "tradesCount": 5
      }
    ],
    "tradingPerformance": {
      "winRate": 68.5,
      "avgWinAmount": "125.30",
      "avgLossAmount": "85.20",
      "profitFactor": 1.47,
      "sharpeRatio": 0.85,
      "maxDrawdown": "450.00",
      "bestTradingDay": "520.75",
      "worstTradingDay": "-235.50"
    },
    "realtimeStats": {
      "currentBalance": "10250.75",
      "freeBalance": "8750.50",
      "openDealsCount": 3,
      "todayProfit": "125.30",
      "todayTrades": 8,
      "currentStreak": 5,
      "streakType": "win"
    }
  }
}
```

#### Field Descriptions
- `totalTrades`: Lifetime completed trades
- `successfulTradesPercentage`: Win rate percentage  
- `totalProfit`: Net lifetime profit/loss
- `maxProfit`: Best single trade profit
- `maxLoss`: Worst single trade loss
- `averageTradeAmount`: Average trade size
- `topDeals`: Top 5 most profitable trades
- `profitLossChart`: Daily P&L data for charting
- `tradingPerformance`: Advanced performance metrics
- `realtimeStats`: Current account status

### 2. Top Deals

**GET** `/api/analytics/user/top-deals`

User's most profitable trades.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | ❌ | 5 | Number of top deals to return |

#### Response Schema
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "symbol": "BTCUSDT",
      "direction": "up",
      "profit": "450.20",
      "profitPercentage": 45.02,
      "openPrice": "50000.00",
      "closePrice": "52250.00",
      "openedAt": "2025-01-15T09:00:00.000Z",
      "closedAt": "2025-01-15T10:30:00.000Z",
      "duration": 90
    }
  ]
}
```

### 3. Profit/Loss Chart

**GET** `/api/analytics/user/profit-loss-chart`

Daily profit/loss data for charting.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | number | ❌ | 30 | Number of days of historical data |

#### Response Schema
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-15",
      "profit": "150.50",
      "loss": "75.25", 
      "netProfit": "75.25",
      "tradesCount": 5
    }
  ]
}
```

---

## Event Recording Endpoints

### 1. Enhanced Single Event

**POST** `/api/analytics/event/enhanced`

Records single analytics event with queue processing.

#### Request Body
```json
{
  "eventType": "trade_opened",
  "eventData": {
    "symbol": "BTCUSDT",
    "amount": 100,
    "direction": "up",
    "multiplier": 10
  },
  "sessionId": "sess_1642234567890",
  "priority": "normal"
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventType` | string | ✅ | Event identifier (see Event Types) |
| `eventData` | object | ❌ | Event-specific data |
| `sessionId` | string | ❌ | User session identifier |
| `priority` | enum | ❌ | "low", "normal", "high" (default: "normal") |

#### Response Schema
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 2. Batch Events

**POST** `/api/analytics/events/batch`

Records multiple events in a single request.

#### Request Body
```json
{
  "events": [
    {
      "eventType": "screen_view",
      "eventData": {
        "screen": "trading",
        "previousScreen": "home"
      },
      "sessionId": "sess_1642234567890"
    },
    {
      "eventType": "button_click",
      "eventData": {
        "button": "buy",
        "symbol": "BTCUSDT"
      },
      "sessionId": "sess_1642234567890",
      "priority": "high"
    }
  ]
}
```

#### Request Schema
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `events` | array | ✅ | Array of event objects |

Each event object has the same schema as single event.

#### Response Schema
```json
{
  "success": true,
  "processed": 2,
  "message": "Queued 2 events for processing",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 3. Legacy Event Recording

**POST** `/api/analytics/event`

Original event recording endpoint (maintained for compatibility).

#### Request Body
```json
{
  "eventType": "trade_opened",
  "eventData": {
    "symbol": "BTCUSDT",
    "amount": 100
  },
  "sessionId": "sess_1642234567890"
}
```

---

## Queue Management Endpoints (Admin Only)

### 1. Queue Statistics

**GET** `/api/analytics/queue/stats`

Monitor analytics queue performance.

#### Response Schema
```json
{
  "success": true,
  "data": {
    "mainQueueLength": 25,
    "highPriorityQueueLength": 3,
    "failedEventsCount": 0,
    "isProcessing": true
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### Field Descriptions
- `mainQueueLength`: Events pending in normal queue
- `highPriorityQueueLength`: Events pending in high priority queue
- `failedEventsCount`: Number of failed events stored for retry
- `isProcessing`: Whether batch processor is currently running

### 2. Replay Failed Events

**POST** `/api/analytics/queue/replay-failed`

Retry processing of previously failed events.

#### Response Schema
```json
{
  "success": true,
  "data": {
    "replayedCount": 15
  },
  "message": "Successfully replayed 15 failed events",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Event Types Reference

### Standard Analytics Events

| Event Type | Priority | Description | Required Data |
|------------|----------|-------------|---------------|
| `app_install` | High | App installation | `device_info`, `attribution_data` |
| `user_signup` | High | User registration | `signup_method`, `utm_data` |
| `session_start` | Normal | Session beginning | `device_info`, `app_version` |
| `session_update` | Low | Session progress update | `screens_opened`, `trades_opened` |
| `session_end` | Normal | Session completion | `duration`, `final_stats` |
| `screen_view` | Low | Screen navigation | `screen`, `previous_screen` |
| `button_click` | Low | UI interaction | `button`, `context` |
| `trade_opened` | Normal | Trade creation | `symbol`, `amount`, `direction` |
| `trade_closed` | Normal | Trade completion | `profit`, `duration`, `reason` |
| `trade_edited` | Low | Trade modification | `field`, `old_value`, `new_value` |

### Ad-Related Events

| Event Type | Priority | Description | Required Data |
|------------|----------|-------------|---------------|
| `ad_impression` | Normal | Ad displayed | `ad_type`, `ad_network`, `ad_unit_id` |
| `ad_click` | High | Ad clicked | `ad_type`, `ad_network` |
| `ad_reward` | High | Ad reward claimed | `reward_type`, `reward_amount` |
| `ad_close` | Low | Ad closed/skipped | `ad_type`, `close_reason` |

### Monetization Events

| Event Type | Priority | Description | Required Data |
|------------|----------|-------------|---------------|
| `premium_purchase` | High | Premium subscription | `plan_type`, `amount`, `currency` |
| `premium_cancel` | High | Subscription cancelled | `plan_type`, `reason` |
| `in_app_purchase` | High | Virtual currency purchase | `item_type`, `amount`, `currency` |

### Gamification Events

| Event Type | Priority | Description | Required Data |
|------------|----------|-------------|---------------|
| `achievement_unlocked` | Normal | Achievement earned | `achievement_id`, `achievement_type` |
| `daily_reward_claimed` | Normal | Daily bonus claimed | `reward_type`, `reward_amount`, `day` |
| `wheel_spin` | Normal | Fortune wheel used | `result`, `reward_type`, `reward_amount` |
| `box_opened` | Normal | Loot box opened | `box_type`, `reward_type`, `reward_amount` |

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required parameter: startDate",
    "details": {
      "parameter": "startDate",
      "expected": "ISO date string"
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED", 
    "message": "Invalid or missing authentication token"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required for this endpoint"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 429 Rate Limited
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds.",
    "details": {
      "retryAfter": 60,
      "limit": "60 requests per minute"
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred"
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## SDK Integration Examples

### JavaScript/TypeScript
```typescript
class CryptoCrazeAnalytics {
  private baseUrl: string;
  private authToken: string;
  
  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }
  
  async recordEvent(eventType: string, eventData?: any, priority: 'low' | 'normal' | 'high' = 'normal') {
    const response = await fetch(`${this.baseUrl}/api/analytics/event/enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        eventType,
        eventData,
        sessionId: this.getSessionId(),
        priority
      })
    });
    
    return response.json();
  }
  
  async recordBatch(events: Array<{eventType: string, eventData?: any, priority?: string}>) {
    const response = await fetch(`${this.baseUrl}/api/analytics/events/batch`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ events })
    });
    
    return response.json();
  }
  
  private getSessionId(): string {
    // Implementation for session ID generation/retrieval
    return `sess_${Date.now()}`;
  }
}
```

### React Hook
```typescript
import { useCallback } from 'react';

export const useAnalytics = () => {
  const recordTradeOpened = useCallback(async (tradeData: {
    symbol: string;
    amount: number;
    direction: 'up' | 'down';
    multiplier: number;
  }) => {
    await fetch('/api/analytics/event/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'trade_opened',
        eventData: tradeData,
        sessionId: sessionStorage.getItem('sessionId'),
        priority: 'normal'
      })
    });
  }, []);
  
  const recordScreenView = useCallback(async (screen: string, previousScreen?: string) => {
    await fetch('/api/analytics/event/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'screen_view',
        eventData: { screen, previousScreen },
        sessionId: sessionStorage.getItem('sessionId'),
        priority: 'low'
      })
    });
  }, []);
  
  return {
    recordTradeOpened,
    recordScreenView
  };
};
```

### Python SDK
```python
import requests
import json
from typing import Optional, Dict, Any, List

class CryptoCrazeAnalytics:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }
    
    def record_event(self, event_type: str, event_data: Optional[Dict[Any, Any]] = None, 
                     priority: str = 'normal') -> Dict[Any, Any]:
        url = f"{self.base_url}/api/analytics/event/enhanced"
        payload = {
            'eventType': event_type,
            'eventData': event_data,
            'sessionId': self._get_session_id(),
            'priority': priority
        }
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()
    
    def record_batch(self, events: List[Dict[str, Any]]) -> Dict[Any, Any]:
        url = f"{self.base_url}/api/analytics/events/batch"
        payload = {'events': events}
        
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()
    
    def get_user_dashboard(self) -> Dict[Any, Any]:
        url = f"{self.base_url}/api/analytics/user/dashboard"
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def _get_session_id(self) -> str:
        # Implementation for session ID generation/retrieval
        import time
        return f"sess_{int(time.time() * 1000)}"
```

This API specification provides complete documentation for integrating with the CryptoCraze Analytics system, covering all endpoints, data formats, error handling, and SDK examples.