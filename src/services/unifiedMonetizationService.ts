import { config } from '../lib/config';

// Unified interfaces for monetization and advertising data
export interface UnifiedMonetizationData {
  revenue: {
    totalRevenue: string;
    premiumRevenue: string;
    adRevenue: string;
    arpu: string;
    arppu: string;
    payingUsers: number;
    conversionRate: number;
    monthlyRecurringRevenue: string;
    annualRecurringRevenue: string;
  };
  subscriptions: {
    activeSubscriptions: number;
    monthlySubscriptions: number;
    yearlySubscriptions: number;
    churnRate: number;
  };
  pricing: {
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
  };
  adPerformance: {
    totalAdRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    avgCTR: number;
    avgCPI: number;
    avgCPA: number;
    avgROAS: number;
    videoCompletionRate: number;
    rewardsClaimed: number;
    activeNetworks: number;
    activeCampaigns: number;
    failedRequests: number;
  };
  taskIntegration: {
    energyProgressAds: number;
    wheelSpinAds: number;
    boxOpeningAds: number;
    tradingBonusAds: number;
    completedVideoTasks: number;
    avgWatchTime: number;
    rewardConversionRate: number;
  };
  adNetworks: AdNetworkData[];
  campaigns: CampaignData[];
}

export interface AdNetworkData {
  id: string;
  name: string;
  type: 'google_admob' | 'meta_audience' | 'unity_ads' | 'simulation';
  status: 'active' | 'inactive' | 'error' | 'testing';
  revenue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  fillRate: number;
  isTestMode: boolean;
  lastSync: string;
  errorMessage?: string;
}

export interface CampaignData {
  id: string;
  name: string;
  network: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  startDate: string;
  endDate?: string;
}

class UnifiedMonetizationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.api.baseUrl;
  }

  /**
   * Fetch unified monetization data combining revenue and advertising metrics
   */
  async fetchUnifiedData(): Promise<UnifiedMonetizationData> {
    try {
      const [revenueData, adPerformanceData, networksData, campaignsData] = await Promise.allSettled([
        this.fetchRevenueData(),
        this.fetchAdPerformanceData(),
        this.fetchAdNetworksData(),
        this.fetchCampaignsData()
      ]);

      // Combine all data into unified structure
      const unifiedData: UnifiedMonetizationData = {
        revenue: this.extractRevenueData(revenueData),
        subscriptions: this.extractSubscriptionData(revenueData),
        pricing: this.extractPricingData(revenueData),
        adPerformance: this.extractAdPerformanceData(adPerformanceData),
        taskIntegration: this.extractTaskIntegrationData(adPerformanceData),
        adNetworks: this.extractAdNetworksData(networksData),
        campaigns: this.extractCampaignsData(campaignsData)
      };

      return unifiedData;
    } catch (error) {
      console.error('Error fetching unified monetization data:', error);
      throw new Error('Failed to fetch unified monetization data');
    }
  }

  /**
   * Fetch revenue data from monetization API
   */
  private async fetchRevenueData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/monetization/overview`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch revenue data: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Fetch ad performance data from advertising API
   */
  private async fetchAdPerformanceData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/ads/overview`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ad performance data: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
  }

  /**
   * Fetch ad networks data
   */
  private async fetchAdNetworksData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/ads/networks`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ad networks data: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : [];
  }

  /**
   * Fetch campaigns data
   */
  private async fetchCampaignsData(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/admin/ads/campaigns`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns data: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : [];
  }

  /**
   * Extract revenue data from API response
   */
  private extractRevenueData(revenueData: any): UnifiedMonetizationData['revenue'] {
    if (revenueData.status === 'rejected' || !revenueData.value) {
      return {
        totalRevenue: '0',
        premiumRevenue: '0',
        adRevenue: '0',
        arpu: '0',
        arppu: '0',
        payingUsers: 0,
        conversionRate: 0,
        monthlyRecurringRevenue: '0',
        annualRecurringRevenue: '0'
      };
    }

    const data = revenueData.value;
    return {
      totalRevenue: data.revenue?.totalRevenue || '0',
      premiumRevenue: data.revenue?.premiumRevenue || '0',
      adRevenue: data.revenue?.adRevenue || '0',
      arpu: data.revenue?.arpu || '0',
      arppu: data.revenue?.arppu || '0',
      payingUsers: data.revenue?.payingUsers || 0,
      conversionRate: data.revenue?.conversionRate || 0,
      monthlyRecurringRevenue: data.subscriptions?.monthlyRecurringRevenue || '0',
      annualRecurringRevenue: data.subscriptions?.annualRecurringRevenue || '0'
    };
  }

  /**
   * Extract subscription data from API response
   */
  private extractSubscriptionData(revenueData: any): UnifiedMonetizationData['subscriptions'] {
    if (revenueData.status === 'rejected' || !revenueData.value) {
      return {
        activeSubscriptions: 0,
        monthlySubscriptions: 0,
        yearlySubscriptions: 0,
        churnRate: 0
      };
    }

    const data = revenueData.value;
    return {
      activeSubscriptions: data.subscriptions?.activeSubscriptions || 0,
      monthlySubscriptions: data.subscriptions?.monthlySubscriptions || 0,
      yearlySubscriptions: data.subscriptions?.yearlySubscriptions || 0,
      churnRate: data.subscriptions?.churnRate || 0
    };
  }

  /**
   * Extract pricing data from API response
   */
  private extractPricingData(revenueData: any): UnifiedMonetizationData['pricing'] {
    if (revenueData.status === 'rejected' || !revenueData.value) {
      return {
        monthlyPrice: 6.99,
        yearlyPrice: 64.99,
        currency: 'USD'
      };
    }

    const data = revenueData.value;
    return {
      monthlyPrice: data.pricing?.monthlyPrice || 6.99,
      yearlyPrice: data.pricing?.yearlyPrice || 64.99,
      currency: data.pricing?.currency || 'USD'
    };
  }

  /**
   * Extract ad performance data from API response
   */
  private extractAdPerformanceData(adPerformanceData: any): UnifiedMonetizationData['adPerformance'] {
    if (adPerformanceData.status === 'rejected' || !adPerformanceData.value) {
      return {
        totalAdRevenue: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: 0,
        avgCPI: 0,
        avgCPA: 0,
        avgROAS: 0,
        videoCompletionRate: 0,
        rewardsClaimed: 0,
        activeNetworks: 0,
        activeCampaigns: 0,
        failedRequests: 0
      };
    }

    const data = adPerformanceData.value;
    return {
      totalAdRevenue: data.totalAdRevenue || 0,
      totalImpressions: data.totalImpressions || 0,
      totalClicks: data.totalClicks || 0,
      avgCTR: data.avgCTR || 0,
      avgCPI: data.avgCPI || 0,
      avgCPA: data.avgCPA || 0,
      avgROAS: data.avgROAS || 0,
      videoCompletionRate: data.videoCompletionRate || 0,
      rewardsClaimed: data.rewardsClaimed || 0,
      activeNetworks: data.activeNetworks || 0,
      activeCampaigns: data.activeCampaigns || 0,
      failedRequests: data.failedRequests || 0
    };
  }

  /**
   * Extract task integration data from API response
   */
  private extractTaskIntegrationData(adPerformanceData: any): UnifiedMonetizationData['taskIntegration'] {
    if (adPerformanceData.status === 'rejected' || !adPerformanceData.value) {
      return {
        energyProgressAds: 0,
        wheelSpinAds: 0,
        boxOpeningAds: 0,
        tradingBonusAds: 0,
        completedVideoTasks: 0,
        avgWatchTime: 0,
        rewardConversionRate: 0
      };
    }

    const data = adPerformanceData.value;
    return {
      energyProgressAds: data.taskIntegration?.energyProgressAds || 0,
      wheelSpinAds: data.taskIntegration?.wheelSpinAds || 0,
      boxOpeningAds: data.taskIntegration?.boxOpeningAds || 0,
      tradingBonusAds: data.taskIntegration?.tradingBonusAds || 0,
      completedVideoTasks: data.taskIntegration?.completedVideoTasks || 0,
      avgWatchTime: data.taskIntegration?.avgWatchTime || 0,
      rewardConversionRate: data.taskIntegration?.rewardConversionRate || 0
    };
  }

  /**
   * Extract ad networks data from API response
   */
  private extractAdNetworksData(networksData: any): AdNetworkData[] {
    if (networksData.status === 'rejected' || !networksData.value) {
      return [];
    }

    return networksData.value.map((network: any) => ({
      id: network.id || '',
      name: network.name || '',
      type: network.type || 'simulation',
      status: network.status || 'inactive',
      revenue: network.revenue || 0,
      impressions: network.impressions || 0,
      clicks: network.clicks || 0,
      ctr: network.ctr || 0,
      fillRate: network.fillRate || 0,
      isTestMode: network.isTestMode || false,
      lastSync: network.lastSync || '',
      errorMessage: network.errorMessage
    }));
  }

  /**
   * Extract campaigns data from API response
   */
  private extractCampaignsData(campaignsData: any): CampaignData[] {
    if (campaignsData.status === 'rejected' || !campaignsData.value) {
      return [];
    }

    return campaignsData.value.map((campaign: any) => ({
      id: campaign.id || '',
      name: campaign.name || '',
      network: campaign.network || '',
      status: campaign.status || 'draft',
      budget: campaign.budget || 0,
      spent: campaign.spent || 0,
      impressions: campaign.impressions || 0,
      clicks: campaign.clicks || 0,
      conversions: campaign.conversions || 0,
      roas: campaign.roas || 0,
      startDate: campaign.startDate || '',
      endDate: campaign.endDate
    }));
  }

  /**
   * Update pricing for monthly plan
   */
  async updateMonthlyPricing(price: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/pricing/monthly`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ price })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating monthly pricing:', error);
      return false;
    }
  }

  /**
   * Update pricing for yearly plan
   */
  async updateYearlyPricing(price: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/pricing/yearly`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ price })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating yearly pricing:', error);
      return false;
    }
  }

  /**
   * Test ad network connection
   */
  async testAdNetwork(networkId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ad-settings/test/${networkId}`, {
        method: 'POST',
        credentials: 'include'
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing ad network:', error);
      return false;
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(campaignData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(campaignData)
      });

      return response.ok;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return false;
    }
  }
}

export const unifiedMonetizationService = new UnifiedMonetizationService();
