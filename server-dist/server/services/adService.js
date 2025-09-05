"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adService = exports.AdService = exports.AdLimitError = exports.AdFraudError = exports.AdServiceError = void 0;
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const analyticsLogger_js_1 = __importDefault(require("../middleware/analyticsLogger.js"));
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
};
class AdServiceError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AdServiceError';
    }
}
exports.AdServiceError = AdServiceError;
class AdFraudError extends AdServiceError {
    constructor(message) {
        super(message, 'AD_FRAUD', 403);
        this.name = 'AdFraudError';
    }
}
exports.AdFraudError = AdFraudError;
class AdLimitError extends AdServiceError {
    constructor(message) {
        super(message, 'AD_LIMIT_EXCEEDED', 429);
        this.name = 'AdLimitError';
    }
}
exports.AdLimitError = AdLimitError;
class AdService {
    // Get client IP address from request
    getClientIP(req) {
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0].trim()
            : req.socket.remoteAddress || 'unknown';
        return ip;
    }
    // Check if user has premium (ad-free experience)
    async checkPremiumStatus(userId) {
        try {
            const [user] = await db_1.db
                .select({ premiumExpiresAt: schema_1.users.premiumExpiresAt })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            if (!user)
                return false;
            return Boolean(user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date());
        }
        catch (error) {
            console.error('[AdService] Error checking premium status:', error);
            return false;
        }
    }
    // Fraud detection checks
    async performFraudChecks(userId, adId, ipAddress, userAgent) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        try {
            // Check sessions per hour
            const [hourlySessionsResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId), (0, drizzle_orm_1.gte)(schema_1.adSessions.startTime, oneHourAgo)));
            if (hourlySessionsResult.count >= AD_CONFIG.fraud.maxSessionsPerHour) {
                throw new AdLimitError('Too many ad sessions in the past hour');
            }
            // Check rewards per day
            const [dailyRewardsResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.adSessions.completed, true), (0, drizzle_orm_1.eq)(schema_1.adSessions.rewardClaimed, true), (0, drizzle_orm_1.gte)(schema_1.adSessions.startTime, oneDayAgo)));
            if (dailyRewardsResult.count >= AD_CONFIG.fraud.maxRewardsPerDay) {
                throw new AdLimitError('Daily reward limit reached');
            }
            // Check time between ads
            const [lastSession] = await db_1.db
                .select({ startTime: schema_1.adSessions.startTime })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.adSessions.startTime))
                .limit(1);
            if (lastSession) {
                const timeSinceLastAd = now.getTime() - lastSession.startTime.getTime();
                if (timeSinceLastAd < AD_CONFIG.fraud.minTimeBetweenAds) {
                    throw new AdFraudError('Ads are being requested too frequently');
                }
            }
            // Check for suspicious patterns (same adId in short timeframe)
            const [duplicateAdResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.adId, adId), (0, drizzle_orm_1.gte)(schema_1.adSessions.startTime, oneHourAgo)));
            if (duplicateAdResult.count > 0) {
                throw new AdFraudError('Duplicate ad ID detected');
            }
        }
        catch (error) {
            if (error instanceof AdServiceError) {
                throw error;
            }
            console.error('[AdService] Fraud check error:', error);
            // Don't block on database errors
        }
    }
    // Start ad session
    async startAdSession(userId, sessionData, req) {
        try {
            // Check premium status
            if (AD_CONFIG.premium.adFreeEnabled && await this.checkPremiumStatus(userId)) {
                throw new AdServiceError('Premium users have ad-free experience', 'PREMIUM_USER', 403);
            }
            const ipAddress = this.getClientIP(req);
            // Perform fraud detection
            await this.performFraudChecks(userId, sessionData.adId, ipAddress, sessionData.userAgent);
            // Create session record
            const [session] = await db_1.db
                .insert(schema_1.adSessions)
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
                .returning({ id: schema_1.adSessions.id });
            console.log(`[AdService] Ad session started for user ${userId}, session ${session.id}`);
            // Update performance metrics
            await this.updatePerformanceMetrics('rewarded_video', sessionData.placement, 'simulation', { impressions: 1 });
            return session.id;
        }
        catch (error) {
            console.error('[AdService] Error starting ad session:', error);
            if (error instanceof AdServiceError) {
                throw error;
            }
            throw new AdServiceError('Failed to start ad session', 'SESSION_START_ERROR', 500);
        }
    }
    // Complete ad session and process reward
    async completeAdSession(userId, completionData) {
        try {
            // Find the session
            const [session] = await db_1.db
                .select()
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.adSessions.adId, completionData.adId), (0, drizzle_orm_1.eq)(schema_1.adSessions.completed, false)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.adSessions.startTime))
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
            await db_1.db
                .update(schema_1.adSessions)
                .set({
                endTime: new Date(),
                watchTime: completionData.watchTime,
                completed: completionData.completed,
                fraudDetected,
                fraudReason,
                rewardClaimed: !fraudDetected && completionData.completed,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.adSessions.id, session.id));
            let processedReward = null;
            // Process reward if not fraud
            if (!fraudDetected && completionData.completed) {
                try {
                    processedReward = await this.processAdReward(userId, session.id, completionData.reward);
                    console.log(`[AdService] Reward processed for user ${userId}: ${JSON.stringify(processedReward)}`);
                }
                catch (rewardError) {
                    console.error('[AdService] Error processing reward:', rewardError);
                    // Mark as reward processing failed but don't fail the whole request
                    await db_1.db
                        .update(schema_1.adSessions)
                        .set({ rewardClaimed: false })
                        .where((0, drizzle_orm_1.eq)(schema_1.adSessions.id, session.id));
                }
            }
            // Update performance metrics
            const metricsUpdate = { completions: 1 };
            if (!fraudDetected && completionData.completed) {
                metricsUpdate.rewards = 1;
            }
            if (fraudDetected) {
                metricsUpdate.fraudAttempts = 1;
            }
            await this.updatePerformanceMetrics(session.adType, session.placement, session.provider, metricsUpdate);
            return {
                success: !fraudDetected && completionData.completed,
                fraudDetected,
                reward: processedReward,
            };
        }
        catch (error) {
            console.error('[AdService] Error completing ad session:', error);
            if (error instanceof AdServiceError) {
                throw error;
            }
            throw new AdServiceError('Failed to complete ad session', 'SESSION_COMPLETE_ERROR', 500);
        }
    }
    // Process ad reward and update user balance
    async processAdReward(userId, sessionId, reward) {
        try {
            // Create reward record
            const [rewardRecord] = await db_1.db
                .insert(schema_1.adRewards)
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
                    updateResult = await db_1.db
                        .update(schema_1.users)
                        .set({
                        balance: (0, drizzle_orm_1.sql) `${schema_1.users.balance} + ${reward.amount}`,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                        .returning({ balance: schema_1.users.balance });
                    break;
                case 'coins':
                    updateResult = await db_1.db
                        .update(schema_1.users)
                        .set({
                        coins: (0, drizzle_orm_1.sql) `${schema_1.users.coins} + ${reward.amount}`,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                        .returning({ coins: schema_1.users.coins });
                    break;
                case 'energy':
                    updateResult = await db_1.db
                        .update(schema_1.users)
                        .set({
                        energyTasksBonus: (0, drizzle_orm_1.sql) `LEAST(${schema_1.users.energyTasksBonus} + ${reward.amount}, 100)`,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                        .returning({ energyTasksBonus: schema_1.users.energyTasksBonus });
                    break;
                case 'trading_bonus':
                    // For trading bonus, we increase the free balance by the bonus percentage
                    const bonusMultiplier = 1 + (reward.bonusPercentage || 5) / 100;
                    updateResult = await db_1.db
                        .update(schema_1.users)
                        .set({
                        freeBalance: (0, drizzle_orm_1.sql) `${schema_1.users.freeBalance} * ${bonusMultiplier}`,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                        .returning({ freeBalance: schema_1.users.freeBalance });
                    break;
                default:
                    throw new Error(`Unknown reward type: ${reward.type}`);
            }
            // Mark reward as processed
            await db_1.db
                .update(schema_1.adRewards)
                .set({
                processed: true,
                processedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.adRewards.id, rewardRecord.id));
            // Log revenue from ad viewing
            const revenueAmount = this.calculateAdRevenue(reward);
            if (revenueAmount > 0) {
                try {
                    const userIdNumber = Number(userId);
                    await analyticsLogger_js_1.default.logRevenue(userIdNumber, 'ad', revenueAmount, 'USD');
                    console.log(`[AdService] Logged ad revenue: $${revenueAmount} for user ${userId}`);
                }
                catch (analyticsError) {
                    console.error('[AdService] Failed to log ad revenue analytics:', analyticsError);
                    // Don't fail the whole process due to analytics error
                }
            }
            return {
                rewardId: rewardRecord.id,
                type: reward.type,
                amount: reward.amount,
                userUpdate: updateResult?.[0] || null,
            };
        }
        catch (error) {
            console.error('[AdService] Error processing reward:', error);
            // Mark reward as failed
            await db_1.db
                .update(schema_1.adRewards)
                .set({
                processed: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            })
                .where((0, drizzle_orm_1.eq)(schema_1.adRewards.sessionId, sessionId));
            throw new AdServiceError('Failed to process reward', 'REWARD_PROCESS_ERROR', 500);
        }
    }
    // Calculate revenue from ad viewing (estimated)
    calculateAdRevenue(reward) {
        // Estimate revenue based on reward type and industry standards
        switch (reward.type) {
            case 'money':
                // If we give $100 (virtual money), we typically earn $0.05-0.10 from ad networks
                return 0.08; // $0.08 revenue per money reward ad
            case 'coins':
                // Similar calculation for coins
                return 0.06; // $0.06 revenue per coins reward ad
            case 'energy':
                // Energy rewards are typically for lighter engagement
                return 0.04; // $0.04 revenue per energy reward ad
            case 'trading_bonus':
                // Trading bonus ads are valuable as they increase engagement
                return 0.12; // $0.12 revenue per trading bonus ad
            default:
                return 0.05; // Default $0.05 revenue per ad view
        }
    }
    // Update performance metrics
    async updatePerformanceMetrics(adType, placement, provider, metrics) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Try to update existing record
            const updateResult = await db_1.db
                .update(schema_1.adPerformanceMetrics)
                .set({
                impressions: metrics.impressions
                    ? (0, drizzle_orm_1.sql) `${schema_1.adPerformanceMetrics.impressions} + ${metrics.impressions}`
                    : schema_1.adPerformanceMetrics.impressions,
                completions: metrics.completions
                    ? (0, drizzle_orm_1.sql) `${schema_1.adPerformanceMetrics.completions} + ${metrics.completions}`
                    : schema_1.adPerformanceMetrics.completions,
                rewards: metrics.rewards
                    ? (0, drizzle_orm_1.sql) `${schema_1.adPerformanceMetrics.rewards} + ${metrics.rewards}`
                    : schema_1.adPerformanceMetrics.rewards,
                fraudAttempts: metrics.fraudAttempts
                    ? (0, drizzle_orm_1.sql) `${schema_1.adPerformanceMetrics.fraudAttempts} + ${metrics.fraudAttempts}`
                    : schema_1.adPerformanceMetrics.fraudAttempts,
                totalWatchTime: metrics.totalWatchTime
                    ? (0, drizzle_orm_1.sql) `${schema_1.adPerformanceMetrics.totalWatchTime} + ${metrics.totalWatchTime}`
                    : schema_1.adPerformanceMetrics.totalWatchTime,
                revenue: metrics.revenue
                    ? (0, drizzle_orm_1.sql) `${schema_1.adPerformanceMetrics.revenue} + ${metrics.revenue}`
                    : schema_1.adPerformanceMetrics.revenue,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adPerformanceMetrics.date, today), (0, drizzle_orm_1.eq)(schema_1.adPerformanceMetrics.adType, adType), (0, drizzle_orm_1.eq)(schema_1.adPerformanceMetrics.placement, placement), (0, drizzle_orm_1.eq)(schema_1.adPerformanceMetrics.provider, provider)));
            // If no record was updated, create a new one
            if (updateResult.rowCount === 0) {
                await db_1.db.insert(schema_1.adPerformanceMetrics).values({
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
        }
        catch (error) {
            console.error('[AdService] Error updating performance metrics:', error);
            // Don't throw - metrics are not critical
        }
    }
    // Get analytics data
    async getAnalytics(timeframe = 'day') {
        try {
            const now = new Date();
            let startDate;
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
            const [result] = await db_1.db
                .select({
                impressions: (0, drizzle_orm_1.sum)(schema_1.adPerformanceMetrics.impressions),
                completions: (0, drizzle_orm_1.sum)(schema_1.adPerformanceMetrics.completions),
                rewards: (0, drizzle_orm_1.sum)(schema_1.adPerformanceMetrics.rewards),
                fraudAttempts: (0, drizzle_orm_1.sum)(schema_1.adPerformanceMetrics.fraudAttempts),
                totalWatchTime: (0, drizzle_orm_1.sum)(schema_1.adPerformanceMetrics.totalWatchTime),
                revenue: (0, drizzle_orm_1.sum)(schema_1.adPerformanceMetrics.revenue),
            })
                .from(schema_1.adPerformanceMetrics)
                .where((0, drizzle_orm_1.gte)(schema_1.adPerformanceMetrics.date, startDate));
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
        }
        catch (error) {
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
    async getUserAdStats(userId) {
        try {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            // Get counts
            const [dailyResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.adSessions.completed, true), (0, drizzle_orm_1.eq)(schema_1.adSessions.rewardClaimed, true), (0, drizzle_orm_1.gte)(schema_1.adSessions.startTime, oneDayAgo)));
            const [hourlyResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.adSessions.completed, true), (0, drizzle_orm_1.eq)(schema_1.adSessions.rewardClaimed, true), (0, drizzle_orm_1.gte)(schema_1.adSessions.startTime, oneHourAgo)));
            const [totalResult] = await db_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.adSessions.completed, true), (0, drizzle_orm_1.eq)(schema_1.adSessions.rewardClaimed, true)));
            // Check last ad time for rate limiting
            const [lastSession] = await db_1.db
                .select({ startTime: schema_1.adSessions.startTime })
                .from(schema_1.adSessions)
                .where((0, drizzle_orm_1.eq)(schema_1.adSessions.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.adSessions.startTime))
                .limit(1);
            const dailyRewards = dailyResult.count;
            const hourlyRewards = hourlyResult.count;
            const totalRewards = totalResult.count;
            let canWatchAd = true;
            let nextAdAvailableAt;
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
        }
        catch (error) {
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
exports.AdService = AdService;
// Export singleton instance
exports.adService = new AdService();
exports.default = exports.adService;
