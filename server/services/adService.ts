import { db } from '../db';
import { users, adSessions, adRewards, adPerformanceMetrics } from '../../shared/schema';
import { eq, sql, and, gte, lte, desc, count, sum } from 'drizzle-orm';
import type { Request } from 'express';

// Types for ad system
export type AdType = 'rewarded_video' | 'interstitial' | 'banner' | 'native';
export type AdPlacement = 'task_completion' | 'wheel_spin' | 'box_opening' | 'trading_bonus' | 'screen_transition';
export type AdProvider = 'google_admob' | 'google_adsense' | 'simulation';
export type AdRewardType = 'money' | 'coins' | 'energy' | 'trading_bonus';

export interface AdSessionData {
  adId: string;
  placement: AdPlacement;
  userAgent: string;
  deviceInfo?: Record<string, any>;
}

export interface AdReward {
  type: AdRewardType;
  amount: number;
  multiplier?: number;
  bonusPercentage?: number;
}

export interface AdCompletionData {
  adId: string;
  watchTime: number;
  reward: AdReward;
  completed: boolean;
}

export interface AdAnalytics {
  impressions: number;
  completions: number;
  rewards: number;
  revenue: number;
  completionRate: number;
  fraudRate: number;
  totalWatchTime: number;
}

// Configuration
const AD_CONFIG = {
  fraud: {
    minWatchTime: 15000, // 15 seconds minimum
    maxSessionsPerHour: 10,
    maxRewardsPerDay: 50,
    maxRewardsPerHour: 5,
    minTimeBetweenAds: 60000, // 1 minute between ads
  },
  rewards: {
    defaultMoneyReward: 100,
    defaultEnergyReward: 5,
    tradingBonusPercentage: 5,
    wheelSpinCost: 10,
  },
  premium: {
    adFreeEnabled: true,
  }
} as const;

export class AdServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AdServiceError';
  }
}

export class AdFraudError extends AdServiceError {
  constructor(message: string) {
    super(message, 'AD_FRAUD', 403);
    this.name = 'AdFraudError';
  }
}

export class AdLimitError extends AdServiceError {
  constructor(message: string) {
    super(message, 'AD_LIMIT_EXCEEDED', 429);
    this.name = 'AdLimitError';
  }
}

