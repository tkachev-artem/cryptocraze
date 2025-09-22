import { config } from '../lib/config';
import {
  UserAnalyticsMetrics,
  ExpandableMetric,
  UserDetail,
  RetentionUserDetail,
  EngagementUserDetail,
  RevenueUserDetail,
  AcquisitionUserDetail,
  AnalyticsFilters
} from '../types/userAnalytics';

/**
 * Современный сервис для аналитики пользователей
 * Обеспечивает получение детальных данных для каждой метрики
 */
class ModernUserAnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Получение всех метрик с детальными данными пользователей
   */
  async fetchAllMetrics(filters?: AnalyticsFilters): Promise<UserAnalyticsMetrics> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/all${params}`, {
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
   * Получение детальных данных для конкретной метрики
   */
  async fetchMetricDetails<T extends UserDetail>(
    metricId: string, 
    filters?: AnalyticsFilters
  ): Promise<T[]> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/metric/${metricId}/details${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения деталей метрики: ${response.status}`);
      }

      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Ошибка получения деталей метрики:', error);
      return [];
    }
  }

  /**
   * Получение данных о retention с пользователями
   */
  async fetchRetentionMetrics(filters?: AnalyticsFilters): Promise<{
    day1Retention: ExpandableMetric<RetentionUserDetail[]>;
    day7Retention: ExpandableMetric<RetentionUserDetail[]>;
    day30Retention: ExpandableMetric<RetentionUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/retention${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения retention данных: ${response.status}`);
      }

      const data = await response.json();
      return {
        day1Retention: this.transformToExpandableMetric(data.day1, 'retention', 'День 1 - Возврат'),
        day7Retention: this.transformToExpandableMetric(data.day7, 'retention', 'День 7 - Возврат'),
        day30Retention: this.transformToExpandableMetric(data.day30, 'retention', 'День 30 - Возврат')
      };
    } catch (error) {
      console.error('Ошибка получения retention метрик:', error);
      throw error;
    }
  }

  /**
   * Получение данных о engagement с пользователями
   */
  async fetchEngagementMetrics(filters?: AnalyticsFilters): Promise<{
    activeUsers: ExpandableMetric<EngagementUserDetail[]>;
    sessionDuration: ExpandableMetric<EngagementUserDetail[]>;
    featureAdoption: ExpandableMetric<EngagementUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/engagement${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения engagement данных: ${response.status}`);
      }

      const data = await response.json();
      return {
        activeUsers: this.transformToExpandableMetric(data.activeUsers, 'engagement', 'Активные пользователи'),
        sessionDuration: this.transformToExpandableMetric(data.sessionDuration, 'engagement', 'Длительность сессий'),
        featureAdoption: this.transformToExpandableMetric(data.featureAdoption, 'engagement', 'Принятие функций')
      };
    } catch (error) {
      console.error('Ошибка получения engagement метрик:', error);
      throw error;
    }
  }

  /**
   * Получение данных о revenue с пользователями
   */
  async fetchRevenueMetrics(filters?: AnalyticsFilters): Promise<{
    arpu: ExpandableMetric<RevenueUserDetail[]>;
    ltv: ExpandableMetric<RevenueUserDetail[]>;
    conversionRate: ExpandableMetric<RevenueUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/revenue${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения revenue данных: ${response.status}`);
      }

      const data = await response.json();
      return {
        arpu: this.transformToExpandableMetric(data.arpu, 'revenue', 'ARPU'),
        ltv: this.transformToExpandableMetric(data.ltv, 'revenue', 'LTV'),
        conversionRate: this.transformToExpandableMetric(data.conversionRate, 'revenue', 'Конверсия в оплату')
      };
    } catch (error) {
      console.error('Ошибка получения revenue метрик:', error);
      throw error;
    }
  }

  /**
   * Получение данных о acquisition с пользователями
   */
  async fetchAcquisitionMetrics(filters?: AnalyticsFilters): Promise<{
    newUsers: ExpandableMetric<AcquisitionUserDetail[]>;
    acquisitionCost: ExpandableMetric<AcquisitionUserDetail[]>;
    organicGrowth: ExpandableMetric<AcquisitionUserDetail[]>;
  }> {
    try {
      const params = this.buildQueryParams(filters);
      
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/acquisition${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения acquisition данных: ${response.status}`);
      }

      const data = await response.json();
      return {
        newUsers: this.transformToExpandableMetric(data.newUsers, 'acquisition', 'Новые пользователи'),
        acquisitionCost: this.transformToExpandableMetric(data.acquisitionCost, 'acquisition', 'CAC'),
        organicGrowth: this.transformToExpandableMetric(data.organicGrowth, 'acquisition', 'Органический рост')
      };
    } catch (error) {
      console.error('Ошибка получения acquisition метрик:', error);
      throw error;
    }
  }

  /**
   * Экспорт данных
   */
  async exportMetricData(
    metricId: string,
    format: 'csv' | 'xlsx' | 'pdf',
    includeUserDetails = true
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/modern/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          metricId,
          format,
          includeUserDetails
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

  /**
   * Построение параметров запроса
   */
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

  /**
   * Преобразование API данных в объект метрики
   */
  private transformToExpandableMetric<T extends UserDetail>(
    data: any, 
    category: ExpandableMetric['category'],
    title: string
  ): ExpandableMetric<T[]> {
    return {
      id: data.id || `${category}_metric`,
      title,
      description: data.description || '',
      value: data.value || 0,
      formattedValue: data.formattedValue || '0',
      icon: data.icon || 'users',
      change: data.change,
      status: data.status || 'neutral',
      target: data.target,
      userDetails: data.userDetails || [],
      category,
      color: this.getCategoryColor(category),
      sparkline: data.sparkline
    };
  }

  /**
   * Преобразование API данных в полный объект метрик
   */
  private transformApiDataToMetrics(data: any): UserAnalyticsMetrics {
    // Здесь будет реализована логика преобразования API данных
    // в структуру UserAnalyticsMetrics
    // Пока что возвращаем заглушку, которая будет заменена на реальные данные
    
    return data as UserAnalyticsMetrics;
  }

  /**
   * Получение цвета по категории
   */
  private getCategoryColor(category: ExpandableMetric['category']): string {
    const colors = {
      retention: '#10B981',
      engagement: '#3B82F6', 
      revenue: '#F59E0B',
      acquisition: '#8B5CF6',
      behavior: '#EF4444'
    };
    
    return colors[category] || '#6B7280';
  }

  /**
   * Валидация данных пользователя
   */
  private validateUserDetails(users: any[]): UserDetail[] {
    return users.map(user => ({
      id: user.id || `user_${Date.now()}`,
      email: user.email || 'unknown@example.com',
      username: user.username,
      avatar: user.avatar,
      registrationDate: new Date(user.registrationDate || Date.now()),
      lastActiveDate: new Date(user.lastActiveDate || Date.now()),
      totalRevenue: user.totalRevenue || 0,
      premiumStatus: user.premiumStatus || false,
      region: user.region || 'Unknown',
      device: user.device || 'desktop',
      source: user.source || 'unknown'
    }));
  }

  /**
   * Получение статистики в реальном времени
   */
  async fetchRealtimeStats(): Promise<{
    activeUsers: number;
    activeTrades: number;
    totalRevenue: number;
    newRegistrations: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/realtime`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Ошибка получения статистики в реальном времени: ${response.status}`);
      }

      const data = await response.json();
      return {
        activeUsers: data.activeUsers || 0,
        activeTrades: data.activeTrades || 0,
        totalRevenue: data.totalRevenue || 0,
        newRegistrations: data.newRegistrations || 0
      };
    } catch (error) {
      console.error('Ошибка получения статистики в реальном времени:', error);
      return {
        activeUsers: 0,
        activeTrades: 0,
        totalRevenue: 0,
        newRegistrations: 0
      };
    }
  }
}

export const modernUserAnalyticsService = new ModernUserAnalyticsService();
export default modernUserAnalyticsService;
