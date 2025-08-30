"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const redisService_js_1 = require("./redisService.js");
/**
 * Comprehensive Analytics Service for CryptoCraze BI System
 * Handles event collection, session tracking, cohort analysis, and metrics calculation
 */
class AnalyticsService {
    BATCH_SIZE = 100;
    CACHE_TTL = 300; // 5 minutes
    analyticsQueue = [];
    constructor() {
        this.initializeBatchProcessor();
    }
    /**
     * Initialize batch processing for analytics events
     */
    initializeBatchProcessor() {
        setInterval(async () => {
            if (this.analyticsQueue.length > 0) {
                await this.processBatchEvents();
            }
        }, 30000); // Process every 30 seconds
        // Also process immediately when batch size is reached
        setInterval(() => {
            if (this.analyticsQueue.length >= this.BATCH_SIZE) {
                this.processBatchEvents();
            }
        }, 1000);
    }
    /**
     * Enhanced analytics event recording with batching
     */
    async recordEvent(userId, eventType, eventData, sessionId, userAgent, ipAddress) {
        const event = {
            userId,
            eventType,
            eventData,
            sessionId,
            userAgent,
            ipAddress,
            timestamp: new Date(),
        };
        // Add to batch queue
        this.analyticsQueue.push(event);
        // Process immediately for critical events
        const criticalEvents = ['user_signup', 'first_trade', 'premium_purchase'];
        if (criticalEvents.includes(eventType)) {
            await this.processBatchEvents();
        }
    }
    /**
     * Process batch of analytics events
     */
    async processBatchEvents() {
        if (this.analyticsQueue.length === 0)
            return;
        const events = this.analyticsQueue.splice(0, this.BATCH_SIZE);
        try {
            await db_js_1.db.insert(schema_1.analytics).values(events);
            // Process special events for enhanced tracking
            for (const event of events) {
                await this.processSpecialEvent(event);
            }
        }
        catch (error) {
            console.error('Error processing analytics batch:', error);
            // Re-add failed events to queue for retry
            this.analyticsQueue.unshift(...events);
        }
    }
    /**
     * Process special events for enhanced analytics
     */
    async processSpecialEvent(event) {
        switch (event.eventType) {
            case 'session_start':
                await this.startUserSession(event);
                break;
            case 'session_end':
                await this.endUserSession(event);
                break;
            case 'user_install':
                await this.trackUserAcquisition(event);
                break;
            case 'ad_impression':
            case 'ad_click':
            case 'ad_reward':
                await this.trackAdEvent(event);
                break;
        }
    }
    /**
     * Start a new user session
     */
    async startUserSession(sessionData) {
        const sessionInsert = {
            userId: sessionData.userId,
            sessionId: sessionData.sessionId,
            startTime: new Date(),
            deviceInfo: sessionData.deviceInfo,
            screensOpened: 0,
            tradesOpened: 0,
            adsWatched: 0,
            virtualBalanceUsed: '0',
        };
        await db_js_1.db.insert(schema_1.userSessions).values(sessionInsert);
    }
    /**
     * End user session and calculate metrics
     */
    async endUserSession(sessionData) {
        const endTime = new Date();
        const sessionResults = await db_js_1.db
            .select()
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.sessionId, sessionData.sessionId))
            .limit(1);
        if (sessionResults.length === 0)
            return;
        const session = sessionResults[0];
        const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
        await db_js_1.db
            .update(schema_1.userSessions)
            .set({
            endTime,
            duration,
            screensOpened: sessionData.screensOpened || session.screensOpened,
            tradesOpened: sessionData.tradesOpened || session.tradesOpened,
            adsWatched: sessionData.adsWatched || session.adsWatched,
            virtualBalanceUsed: sessionData.virtualBalanceUsed || session.virtualBalanceUsed,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.userSessions.sessionId, sessionData.sessionId));
    }
    /**
     * Track user acquisition
     */
    async trackUserAcquisition(acquisitionData) {
        const acquisitionInsert = {
            userId: acquisitionData.userId,
            installDate: new Date(),
            acquisitionSource: acquisitionData.acquisitionSource,
            campaignId: acquisitionData.campaignId,
            utmSource: acquisitionData.utmSource,
            utmMedium: acquisitionData.utmMedium,
            utmCampaign: acquisitionData.utmCampaign,
            referralCode: acquisitionData.referralCode,
        };
        await db_js_1.db
            .insert(schema_1.userAcquisition)
            .values(acquisitionInsert)
            .onConflictDoNothing();
    }
    /**
     * Track ad events
     */
    async trackAdEvent(adData) {
        const adEventInsert = {
            userId: adData.userId,
            sessionId: adData.sessionId,
            adType: adData.adType,
            adNetwork: adData.adNetwork,
            eventType: adData.eventType,
            rewardAmount: adData.rewardAmount,
            rewardType: adData.rewardType,
            revenue: adData.revenue,
            metadata: adData.metadata,
        };
        await db_js_1.db.insert(schema_1.adEvents).values(adEventInsert);
    }
    /**
     * Get User Acquisition Metrics
     */
    async getUserAcquisitionMetrics(startDate, endDate) {
        const cacheKey = `user_acquisition_${startDate.toISOString()}_${endDate.toISOString()}`;
        const cached = await redisService_js_1.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Total installs in period
        const installs = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.userAcquisition)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userAcquisition.installDate, startDate), (0, drizzle_orm_1.lt)(schema_1.userAcquisition.installDate, endDate)));
        // Signups (users with signup date)
        const signups = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.userAcquisition)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userAcquisition.installDate, startDate), (0, drizzle_orm_1.lt)(schema_1.userAcquisition.installDate, endDate), (0, drizzle_orm_1.sql) `${schema_1.userAcquisition.signupDate} IS NOT NULL`));
        // First trades
        const firstTrades = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.userAcquisition)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userAcquisition.installDate, startDate), (0, drizzle_orm_1.lt)(schema_1.userAcquisition.installDate, endDate), (0, drizzle_orm_1.sql) `${schema_1.userAcquisition.firstTradeDate} IS NOT NULL`));
        // Installs by source
        const installsBySource = await db_js_1.db
            .select({
            source: schema_1.userAcquisition.acquisitionSource,
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.userAcquisition)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userAcquisition.installDate, startDate), (0, drizzle_orm_1.lt)(schema_1.userAcquisition.installDate, endDate)))
            .groupBy(schema_1.userAcquisition.acquisitionSource);
        // Daily installs
        const dailyInstalls = await db_js_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(${schema_1.userAcquisition.installDate})`,
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.userAcquisition)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userAcquisition.installDate, startDate), (0, drizzle_orm_1.lt)(schema_1.userAcquisition.installDate, endDate)))
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.userAcquisition.installDate})`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(${schema_1.userAcquisition.installDate})`);
        const totalInstalls = installs[0]?.count || 0;
        const totalSignups = signups[0]?.count || 0;
        const totalFirstTrades = firstTrades[0]?.count || 0;
        const metrics = {
            installs: totalInstalls,
            signupRate: totalInstalls > 0 ? (totalSignups / totalInstalls) * 100 : 0,
            tradeOpenRate: totalSignups > 0 ? (totalFirstTrades / totalSignups) * 100 : 0,
            installsBySource: installsBySource.map(item => ({
                source: item.source || 'unknown',
                count: item.count
            })),
            dailyInstalls: dailyInstalls.map(item => ({
                date: item.date,
                count: item.count
            }))
        };
        await redisService_js_1.redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
        return metrics;
    }
    /**
     * Get Engagement Metrics
     */
    async getEngagementMetrics(startDate, endDate) {
        const cacheKey = `engagement_${startDate.toISOString()}_${endDate.toISOString()}`;
        const cached = await redisService_js_1.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Daily Active Users
        const dauResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)(drizzle_orm_1.sql.distinct(schema_1.userSessions.userId)) })
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userSessions.startTime, startDate), (0, drizzle_orm_1.lt)(schema_1.userSessions.startTime, endDate)));
        // Weekly Active Users (last 7 days from end date)
        const wauStart = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const wauResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)(drizzle_orm_1.sql.distinct(schema_1.userSessions.userId)) })
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userSessions.startTime, wauStart), (0, drizzle_orm_1.lt)(schema_1.userSessions.startTime, endDate)));
        // Monthly Active Users (last 30 days)
        const mauStart = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const mauResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)(drizzle_orm_1.sql.distinct(schema_1.userSessions.userId)) })
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userSessions.startTime, mauStart), (0, drizzle_orm_1.lt)(schema_1.userSessions.startTime, endDate)));
        // Session metrics
        const sessionMetrics = await db_js_1.db
            .select({
            avgSessions: (0, drizzle_orm_1.avg)((0, drizzle_orm_1.sql) `1`),
            avgDuration: (0, drizzle_orm_1.avg)(schema_1.userSessions.duration),
            avgTrades: (0, drizzle_orm_1.avg)(schema_1.userSessions.tradesOpened),
            avgVirtualBalance: (0, drizzle_orm_1.avg)((0, drizzle_orm_1.sql) `CAST(${schema_1.userSessions.virtualBalanceUsed} AS DECIMAL)`)
        })
            .from(schema_1.userSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userSessions.startTime, startDate), (0, drizzle_orm_1.lt)(schema_1.userSessions.startTime, endDate), (0, drizzle_orm_1.sql) `${schema_1.userSessions.endTime} IS NOT NULL`));
        // Screen opens by type from analytics
        const screenOpens = await db_js_1.db
            .select({
            screen: (0, drizzle_orm_1.sql) `${schema_1.analytics.eventData}->>'screen'`,
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.analytics)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analytics.eventType, 'screen_view'), (0, drizzle_orm_1.gte)(schema_1.analytics.timestamp, startDate), (0, drizzle_orm_1.lt)(schema_1.analytics.timestamp, endDate)))
            .groupBy((0, drizzle_orm_1.sql) `${schema_1.analytics.eventData}->>'screen'`);
        const metrics = {
            dailyActiveUsers: dauResult[0]?.count || 0,
            weeklyActiveUsers: wauResult[0]?.count || 0,
            monthlyActiveUsers: mauResult[0]?.count || 0,
            avgSessionsPerUser: Number(sessionMetrics[0]?.avgSessions || 0),
            avgSessionDuration: Number(sessionMetrics[0]?.avgDuration || 0) / 60, // convert to minutes
            tradesPerUser: Number(sessionMetrics[0]?.avgTrades || 0),
            avgVirtualBalanceUsed: sessionMetrics[0]?.avgVirtualBalance?.toString() || '0',
            screenOpensByType: screenOpens
                .filter(item => item.screen)
                .map(item => ({
                screen: item.screen,
                count: item.count
            }))
        };
        await redisService_js_1.redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
        return metrics;
    }
    /**
     * Calculate retention metrics with cohort analysis
     */
    async getRetentionMetrics(cohortStartDate, cohortEndDate) {
        const cacheKey = `retention_${cohortStartDate.toISOString()}_${cohortEndDate.toISOString()}`;
        const cached = await redisService_js_1.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Update cohort data first
        await this.updateCohortData(cohortStartDate, cohortEndDate);
        // Calculate retention rates
        const retentionRates = await db_js_1.db
            .select({
            day: schema_1.userCohorts.daysSinceInstall,
            totalUsers: (0, drizzle_orm_1.count)(),
            activeUsers: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.userCohorts.isActive} THEN 1 ELSE 0 END`)
        })
            .from(schema_1.userCohorts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userCohorts.cohortDate, cohortStartDate), (0, drizzle_orm_1.lt)(schema_1.userCohorts.cohortDate, cohortEndDate), (0, drizzle_orm_1.sql) `${schema_1.userCohorts.daysSinceInstall} IN (1, 3, 7, 30)`))
            .groupBy(schema_1.userCohorts.daysSinceInstall);
        const getRetentionRate = (day) => {
            const rate = retentionRates.find(r => r.day === day);
            if (!rate || !rate.totalUsers)
                return 0;
            return (Number(rate.activeUsers) / rate.totalUsers) * 100;
        };
        // Cohort analysis
        const cohortData = await this.getCohortAnalysis(cohortStartDate, cohortEndDate);
        // Calculate churn rate (users who haven't been active in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const totalUsersResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.gte)(schema_1.users.createdAt, cohortStartDate));
        const recentActiveUsersResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)(drizzle_orm_1.sql.distinct(schema_1.userSessions.userId)) })
            .from(schema_1.userSessions)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.userSessions.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.users.createdAt, cohortStartDate), (0, drizzle_orm_1.gte)(schema_1.userSessions.startTime, sevenDaysAgo)));
        const totalUsers = totalUsersResult[0]?.count || 0;
        const activeUsers = recentActiveUsersResult[0]?.count || 0;
        const churnRate = totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0;
        const metrics = {
            d1: getRetentionRate(1),
            d3: getRetentionRate(3),
            d7: getRetentionRate(7),
            d30: getRetentionRate(30),
            churnRate,
            cohortAnalysis: cohortData
        };
        await redisService_js_1.redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
        return metrics;
    }
    /**
     * Update cohort data for retention analysis
     */
    async updateCohortData(startDate, endDate) {
        // Get all users in the cohort period
        const cohortUsers = await db_js_1.db
            .select({
            userId: schema_1.users.id,
            installDate: (0, drizzle_orm_1.sql) `DATE(${schema_1.users.createdAt})`
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.users.createdAt, startDate), (0, drizzle_orm_1.lt)(schema_1.users.createdAt, endDate)));
        // For each user, calculate their activity for each day since install
        for (const user of cohortUsers) {
            const installDate = new Date(user.installDate);
            const today = new Date();
            const daysSinceInstall = Math.floor((today.getTime() - installDate.getTime()) / (24 * 60 * 60 * 1000));
            for (let day = 1; day <= Math.min(daysSinceInstall, 30); day++) {
                const targetDate = new Date(installDate.getTime() + day * 24 * 60 * 60 * 1000);
                const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
                // Check if user was active on this day
                const sessionCount = await db_js_1.db
                    .select({ count: (0, drizzle_orm_1.count)() })
                    .from(schema_1.userSessions)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userSessions.userId, user.userId), (0, drizzle_orm_1.gte)(schema_1.userSessions.startTime, targetDate), (0, drizzle_orm_1.lt)(schema_1.userSessions.startTime, nextDay)));
                const isActive = (sessionCount[0]?.count || 0) > 0;
                // Upsert cohort record
                await db_js_1.db
                    .insert(schema_1.userCohorts)
                    .values({
                    userId: user.userId,
                    cohortDate: installDate,
                    daysSinceInstall: day,
                    isActive,
                    recordDate: targetDate,
                    tradesCount: 0,
                    sessionDuration: 0,
                    virtualBalanceUsed: '0'
                })
                    .onConflictDoUpdate({
                    target: [schema_1.userCohorts.userId, schema_1.userCohorts.cohortDate, schema_1.userCohorts.daysSinceInstall],
                    set: { isActive, recordDate: targetDate }
                });
            }
        }
    }
    /**
     * Get detailed cohort analysis
     */
    async getCohortAnalysis(startDate, endDate) {
        const cohorts = await db_js_1.db
            .select({
            cohortDate: (0, drizzle_orm_1.sql) `DATE(${schema_1.userCohorts.cohortDate})`,
            usersCount: (0, drizzle_orm_1.count)(drizzle_orm_1.sql.distinct(schema_1.userCohorts.userId))
        })
            .from(schema_1.userCohorts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.userCohorts.cohortDate, startDate), (0, drizzle_orm_1.lt)(schema_1.userCohorts.cohortDate, endDate)))
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.userCohorts.cohortDate})`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(${schema_1.userCohorts.cohortDate})`);
        const cohortData = [];
        for (const cohort of cohorts) {
            const retentionByDay = await db_js_1.db
                .select({
                day: schema_1.userCohorts.daysSinceInstall,
                retained: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.userCohorts.isActive} THEN 1 ELSE 0 END`)
            })
                .from(schema_1.userCohorts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `DATE(${schema_1.userCohorts.cohortDate}) = ${cohort.cohortDate}`, (0, drizzle_orm_1.sql) `${schema_1.userCohorts.daysSinceInstall} <= 30`))
                .groupBy(schema_1.userCohorts.daysSinceInstall)
                .orderBy(schema_1.userCohorts.daysSinceInstall);
            cohortData.push({
                cohortDate: cohort.cohortDate,
                usersCount: cohort.usersCount,
                retentionByDay: retentionByDay.map(retention => ({
                    day: retention.day,
                    retained: Number(retention.retained),
                    percentage: cohort.usersCount > 0 ? (Number(retention.retained) / cohort.usersCount) * 100 : 0
                }))
            });
        }
        return cohortData;
    }
    /**
     * Get monetization metrics
     */
    async getMonetizationMetrics(startDate, endDate) {
        const cacheKey = `monetization_${startDate.toISOString()}_${endDate.toISOString()}`;
        const cached = await redisService_js_1.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Total revenue from premium subscriptions
        const revenueResult = await db_js_1.db
            .select({
            totalRevenue: (0, drizzle_orm_1.sum)(schema_1.premiumSubscriptions.amount),
            subscriptionCount: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.premiumSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.premiumSubscriptions.createdAt, startDate), (0, drizzle_orm_1.lt)(schema_1.premiumSubscriptions.createdAt, endDate), (0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.status, 'succeeded')));
        // Total users in period
        const totalUsersResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.users.createdAt, startDate), (0, drizzle_orm_1.lt)(schema_1.users.createdAt, endDate)));
        // Paying users
        const payingUsersResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)(drizzle_orm_1.sql.distinct(schema_1.premiumSubscriptions.userId)) })
            .from(schema_1.premiumSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.premiumSubscriptions.createdAt, startDate), (0, drizzle_orm_1.lt)(schema_1.premiumSubscriptions.createdAt, endDate), (0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.status, 'succeeded')));
        // Revenue by source (plan type)
        const revenueBySource = await db_js_1.db
            .select({
            source: schema_1.premiumSubscriptions.planType,
            amount: (0, drizzle_orm_1.sum)(schema_1.premiumSubscriptions.amount)
        })
            .from(schema_1.premiumSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.premiumSubscriptions.createdAt, startDate), (0, drizzle_orm_1.lt)(schema_1.premiumSubscriptions.createdAt, endDate), (0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.status, 'succeeded')))
            .groupBy(schema_1.premiumSubscriptions.planType);
        const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
        const totalUsers = totalUsersResult[0]?.count || 0;
        const payingUsers = payingUsersResult[0]?.count || 0;
        const metrics = {
            totalRevenue: totalRevenue.toString(),
            arpu: totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : '0',
            arppu: payingUsers > 0 ? (totalRevenue / payingUsers).toFixed(2) : '0',
            conversionToPaid: totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0,
            premiumSubscriptions: revenueResult[0]?.subscriptionCount || 0,
            revenueBySource: revenueBySource.map(item => ({
                source: item.source || 'unknown',
                amount: Number(item.amount || 0).toString()
            }))
        };
        await redisService_js_1.redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
        return metrics;
    }
    /**
     * Get ad performance metrics
     */
    async getAdPerformanceMetrics(startDate, endDate) {
        const cacheKey = `ad_performance_${startDate.toISOString()}_${endDate.toISOString()}`;
        const cached = await redisService_js_1.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Ad events summary
        const adMetrics = await db_js_1.db
            .select({
            eventType: schema_1.adEvents.eventType,
            count: (0, drizzle_orm_1.count)(),
            revenue: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CAST(${schema_1.adEvents.revenue} AS DECIMAL)`)
        })
            .from(schema_1.adEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.adEvents.timestamp, startDate), (0, drizzle_orm_1.lt)(schema_1.adEvents.timestamp, endDate)))
            .groupBy(schema_1.adEvents.eventType);
        const impressions = adMetrics.find(m => m.eventType === 'impression')?.count || 0;
        const clicks = adMetrics.find(m => m.eventType === 'click')?.count || 0;
        const rewards = adMetrics.find(m => m.eventType === 'reward')?.count || 0;
        const totalRevenue = adMetrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0);
        // Performance by network
        const performanceByNetwork = await db_js_1.db
            .select({
            network: schema_1.adEvents.adNetwork,
            impressions: (0, drizzle_orm_1.count)(),
            revenue: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CAST(${schema_1.adEvents.revenue} AS DECIMAL)`)
        })
            .from(schema_1.adEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.adEvents.timestamp, startDate), (0, drizzle_orm_1.lt)(schema_1.adEvents.timestamp, endDate), (0, drizzle_orm_1.eq)(schema_1.adEvents.eventType, 'impression')))
            .groupBy(schema_1.adEvents.adNetwork);
        // Calculate derived metrics
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        // CPI and CPA would typically come from external ad platforms
        // For now, we'll calculate estimated values based on revenue
        const estimatedCPI = impressions > 0 ? totalRevenue / impressions : 0;
        const estimatedCPA = rewards > 0 ? totalRevenue / rewards : 0;
        // ROAS calculation would require cost data from ad platforms
        const estimatedROAS = totalRevenue > 0 ? totalRevenue / (totalRevenue * 0.7) : 0; // Assuming 70% cost
        const metrics = {
            impressions,
            clicks,
            ctr,
            rewards,
            revenue: totalRevenue.toFixed(6),
            cpi: estimatedCPI.toFixed(6),
            cpa: estimatedCPA.toFixed(6),
            roas: estimatedROAS,
            performanceByNetwork: performanceByNetwork.map(item => ({
                network: item.network || 'unknown',
                impressions: item.impressions,
                revenue: Number(item.revenue || 0).toFixed(6)
            }))
        };
        await redisService_js_1.redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
        return metrics;
    }
    /**
     * Get comprehensive user dashboard metrics
     */
    async getUserDashboardMetrics(userId) {
        const cacheKey = `user_dashboard_${userId}`;
        const cached = await redisService_js_1.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        // Get user data
        const user = await db_js_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (user.length === 0) {
            throw new Error('User not found');
        }
        const userData = user[0];
        // Top 5 profitable deals
        const topDeals = await this.getUserTopDeals(userId, 5);
        // Profit/Loss chart data (last 30 days)
        const profitLossChart = await this.getUserProfitLossChart(userId, 30);
        // Trading performance metrics
        const tradingPerformance = await this.getUserTradingPerformance(userId);
        // Real-time stats
        const realtimeStats = await this.getUserRealtimeStats(userId);
        const metrics = {
            totalTrades: Number(userData.tradesCount || 0),
            successfulTradesPercentage: Number(userData.successfulTradesPercentage || 0),
            totalProfit: this.calculateTotalProfit(profitLossChart),
            maxProfit: userData.maxProfit || '0',
            maxLoss: userData.maxLoss || '0',
            averageTradeAmount: userData.averageTradeAmount || '0',
            topDeals,
            profitLossChart,
            tradingPerformance,
            realtimeStats
        };
        await redisService_js_1.redisService.setex(cacheKey, 60, JSON.stringify(metrics)); // 1 minute cache
        return metrics;
    }
    /**
     * Get user's top deals
     */
    async getUserTopDeals(userId, limit) {
        const topDealsResult = await db_js_1.db
            .select()
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed'), (0, drizzle_orm_1.sql) `${schema_1.deals.profit} IS NOT NULL`))
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `CAST(${schema_1.deals.profit} AS DECIMAL)`))
            .limit(limit);
        return topDealsResult.map(deal => {
            const openPrice = Number(deal.openPrice);
            const closePrice = Number(deal.closePrice || 0);
            const profit = Number(deal.profit || 0);
            const profitPercentage = openPrice > 0 ? (profit / Number(deal.amount)) * 100 : 0;
            const duration = deal.closedAt && deal.openedAt
                ? Math.floor((deal.closedAt.getTime() - deal.openedAt.getTime()) / (60 * 1000))
                : 0;
            return {
                id: deal.id,
                symbol: deal.symbol,
                direction: deal.direction,
                profit: deal.profit || '0',
                profitPercentage,
                openPrice: deal.openPrice,
                closePrice: deal.closePrice || '0',
                openedAt: deal.openedAt.toISOString(),
                closedAt: deal.closedAt?.toISOString() || '',
                duration
            };
        });
    }
    /**
     * Get user's profit/loss chart data
     */
    async getUserProfitLossChart(userId, days) {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        const dailyData = await db_js_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(${schema_1.deals.closedAt})`,
            totalProfit: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CASE WHEN CAST(${schema_1.deals.profit} AS DECIMAL) > 0 THEN CAST(${schema_1.deals.profit} AS DECIMAL) ELSE 0 END`),
            totalLoss: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CASE WHEN CAST(${schema_1.deals.profit} AS DECIMAL) < 0 THEN ABS(CAST(${schema_1.deals.profit} AS DECIMAL)) ELSE 0 END`),
            netProfit: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CAST(${schema_1.deals.profit} AS DECIMAL)`),
            tradesCount: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed'), (0, drizzle_orm_1.gte)(schema_1.deals.closedAt, startDate), (0, drizzle_orm_1.lt)(schema_1.deals.closedAt, endDate), (0, drizzle_orm_1.sql) `${schema_1.deals.profit} IS NOT NULL`))
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.deals.closedAt})`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(${schema_1.deals.closedAt})`);
        return dailyData.map(data => ({
            date: data.date,
            profit: Number(data.totalProfit || 0).toString(),
            loss: Number(data.totalLoss || 0).toString(),
            netProfit: Number(data.netProfit || 0).toString(),
            tradesCount: data.tradesCount
        }));
    }
    /**
     * Get user's trading performance metrics
     */
    async getUserTradingPerformance(userId) {
        const closedDeals = await db_js_1.db
            .select()
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed'), (0, drizzle_orm_1.sql) `${schema_1.deals.profit} IS NOT NULL`));
        if (closedDeals.length === 0) {
            return {
                winRate: 0,
                avgWinAmount: '0',
                avgLossAmount: '0',
                profitFactor: 0,
                sharpeRatio: 0,
                maxDrawdown: '0',
                bestTradingDay: '0',
                worstTradingDay: '0'
            };
        }
        const wins = closedDeals.filter(deal => Number(deal.profit) > 0);
        const losses = closedDeals.filter(deal => Number(deal.profit) < 0);
        const totalWinAmount = wins.reduce((sum, deal) => sum + Number(deal.profit), 0);
        const totalLossAmount = Math.abs(losses.reduce((sum, deal) => sum + Number(deal.profit), 0));
        const winRate = (wins.length / closedDeals.length) * 100;
        const avgWinAmount = wins.length > 0 ? totalWinAmount / wins.length : 0;
        const avgLossAmount = losses.length > 0 ? totalLossAmount / losses.length : 0;
        const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : 0;
        // Calculate max drawdown
        let maxDrawdown = 0;
        let currentDrawdown = 0;
        let peak = 0;
        let runningTotal = 0;
        for (const deal of closedDeals.sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime())) {
            runningTotal += Number(deal.profit);
            if (runningTotal > peak) {
                peak = runningTotal;
                currentDrawdown = 0;
            }
            else {
                currentDrawdown = peak - runningTotal;
                if (currentDrawdown > maxDrawdown) {
                    maxDrawdown = currentDrawdown;
                }
            }
        }
        // Get best/worst trading days
        const dailyResults = await db_js_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(${schema_1.deals.closedAt})`,
            dailyProfit: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CAST(${schema_1.deals.profit} AS DECIMAL)`)
        })
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed'), (0, drizzle_orm_1.sql) `${schema_1.deals.profit} IS NOT NULL`))
            .groupBy((0, drizzle_orm_1.sql) `DATE(${schema_1.deals.closedAt})`);
        const bestDay = Math.max(...dailyResults.map(d => Number(d.dailyProfit)));
        const worstDay = Math.min(...dailyResults.map(d => Number(d.dailyProfit)));
        // Simple Sharpe ratio calculation (would need risk-free rate for accuracy)
        const returns = dailyResults.map(d => Number(d.dailyProfit));
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const returnStdDev = Math.sqrt(returnVariance);
        const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
        return {
            winRate,
            avgWinAmount: avgWinAmount.toString(),
            avgLossAmount: avgLossAmount.toString(),
            profitFactor,
            sharpeRatio,
            maxDrawdown: maxDrawdown.toString(),
            bestTradingDay: bestDay.toString(),
            worstTradingDay: worstDay.toString()
        };
    }
    /**
     * Get user's real-time stats
     */
    async getUserRealtimeStats(userId) {
        const user = await db_js_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).limit(1);
        if (user.length === 0)
            throw new Error('User not found');
        const userData = user[0];
        // Open deals count
        const openDealsResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'open')));
        // Today's profit and trades
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const todayResults = await db_js_1.db
            .select({
            profit: (0, drizzle_orm_1.sum)((0, drizzle_orm_1.sql) `CAST(${schema_1.deals.profit} AS DECIMAL)`),
            count: (0, drizzle_orm_1.count)()
        })
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed'), (0, drizzle_orm_1.gte)(schema_1.deals.closedAt, today), (0, drizzle_orm_1.lt)(schema_1.deals.closedAt, tomorrow)));
        // Calculate current streak
        const recentDeals = await db_js_1.db
            .select()
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed'), (0, drizzle_orm_1.sql) `${schema_1.deals.profit} IS NOT NULL`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.deals.closedAt))
            .limit(50);
        let currentStreak = 0;
        let streakType = 'win';
        if (recentDeals.length > 0) {
            const isFirstWin = Number(recentDeals[0].profit) > 0;
            streakType = isFirstWin ? 'win' : 'loss';
            for (const deal of recentDeals) {
                const isWin = Number(deal.profit) > 0;
                if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
                    currentStreak++;
                }
                else {
                    break;
                }
            }
        }
        return {
            currentBalance: userData.balance || '0',
            freeBalance: userData.freeBalance || '0',
            openDealsCount: openDealsResult[0]?.count || 0,
            todayProfit: todayResults[0]?.profit?.toString() || '0',
            todayTrades: todayResults[0]?.count || 0,
            currentStreak,
            streakType
        };
    }
    /**
     * Calculate total profit from chart data
     */
    calculateTotalProfit(chartData) {
        const total = chartData.reduce((sum, point) => sum + Number(point.netProfit), 0);
        return total.toString();
    }
    /**
     * Generate daily metrics aggregation (scheduled job)
     */
    async generateDailyMetrics(date) {
        const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        // Get all metrics for the day
        const [userAcquisition, engagement, retention, monetization, adPerformance] = await Promise.all([
            this.getUserAcquisitionMetrics(date, nextDay),
            this.getEngagementMetrics(date, nextDay),
            this.getRetentionMetrics(date, nextDay),
            this.getMonetizationMetrics(date, nextDay),
            this.getAdPerformanceMetrics(date, nextDay)
        ]);
        // Insert or update daily metrics
        await db_js_1.db
            .insert(schema_1.dailyMetrics)
            .values({
            date,
            newInstalls: userAcquisition.installs,
            newSignups: Math.round((userAcquisition.installs * userAcquisition.signupRate) / 100),
            newFirstTrades: Math.round((userAcquisition.installs * userAcquisition.tradeOpenRate) / 100),
            dailyActiveUsers: engagement.dailyActiveUsers,
            totalSessions: 0, // Would need to calculate from sessions
            avgSessionDuration: engagement.avgSessionDuration.toString(),
            totalTradesOpened: 0, // Would need to calculate from deals
            totalScreensOpened: 0, // Would need to calculate from analytics
            avgVirtualBalanceUsed: engagement.avgVirtualBalanceUsed,
            retentionD1: retention.d1.toString(),
            retentionD3: retention.d3.toString(),
            retentionD7: retention.d7.toString(),
            retentionD30: retention.d30.toString(),
            totalRevenue: monetization.totalRevenue,
            premiumSubscriptions: monetization.premiumSubscriptions,
            arpu: monetization.arpu,
            arppu: monetization.arppu,
            adImpressions: adPerformance.impressions,
            adClicks: adPerformance.clicks,
            adRewards: adPerformance.rewards,
            adRevenue: adPerformance.revenue,
            ctr: adPerformance.ctr.toString()
        })
            .onConflictDoUpdate({
            target: schema_1.dailyMetrics.date,
            set: {
                updatedAt: new Date(),
                newInstalls: userAcquisition.installs,
                dailyActiveUsers: engagement.dailyActiveUsers,
                totalRevenue: monetization.totalRevenue,
                adImpressions: adPerformance.impressions
            }
        });
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