export class AdService {
  // Get client IP address from request
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0].trim()
      : req.socket.remoteAddress || 'unknown';
    return ip;
  }

  // Check if user has premium (ad-free experience)
  private async checkPremiumStatus(userId: string): Promise<boolean> {
    try {
      const [user] = await db
        .select({ premiumExpiresAt: users.premiumExpiresAt })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) return false;

      return Boolean(
        user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date()
      );
    } catch (error) {
      console.error('[AdService] Error checking premium status:', error);
      return false;
    }
  }

  // Fraud detection checks
  private async performFraudChecks(
    userId: string,
    adId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Check sessions per hour
      const [hourlySessionsResult] = await db
        .select({ count: count() })
        .from(adSessions)
        .where(
          and(
            eq(adSessions.userId, userId),
            gte(adSessions.startTime, oneHourAgo)
          )
        );

      if (hourlySessionsResult.count >= AD_CONFIG.fraud.maxSessionsPerHour) {
        throw new AdLimitError('Too many ad sessions in the past hour');
      }

      // Check rewards per day
      const [dailyRewardsResult] = await db
        .select({ count: count() })
        .from(adSessions)
        .where(
          and(
            eq(adSessions.userId, userId),
            eq(adSessions.completed, true),
            eq(adSessions.rewardClaimed, true),
            gte(adSessions.startTime, oneDayAgo)
          )
        );

      if (dailyRewardsResult.count >= AD_CONFIG.fraud.maxRewardsPerDay) {
        throw new AdLimitError('Daily reward limit reached');
      }

      // Check time between ads
      const [lastSession] = await db
        .select({ startTime: adSessions.startTime })
        .from(adSessions)
        .where(eq(adSessions.userId, userId))
        .orderBy(desc(adSessions.startTime))
        .limit(1);

      if (lastSession) {
        const timeSinceLastAd = now.getTime() - lastSession.startTime.getTime();
        if (timeSinceLastAd < AD_CONFIG.fraud.minTimeBetweenAds) {
          throw new AdFraudError('Ads are being requested too frequently');
        }
      }

      // Check for suspicious patterns (same adId in short timeframe)
      const [duplicateAdResult] = await db
        .select({ count: count() })
        .from(adSessions)
        .where(
          and(
            eq(adSessions.adId, adId),
            gte(adSessions.startTime, oneHourAgo)
          )
        );

      if (duplicateAdResult.count > 0) {
        throw new AdFraudError('Duplicate ad ID detected');
      }

    } catch (error) {
      if (error instanceof AdServiceError) {
        throw error;
      }
      console.error('[AdService] Fraud check error:', error);
      // Don't block on database errors
    }
  }

  // Start ad session
  public async startAdSession(
    userId: string,
    sessionData: AdSessionData,
    req: Request
  ): Promise<string> {
    try {
      // Check premium status
      if (AD_CONFIG.premium.adFreeEnabled && await this.checkPremiumStatus(userId)) {
        throw new AdServiceError('Premium users have ad-free experience', 'PREMIUM_USER', 403);
      }

      const ipAddress = this.getClientIP(req);
      
      // Perform fraud detection
      await this.performFraudChecks(userId, sessionData.adId, ipAddress, sessionData.userAgent);

      // Create session record
      const [session] = await db
        .insert(adSessions)
        .values({
          userId,
          adId: sessionData.adId,
          adType: 'rewarded_video', // Default type
          placement: sessionData.placement,
          provider: 'simulation', // Default provider
          ipAddress,
          userAgent: sessionData.userAgent,
          deviceInfo: sessionData.deviceInfo || null,
        })
        .returning({ id: adSessions.id });

      console.log(`[AdService] Ad session started for user ${userId}, session ${session.id}`);
      
      // Update performance metrics
      await this.updatePerformanceMetrics(
        'rewarded_video',
        sessionData.placement,
        'simulation',
        { impressions: 1 }
      );

      return session.id;
    } catch (error) {
      console.error('[AdService] Error starting ad session:', error);
      
      if (error instanceof AdServiceError) {
        throw error;
      }
      
      throw new AdServiceError(
        'Failed to start ad session',
        'SESSION_START_ERROR',
        500
      );
    }
  }

  // Complete ad session and process reward
  public async completeAdSession(
    userId: string,
    completionData: AdCompletionData
  ): Promise<{ success: boolean; fraudDetected: boolean; reward?: any }> {
    try {
      // Find the session
      const [session] = await db
        .select()
        .from(adSessions)
        .where(
          and(
            eq(adSessions.userId, userId),
            eq(adSessions.adId, completionData.adId),
            eq(adSessions.completed, false)
          )
        )
        .orderBy(desc(adSessions.startTime))
        .limit(1);

      if (!session) {
        throw new AdServiceError('Ad session not found', 'SESSION_NOT_FOUND', 404);
      }

      let fraudDetected = false;
      let fraudReason = null;

      // Validate watch time
      if (completionData.watchTime < AD_CONFIG.fraud.minWatchTime) {
        fraudDetected = true;
        fraudReason = `Watch time too short: ${completionData.watchTime}ms`;
      }

      // Calculate actual watch time based on session start time
      const actualWatchTime = Date.now() - session.startTime.getTime();
      if (Math.abs(actualWatchTime - completionData.watchTime) > 5000) { // 5 second tolerance
        fraudDetected = true;
        fraudReason = `Watch time mismatch: reported ${completionData.watchTime}ms, actual ${actualWatchTime}ms`;
      }

      // Update session as completed
      await db
        .update(adSessions)
        .set({
          endTime: new Date(),
          watchTime: completionData.watchTime,
          completed: completionData.completed,
          fraudDetected,
          fraudReason,
          rewardClaimed: !fraudDetected && completionData.completed,
          updatedAt: new Date(),
        })
        .where(eq(adSessions.id, session.id));

      let processedReward = null;

      // Process reward if not fraud
      if (!fraudDetected && completionData.completed) {
        try {
          processedReward = await this.processAdReward(userId, session.id, completionData.reward);
          
          console.log(`[AdService] Reward processed for user ${userId}: ${JSON.stringify(processedReward)}`);
        } catch (rewardError) {
          console.error('[AdService] Error processing reward:', rewardError);
          
          // Mark as reward processing failed but don't fail the whole request
          await db
            .update(adSessions)
            .set({ rewardClaimed: false })
            .where(eq(adSessions.id, session.id));
        }
      }

      // Update performance metrics
      const metricsUpdate: Record<string, number> = { completions: 1 };
      if (!fraudDetected && completionData.completed) {
        metricsUpdate.rewards = 1;
      }
      if (fraudDetected) {
        metricsUpdate.fraudAttempts = 1;
      }

      await this.updatePerformanceMetrics(
        session.adType,
        session.placement,
        session.provider,
        metricsUpdate
      );

      return {
        success: !fraudDetected && completionData.completed,
        fraudDetected,
        reward: processedReward,
      };

    } catch (error) {
      console.error('[AdService] Error completing ad session:', error);
      
      if (error instanceof AdServiceError) {
        throw error;
      }
      
      throw new AdServiceError(
        'Failed to complete ad session',
        'SESSION_COMPLETE_ERROR',
        500
      );
    }
  }

  // Process ad reward and update user balance
  private async processAdReward(
    userId: string,
    sessionId: string,
    reward: AdReward
  ): Promise<any> {
    try {
      // Create reward record
      const [rewardRecord] = await db
        .insert(adRewards)
        .values({
          sessionId,
          userId,
          rewardType: reward.type,
          amount: reward.amount.toString(),
          multiplier: reward.multiplier?.toString() || '1.00',
          bonusPercentage: reward.bonusPercentage || null,
        })
        .returning();

      // Update user balance based on reward type
      let updateResult = null;
      
      switch (reward.type) {
        case 'money':
          updateResult = await db
            .update(users)
            .set({
              balance: sql`${users.balance} + ${reward.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({ balance: users.balance });
          break;

        case 'coins':
          updateResult = await db
            .update(users)
            .set({
              coins: sql`${users.coins} + ${reward.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({ coins: users.coins });
          break;

        case 'energy':
          updateResult = await db
            .update(users)
            .set({
              energyTasksBonus: sql`LEAST(${users.energyTasksBonus} + ${reward.amount}, 100)`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({ energyTasksBonus: users.energyTasksBonus });
          break;

        case 'trading_bonus':
          // For trading bonus, we increase the free balance by the bonus percentage
          const bonusMultiplier = 1 + (reward.bonusPercentage || 5) / 100;
          updateResult = await db
            .update(users)
            .set({
              freeBalance: sql`${users.freeBalance} * ${bonusMultiplier}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))
            .returning({ freeBalance: users.freeBalance });
          break;

        default:
          throw new Error(`Unknown reward type: ${reward.type}`);
      }

      // Mark reward as processed
      await db
        .update(adRewards)
        .set({
          processed: true,
          processedAt: new Date(),
        })
        .where(eq(adRewards.id, rewardRecord.id));

      return {
        rewardId: rewardRecord.id,
        type: reward.type,
        amount: reward.amount,
        userUpdate: updateResult?.[0] || null,
      };

    } catch (error) {
      console.error('[AdService] Error processing reward:', error);
      
      // Mark reward as failed
      await db
        .update(adRewards)
        .set({
          processed: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(adRewards.sessionId, sessionId));

      throw new AdServiceError(
        'Failed to process reward',
        'REWARD_PROCESS_ERROR',
        500
      );
    }
  }

  // Update performance metrics
  private async updatePerformanceMetrics(
    adType: AdType,
    placement: AdPlacement,
    provider: AdProvider,
    metrics: Partial<{
      impressions: number;
      completions: number;
      rewards: number;
      fraudAttempts: number;
      totalWatchTime: number;
      revenue: number;
    }>
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Try to update existing record
      const updateResult = await db
        .update(adPerformanceMetrics)
        .set({
          impressions: metrics.impressions 
            ? sql`${adPerformanceMetrics.impressions} + ${metrics.impressions}`
            : adPerformanceMetrics.impressions,
          completions: metrics.completions
            ? sql`${adPerformanceMetrics.completions} + ${metrics.completions}`
            : adPerformanceMetrics.completions,
          rewards: metrics.rewards
            ? sql`${adPerformanceMetrics.rewards} + ${metrics.rewards}`
            : adPerformanceMetrics.rewards,
          fraudAttempts: metrics.fraudAttempts
            ? sql`${adPerformanceMetrics.fraudAttempts} + ${metrics.fraudAttempts}`
            : adPerformanceMetrics.fraudAttempts,
          totalWatchTime: metrics.totalWatchTime
            ? sql`${adPerformanceMetrics.totalWatchTime} + ${metrics.totalWatchTime}`
            : adPerformanceMetrics.totalWatchTime,
          revenue: metrics.revenue
            ? sql`${adPerformanceMetrics.revenue} + ${metrics.revenue}`
            : adPerformanceMetrics.revenue,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(adPerformanceMetrics.date, today),
            eq(adPerformanceMetrics.adType, adType),
            eq(adPerformanceMetrics.placement, placement),
            eq(adPerformanceMetrics.provider, provider)
          )
        );

      // If no record was updated, create a new one
      if (updateResult.rowCount === 0) {
        await db.insert(adPerformanceMetrics).values({
          date: today,
          adType,
          placement,
          provider,
          impressions: metrics.impressions || 0,
          completions: metrics.completions || 0,
          rewards: metrics.rewards || 0,
          fraudAttempts: metrics.fraudAttempts || 0,
          totalWatchTime: metrics.totalWatchTime || 0,
          revenue: metrics.revenue ? metrics.revenue.toString() : '0',
        });
      }
    } catch (error) {
      console.error('[AdService] Error updating performance metrics:', error);
      // Don't throw - metrics are not critical
    }
  }

  // Get analytics data
  public async getAnalytics(
    timeframe: 'day' | 'week' | 'month' = 'day'
  ): Promise<AdAnalytics> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      const [result] = await db
        .select({
          impressions: sum(adPerformanceMetrics.impressions),
          completions: sum(adPerformanceMetrics.completions),
          rewards: sum(adPerformanceMetrics.rewards),
          fraudAttempts: sum(adPerformanceMetrics.fraudAttempts),
          totalWatchTime: sum(adPerformanceMetrics.totalWatchTime),
          revenue: sum(adPerformanceMetrics.revenue),
        })
        .from(adPerformanceMetrics)
        .where(gte(adPerformanceMetrics.date, startDate));

      const impressions = Number(result.impressions) || 0;
      const completions = Number(result.completions) || 0;
      const rewards = Number(result.rewards) || 0;
      const fraudAttempts = Number(result.fraudAttempts) || 0;
      const totalWatchTime = Number(result.totalWatchTime) || 0;
      const revenue = Number(result.revenue) || 0;

      return {
        impressions,
        completions,
        rewards,
        revenue,
        completionRate: impressions > 0 ? (completions / impressions) * 100 : 0,
        fraudRate: (impressions + fraudAttempts) > 0 ? (fraudAttempts / (impressions + fraudAttempts)) * 100 : 0,
        totalWatchTime,
      };
    } catch (error) {
      console.error('[AdService] Error fetching analytics:', error);
      return {
        impressions: 0,
        completions: 0,
        rewards: 0,
        revenue: 0,
        completionRate: 0,
        fraudRate: 0,
        totalWatchTime: 0,
      };
    }
  }

  // Get user ad stats
  public async getUserAdStats(userId: string): Promise<{
    dailyRewards: number;
    hourlyRewards: number;
    totalRewards: number;
    canWatchAd: boolean;
    nextAdAvailableAt?: Date;
  }> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get counts
      const [dailyResult] = await db
        .select({ count: count() })
        .from(adSessions)
        .where(
          and(
            eq(adSessions.userId, userId),
            eq(adSessions.completed, true),
            eq(adSessions.rewardClaimed, true),
            gte(adSessions.startTime, oneDayAgo)
          )
        );

      const [hourlyResult] = await db
        .select({ count: count() })
        .from(adSessions)
        .where(
          and(
            eq(adSessions.userId, userId),
            eq(adSessions.completed, true),
            eq(adSessions.rewardClaimed, true),
            gte(adSessions.startTime, oneHourAgo)
          )
        );

      const [totalResult] = await db
        .select({ count: count() })
        .from(adSessions)
        .where(
          and(
            eq(adSessions.userId, userId),
            eq(adSessions.completed, true),
            eq(adSessions.rewardClaimed, true)
          )
        );

      // Check last ad time for rate limiting
      const [lastSession] = await db
        .select({ startTime: adSessions.startTime })
        .from(adSessions)
        .where(eq(adSessions.userId, userId))
        .orderBy(desc(adSessions.startTime))
        .limit(1);

      const dailyRewards = dailyResult.count;
      const hourlyRewards = hourlyResult.count;
      const totalRewards = totalResult.count;

      let canWatchAd = true;
      let nextAdAvailableAt: Date | undefined;

      // Check daily limit
      if (dailyRewards >= AD_CONFIG.fraud.maxRewardsPerDay) {
        canWatchAd = false;
        nextAdAvailableAt = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
      }
      // Check hourly limit
      else if (hourlyRewards >= AD_CONFIG.fraud.maxRewardsPerHour) {
        canWatchAd = false;
        nextAdAvailableAt = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);
      }
      // Check minimum time between ads
      else if (lastSession) {
        const timeSinceLastAd = now.getTime() - lastSession.startTime.getTime();
        if (timeSinceLastAd < AD_CONFIG.fraud.minTimeBetweenAds) {
          canWatchAd = false;
          nextAdAvailableAt = new Date(lastSession.startTime.getTime() + AD_CONFIG.fraud.minTimeBetweenAds);
        }
      }

      return {
        dailyRewards,
        hourlyRewards,
        totalRewards,
        canWatchAd,
        nextAdAvailableAt,
      };
    } catch (error) {
      console.error('[AdService] Error fetching user ad stats:', error);
      return {
        dailyRewards: 0,
        hourlyRewards: 0,
        totalRewards: 0,
        canWatchAd: false,
      };
    }
  }
}

// Export singleton instance
export const adService = new AdService();
export default adService;