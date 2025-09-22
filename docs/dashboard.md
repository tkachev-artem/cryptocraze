# CryptoCraze Analytics Dashboard - Final Development Plan

## Project Overview

Creating a comprehensive desktop analytics dashboard for CryptoCraze web application - a crypto trading simulator game with advanced analytics, ad campaign management, and regional analytics.

---

## Architecture & Structure

### Technical Solution:
- **Platform**: Desktop web interface (1440px+)
- **Frontend**: React + TypeScript + Chart.js
- **Backend**: Integration with existing ClickHouse + PostgreSQL
- **Styling**: CSS Grid + Tailwind CSS (preserving project style)
- **Real-time**: WebSocket for live updates

### File Structure:
```
/src/pages/Admin/
├── Dashboard.tsx              # Main page (extend existing)
├── UserAcquisition/
│   ├── index.tsx             # Conversion funnels
│   ├── ConversionFunnel.tsx  # Registration → first trade
│   └── SourceBreakdown.tsx   # Traffic sources
├── Engagement/
│   ├── index.tsx             # Gamification + behavior
│   ├── GameMetrics.tsx       # Tutorial, rewards, achievements
│   └── SessionAnalytics.tsx  # Session time, screens
├── Retention/
│   ├── index.tsx             # User retention
│   ├── CohortAnalysis.tsx    # Cohort analysis
│   └── ChurnPrediction.tsx   # Churn prediction
├── Monetization/
│   ├── index.tsx             # Revenue & monetization
│   ├── RevenueStreams.tsx    # Premium + virtual purchases
│   ├── PremiumAnalytics.tsx  # Pro-mode analytics
│   ├── StripeIntegration.tsx # Stripe payment management
│   ├── SubscriptionManager.tsx # Subscription analytics & management
│   ├── PricingManager.tsx    # Dynamic pricing management (NEW!)
│   └── LocalizationManager.tsx # Multi-language pricing sync (NEW!)
├── AdPerformance/
│   ├── index.tsx             # Ad analytics
│   ├── CampaignManager.tsx   # Campaign management
│   ├── AdNetworks.tsx        # Google AdMob, Meta, Unity
│   ├── TaskIntegration.tsx   # Video tasks integration
│   └── AdNetworkSettings.tsx # Ad keys & configuration management
├── Regional/
│   ├── index.tsx             # Geographic analytics
│   ├── GeographicMap.tsx     # Interactive world map
│   └── CountryBreakdown.tsx  # Country breakdown
└── components/
    ├── layout/
    │   ├── DesktopSidebar.tsx
    │   ├── TopHeader.tsx
    │   └── BrandLogo.tsx
    ├── charts/
    │   ├── MetricCard.tsx
    │   ├── TimeSeriesChart.tsx
    │   ├── CohortHeatmap.tsx
    │   └── GeographicHeatmap.tsx
    ├── filters/
    │   ├── DateRangePicker.tsx
    │   ├── RegionFilter.tsx
    │   └── CampaignFilter.tsx
    └── exports/
        ├── CSVExporter.tsx
        ├── PDFReporter.tsx
        └── DataExporter.tsx
```

---

## Design System

