import { db } from '../db.js';
import { adPerformanceMetrics, adSessions, users } from '../../shared/schema.js';
import { eq, and, gte, lte, desc, asc, count, sum, sql } from 'drizzle-orm';
import { adService, AdAnalytics } from './adService.js';

export interface AdNetworkConfig {
  id: string;
  name: string;
  type: 'google_admob' | 'google_adsense' | 'unity_ads' | 'facebook_ads' | 'applovin' | 'ironsource';
  isActive: boolean;
  credentials: {
    appId?: string;
    unitId?: string;
    clientId?: string;
    secretKey?: string;
    publisherId?: string;
  };
  settings: {
    adTypes: ('rewarded_video' | 'interstitial' | 'banner' | 'native')[];
    placements: ('task_completion' | 'wheel_spin' | 'box_opening' | 'trading_bonus' | 'screen_transition')[];
    revenueShare: number; // Percentage
    priority: number; // 1-10, higher is better
    minWatchTime: number; // milliseconds
    maxSessionsPerHour: number;
    maxRewardsPerDay: number;
  };
  performance: {
    fillRate: number;
    ctr: number; // Click-through rate
    ecpm: number; // Effective CPM
    revenue: string;
    impressions: number;
    clicks: number;
  };
}

export interface AdCampaign {
  id: string;
  name: string;
  type: 'user_acquisition' | 'monetization' | 'retention';
  status: 'active' | 'paused' | 'completed' | 'draft';
  networks: string[]; // Network IDs
  targetAudience: {
    countries: string[];
    ageRange: [number, number];
    interests: string[];
    isPremium?: boolean;
  };
  budget: {
    total: number;
    daily: number;
    spent: number;
    currency: string;
  };
  schedule: {
    startDate: string;
    endDate?: string;
    timezone: string;
  };
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number; // Cost per acquisition
    roas: number; // Return on ad spend
    revenue: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdPerformanceData {
  date: string;
  impressions: number;
  completions: number;
  rewards: number;
  fraudAttempts: number;
  totalWatchTime: number;
  revenue: string;
  completionRate: number;
  fraudRate: number;
  averageWatchTime: number;
  rewardAmount: string;
}

export interface AdManagementOverview {
  networks: {
    total: number;
    active: number;
    totalRevenue: string;
    topPerformer: string;
  };
  campaigns: {
    total: number;
    active: number;
    totalSpend: string;
    totalRevenue: string;
    averageROAS: number;
  };
  performance: {
    totalImpressions: number;
    totalCompletions: number;
    totalRewards: number;
    totalFraudAttempts: number;
    averageCompletionRate: number;
    averageFraudRate: number;
    totalRevenue: string;
  };
  insights: {
    topPerformingNetwork: string;
    bestCTRCampaign: string;
    highestROASCampaign: string;
    mostFraudulentPlacement: string;
  };
}

export class AdminAdManagementService {

  /**
   * Получить список всех кампаний (instance method for routes)
   */
  async getCampaigns(): Promise<AdCampaign[]> {
    return AdminAdManagementService.getAdCampaigns();
  }

  /**
   * Получить статистику кампаний (instance method for routes)
   */
  async getCampaignStats(timeRange: string = '7d'): Promise<any> {
    try {
      const campaigns = await this.getCampaigns();
      const networks = await AdminAdManagementService.getAdNetworks();
      
      // Calculate stats based on time range
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      const totalSpend = campaigns.reduce((sum, c) => sum + c.budget.spent, 0);
      const totalRevenue = campaigns.reduce((sum, c) => sum + parseFloat(c.performance.revenue), 0);
      const totalImpressions = campaigns.reduce((sum, c) => sum + c.performance.impressions, 0);
      const totalClicks = campaigns.reduce((sum, c) => sum + c.performance.clicks, 0);
      
      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: activeCampaigns.length,
        totalSpend: totalSpend.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        totalImpressions,
        totalClicks,
        averageCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
        averageROAS: campaigns.length > 0 ? (campaigns.reduce((sum, c) => sum + c.performance.roas, 0) / campaigns.length).toFixed(2) : '0.00',
        timeRange
      };
    } catch (error) {
      console.error('Error getting campaign stats:', error);
      throw new Error('Failed to get campaign stats');
    }
  }

  /**
   * Создать кампанию (instance method for routes)
   */
  async createCampaign(campaignData: any): Promise<any> {
    return AdminAdManagementService.createAdCampaign(campaignData);
  }

