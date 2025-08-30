import { storage } from '../storage.js';
import type { User } from '../../shared/schema';

export interface RewardResult {
  success: boolean;
  reward?: {
    type: 'currency' | 'pro_mode' | 'no_ads';
    amount?: number;
    duration?: number;
  };
  error?: string;
}

export class GamificationService {
  private achievements: any[] = [];
  
  // Список разрешенных ID для добавления монет (админы/модераторы)
  private readonly ALLOWED_COIN_ADMIN_IDS = [
    'admin_user_id_1', // Замените на реальные ID
    'admin_user_id_2',
    '111907067370663926621', // Временный тестовый админ
    // Добавьте сюда ID администраторов
  ];
  
  constructor() {}

  private async initializeAchievements(): Promise<void> { /* no-op */ }

  async checkAchievements(_userId: string, _eventType: string, _eventData: any): Promise<void> { return; }

  private async completeAchievement(): Promise<void> { return; }

  async claimDailyReward(userId: string): Promise<RewardResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const now = new Date();
      const lastClaim = undefined as Date | undefined; // поле отсутствует в текущей схеме users
      
      // Check if user can claim (24 hours since last claim)
      if (lastClaim) {
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim < 24) {
          return { success: false, error: 'Daily reward already claimed' };
        }
      }

      // Calculate streak
      let streak = 0; // streak отсутствует в текущей схеме users
      if (lastClaim) {
        const daysSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastClaim > 2) {
          streak = 0; // Reset streak if more than 2 days
        }
      }

      const newStreak = Math.min(streak + 1, 24);
      
      // Get reward for current day
      await storage.recordAnalyticsEvent(userId, 'daily_reward_attempt', {});
      return { success: false, error: 'Daily rewards are disabled' };
    } catch (error) {
      console.error('Error claiming daily reward:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async openLootBox(userId: string, lootBoxId: number): Promise<RewardResult> {
    try {
      return { success: false, error: 'Loot boxes are disabled' };
    } catch (error) {
      console.error('Error opening loot box:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async giveAdReward(userId: string): Promise<RewardResult> {
    try {
      const rewardAmount = 50; // Base ad reward
      
      await storage.updateUserBalance(userId, rewardAmount);
      await storage.updateUserFreeBalance(userId, rewardAmount);

      // Record analytics
      await storage.recordAnalyticsEvent(userId, 'ad_watched', {
        rewardAmount,
      });

      // Check achievements
      await this.checkAchievements(userId, 'ad_watched', { rewardAmount });

      return {
        success: true,
        reward: {
          type: 'currency',
          amount: rewardAmount,
        },
      };
    } catch (error) {
      console.error('Error giving ad reward:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async getUserProgress(userId: string): Promise<{
    level: number;
    experience: number;
    nextLevelExp: number;
    achievements: any[];
    dailyStreak: number;
    canClaimDaily: boolean;
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const achievementsWithDetails: any[] = [];

      // Check if user can claim daily reward
      const canClaimDaily = false;

      return {
        level: 1,
        experience: 0,
        nextLevelExp: 1000,
        achievements: achievementsWithDetails,
        dailyStreak: 0,
        canClaimDaily,
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  }

  async addCoins(userId: string, amount: number, adminId?: string): Promise<RewardResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Проверка прав доступа для добавления монет
      if (adminId && !this.ALLOWED_COIN_ADMIN_IDS.includes(adminId)) {
        return { success: false, error: 'Insufficient permissions to add coins' };
      }

      await storage.updateUserCoins(userId, user.coins + amount);

      // Логируем операцию
      console.log(`Coins added: ${amount} to user ${userId} by admin ${adminId || 'system'}`);

      return {
        success: true,
        reward: {
          type: 'currency',
          amount: amount
        }
      };
    } catch (error) {
      console.error('Error adding coins:', error);
      return { success: false, error: 'Failed to add coins' };
    }
  }

  async spendCoins(userId: string, amount: number): Promise<RewardResult> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.coins < amount) {
        return { success: false, error: 'Insufficient coins' };
      }

      await storage.updateUserCoins(userId, user.coins - amount);

      return {
        success: true,
        reward: {
          type: 'currency',
          amount: -amount
        }
      };
    } catch (error) {
      console.error('Error spending coins:', error);
      return { success: false, error: 'Failed to spend coins' };
    }
  }

  async getCoinsBalance(userId: string): Promise<{ coins: number }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return { coins: user.coins };
    } catch (error) {
      console.error('Error getting coins balance:', error);
      throw error;
    }
  }
}

export const gamificationService = new GamificationService();