### Header with Branding:
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [🌀] CryptoCraze Dashboard > Analytics > Overview    [📊Live Stats]    [Export][User] │
├─────────────────────────────────────────────────────────────────────────────────────┤
```

- **Logo**: `/logo/logo.svg` + text "CryptoCraze Dashboard"
- **Navigation**: Breadcrumb navigation
- **Live Stats**: Online users, active trades, current revenue
- **Actions**: Export, refresh, user profile

### Color Scheme (from existing Dashboard.tsx):
```css
:root {
  --primary-bg: #F1F7FF;          /* Main background from App.tsx */
  --card-bg: #FFFFFF;             /* White cards */
  --primary-blue: #0C54EA;        /* Blue accents from App.tsx */
  --text-primary: #1F2937;        /* Primary text */
  --text-secondary: #6B7280;      /* Secondary text */
  --success-color: #2EBD85;       /* Green (profit) */
  --warning-color: #F59E0B;       /* Orange */
  --error-color: #EF4444;         /* Red (losses) */
  
  /* Additional UI colors from existing dashboard */
  --border-color: #E5E7EB;        /* Card borders */
  --skeleton-color: #F3F4F6;      /* Loading states */
  --hover-color: #F9FAFB;         /* Hover states */
}
```

### Desktop Layout (enhanced from existing mobile):
- **Sidebar**: 264px fixed navigation left (replacing mobile BottomNavigation)
- **Main Content**: Flex-1 with sidebar offset
- **Grid System**: CSS Grid 12 columns for complex layouts (extending existing card system)
- **Components**: Reuse existing Card, Button, Badge, Skeleton from ui/
- **Icons**: Lucide React icons (already imported in existing dashboard)
- **Hover Effects**: Interactive elements for desktop
- **Loading States**: Enhanced Skeleton components for desktop layouts

### Admin Routes Integration:
- **Current Route**: `/admin` → AdminDashboard (from App.tsx line 4)
- **Enhanced Routes**: Extend to `/admin/*` for all new pages
- **Authentication**: Maintain existing auth system
- **Navigation**: Desktop sidebar replaces BottomNavigation for admin

---

## Key Metrics and Data

### 1. User Acquisition
```typescript
interface UserAcquisitionMetrics {
  // Instead of app installs - web sessions
  registrations: {
    total: number;
    today: number;
    thisWeek: number;
  };
  
  conversionFunnel: {
    visitors: number;           // Unique visitors
    registrations: number;      // OAuth registrations
    firstSession: number;       // First sessions
    firstTrade: number;         // First trades
    tutorialComplete: number;   // Tutorial completion
  };
  
  sourceBreakdown: {
    [source: string]: {
      users: number;
      conversionRate: number;
      cost: number;
    }
  };
  
  tutorialMetrics: {
    skipRate: number;           // tutorial_skip_rate
    completionRate: number;
    dropoffPoints: TutorialStep[];
  };
}
```

### 2. Engagement
```typescript
interface EngagementMetrics {
  sessions: {
    total: number;
    avgPerUser: number;
    avgDuration: number;        // In seconds
  };
  
  gameMetrics: {
    dailyRewardClaimed: number;
    lootBoxOpened: number;
    wheelSpins: number;
    achievementsUnlocked: number;
    proModeActivations: number;
  };
  
  screenActivity: {
    dashboard: number;
    trading: number;
    rewards: number;
    profile: number;
  };
  
  tradingBehavior: {
    tradesPerUser: number;
    avgVirtualBalanceUsed: number;
    priceStreamConnections: number;
  };
}
```

### 3. Regional Analytics (NEW!)
```typescript
interface RegionalAnalytics {
  geographic: {
    worldMap: {
      [countryCode: string]: {
        users: number;
        revenue: number;
        retention_d7: number;
        topCities: City[];
      }
    };
    
    regionalPerformance: {
      [region: string]: {
        arpu: number;
        conversionRate: number;
        preferredLanguages: string[];
        peakHours: number[];
      }
    };
    
    culturalInsights: {
      holidayImpact: SeasonalData[];
      timeZoneDistribution: TimezoneStats[];
      localizedFeatureUsage: FeatureUsage[];
    };
  };
}
```

### 4. Ad Performance with Trials.tsx Integration
```typescript
interface AdPerformanceMetrics {
  // Integration with existing system
  videoTasks: {
    // Connection with EnhancedVideoAdModal + TaskCard
    totalVideoTasks: number;
    completedVideoAds: number;
    avgWatchTime: number;
    rewardsClaimed: number;
  };
  
  adNetworks: {
    googleAdMob: AdNetworkStats;
    metaAudience: AdNetworkStats;
    unityAds: AdNetworkStats;
    simulation: AdNetworkStats;    // From adService.ts
  };
  
  campaignManagement: {
    activeCampaigns: Campaign[];
    budgetAllocation: BudgetRule[];
    performanceAlerts: Alert[];
    automationRules: AutomationRule[];
  };
  
  taskIntegration: {
    // Connection with /pages/Trials.tsx
    energyProgressAds: number;     // Ads in energy progress
    wheelSpinAds: number;          // Ads before wheel
    boxOpeningAds: number;         // Ads before boxes
    tradingBonusAds: number;       // Video bonus in trades
  };
}
```

### 5. Campaign Management System (NEW!)
```typescript
interface CampaignManager {
  campaigns: {
    active: Campaign[];
    paused: Campaign[];
    completed: Campaign[];
  };
  
  targeting: {
    geographic: string[];
    demographic: Demographics;
    behavioral: BehaviorSegment[];
    lookalike: boolean;
  };
  
  creativeOptimization: {
    abtests: ABTest[];
    topPerformingCreatives: Creative[];
    audienceSegments: Audience[];
  };
  
  automation: {
    bidStrategies: BidStrategy[];
    budgetRules: BudgetRule[];
    performanceAlerts: Alert[];
  };
}
```

### 6. Ad Network Keys Management (NEW!)
```typescript
interface AdNetworkManagement {
  settings: {
    googleAdSense: {
      clientId: string;
      videoSlotId: string;
      bannerSlotId: string;
      isEnabled: boolean;
      testMode: boolean;
      fallbackToTest: boolean; // Always show test ads if real fail
    };
    
    googleAdMob: {
      appId: string;
      rewardedVideoId: string;
      interstitialId: string;
      bannerId: string;
      isEnabled: boolean;
      testMode: boolean;
      testDeviceIds: string[]; // Test device IDs for Google test ads
    };
    
    metaAudienceNetwork: {
      placementId: string;
      appId: string;
      isEnabled: boolean;
      testMode: boolean;
    };
    
    unityAds: {
      gameId: string;
      placementId: string;
      isEnabled: boolean;
      testMode: boolean;
    };
    
    customNetworks: AdNetworkConfig[];
  };
  
  reliabilityConfig: {
    alwaysShowAds: boolean; // Never show "no ads available"
    fallbackToSimulation: boolean; // Use simulation if all networks fail
    minimumAdInterval: number; // Seconds between ads
    maxRetryAttempts: number; // Retry failed ad loads
  };
  
  testing: {
    connectionStatus: NetworkStatus[];
    lastTestResults: TestResult[];
    autoTestSchedule: TestSchedule;
    testAdPreview: boolean; // Preview test ads in dashboard
  };
  
  security: {
    keyEncryption: boolean;
    accessLogs: AccessLog[];
    roleBasedAccess: RolePermissions;
  };
  
  performance: {
    networkComparison: NetworkPerformance[];
    revenueOptimization: OptimizationSuggestion[];
    integrationHealth: HealthCheck[];
    adServeReliability: ReliabilityMetrics[];
  };
}
```

### 7. Premium Subscriptions & Stripe Integration (NEW!)
```typescript
interface PremiumSubscriptionManagement {
  stripeConfig: {
    publishableKey: string;
    secretKey: string; // Encrypted in database
    testMode: boolean;
    webhookSecret: string;
    testCards: StripeTestCard[]; // Test card numbers for testing
  };
  
  // DYNAMIC PRICING MANAGEMENT - UPDATES FRONTEND AUTOMATICALLY
  pricingManagement: {
    monthly: {
      price: 6.99; // Current price from Premium.tsx
      currency: 'USD';
      interval: 'month';
      stripeProductId: 'prod_cryptocraze_monthly';
      stripePriceId: 'price_monthly_699';
      isActive: boolean;
      displayPrice: string; // '$6.99/month'
      features: string[];
    };
    yearly: {
      price: 64.99; // Current price from Premium.tsx  
      currency: 'USD';
      interval: 'year';
      stripeProductId: 'prod_cryptocraze_yearly';
      stripePriceId: 'price_yearly_6499';
      isActive: boolean;
      displayPrice: string; // '$64.99/year'
      savings: string; // Auto-calculated savings
      features: string[];
    };
    
    // AUTOMATIC FRONTEND SYNC
    frontendSync: {
      autoUpdatePrices: boolean; // Update Premium.tsx prices via API
      updateLocalization: boolean; // Update ru.json, en.json automatically
      cacheInvalidation: boolean; // Clear frontend cache when prices change
      previewMode: boolean; // Preview price changes before applying
    };
  };
  
  // PRICE CHANGE MANAGEMENT
  priceChangeSystem: {
    pendingChanges: PriceChange[];
    changeHistory: PriceChangeLog[];
    rollbackCapability: boolean;
    effectiveDate: string; // When price change takes effect
    grandfatherExisting: boolean; // Keep existing users on old price
    notificationsSent: boolean; // Notify users about price changes
  };
  
  analytics: {
    activeSubscriptions: SubscriptionMetrics;
    revenue: RevenueBreakdown;
    churnAnalysis: ChurnMetrics;
    conversionFunnel: ConversionMetrics;
    ltv: LifetimeValueMetrics;
    priceElasticity: PriceElasticityMetrics; // How price changes affect conversions
  };
  
  management: {
    subscriptionsList: Subscription[];
    refunds: RefundRequest[];
    failedPayments: FailedPayment[];
    webhookLogs: WebhookLog[];
  };
}

// PRICE CHANGE INTERFACES
interface PriceChange {
  id: string;
  plan: 'monthly' | 'yearly';
  currentPrice: number;
  newPrice: number;
  effectiveDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'applied' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
}

interface PriceElasticityMetrics {
  conversionImpact: number; // % change in conversions after price change
  revenueImpact: number; // % change in revenue
  churnImpact: number; // % change in churn rate
  demandElasticity: number; // Price elasticity coefficient
}
```

---

## Integration with Existing System

### 1. Ad System Integration:

**Files for integration:**
- `/src/pages/Trials.tsx` - main page with video tasks
- `/src/components/TaskCard.tsx` - task cards with video ads
- `/src/components/EnhancedVideoAdModal.tsx` - ad viewing modal
- `/src/services/adService.ts` - frontend ad service
- `/server/services/adService.ts` - backend ad logic

**Key integration points:**
```typescript
// Dashboard will track:
- analyticsService.trackAdWatch() // From analyticsService.ts
- adService.showRewardedVideo()   // From adService.ts  
- TaskCard video completion events // From TaskCard.tsx
- Energy progress + ad rewards    // From Trials.tsx
- Wheel/Box opening with ads      // From Trials.tsx
```

### 2. ClickHouse Integration:

**Existing tables:**
- `user_events` - user events (including ad_watch)
- `deals_analytics` - trading analytics
- `revenue_events` - revenue events
- `ad_events` - ad events

**New tables for dashboard:**
```sql
-- Geographic data
user_geographic (
  user_id, country, region, city, timezone, language
)

-- Campaign tracking  
ad_campaigns (
  campaign_id, name, budget, targeting, status, performance
)

-- Regional performance
regional_metrics (
  region, date, users, revenue, retention, engagement
)
```

### 3. API endpoints for dashboard:
```typescript
// Extending existing /admin/analytics/overview-v2
GET /admin/analytics/geographic        // Regional data
GET /admin/analytics/campaigns        // Ad campaigns  
GET /admin/analytics/engagement       // Detailed engagement
GET /admin/analytics/retention        // Cohort analysis
GET /admin/analytics/real-time        // Live metrics

// New management endpoints
POST /admin/campaigns                 // Create campaign
PUT /admin/campaigns/:id             // Update campaign
GET /admin/campaigns/:id/performance // Campaign performance

// Ad Network Keys Management (NEW!)
GET    /admin/ad-settings                     // Get all ad network settings
PUT    /admin/ad-settings/:network           // Update network settings
POST   /admin/ad-settings/test/:network      // Test network integration
DELETE /admin/ad-settings/:network           // Delete network settings
GET    /admin/ad-settings/logs               // Access logs for security
POST   /admin/ad-settings/encrypt-keys       // Encrypt/decrypt keys
GET    /admin/ad-settings/performance        // Network performance comparison
POST   /admin/ad-settings/preview-test-ad    // Preview test ads in dashboard

// Stripe & Subscriptions Management (NEW!)
GET    /admin/stripe/config                  // Get Stripe configuration
PUT    /admin/stripe/config                  // Update Stripe settings
POST   /admin/stripe/test-connection         // Test Stripe API connection
GET    /admin/subscriptions                  // Get all subscriptions
GET    /admin/subscriptions/:id              // Get subscription details
POST   /admin/subscriptions/:id/cancel       // Cancel subscription
POST   /admin/subscriptions/:id/refund       // Process refund
GET    /admin/stripe/webhooks                // Webhook logs
GET    /admin/stripe/failed-payments         // Failed payment attempts
GET    /admin/stripe/analytics               // Revenue & subscription analytics

// Dynamic Pricing Management (NEW!)
GET    /admin/pricing                        // Get current pricing for both plans
PUT    /admin/pricing/monthly                // Update monthly plan price
PUT    /admin/pricing/yearly                 // Update yearly plan price
POST   /admin/pricing/preview                // Preview price change impact
POST   /admin/pricing/apply                  // Apply pending price changes
GET    /admin/pricing/history                // Price change history
POST   /admin/pricing/rollback/:changeId     // Rollback to previous price
GET    /api/pricing                          // PUBLIC: Get current prices for frontend
POST   /admin/pricing/sync-frontend          // Force frontend cache invalidation
POST   /admin/pricing/sync-localization      // Update ALL language files (ru,en,es,fr,pt)
```

---

## Advanced Features

### 1. Real-time System:
```typescript
interface RealtimeUpdates {
  userActivity: {
    onlineUsers: number;
    newRegistrations: User[];
    activeTrades: Trade[];
    completedVideoTasks: VideoTask[];
  };
  
  campaignPerformance: {
    liveBudgetSpend: CampaignSpend[];
    realTimeROAS: ROASUpdate[];
    alertsAndNotifications: Alert[];
  };
  
  systemHealth: {
    clickhouseLatency: number;
    apiResponseTime: number;
    adServiceStatus: 'online' | 'offline';
    taskServiceStatus: 'online' | 'offline';
  };
}
```

### 2. Filtering System:
```typescript
interface AdvancedFilters {
  temporal: {
    dateRange: DateRange;
    timeZone: string;
    granularity: 'hour' | 'day' | 'week' | 'month';
    comparison: 'previous_period' | 'year_over_year';
  };
  
  geographic: {
    countries: string[];
    regions: string[];
    languages: string[];
  };
  
  campaigns: {
    adNetworks: string[];
    campaignTypes: string[];
    budgetRanges: BudgetRange[];
    performanceMetrics: MetricFilter[];
  };
  
  behavioral: {
    userSegments: UserSegment[];
    engagementLevels: EngagementLevel[];
    spendingTiers: SpendingTier[];
  };
}
```

### 3. Export and Reporting:
```typescript
interface ExportSystem {
  formats: ['csv', 'json', 'pdf', 'excel'];
  
  scheduledReports: {
    daily: DailyReport[];
    weekly: WeeklyReport[];
    monthly: MonthlyReport[];
  };
  
  customReports: {
    templates: ReportTemplate[];
    builder: ReportBuilder;
    automation: AutomationRule[];
  };
}
```

---

## Visualizations (Chart.js)

### Main Chart Types:
1. **Line Charts**: Retention curves, revenue trends, user growth
2. **Bar Charts**: Regional comparison, campaign performance
3. **Pie Charts**: Source breakdown, ad network distribution  
4. **Heatmaps**: Geographic data, engagement patterns
5. **Funnel Charts**: Conversion funnels, user journey
6. **Real-time Charts**: Live metrics, concurrent users
7. **Cohort Matrix**: Retention heatmap
8. **Geographic Maps**: World map with metrics overlay

### Interactive Elements:
- Hover tooltips with detailed information
- Drill-down capability (click element → details)
- Zoom and pan for time series
- Brush selection for filtering
- Export charts to PNG/SVG

---

## Development Phases

### Phase 1: Foundation (1-2 weeks)
1. ✅ Create desktop layout with sidebar
2. ✅ Logo and branding integration
3. ✅ Extend existing Dashboard.tsx
4. 🔄 Connect to ClickHouse data
5. 🔄 Basic metric cards and charts

### Phase 2: Detailed Pages (2-3 weeks)
6. User Acquisition page with funnels
7. Engagement page with gamification
8. Retention page with cohort analysis
9. Monetization page with revenue streams + Stripe integration (NEW!)
10. Premium subscription analytics dashboard (NEW!)
11. Dynamic pricing management system (NEW!)
12. Basic filtering and export

### Phase 3: Ads & Campaigns (2-3 weeks)
11. Ad Performance page with Trials.tsx integration
12. Campaign Manager for creating/managing campaigns
13. Ad Network Keys Management system (NEW!)
14. Fix ad integration to always work with test/real keys (NEW!)
15. Connection with EnhancedVideoAdModal and TaskCard
16. Campaign automation and optimization

### Phase 4: Regional Analytics (1-2 weeks)
17. Regional Analytics page
18. Interactive world map
19. Geographic filters
20. Cultural insights and localization

### Phase 5: Advanced Features (1-2 weeks)
21. Real-time WebSocket integration
22. Advanced filtering system
23. Scheduled reports and automation
24. Ad network security and encryption
25. Performance optimization

---

## Key Results

### Final Dashboard Will Include:

1. **Main Dashboard** - enhanced overview with real-time + regional data
2. **User Acquisition** - conversion funnels + traffic sources  
3. **Engagement** - gamification + behavioral analytics
4. **Retention** - cohort analysis + churn prediction
5. **Monetization** - revenue streams + premium analytics + Stripe integration
6. **Premium Subscriptions** - subscription analytics + management dashboard  
7. **Dynamic Pricing** - live price management + frontend auto-sync + multi-language support + impact analytics
8. **Ad Performance** - campaign management + video tasks integration + reliable ad serving
9. **Regional Analytics** - world map + cultural insights
10. **Campaign Manager** - create/manage ad campaigns
11. **Ad Network Settings** - secure keys management + network testing

### Technical Advantages:
- Full integration with existing architecture
- Real connection with ad system in Trials.tsx
- Dynamic pricing system with automatic frontend synchronization
- Real-time price updates across Premium.tsx and ALL localization files (ru,en,es,fr,pt)
- Secure ad network keys management with encryption
- Reliable ad serving with test/production mode switching
- Stripe payment integration with test mode support
- Premium subscription analytics and management
- Price elasticity analytics and conversion impact tracking
- Comprehensive testing and monitoring of ad integrations
- Preserves project design and UX
- Performance for large data volumes
- Extensibility and scalability

---

## Next Steps

1. **Plan Confirmation** - approve technical solutions
2. **Development Environment Setup** - prepare infrastructure
3. **Create Basic Layout** - desktop sidebar + header
4. **ClickHouse Integration** - connect to real data
5. **Iterative Development** - by phases with testing

---

## 🗺️ **ADMIN USER JOURNEY & NAVIGATION PATHS**

### **Current Admin Access:**
```
/admin/dashboard → AdminDashboard component (existing)
```

### **Enhanced Admin Routes Structure:**
```typescript
// New admin routing system
/admin/
├── dashboard/              # Main overview (enhanced existing)
├── user-acquisition/       # User funnels & sources
├── engagement/             # Gamification & sessions
├── retention/              # Cohort analysis
├── monetization/           # Revenue & subscriptions
│   ├── overview           # Revenue dashboard
│   ├── subscriptions      # Subscription management
│   ├── pricing           # Dynamic pricing controls
│   └── stripe            # Payment settings
├── ads/                   # Ad management
│   ├── performance       # Ad analytics
│   ├── campaigns         # Campaign manager
│   ├── networks          # Ad network settings
│   └── keys              # Network keys management
├── regional/              # Geographic analytics
└── settings/              # Admin settings
    ├── users             # User management
    ├── permissions       # Role management
    └── system            # System settings
```

### **Admin User Flow Scenarios:**

#### **🔧 Daily Operations Admin:**
1. **Login** → `/admin/dashboard`
2. **Check Overview** → Key metrics cards
3. **Monitor Revenue** → `/admin/monetization/overview`
4. **Review Ad Performance** → `/admin/ads/performance`
5. **Check User Growth** → `/admin/user-acquisition`

#### **💰 Revenue Management:**
1. **Pricing Updates** → `/admin/monetization/pricing`
   - Change monthly/yearly prices ($6.99/$64.99)
   - Preview impact analysis
   - Apply changes to all language files (ru,en,es,fr,pt)
2. **Subscription Management** → `/admin/monetization/subscriptions`
   - View active subscriptions
   - Process refunds
   - Cancel problematic accounts
3. **Stripe Configuration** → `/admin/monetization/stripe`
   - Update payment settings
   - Test webhook integration

#### **📺 Ad Campaign Management:**
1. **Campaign Overview** → `/admin/ads/campaigns`
   - Create new campaigns
   - Monitor active campaigns
   - Optimize performance
2. **Network Management** → `/admin/ads/networks`
   - Add/configure ad networks (Google, Meta, Unity)
   - Test integrations
   - Monitor revenue per network
3. **Keys Management** → `/admin/ads/keys`
   - Securely store API keys
   - Test connections
   - Enable/disable networks

#### **📊 Data Analytics:**
1. **User Analytics** → `/admin/user-acquisition`
   - Analyze conversion funnels
   - Track traffic sources
   - Monitor acquisition costs
2. **Retention Analysis** → `/admin/retention`
   - Cohort analysis
   - Churn prediction
   - User lifecycle management
3. **Regional Insights** → `/admin/regional`
   - Geographic performance
   - Cultural analysis
   - Localization effectiveness

### **Admin Access Control:**

#### **🔐 Single Admin System:**
- **Database field**: `user.isAdmin = true` (existing)
- **Full access** to all dashboard features
- **No role differentiation** - one admin can do everything
- **Simple authentication**: Check `isAdmin` flag for all admin routes

### **Navigation UX Design:**

#### **Desktop Sidebar Navigation:**
```
┌─────────────────────┐
│ 🌀 CryptoCraze      │
│    Dashboard        │
├─────────────────────┤
│ 📊 Overview         │ ← /admin/dashboard
│ 👥 Users            │ ← /admin/user-acquisition  
│ ⚡ Engagement       │ ← /admin/engagement
│ 🔄 Retention        │ ← /admin/retention
│ 💰 Monetization     │ ← /admin/monetization
│ 📺 Advertising      │ ← /admin/ads
│ 🌍 Regional         │ ← /admin/regional
├─────────────────────┤
│ ⚙️ Settings         │ ← /admin/settings
│ 🚪 Logout           │
└─────────────────────┘
```

#### **Breadcrumb Navigation:**
```
CryptoCraze Dashboard > Monetization > Dynamic Pricing
CryptoCraze Dashboard > Ads > Campaign Manager > Campaign Details
CryptoCraze Dashboard > Regional > Country Analysis > Brazil
```

#### **Quick Actions Header:**
```
[🔄 Refresh Data] [📊 Export Current View] [⚡ Real-time: ON] [👤 Admin Profile]
```

### **Access Control Integration:**
- **Route Guards**: Simple `user.isAdmin` check for all admin routes
- **API Permissions**: Backend validates `isAdmin` flag for all admin endpoints
- **Single Admin**: No UI hiding - admin sees everything
- **Audit Logging**: Track admin actions for security (optional)

---

## 🎯 **ФИНАЛЬНЫЙ ЧЕКЛИСТ ДЛЯ РЕАЛИЗАЦИИ**

### **ЭТАП 1: ОСНОВА СИСТЕМЫ (ПРИОРИТЕТ 1) - 1 неделя**

#### ✅ **1.1 Desktop Layout & Navigation**
- [ ] Создать `src/pages/Admin/components/layout/DesktopSidebar.tsx`
- [ ] Создать `src/pages/Admin/components/layout/TopHeader.tsx` 
- [ ] Создать `src/pages/Admin/components/layout/BrandLogo.tsx`
- [ ] Обновить существующий `Dashboard.tsx` под desktop layout
- [ ] Настроить роутинг `/admin/*` в `App.tsx`

#### ✅ **1.2 Core Components**
- [ ] Создать `src/pages/Admin/components/charts/MetricCard.tsx`
- [ ] Создать `src/pages/Admin/components/charts/TimeSeriesChart.tsx`
- [ ] Создать `src/pages/Admin/components/filters/DateRangePicker.tsx`
- [ ] Установить Chart.js: `npm install chart.js react-chartjs-2`

#### ✅ **1.3 Backend API Foundation**
```bash
# Новые эндпоинты для реализации:
GET /admin/analytics/engagement        # Детальные метрики активности
GET /admin/analytics/retention         # Когортный анализ
GET /admin/analytics/geographic        # Региональные данные
GET /admin/pricing                     # Текущие цены планов
```

### **ЭТАП 2: MONETIZATION СИСТЕМА (ПРИОРИТЕТ 2) - 1 неделя**

#### 💰 **2.1 Dynamic Pricing Management**
- [ ] Создать `src/pages/Admin/Monetization/PricingManager.tsx`
- [ ] API: `PUT /admin/pricing/monthly` - изменение цены месячной подписки
- [ ] API: `PUT /admin/pricing/yearly` - изменение цены годовой подписки  
- [ ] API: `GET /api/pricing` - публичный эндпоинт для frontend
- [ ] Автоматическое обновление цен в `Premium.tsx` через API
- [ ] Автоматическое обновление всех языковых файлов (ru,en,es,fr,pt)

#### 💳 **2.2 Stripe Integration**
- [ ] Создать `src/pages/Admin/Monetization/StripeIntegration.tsx`
- [ ] API: `GET /admin/stripe/config` - настройки Stripe
- [ ] API: `PUT /admin/stripe/config` - обновление настроек
- [ ] API: `GET /admin/subscriptions` - управление подписками
- [ ] Тестирование платежей в test mode

#### 📊 **2.3 Premium Analytics**
- [ ] Создать `src/pages/Admin/Monetization/PremiumAnalytics.tsx`
- [ ] Метрики: активные подписки, revenue, churn rate
- [ ] Интеграция с существующим `PremiumStatsBlock.tsx`

### **ЭТАП 3: AD MANAGEMENT СИСТЕМА (ПРИОРИТЕТ 3) - 1-2 недели**

#### 📺 **3.1 Ad Network Keys Management**
- [ ] Создать `src/pages/Admin/AdPerformance/AdNetworkSettings.tsx`
- [ ] API: `GET /admin/ad-settings` - получение настроек сетей
- [ ] API: `PUT /admin/ad-settings/:network` - обновление ключей
- [ ] API: `POST /admin/ad-settings/test/:network` - тестирование сетей
- [ ] Поддержка: Google AdMob, Meta Audience, Unity Ads
- [ ] Безопасное хранение API ключей (encryption)

#### 🎯 **3.2 Campaign Management**
- [ ] Создать `src/pages/Admin/AdPerformance/CampaignManager.tsx`
- [ ] API: `POST /admin/campaigns` - создание кампаний
- [ ] API: `GET /admin/campaigns/:id/performance` - статистика кампаний
- [ ] Интеграция с существующим `Trials.tsx` + `TaskCard.tsx`

#### 📈 **3.3 Ad Performance Analytics**
- [ ] Создать `src/pages/Admin/AdPerformance/index.tsx`
- [ ] Интеграция с `adService.ts` и `analyticsService.ts`
- [ ] Метрики: video completion rate, revenue per ad, ROAS

### **ЭТАП 4: ANALYTICS СИСТЕМА (ПРИОРИТЕТ 4) - 1 неделя**

#### 👥 **4.1 User Acquisition**
- [ ] Создать `src/pages/Admin/UserAcquisition/index.tsx`
- [ ] Создать `src/pages/Admin/UserAcquisition/ConversionFunnel.tsx`
- [ ] Метрики: registration → first trade → tutorial completion

#### ⚡ **4.2 Engagement Analytics**
- [ ] Создать `src/pages/Admin/Engagement/index.tsx`
- [ ] Создать `src/pages/Admin/Engagement/SessionAnalytics.tsx`
- [ ] Метрики: session duration, screens per session, feature usage

#### 🔄 **4.3 Retention Analytics**
- [ ] Создать `src/pages/Admin/Retention/index.tsx`
- [ ] Создать `src/pages/Admin/Retention/CohortAnalysis.tsx`
- [ ] Когортная матрица: D1, D3, D7, D30 retention

### **ЭТАП 5: REGIONAL ANALYTICS (ПРИОРИТЕТ 5) - 1 неделя**

#### 🌍 **5.1 Geographic Analytics**
- [ ] Создать `src/pages/Admin/Regional/index.tsx`
- [ ] Создать `src/pages/Admin/Regional/GeographicMap.tsx`
- [ ] Интерактивная карта мира с метриками по странам
- [ ] Установить: `npm install react-leaflet leaflet`

#### 🌐 **5.2 Localization Analytics**
- [ ] Анализ производительности по языкам
- [ ] Эффективность локализации (ru,en,es,fr,pt)
- [ ] Regional performance breakdown

### **ЭТАП 6: SYSTEM INTEGRATION (ПРИОРИТЕТ 6) - 3-5 дней**

#### 🔌 **6.1 Real-time Updates**
- [ ] WebSocket интеграция для live метрик
- [ ] Real-time updates: online users, active trades, revenue
- [ ] Настройка в существующем backend

#### 📊 **6.2 Export System**
- [ ] Создать `src/pages/Admin/components/exports/CSVExporter.tsx`
- [ ] Создать `src/pages/Admin/components/exports/PDFReporter.tsx`
- [ ] Export всех dashboard данных в CSV/PDF

#### 🔒 **6.3 Security & Permissions**
- [ ] Проверка `user.isAdmin` для всех новых роутов
- [ ] Audit logging для admin действий
- [ ] Защита API endpoints в backend

---

## 🚀 **ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ**

### **Dependencies для установки:**
```bash
npm install chart.js react-chartjs-2 react-leaflet leaflet
npm install @types/leaflet  # TypeScript types
```

### **Backend изменения:**
```typescript
// Новые API endpoints для реализации:
GET    /admin/analytics/engagement        # Детальная активность
GET    /admin/analytics/retention         # Когортный анализ  
GET    /admin/analytics/geographic        # Региональные данные
GET    /admin/pricing                     # Текущие цены
PUT    /admin/pricing/monthly             # Изменить месячную цену
PUT    /admin/pricing/yearly              # Изменить годовую цену
GET    /api/pricing                       # Публичные цены для frontend
PUT    /admin/stripe/config               # Настройки Stripe
GET    /admin/subscriptions               # Управление подписками
GET    /admin/ad-settings                 # Настройки рекламных сетей
PUT    /admin/ad-settings/:network        # Обновление ключей сетей
POST   /admin/campaigns                   # Создание кампаний
```

### **Frontend файловая структура:**
```
/src/pages/Admin/
├── Dashboard.tsx                    # ✅ Существует - обновить под desktop
├── Monetization/
│   ├── index.tsx                   # 💰 Revenue dashboard  
│   ├── PricingManager.tsx          # 🎯 Dynamic pricing system
│   ├── StripeIntegration.tsx       # 💳 Payment management
│   └── PremiumAnalytics.tsx        # 📊 Subscription analytics
├── AdPerformance/
│   ├── index.tsx                   # 📺 Ad analytics dashboard
│   ├── CampaignManager.tsx         # 🎯 Campaign management
│   └── AdNetworkSettings.tsx       # 🔧 Network keys management  
├── UserAcquisition/
│   ├── index.tsx                   # 👥 User funnels
│   └── ConversionFunnel.tsx        # 📈 Registration → first trade
├── Engagement/
│   ├── index.tsx                   # ⚡ Engagement dashboard
│   └── SessionAnalytics.tsx        # 📱 Session metrics
├── Retention/
│   ├── index.tsx                   # 🔄 Retention dashboard  
│   └── CohortAnalysis.tsx          # 📋 Cohort matrix
├── Regional/
│   ├── index.tsx                   # 🌍 Geographic dashboard
│   └── GeographicMap.tsx           # 🗺️ Interactive world map
└── components/
    ├── layout/
    │   ├── DesktopSidebar.tsx      # 🎯 Main navigation
    │   ├── TopHeader.tsx           # 📊 Header with breadcrumbs
    │   └── BrandLogo.tsx           # 🌀 CryptoCraze branding
    ├── charts/
    │   ├── MetricCard.tsx          # 📊 Metric display cards
    │   └── TimeSeriesChart.tsx     # 📈 Chart.js integration
    ├── filters/
    │   └── DateRangePicker.tsx     # 📅 Date filtering
    └── exports/
        ├── CSVExporter.tsx         # 📄 CSV export
        └── PDFReporter.tsx         # 📑 PDF reports
```

---

## 🎯 **ИТОГОВАЯ ЦЕЛЬ СИСТЕМЫ**

### **Что получим в результате:**

1. **🖥️ Desktop Admin Dashboard** - полноценная админка для управления CryptoCraze
2. **💰 Dynamic Pricing System** - управление ценами подписок с автообновлением frontend
3. **📺 Ad Management Center** - управление рекламными сетями и кампаниями  
4. **📊 Advanced Analytics** - глубокая аналитика пользователей, retention, revenue
5. **🌍 Regional Intelligence** - географическая аналитика и локализация
6. **🔧 Stripe Integration** - полное управление платежами и подписками
7. **🔒 Security & Audit** - безопасное управление ключами и audit trail

### **Интеграция с существующей системой:**
- ✅ Использует существующий `AdminDashboard.tsx` как основу
- ✅ Интегрируется с `Trials.tsx` и `TaskCard.tsx` для рекламы
- ✅ Подключается к ClickHouse через существующий `analyticsService.ts`
- ✅ Сохраняет дизайн проекта (цвета, шрифты, компоненты)
- ✅ Работает с существующей системой авторизации (`user.isAdmin`)

### **Бизнес-ценность:**
- 📈 **Увеличение revenue** через dynamic pricing и A/B testing цен
- 🎯 **Оптимизация рекламы** через централизованное управление сетями
- 👥 **Улучшение retention** через data-driven insights
- 🌍 **Глобальная экспансия** через региональную аналитику
- ⚡ **Операционная эффективность** через автоматизацию и real-time мониторинг

---

*Document finalized: September 18, 2024*  
*Project: CryptoCraze Analytics Dashboard*  
*Status: ✅ Plan ready for immediate implementation*  
*Priority: ЭТАП 1 → ЭТАП 2 → ЭТАП 3 → ЭТАП 4 → ЭТАП 5 → ЭТАП 6*