  /**
   * Получить производительность кампании (instance method for routes)
   */
  async getCampaignPerformance(campaignId: string, timeRange: string = '7d'): Promise<any> {
    try {
      const campaigns = await this.getCampaigns();
      const campaign = campaigns.find(c => c.id === campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Return campaign performance data
      return {
        campaignId,
        timeRange,
        performance: campaign.performance,
        budget: campaign.budget,
        status: campaign.status
      };
    } catch (error) {
      console.error('Error getting campaign performance:', error);
      throw new Error('Failed to get campaign performance');
    }
  }

  /**
   * Получить обзор Ad Management System
   */
  static async getAdManagementOverview(): Promise<AdManagementOverview> {
    try {
      // Получаем данные из существующего adService
      const monthlyAnalytics = await adService.getAnalytics('month');
      
      // Получаем данные сетей (заглушка - в будущем из БД)
      const networks = await this.getAdNetworks();
      
      // Получаем данные кампаний (заглушка - в будущем из БД)
      const campaigns = await this.getAdCampaigns();

      // Вычисляем статистику сетей
      const activeNetworks = networks.filter(n => n.isActive);
      const totalNetworkRevenue = networks.reduce((sum, n) => sum + parseFloat(n.performance.revenue), 0);
      const topPerformer = networks.sort((a, b) => parseFloat(b.performance.revenue) - parseFloat(a.performance.revenue))[0];

      // Вычисляем статистику кампаний
      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      const totalSpend = campaigns.reduce((sum, c) => sum + c.budget.spent, 0);
      const totalCampaignRevenue = campaigns.reduce((sum, c) => sum + parseFloat(c.performance.revenue), 0);
      const averageROAS = campaigns.length > 0 
        ? campaigns.reduce((sum, c) => sum + c.performance.roas, 0) / campaigns.length 
        : 0;

      // Получаем инсайты
      const insights = await this.getAdInsights();

      return {
        networks: {
          total: networks.length,
          active: activeNetworks.length,
          totalRevenue: totalNetworkRevenue.toFixed(2),
          topPerformer: topPerformer?.name || 'N/A'
        },
        campaigns: {
          total: campaigns.length,
          active: activeCampaigns.length,
          totalSpend: totalSpend.toFixed(2),
          totalRevenue: totalCampaignRevenue.toFixed(2),
          averageROAS: averageROAS
        },
        performance: {
          totalImpressions: monthlyAnalytics.impressions,
          totalCompletions: monthlyAnalytics.completions,
          totalRewards: monthlyAnalytics.rewards,
          totalFraudAttempts: 0, // Добавим в будущем
          averageCompletionRate: monthlyAnalytics.completionRate,
          averageFraudRate: monthlyAnalytics.fraudRate,
          totalRevenue: monthlyAnalytics.revenue.toFixed(2)
        },
        insights: insights
      };

    } catch (error) {
      console.error('Error getting ad management overview:', error);
      throw new Error('Failed to get ad management overview');
    }
  }

  /**
   * Получить конфигурации рекламных сетей
   */
  static async getAdNetworks(): Promise<AdNetworkConfig[]> {
    try {
      // Заглушка - в будущем будет читать из БД
      return [
        {
          id: 'google_admob',
          name: 'Google AdMob',
          type: 'google_admob',
          isActive: true,
          credentials: {
            appId: 'ca-app-pub-3940256099942544~3347511713',
            unitId: 'ca-app-pub-3940256099942544/5224354917'
          },
          settings: {
            adTypes: ['rewarded_video', 'interstitial', 'banner'],
            placements: ['task_completion', 'wheel_spin', 'trading_bonus'],
            revenueShare: 70,
            priority: 9,
            minWatchTime: 15000,
            maxSessionsPerHour: 10,
            maxRewardsPerDay: 50
          },
          performance: {
            fillRate: 95.5,
            ctr: 3.2,
            ecpm: 12.50,
            revenue: '2450.75',
            impressions: 15420,
            clicks: 493
          }
        },
        {
          id: 'unity_ads',
          name: 'Unity Ads',
          type: 'unity_ads',
          isActive: true,
          credentials: {
            appId: '1234567',
            unitId: 'rewardedVideo'
          },
          settings: {
            adTypes: ['rewarded_video', 'interstitial'],
            placements: ['task_completion', 'box_opening'],
            revenueShare: 65,
            priority: 7,
            minWatchTime: 15000,
            maxSessionsPerHour: 8,
            maxRewardsPerDay: 40
          },
          performance: {
            fillRate: 88.2,
            ctr: 2.8,
            ecpm: 8.75,
            revenue: '1320.40',
            impressions: 9876,
            clicks: 276
          }
        },
        {
          id: 'applovin',
          name: 'AppLovin MAX',
          type: 'applovin',
          isActive: false,
          credentials: {
            appId: 'abc123def456',
            secretKey: 'secret_key_here'
          },
          settings: {
            adTypes: ['rewarded_video', 'banner'],
            placements: ['screen_transition'],
            revenueShare: 60,
            priority: 5,
            minWatchTime: 12000,
            maxSessionsPerHour: 15,
            maxRewardsPerDay: 60
          },
          performance: {
            fillRate: 0,
            ctr: 0,
            ecpm: 0,
            revenue: '0',
            impressions: 0,
            clicks: 0
          }
        }
      ];
    } catch (error) {
      console.error('Error getting ad networks:', error);
      throw new Error('Failed to get ad networks');
    }
  }

  /**
   * Обновить конфигурацию рекламной сети
   */
  static async updateAdNetwork(networkId: string, config: Partial<AdNetworkConfig>): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Updating ad network ${networkId} with config:`, config);
      
      // TODO: Реальное обновление в БД
      // 1. Валидировать конфигурацию
      // 2. Обновить запись в ad_networks таблице
      // 3. Обновить настройки в соответствующих SDK
      
      return {
        success: true,
        message: `Ad network ${networkId} updated successfully`
      };
    } catch (error) {
      console.error('Error updating ad network:', error);
      throw new Error('Failed to update ad network');
    }
  }

  /**
   * Получить рекламные кампании
   */
  static async getAdCampaigns(): Promise<AdCampaign[]> {
    try {
      // Заглушка - в будущем будет читать из БД
      return [
        {
          id: 'campaign_1',
          name: 'User Acquisition - Q4',
          type: 'user_acquisition',
          status: 'active',
          networks: ['google_admob', 'unity_ads'],
          targetAudience: {
            countries: ['US', 'CA', 'GB', 'AU'],
            ageRange: [18, 45],
            interests: ['trading', 'cryptocurrency', 'finance'],
            isPremium: false
          },
          budget: {
            total: 10000,
            daily: 100,
            spent: 3450.75,
            currency: 'USD'
          },
          schedule: {
            startDate: '2024-10-01',
            endDate: '2024-12-31',
            timezone: 'UTC'
          },
          performance: {
            impressions: 125000,
            clicks: 3750,
            conversions: 187,
            ctr: 3.0,
            cpa: 18.45,
            roas: 2.8,
            revenue: '9662.10'
          },
          createdAt: '2024-09-15T10:00:00Z',
          updatedAt: '2024-09-18T14:30:00Z'
        },
        {
          id: 'campaign_2',
          name: 'Premium Monetization',
          type: 'monetization',
          status: 'active',
          networks: ['google_admob'],
          targetAudience: {
            countries: ['US', 'GB', 'DE', 'FR'],
            ageRange: [25, 55],
            interests: ['premium', 'trading', 'investment'],
            isPremium: false
          },
          budget: {
            total: 5000,
            daily: 50,
            spent: 1275.30,
            currency: 'USD'
          },
          schedule: {
            startDate: '2024-09-01',
            timezone: 'UTC'
          },
          performance: {
            impressions: 87500,
            clicks: 2100,
            conversions: 42,
            ctr: 2.4,
            cpa: 30.36,
            roas: 4.2,
            revenue: '5356.26'
          },
          createdAt: '2024-08-25T09:00:00Z',
          updatedAt: '2024-09-18T12:15:00Z'
        }
      ];
    } catch (error) {
      console.error('Error getting ad campaigns:', error);
      throw new Error('Failed to get ad campaigns');
    }
  }

  /**
   * Создать новую рекламную кампанию
   */
  static async createAdCampaign(campaign: Omit<AdCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; campaignId: string; message: string }> {
    try {
      const campaignId = `campaign_${Date.now()}`;
      console.log(`Creating ad campaign ${campaignId}:`, campaign);
      
      // TODO: Реальное создание в БД
      // 1. Валидировать данные кампании
      // 2. Создать запись в ad_campaigns таблице
      // 3. Настроить таргетинг в рекламных сетях
      
      return {
        success: true,
        campaignId,
        message: 'Ad campaign created successfully'
      };
    } catch (error) {
      console.error('Error creating ad campaign:', error);
      throw new Error('Failed to create ad campaign');
    }
  }

  /**
   * Получить данные производительности рекламы
   */
  static async getAdPerformanceData(days: number = 30): Promise<{ data: AdPerformanceData[]; summary: any }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const result = await db.execute(sql`
        SELECT 
          date,
          SUM(impressions) as impressions,
          SUM(completions) as completions,
          SUM(rewards) as rewards,
          SUM(fraud_attempts) as fraud_attempts,
          SUM(total_watch_time) as total_watch_time,
          SUM(revenue::DECIMAL) as revenue
        FROM ad_performance_metrics
        WHERE date >= ${startDate} AND date <= ${endDate}
        GROUP BY date
        ORDER BY date ASC
      `);

      const data = (result.rows || []).map((row: any) => {
        const impressions = Number(row.impressions || 0);
        const completions = Number(row.completions || 0);
        const totalWatchTime = Number(row.total_watch_time || 0);
        
        return {
          date: this.formatDate(row.date),
          impressions,
          completions,
          rewards: Number(row.rewards || 0),
          fraudAttempts: Number(row.fraud_attempts || 0),
          totalWatchTime,
          revenue: String(row.revenue || '0'),
          completionRate: impressions > 0 ? (completions / impressions) * 100 : 0,
          fraudRate: Number(row.fraud_attempts || 0) / Math.max(impressions, 1) * 100,
          averageWatchTime: completions > 0 ? totalWatchTime / completions : 0,
          rewardAmount: String((Number(row.revenue || 0) * 0.1).toFixed(2)) // Estimated reward amount
        };
      });

      // Вычисляем сводную статистику
      const summary = data.reduce((acc, day) => ({
        totalImpressions: acc.totalImpressions + day.impressions,
        totalCompletions: acc.totalCompletions + day.completions,
        totalRewards: acc.totalRewards + day.rewards,
        totalFraudAttempts: acc.totalFraudAttempts + day.fraudAttempts,
        totalWatchTime: acc.totalWatchTime + day.totalWatchTime,
        totalRevenue: acc.totalRevenue + parseFloat(day.revenue),
        daysAnalyzed: acc.daysAnalyzed + 1
      }), {
        totalImpressions: 0,
        totalCompletions: 0,
        totalRewards: 0,
        totalFraudAttempts: 0,
        totalWatchTime: 0,
        totalRevenue: 0,
        daysAnalyzed: 0
      });

      // Добавляем средние значения
      const enhancedSummary = {
        ...summary,
        averageCompletionRate: summary.totalImpressions > 0 ? (summary.totalCompletions / summary.totalImpressions) * 100 : 0,
        averageFraudRate: summary.totalImpressions > 0 ? (summary.totalFraudAttempts / summary.totalImpressions) * 100 : 0,
        averageRevenuePerDay: summary.daysAnalyzed > 0 ? summary.totalRevenue / summary.daysAnalyzed : 0,
        totalRevenueFormatted: summary.totalRevenue.toFixed(2)
      };

      return { data, summary: enhancedSummary };

    } catch (error) {
      console.error('Error getting ad performance data:', error);
      return { 
        data: [],
        summary: {
          totalImpressions: 0,
          totalCompletions: 0,
          totalRewards: 0,
          totalFraudAttempts: 0,
          totalWatchTime: 0,
          totalRevenueFormatted: '0.00',
          averageCompletionRate: 0,
          averageFraudRate: 0,
          daysAnalyzed: 0
        }
      };
    }
  }

  /**
   * Получить инсайты по рекламе
   */
  static async getAdInsights(): Promise<{
    topPerformingNetwork: string;
    bestCTRCampaign: string;
    highestROASCampaign: string;
    mostFraudulentPlacement: string;
  }> {
    try {
      const networks = await this.getAdNetworks();
      const campaigns = await this.getAdCampaigns();

      // Находим топ-сети и кампании
      const topNetwork = networks
        .sort((a, b) => parseFloat(b.performance.revenue) - parseFloat(a.performance.revenue))[0];
      
      const bestCTRCampaign = campaigns
        .sort((a, b) => b.performance.ctr - a.performance.ctr)[0];
      
      const highestROASCampaign = campaigns
        .sort((a, b) => b.performance.roas - a.performance.roas)[0];

      return {
        topPerformingNetwork: topNetwork?.name || 'N/A',
        bestCTRCampaign: bestCTRCampaign?.name || 'N/A',
        highestROASCampaign: highestROASCampaign?.name || 'N/A',
        mostFraudulentPlacement: 'task_completion' // Заглушка
      };
    } catch (error) {
      console.error('Error getting ad insights:', error);
      return {
        topPerformingNetwork: 'N/A',
        bestCTRCampaign: 'N/A',
        highestROASCampaign: 'N/A',
        mostFraudulentPlacement: 'N/A'
      };
    }
  }

  /**
   * Синхронизировать рекламные сети
   */
  static async syncAdNetworks(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Syncing ad networks...');
      
      // TODO:
      // 1. Обновить статистику производительности из API сетей
      // 2. Синхронизировать настройки плейсментов
      // 3. Обновить revenue данные
      
      return {
        success: true,
        message: 'Ad networks synchronized successfully'
      };
    } catch (error) {
      console.error('Error syncing ad networks:', error);
      throw new Error('Failed to sync ad networks');
    }
  }

  /**
   * Форматирование даты
   */
  private static formatDate(date: any): string {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      return d.toISOString().split('T')[0]; // YYYY-MM-DD формат
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }
}