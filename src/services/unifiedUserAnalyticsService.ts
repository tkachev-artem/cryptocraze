import { config } from '../lib/config';

// Unified interfaces for user analytics data
export interface UnifiedUserAnalyticsData {
  retention: {
    overview: {
      day1Retention: number;
      day7Retention: number;
      day30Retention: number;
      churnRate: number;
      averageLifetime: number;
    };
    cohorts: CohortData[];
    churnPrediction: ChurnData[];
    retentionTrends: TimeSeriesData[];
  };
  engagement: {
    sessions: {
      total: number;
      avgPerUser: number;
      avgDuration: number;
      bounceRate: number;
    };
    gameMetrics: {
      dailyRewardClaimed: number;
      lootBoxOpened: number;
      wheelSpins: number;
      achievementsUnlocked: number;
      proModeActivations: number;
      energySpent: number;
    };
    screenActivity: {
      dashboard: number;
      trading: number;
      rewards: number;
      profile: number;
      trials: number;
      premium: number;
    };
    tradingBehavior: {
      tradesPerUser: number;
      avgVirtualBalanceUsed: number;
      priceStreamConnections: number;
      avgTradeHoldTime: number;
      profitableTradesRatio: number;
    };
    timeBasedMetrics: {
      peakHours: { hour: number; sessions: number }[];
      weekdayVsWeekend: {
        weekdays: { sessions: number; avgDuration: number };
        weekends: { sessions: number; avgDuration: number };
      };
    };
  };
}

export interface CohortData {
  cohortMonth: string;
  users: number;
  retention: {
    week1: number;
    week2: number;
    week4: number;
    week8: number;
    week12: number;
  };
}

export interface ChurnData {
  segment: string;
  churnRisk: 'low' | 'medium' | 'high';
  users: number;
  probability: number;
  factors: string[];
}

export interface TimeSeriesData {
  date: string;
  day1: number;
  day7: number;
  day30: number;
}

class UnifiedUserAnalyticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Fetch unified user analytics data combining retention and engagement metrics
   */
  async fetchUnifiedData(): Promise<UnifiedUserAnalyticsData> {
    try {
      const [retentionData, engagementData] = await Promise.allSettled([
        this.fetchRetentionData(),
        this.fetchEngagementData()
      ]);

      // Combine all data into unified structure
      const unifiedData: UnifiedUserAnalyticsData = {
        retention: this.extractRetentionData(retentionData),
        engagement: this.extractEngagementData(engagementData)
      };

      return unifiedData;
    } catch (error) {
      console.error('Error fetching unified user analytics data:', error);
      throw new Error('Failed to fetch unified user analytics data');
    }
  }

  /**
   * Fetch retention data from retention API
   */
  private async fetchRetentionData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/analytics/retention`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch retention data: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetch engagement data from engagement API
   */
  private async fetchEngagementData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/analytics/engagement`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch engagement data: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Extract retention data from API response
   */
  private extractRetentionData(retentionData: any): UnifiedUserAnalyticsData['retention'] {
    if (retentionData.status === 'rejected' || !retentionData.value) {
      return {
        overview: {
          day1Retention: 0,
          day7Retention: 0,
          day30Retention: 0,
          churnRate: 0,
          averageLifetime: 0
        },
        cohorts: [],
        churnPrediction: [],
        retentionTrends: []
      };
    }

    const data = retentionData.value;
    return {
      overview: {
        day1Retention: data.overview?.day1Retention || 0,
        day7Retention: data.overview?.day7Retention || 0,
        day30Retention: data.overview?.day30Retention || 0,
        churnRate: data.overview?.churnRate || 0,
        averageLifetime: data.overview?.averageLifetime || 0
      },
      cohorts: data.cohorts || [],
      churnPrediction: data.churnPrediction || [],
      retentionTrends: data.retentionTrends || []
    };
  }

  /**
   * Extract engagement data from API response
   */
  private extractEngagementData(engagementData: any): UnifiedUserAnalyticsData['engagement'] {
    if (engagementData.status === 'rejected' || !engagementData.value) {
      return {
        sessions: {
          total: 0,
          avgPerUser: 0,
          avgDuration: 0,
          bounceRate: 0
        },
        gameMetrics: {
          dailyRewardClaimed: 0,
          lootBoxOpened: 0,
          wheelSpins: 0,
          achievementsUnlocked: 0,
          proModeActivations: 0,
          energySpent: 0
        },
        screenActivity: {
          dashboard: 0,
          trading: 0,
          rewards: 0,
          profile: 0,
          trials: 0,
          premium: 0
        },
        tradingBehavior: {
          tradesPerUser: 0,
          avgVirtualBalanceUsed: 0,
          priceStreamConnections: 0,
          avgTradeHoldTime: 0,
          profitableTradesRatio: 0
        },
        timeBasedMetrics: {
          peakHours: [],
          weekdayVsWeekend: {
            weekdays: { sessions: 0, avgDuration: 0 },
            weekends: { sessions: 0, avgDuration: 0 }
          }
        }
      };
    }

    const data = engagementData.value;
    return {
      sessions: {
        total: data.sessions?.total || 0,
        avgPerUser: data.sessions?.avgPerUser || 0,
        avgDuration: data.sessions?.avgDuration || 0,
        bounceRate: data.sessions?.bounceRate || 0
      },
      gameMetrics: {
        dailyRewardClaimed: data.gameMetrics?.dailyRewardClaimed || 0,
        lootBoxOpened: data.gameMetrics?.lootBoxOpened || 0,
        wheelSpins: data.gameMetrics?.wheelSpins || 0,
        achievementsUnlocked: data.gameMetrics?.achievementsUnlocked || 0,
        proModeActivations: data.gameMetrics?.proModeActivations || 0,
        energySpent: data.gameMetrics?.energySpent || 0
      },
      screenActivity: {
        dashboard: data.screenActivity?.dashboard || 0,
        trading: data.screenActivity?.trading || 0,
        rewards: data.screenActivity?.rewards || 0,
        profile: data.screenActivity?.profile || 0,
        trials: data.screenActivity?.trials || 0,
        premium: data.screenActivity?.premium || 0
      },
      tradingBehavior: {
        tradesPerUser: data.tradingBehavior?.tradesPerUser || 0,
        avgVirtualBalanceUsed: data.tradingBehavior?.avgVirtualBalanceUsed || 0,
        priceStreamConnections: data.tradingBehavior?.priceStreamConnections || 0,
        avgTradeHoldTime: data.tradingBehavior?.avgTradeHoldTime || 0,
        profitableTradesRatio: data.tradingBehavior?.profitableTradesRatio || 0
      },
      timeBasedMetrics: {
        peakHours: data.timeBasedMetrics?.peakHours || [],
        weekdayVsWeekend: {
          weekdays: data.timeBasedMetrics?.weekdayVsWeekend?.weekdays || { sessions: 0, avgDuration: 0 },
          weekends: data.timeBasedMetrics?.weekdayVsWeekend?.weekends || { sessions: 0, avgDuration: 0 }
        }
      }
    };
  }

  /**
   * Fetch detailed cohort analysis
   */
  async fetchCohortAnalysis(): Promise<CohortData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/retention/cohorts`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch cohort analysis: ${response.status}`);
      }

      const data = await response.json();
      return data.cohorts || [];
    } catch (error) {
      console.error('Error fetching cohort analysis:', error);
      return [];
    }
  }

  /**
   * Fetch churn prediction data
   */
  async fetchChurnPrediction(): Promise<ChurnData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/retention/churn-prediction`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch churn prediction: ${response.status}`);
      }

      const data = await response.json();
      return data.churnPrediction || [];
    } catch (error) {
      console.error('Error fetching churn prediction:', error);
      return [];
    }
  }

  /**
   * Fetch session analytics
   */
  async fetchSessionAnalytics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/engagement/sessions`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch session analytics: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session analytics:', error);
      return null;
    }
  }

  /**
   * Fetch game metrics
   */
  async fetchGameMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/engagement/game-metrics`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game metrics: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching game metrics:', error);
      return null;
    }
  }

  /**
   * Export user analytics report
   */
  async exportUserAnalyticsReport(format: 'csv' | 'pdf' | 'json'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/analytics/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ format, type: 'user-analytics' })
      });

      if (!response.ok) {
        throw new Error(`Failed to export user analytics report: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting user analytics report:', error);
      throw error;
    }
  }
}

export const unifiedUserAnalyticsService = new UnifiedUserAnalyticsService();
