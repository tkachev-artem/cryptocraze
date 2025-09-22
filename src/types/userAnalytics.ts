// Современные интерфейсы для User Analytics в стиле лучших SaaS платформ

// Базовая информация о пользователе
export interface UserDetail {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  registrationDate: Date;
  lastActiveDate: Date;
  totalRevenue: number;
  premiumStatus: boolean;
  region: string;
  device: 'mobile' | 'desktop' | 'tablet';
  source: string;
}

// Торговые данные
export interface TradeDetail {
  id: string;
  userId: string;
  userEmail: string;
  username?: string;
  symbol: string;
  openDate: Date;
  closeDate?: Date;
  amount: number;
  profit: number;
  profitPercentage: number;
  status: 'open' | 'closed_profit' | 'closed_loss' | 'closed_break_even';
  tradeType: 'buy' | 'sell';
  openPrice: number;
  closePrice?: number;
  duration?: number; // в секундах
}

// Данные вовлеченности пользователя
export interface EngagementUserDetail extends UserDetail {
  sessionsCount: number;
  totalSessionDuration: number;
  averageSessionDuration: number;
  screensOpened: number;
  lastSessionDate: Date;
  isActiveLastWeek: boolean;
  isActiveLastMonth: boolean;
}

// Данные обучения пользователя
export interface TutorialUserDetail extends UserDetail {
  tutorialStarted: boolean;
  tutorialCompleted: boolean;
  tutorialSkipped: boolean;
  tutorialProgress: number; // процент завершения
  tutorialStartDate?: Date;
  tutorialCompleteDate?: Date;
  firstOpenDate: Date;
  signupAfterFirstOpen: boolean;
}

// Данные геймификации
export interface GamificationUserDetail extends UserDetail {
  dailyRewardsClaimedTotal: number;
  dailyRewardsClaimedThisWeek: number;
  lootboxesOpened: number;
  spinsCompleted: number;
  lastRewardClaimedDate?: Date;
  totalRewardsValue: number;
}

// Метрика с возможностью раскрытия деталей
export interface ExpandableMetric<T = UserDetail[]> {
  id: string;
  title: string;
  description: string;
  value: number;
  formattedValue: string;
  icon: string;
  change?: {
    value: number;
    period: string;
    trend: 'up' | 'down' | 'stable';
  };
  status: 'success' | 'warning' | 'error' | 'neutral';
  target?: number;
  userDetails: T;
  category: 'retention' | 'engagement' | 'trading' | 'onboarding' | 'gamification';
  color: string;
  additionalData?: any; // для дополнительных данных типа трейдов
}

// Конкретные типы для разных метрик
export interface RetentionUserDetail extends UserDetail {
  daysSinceRegistration: number;
  returnedOn: Date;
  sessionsAfterReturn: number;
  timeSpentAfterReturn: number; // в секундах
}

export interface RevenueUserDetail extends UserDetail {
  revenueBreakdown: {
    subscriptions: number;
    purchases: number;
    ads: number;
  };
  ltv: number;
  firstPurchaseDate?: Date;
  averageOrderValue: number;
}

export interface EngagementUserDetail extends UserDetail {
  sessionCount: number;
  averageSessionDuration: number;
  screensVisited: string[];
  featuresUsed: string[];
  lastActionType: string;
  engagementScore: number;
}

export interface AcquisitionUserDetail extends UserDetail {
  acquisitionChannel: string;
  campaignName?: string;
  cost: number;
  conversionTime: number; // время до первой конверсии в часах
  referrer?: string;
}

// Основные метрики дашборда
export interface UserAnalyticsMetrics {
  // Retention Metrics (4 карточки)
  day1Retention: ExpandableMetric<RetentionUserDetail[]>;
  day3Retention: ExpandableMetric<RetentionUserDetail[]>;
  day7Retention: ExpandableMetric<RetentionUserDetail[]>;
  day30Retention: ExpandableMetric<RetentionUserDetail[]>;
  
  // Engagement Metrics (4 карточки)
  activeUsersWeek: ExpandableMetric<EngagementUserDetail[]>;
  activeUsersMonth: ExpandableMetric<EngagementUserDetail[]>;
  sessionsPerUser: ExpandableMetric<EngagementUserDetail[]>;
  averageSessionDuration: ExpandableMetric<EngagementUserDetail[]>;
  
  // Trading Metrics (заменяет Revenue)
  totalTrades: ExpandableMetric<UserDetail[]>;
  successfulTradesPercent: ExpandableMetric<UserDetail[]>;
  
  // Onboarding Metrics
  tutorialStarted: ExpandableMetric<TutorialUserDetail[]>;
  tutorialCompleted: ExpandableMetric<TutorialUserDetail[]>;
  tutorialSkipRate: ExpandableMetric<TutorialUserDetail[]>;
  signupRate: ExpandableMetric<TutorialUserDetail[]>;
  
  // Additional Metrics
  priceStreamConnections: ExpandableMetric<EngagementUserDetail[]>;
  dailyRewardsClaimed: ExpandableMetric<GamificationUserDetail[]>;
  lootboxSpinsStarted: ExpandableMetric<GamificationUserDetail[]>;
}

// Фильтры для анализа
export interface AnalyticsFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  userSegment?: 'all' | 'new' | 'returning' | 'premium' | 'free';
  region?: string[];
  device?: ('mobile' | 'desktop' | 'tablet')[];
  source?: string[];
}

// Состояние загрузки и ошибок
export interface UserAnalyticsState {
  metrics: UserAnalyticsMetrics | null;
  filters: AnalyticsFilters;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  selectedMetric: ExpandableMetric | null;
  expandedMetrics: Set<string>;
}

// Конфигурация метрик для кастомизации отображения
export interface MetricConfig {
  id: string;
  enabled: boolean;
  position: number;
  size: 'small' | 'medium' | 'large';
  showSparkline: boolean;
  showTarget: boolean;
  customColor?: string;
}

// Экспорт данных
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  metrics: string[];
  includeUserDetails: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Уведомления и алерты
export interface MetricAlert {
  id: string;
  metricId: string;
  condition: 'above' | 'below' | 'equal';
  threshold: number;
  enabled: boolean;
  lastTriggered?: Date;
  message: string;
}
