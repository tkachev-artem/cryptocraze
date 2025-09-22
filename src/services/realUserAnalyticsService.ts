import { config } from '../lib/config';
import {
  UserAnalyticsMetrics,
  ExpandableMetric,
  UserDetail,
  RetentionUserDetail,
  EngagementUserDetail,
  TutorialUserDetail,
  GamificationUserDetail,
  TradeDetail,
  AnalyticsFilters
} from '../types/userAnalytics';

/**
 * Сервис для получения реальных данных User Analytics из БД и ClickHouse
 */
class RealUserAnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Получение всех метрик с реальными данными
   */
  async fetchAllMetrics(filters?: AnalyticsFilters): Promise<UserAnalyticsMetrics> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/user-analytics${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения данных: ${response.status}`);
      }

      const data = await response.json();
      return this.transformApiDataToMetrics(data);
    } catch (error) {
      console.error('Ошибка получения метрик:', error);
      throw error;
    }
  }

  /**
   * Получение метрик retention с реальными пользователями
   */
  async fetchRetentionMetrics(filters?: AnalyticsFilters): Promise<{
    day1Retention: ExpandableMetric<RetentionUserDetail[]>;
    day3Retention: ExpandableMetric<RetentionUserDetail[]>;
    day7Retention: ExpandableMetric<RetentionUserDetail[]>;
    day30Retention: ExpandableMetric<RetentionUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/retention/detailed${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения retention данных: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        day1Retention: this.createRetentionMetric('day1_retention', 'D1 Retention', 
          'Пользователи, вернувшиеся через 1 день', data.day1),
        day3Retention: this.createRetentionMetric('day3_retention', 'D3 Retention', 
          'Пользователи, вернувшиеся через 3 дня', data.day3),
        day7Retention: this.createRetentionMetric('day7_retention', 'D7 Retention', 
          'Пользователи, вернувшиеся через неделю', data.day7),
        day30Retention: this.createRetentionMetric('day30_retention', 'D30 Retention', 
          'Пользователи, вернувшиеся через месяц', data.day30)
      };
    } catch (error) {
      console.error('Ошибка получения retention метрик:', error);
      throw error;
    }
  }

  /**
   * Получение метрик engagement с реальными данными
   */
  async fetchEngagementMetrics(filters?: AnalyticsFilters): Promise<{
    activeUsersWeek: ExpandableMetric<EngagementUserDetail[]>;
    activeUsersMonth: ExpandableMetric<EngagementUserDetail[]>;
    sessionsPerUser: ExpandableMetric<EngagementUserDetail[]>;
    averageSessionDuration: ExpandableMetric<EngagementUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/engagement/detailed${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения engagement данных: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        activeUsersWeek: this.createEngagementMetric('active_users_week', 'Активные за неделю',
          'Пользователи, активные последние 7 дней', data.activeWeek),
        activeUsersMonth: this.createEngagementMetric('active_users_month', 'Активные за месяц',
          'Пользователи, активные последние 30 дней', data.activeMonth),
        sessionsPerUser: this.createEngagementMetric('sessions_per_user', 'Сессий на пользователя',
          'Среднее количество сессий на одного пользователя', data.sessionsPerUser),
        averageSessionDuration: this.createEngagementMetric('avg_session_duration', 'Средняя длительность сессии',
          'Среднее время, проведенное в приложении', data.avgSessionDuration)
      };
    } catch (error) {
      console.error('Ошибка получения engagement метрик:', error);
      throw error;
    }
  }

  /**
   * Получение торговых метрик с реальными сделками
   */
  async fetchTradingMetrics(filters?: AnalyticsFilters): Promise<{
    totalTrades: ExpandableMetric<UserDetail[]>;
    successfulTradesPercent: ExpandableMetric<UserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/trading/detailed${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения торговых данных: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        totalTrades: this.createTradingMetric('total_trades', 'Всего сделок',
          'Общее количество проведенных сделок', data.totalTrades),
        successfulTradesPercent: this.createTradingMetric('successful_trades_percent', 'Процент успешных сделок',
          'Доля прибыльных сделок от общего количества', data.successfulTrades)
      };
    } catch (error) {
      console.error('Ошибка получения торговых метрик:', error);
      throw error;
    }
  }

  /**
   * Получение данных об обучении (туториал)
   */
  async fetchOnboardingMetrics(filters?: AnalyticsFilters): Promise<{
    tutorialStarted: ExpandableMetric<TutorialUserDetail[]>;
    tutorialCompleted: ExpandableMetric<TutorialUserDetail[]>;
    tutorialSkipRate: ExpandableMetric<TutorialUserDetail[]>;
    signupRate: ExpandableMetric<TutorialUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/onboarding/detailed${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения данных обучения: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        tutorialStarted: this.createOnboardingMetric('tutorial_started', 'Начали туториал',
          'Пользователи, которые начали обучение', data.tutorialStarted),
        tutorialCompleted: this.createOnboardingMetric('tutorial_completed', 'Завершили туториал',
          'Пользователи, которые завершили обучение', data.tutorialCompleted),
        tutorialSkipRate: this.createOnboardingMetric('tutorial_skip_rate', 'Пропустили туториал',
          'Процент пользователей, пропустивших обучение', data.tutorialSkipped),
        signupRate: this.createOnboardingMetric('signup_rate', 'Коэффициент регистрации',
          'Процент регистраций после первого открытия', data.signupRate)
      };
    } catch (error) {
      console.error('Ошибка получения метрик обучения:', error);
      throw error;
    }
  }

  /**
   * Получение метрик геймификации
   */
  async fetchGamificationMetrics(filters?: AnalyticsFilters): Promise<{
    priceStreamConnections: ExpandableMetric<GamificationUserDetail[]>;
    dailyRewardsClaimed: ExpandableMetric<GamificationUserDetail[]>;
    lootboxSpinsStarted: ExpandableMetric<GamificationUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/gamification/detailed${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения данных геймификации: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        priceStreamConnections: this.createPriceStreamMetric('price_stream_connections', 'Подключения к live-ценам',
          'Пользователи, подключившиеся к потоку цен', data.priceStreamConnections),
        dailyRewardsClaimed: this.createGamificationMetric('daily_rewards_claimed', 'Ежедневные награды',
          'Пользователи, получившие ежедневные награды', data.dailyRewards),
        lootboxSpinsStarted: this.createGamificationMetric('lootbox_spins_started', 'Лутбоксы/Спины',
          'Пользователи, открывавшие лутбоксы или крутившие колесо', data.lootboxSpins)
      };
    } catch (error) {
      console.error('Ошибка получения метрик геймификации:', error);
      throw error;
    }
  }

  /**
   * Получение детальных данных торговли для модального окна
   */
  async fetchTradeDetails(metricId: string, userId?: string, filters?: AnalyticsFilters): Promise<TradeDetail[]> {
    try {
      const params = new URLSearchParams(this.buildQueryParams(filters).substring(1));
      if (userId) params.append('userId', userId);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/trading/trades/${metricId}?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения деталей торговли: ${response.status}`);
      }

      const data = await response.json();
      return data.trades || [];
    } catch (error) {
      console.error('Ошибка получения деталей торговли:', error);
      return [];
    }
  }

  /**
   * Экспорт данных метрики
   */
  async exportMetricData(
    metricId: string,
    format: 'csv' | 'xlsx' | 'pdf',
    includeUserDetails = true,
    filters?: AnalyticsFilters
  ): Promise<Blob> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/user-analytics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          metricId,
          format,
          includeUserDetails,
          filters
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка экспорта данных: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Ошибка экспорта данных:', error);
      throw error;
    }
  }

  // Приватные методы для создания метрик

  private createRetentionMetric(
    id: string,
    title: string, 
    description: string,
    data: any
  ): ExpandableMetric<RetentionUserDetail[]> {
    const users: RetentionUserDetail[] = (data?.users || []).map((user: any) => ({
      ...this.mapUserDetail(user),
      daysSinceRegistration: user.daysSinceRegistration || 0,
      returnedOn: new Date(user.returnedOn || Date.now()),
      sessionsAfterReturn: user.sessionsAfterReturn || 0,
      timeSpentAfterReturn: user.timeSpentAfterReturn || 0
    }));

    return {
      id,
      title,
      description,
      value: data?.count || 0,
      formattedValue: `${((data?.percentage || 0) * 100).toFixed(1)}%`,
      icon: 'trending-up',
      change: {
        value: data?.change || 0,
        period: 'за неделю',
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      },
      status: this.getStatus(data?.percentage || 0, 0.4), // 40% хороший retention
      target: data?.target,
      userDetails: users,
      category: 'retention',
      color: '#10B981',
      additionalData: data?.additionalMetrics
    };
  }

  private createEngagementMetric(
    id: string,
    title: string,
    description: string,
    data: any
  ): ExpandableMetric<EngagementUserDetail[]> {
    const users: EngagementUserDetail[] = (data?.users || []).map((user: any) => ({
      ...this.mapUserDetail(user),
      sessionsCount: user.sessionsCount || 0,
      totalSessionDuration: user.totalSessionDuration || 0,
      averageSessionDuration: user.averageSessionDuration || 0,
      screensOpened: user.screensOpened || 0,
      lastSessionDate: new Date(user.lastSessionDate || Date.now()),
      isActiveLastWeek: user.isActiveLastWeek || false,
      isActiveLastMonth: user.isActiveLastMonth || false
    }));

    return {
      id,
      title,
      description,
      value: data?.count || 0,
      formattedValue: this.formatEngagementValue(data?.value || 0, id),
      icon: 'activity',
      change: {
        value: data?.change || 0,
        period: 'за неделю',
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      },
      status: 'neutral',
      target: data?.target,
      userDetails: users,
      category: 'engagement',
      color: '#3B82F6',
      additionalData: data?.charts
    };
  }

  private createTradingMetric(
    id: string,
    title: string,
    description: string,
    data: any
  ): ExpandableMetric<UserDetail[]> {
    return {
      id,
      title,
      description,
      value: data?.count || 0,
      formattedValue: this.formatTradingValue(data?.value || 0, id),
      icon: 'bar-chart-3',
      change: {
        value: data?.change || 0,
        period: 'за неделю',
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      },
      status: this.getStatus(data?.value || 0, 50), // 50% хороший успех
      userDetails: (data?.users || []).map(this.mapUserDetail),
      category: 'trading',
      color: '#8B5CF6',
      additionalData: data?.trades || []
    };
  }

  private createOnboardingMetric(
    id: string,
    title: string,
    description: string,
    data: any
  ): ExpandableMetric<TutorialUserDetail[]> {
    const users: TutorialUserDetail[] = (data?.users || []).map((user: any) => ({
      ...this.mapUserDetail(user),
      tutorialStarted: user.tutorialStarted || false,
      tutorialCompleted: user.tutorialCompleted || false,
      tutorialSkipped: user.tutorialSkipped || false,
      tutorialProgress: user.tutorialProgress || 0,
      tutorialStartDate: user.tutorialStartDate ? new Date(user.tutorialStartDate) : undefined,
      tutorialCompleteDate: user.tutorialCompleteDate ? new Date(user.tutorialCompleteDate) : undefined,
      firstOpenDate: new Date(user.firstOpenDate || user.registrationDate || Date.now()),
      signupAfterFirstOpen: user.signupAfterFirstOpen || false
    }));

    return {
      id,
      title,
      description,
      value: data?.count || 0,
      formattedValue: this.formatOnboardingValue(data?.value || 0, id),
      icon: 'graduation-cap',
      change: {
        value: data?.change || 0,
        period: 'за неделю',
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      },
      status: 'neutral',
      userDetails: users,
      category: 'onboarding',
      color: '#F59E0B'
    };
  }

  private createPriceStreamMetric(
    id: string,
    title: string,
    description: string,
    data: any
  ): ExpandableMetric<GamificationUserDetail[]> {
    const users: GamificationUserDetail[] = (data?.users || []).map((user: any) => ({
      ...this.mapUserDetail(user),
      dailyRewardsClaimedTotal: user.dailyRewardsClaimedTotal || 0,
      dailyRewardsClaimedThisWeek: user.dailyRewardsClaimedThisWeek || 0,
      lootboxesOpened: user.lootboxesOpened || 0,
      spinsCompleted: user.spinsCompleted || 0,
      lastRewardClaimedDate: user.lastRewardClaimedDate ? new Date(user.lastRewardClaimedDate) : undefined,
      totalRewardsValue: user.totalRewardsValue || 0
    }));

    return {
      id,
      title,
      description,
      value: data?.count || 0,
      formattedValue: data?.count?.toLocaleString() || '0',
      icon: 'wifi',
      change: {
        value: data?.change || 0,
        period: 'за неделю',
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      },
      status: 'neutral',
      userDetails: users,
      category: 'gamification',
      color: '#EC4899'
    };
  }

  private createGamificationMetric(
    id: string,
    title: string,
    description: string,
    data: any
  ): ExpandableMetric<GamificationUserDetail[]> {
    const users: GamificationUserDetail[] = (data?.users || []).map((user: any) => ({
      ...this.mapUserDetail(user),
      dailyRewardsClaimedTotal: user.dailyRewardsClaimedTotal || 0,
      dailyRewardsClaimedThisWeek: user.dailyRewardsClaimedThisWeek || 0,
      lootboxesOpened: user.lootboxesOpened || 0,
      spinsCompleted: user.spinsCompleted || 0,
      lastRewardClaimedDate: user.lastRewardClaimedDate ? new Date(user.lastRewardClaimedDate) : undefined,
      totalRewardsValue: user.totalRewardsValue || 0
    }));

    return {
      id,
      title,
      description,
      value: data?.count || 0,
      formattedValue: data?.count?.toLocaleString() || '0',
      icon: 'gift',
      change: {
        value: data?.change || 0,
        period: 'за неделю',
        trend: data?.change > 0 ? 'up' : data?.change < 0 ? 'down' : 'stable'
      },
      status: 'neutral',
      userDetails: users,
      category: 'gamification',
      color: '#EC4899'
    };
  }

  // Утилиты

  private mapUserDetail(user: any): UserDetail {
    return {
      id: user.id || user.userId || `user_${Date.now()}`,
      email: user.email || 'unknown@example.com',
      username: user.username || user.firstName,
      avatar: user.profileImageUrl,
      registrationDate: new Date(user.createdAt || user.registrationDate || Date.now()),
      lastActiveDate: new Date(user.lastActiveDate || user.updatedAt || Date.now()),
      totalRevenue: user.totalRevenue || 0,
      premiumStatus: user.isPremium || false,
      region: user.region || 'Unknown',
      device: user.device || 'desktop',
      source: user.source || 'direct'
    };
  }

  private formatEngagementValue(value: number, metricId: string): string {
    switch (metricId) {
      case 'avg_session_duration':
        if (value >= 3600) return `${(value / 3600).toFixed(1)}ч`;
        if (value >= 60) return `${(value / 60).toFixed(0)}м`;
        return `${value.toFixed(0)}с`;
      case 'sessions_per_user':
        return value.toFixed(1);
      default:
        return value.toLocaleString();
    }
  }

  private formatTradingValue(value: number, metricId: string): string {
    if (metricId === 'successful_trades_percent') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
  }

  private formatOnboardingValue(value: number, metricId: string): string {
    if (metricId.includes('rate') || metricId.includes('percent')) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
  }

  private getStatus(value: number, threshold: number): 'success' | 'warning' | 'error' | 'neutral' {
    if (value >= threshold) return 'success';
    if (value >= threshold * 0.7) return 'warning';
    if (value < threshold * 0.5) return 'error';
    return 'neutral';
  }

  private buildQueryParams(filters?: AnalyticsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();
    
    if (filters.dateRange) {
      params.append('startDate', filters.dateRange.start.toISOString());
      params.append('endDate', filters.dateRange.end.toISOString());
    }
    
    if (filters.userSegment && filters.userSegment !== 'all') {
      params.append('segment', filters.userSegment);
    }
    
    if (filters.region && filters.region.length > 0) {
      params.append('regions', filters.region.join(','));
    }
    
    if (filters.device && filters.device.length > 0) {
      params.append('devices', filters.device.join(','));
    }
    
    if (filters.source && filters.source.length > 0) {
      params.append('sources', filters.source.join(','));
    }

    return params.toString() ? `?${params.toString()}` : '';
  }

  private transformApiDataToMetrics(data: any): UserAnalyticsMetrics {
    // Это будет заполнено после создания API endpoints
    return data as UserAnalyticsMetrics;
  }
}

export const realUserAnalyticsService = new RealUserAnalyticsService();
export default realUserAnalyticsService;
