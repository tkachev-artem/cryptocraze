import { API_BASE_URL } from '@/lib/api';

export type UserStats = {
  balance: number;
  freeBalance: number;
  tradesCount: number;
  totalTradesVolume: string;
  successfulTradesPercentage: string;
  maxProfit: string;
  maxLoss: string;
  averageTradeAmount: string;
  ratingScore: number;
  ratingRank30Days: number | null;
  rewardsCount: number;
  isPremium: boolean;
  premiumExpiresAt: string | null;
}

class UserStatsService {
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${API_BASE_URL}/user/stats`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to get user stats: ${response.statusText}`);
    }

    return response.json() as Promise<UserStats>;
  }
}

export const userStatsService = new UserStatsService(); 