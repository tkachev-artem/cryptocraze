import { db } from '../db.js';
import {
  analytics,
  userSessions,
  userAcquisition,
  adEvents,
  dailyMetrics,
  userCohorts,
  users,
  deals,
  premiumSubscriptions,
  type InsertUserSession,
  type InsertUserAcquisition,
  type InsertAdEvent,
  type InsertUserCohort,
  type UserAcquisitionMetrics,
  type EngagementMetrics,
  type RetentionMetrics,
  type MonetizationMetrics,
  type AdPerformanceMetrics,
  type UserDashboardMetrics,
  type TopDeal,
  type ProfitLossDataPoint,
  type TradingPerformanceMetrics,
  type RealtimeStats,
  type CohortData
} from '../../shared/schema';
import { eq, and, gte, lt, sql, desc, asc, count, sum, avg, max, min } from 'drizzle-orm';
import { redisService } from './redisService.js';
import { GeoLocationService } from './geoLocationService.js';

/**
 * Comprehensive Analytics Service for CryptoCraze BI System
 * Handles event collection, session tracking, cohort analysis, and metrics calculation
 */
export class AnalyticsService {
  private readonly BATCH_SIZE = 100;
  private readonly CACHE_TTL = 300; // 5 minutes
  private analyticsQueue: any[] = [];

  constructor() {
    this.initializeBatchProcessor();
  }

  /**
   * Initialize batch processing for analytics events
   */
  private initializeBatchProcessor() {
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
  async recordEvent(
    userId: string | null,
    eventType: string,
    eventData: any,
    sessionId?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    // Определяем страну по IP адресу
    const country = ipAddress ? GeoLocationService.getCountryFromIP(ipAddress) : 'Unknown';
    
    const event = {
      userId,
      eventType,
      eventData,
      sessionId,
      userAgent,
      ipAddress,
      country,
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
  private async processBatchEvents(): Promise<void> {
    if (this.analyticsQueue.length === 0) return;

    const events = this.analyticsQueue.splice(0, this.BATCH_SIZE);
    
    try {
      await db.insert(analytics).values(events);
      
      // Process special events for enhanced tracking
      for (const event of events) {
        await this.processSpecialEvent(event);
      }
    } catch (error) {
      console.error('Error processing analytics batch:', error);
      // Re-add failed events to queue for retry
      this.analyticsQueue.unshift(...events);
    }
  }

  /**
   * Process special events for enhanced analytics
   */
  private async processSpecialEvent(event: any): Promise<void> {
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
  async startUserSession(sessionData: {
    userId: string;
    sessionId: string;
    deviceInfo?: any;
  }): Promise<void> {
    const sessionInsert: InsertUserSession = {
      userId: sessionData.userId,
      sessionId: sessionData.sessionId,
      startTime: new Date(),
      deviceInfo: sessionData.deviceInfo,
      screensOpened: 0,
      tradesOpened: 0,
      adsWatched: 0,
      virtualBalanceUsed: '0',
    };

    await db.insert(userSessions).values(sessionInsert);
  }

  /**
   * End user session and calculate metrics
   */
  async endUserSession(sessionData: {
    sessionId: string;
    screensOpened?: number;
    tradesOpened?: number;
    adsWatched?: number;
    virtualBalanceUsed?: string;
  }): Promise<void> {
    const endTime = new Date();
    const sessionResults = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionId, sessionData.sessionId))
      .limit(1);

    if (sessionResults.length === 0) return;

    const session = sessionResults[0];
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

    await db
      .update(userSessions)
      .set({
        endTime,
        duration,
        screensOpened: sessionData.screensOpened || session.screensOpened,
        tradesOpened: sessionData.tradesOpened || session.tradesOpened,
        adsWatched: sessionData.adsWatched || session.adsWatched,
        virtualBalanceUsed: sessionData.virtualBalanceUsed || session.virtualBalanceUsed,
      })
      .where(eq(userSessions.sessionId, sessionData.sessionId));
  }

  /**
   * Track user acquisition
   */
  async trackUserAcquisition(acquisitionData: {
    userId: string;
    acquisitionSource?: string;
    campaignId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referralCode?: string;
  }): Promise<void> {
    const acquisitionInsert: InsertUserAcquisition = {
      userId: acquisitionData.userId,
      installDate: new Date(),
      acquisitionSource: acquisitionData.acquisitionSource,
      campaignId: acquisitionData.campaignId,
      utmSource: acquisitionData.utmSource,
      utmMedium: acquisitionData.utmMedium,
      utmCampaign: acquisitionData.utmCampaign,
      referralCode: acquisitionData.referralCode,
    };

    await db
      .insert(userAcquisition)
      .values(acquisitionInsert)
      .onConflictDoNothing();
  }

  /**
   * Track ad events
   */
  async trackAdEvent(adData: {
    userId?: string;
    sessionId?: string;
    adType: string;
    adNetwork?: string;
    eventType: string;
    rewardAmount?: string;
    rewardType?: string;
    revenue?: string;
    metadata?: any;
  }): Promise<void> {
    const adEventInsert: InsertAdEvent = {
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

    await db.insert(adEvents).values(adEventInsert);
  }

  /**
   * Get User Acquisition Metrics
   */
  async getUserAcquisitionMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<UserAcquisitionMetrics> {
    const cacheKey = `user_acquisition_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Total installs in period
    const installs = await db
      .select({ count: count() })
      .from(userAcquisition)
      .where(and(
        gte(userAcquisition.installDate, startDate),
        lt(userAcquisition.installDate, endDate)
      ));

    // Signups (users with signup date)
    const signups = await db
      .select({ count: count() })
      .from(userAcquisition)
      .where(and(
        gte(userAcquisition.installDate, startDate),
        lt(userAcquisition.installDate, endDate),
        sql`${userAcquisition.signupDate} IS NOT NULL`
      ));

    // First trades
    const firstTrades = await db
      .select({ count: count() })
      .from(userAcquisition)
      .where(and(
        gte(userAcquisition.installDate, startDate),
        lt(userAcquisition.installDate, endDate),
        sql`${userAcquisition.firstTradeDate} IS NOT NULL`
      ));

    // Installs by source
    const installsBySource = await db
      .select({
        source: userAcquisition.acquisitionSource,
        count: count()
      })
      .from(userAcquisition)
      .where(and(
        gte(userAcquisition.installDate, startDate),
        lt(userAcquisition.installDate, endDate)
      ))
      .groupBy(userAcquisition.acquisitionSource);

    // Daily installs
    const dailyInstalls = await db
      .select({
        date: sql<string>`DATE(${userAcquisition.installDate})`,
        count: count()
      })
      .from(userAcquisition)
      .where(and(
        gte(userAcquisition.installDate, startDate),
        lt(userAcquisition.installDate, endDate)
      ))
      .groupBy(sql`DATE(${userAcquisition.installDate})`)
      .orderBy(sql`DATE(${userAcquisition.installDate})`);

    const totalInstalls = installs[0]?.count || 0;
    const totalSignups = signups[0]?.count || 0;
    const totalFirstTrades = firstTrades[0]?.count || 0;

    const metrics: UserAcquisitionMetrics = {
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

    await redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Get Engagement Metrics
   */
  async getEngagementMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<EngagementMetrics> {
    const cacheKey = `engagement_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Daily Active Users
    const dauResult = await db
      .select({ count: count(sql.distinct(userSessions.userId)) })
      .from(userSessions)
      .where(and(
        gte(userSessions.startTime, startDate),
        lt(userSessions.startTime, endDate)
      ));

    // Weekly Active Users (last 7 days from end date)
    const wauStart = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const wauResult = await db
      .select({ count: count(sql.distinct(userSessions.userId)) })
      .from(userSessions)
      .where(and(
        gte(userSessions.startTime, wauStart),
        lt(userSessions.startTime, endDate)
      ));

    // Monthly Active Users (last 30 days)
    const mauStart = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const mauResult = await db
      .select({ count: count(sql.distinct(userSessions.userId)) })
      .from(userSessions)
      .where(and(
        gte(userSessions.startTime, mauStart),
        lt(userSessions.startTime, endDate)
      ));

    // Session metrics
    const sessionMetrics = await db
      .select({
        avgSessions: avg(sql<number>`1`),
        avgDuration: avg(userSessions.duration),
        avgTrades: avg(userSessions.tradesOpened),
        avgVirtualBalance: avg(sql<number>`CAST(${userSessions.virtualBalanceUsed} AS DECIMAL)`)
      })
      .from(userSessions)
      .where(and(
        gte(userSessions.startTime, startDate),
        lt(userSessions.startTime, endDate),
        sql`${userSessions.endTime} IS NOT NULL`
      ));

    // Screen opens by type from analytics
    const screenOpens = await db
      .select({
        screen: sql<string>`${analytics.eventData}->>'screen'`,
        count: count()
      })
      .from(analytics)
      .where(and(
        eq(analytics.eventType, 'screen_view'),
        gte(analytics.timestamp, startDate),
        lt(analytics.timestamp, endDate)
      ))
      .groupBy(sql`${analytics.eventData}->>'screen'`);

    const metrics: EngagementMetrics = {
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

    await redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Calculate retention metrics with cohort analysis
   */
  async getRetentionMetrics(
    cohortStartDate: Date,
    cohortEndDate: Date
  ): Promise<RetentionMetrics> {
    const cacheKey = `retention_${cohortStartDate.toISOString()}_${cohortEndDate.toISOString()}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Update cohort data first
    await this.updateCohortData(cohortStartDate, cohortEndDate);

    // Calculate retention rates
    const retentionRates = await db
      .select({
        day: userCohorts.daysSinceInstall,
        totalUsers: count(),
        activeUsers: sum(sql<number>`CASE WHEN ${userCohorts.isActive} THEN 1 ELSE 0 END`)
      })
      .from(userCohorts)
      .where(and(
        gte(userCohorts.cohortDate, cohortStartDate),
        lt(userCohorts.cohortDate, cohortEndDate),
        sql`${userCohorts.daysSinceInstall} IN (1, 3, 7, 30)`
      ))
      .groupBy(userCohorts.daysSinceInstall);

    const getRetentionRate = (day: number): number => {
      const rate = retentionRates.find(r => r.day === day);
      if (!rate || !rate.totalUsers) return 0;
      return (Number(rate.activeUsers) / rate.totalUsers) * 100;
    };

    // Cohort analysis
    const cohortData = await this.getCohortAnalysis(cohortStartDate, cohortEndDate);

    // Calculate churn rate (users who haven't been active in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, cohortStartDate));

    const recentActiveUsersResult = await db
      .select({ count: count(sql.distinct(userSessions.userId)) })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .where(and(
        gte(users.createdAt, cohortStartDate),
        gte(userSessions.startTime, sevenDaysAgo)
      ));

    const totalUsers = totalUsersResult[0]?.count || 0;
    const activeUsers = recentActiveUsersResult[0]?.count || 0;
    const churnRate = totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0;

    const metrics: RetentionMetrics = {
      d1: getRetentionRate(1),
      d3: getRetentionRate(3),
      d7: getRetentionRate(7),
      d30: getRetentionRate(30),
      churnRate,
      cohortAnalysis: cohortData
    };

    await redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Update cohort data for retention analysis
   */
  private async updateCohortData(startDate: Date, endDate: Date): Promise<void> {
    // Get all users in the cohort period
    const cohortUsers = await db
      .select({
        userId: users.id,
        installDate: sql<Date>`DATE(${users.createdAt})`
      })
      .from(users)
      .where(and(
        gte(users.createdAt, startDate),
        lt(users.createdAt, endDate)
      ));

    // For each user, calculate their activity for each day since install
    for (const user of cohortUsers) {
      const installDate = new Date(user.installDate);
      const today = new Date();
      const daysSinceInstall = Math.floor((today.getTime() - installDate.getTime()) / (24 * 60 * 60 * 1000));

      for (let day = 1; day <= Math.min(daysSinceInstall, 30); day++) {
        const targetDate = new Date(installDate.getTime() + day * 24 * 60 * 60 * 1000);
        const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

        // Check if user was active on this day
        const sessionCount = await db
          .select({ count: count() })
          .from(userSessions)
          .where(and(
            eq(userSessions.userId, user.userId),
            gte(userSessions.startTime, targetDate),
            lt(userSessions.startTime, nextDay)
          ));

        const isActive = (sessionCount[0]?.count || 0) > 0;

        // Upsert cohort record
        await db
          .insert(userCohorts)
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
            target: [userCohorts.userId, userCohorts.cohortDate, userCohorts.daysSinceInstall],
            set: { isActive, recordDate: targetDate }
          });
      }
    }
  }

  /**
   * Get detailed cohort analysis
   */
  private async getCohortAnalysis(startDate: Date, endDate: Date): Promise<CohortData[]> {
    const cohorts = await db
      .select({
        cohortDate: sql<string>`DATE(${userCohorts.cohortDate})`,
        usersCount: count(sql.distinct(userCohorts.userId))
      })
      .from(userCohorts)
      .where(and(
        gte(userCohorts.cohortDate, startDate),
        lt(userCohorts.cohortDate, endDate)
      ))
      .groupBy(sql`DATE(${userCohorts.cohortDate})`)
      .orderBy(sql`DATE(${userCohorts.cohortDate})`);

    const cohortData: CohortData[] = [];

    for (const cohort of cohorts) {
      const retentionByDay = await db
        .select({
          day: userCohorts.daysSinceInstall,
          retained: sum(sql<number>`CASE WHEN ${userCohorts.isActive} THEN 1 ELSE 0 END`)
        })
        .from(userCohorts)
        .where(and(
          sql`DATE(${userCohorts.cohortDate}) = ${cohort.cohortDate}`,
          sql`${userCohorts.daysSinceInstall} <= 30`
        ))
        .groupBy(userCohorts.daysSinceInstall)
        .orderBy(userCohorts.daysSinceInstall);

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
  async getMonetizationMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<MonetizationMetrics> {
    const cacheKey = `monetization_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Total revenue from premium subscriptions
    const revenueResult = await db
      .select({
        totalRevenue: sum(premiumSubscriptions.amount),
        subscriptionCount: count()
      })
      .from(premiumSubscriptions)
      .where(and(
        gte(premiumSubscriptions.createdAt, startDate),
        lt(premiumSubscriptions.createdAt, endDate),
        eq(premiumSubscriptions.status, 'succeeded')
      ));

    // Total users in period
    const totalUsersResult = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, startDate),
        lt(users.createdAt, endDate)
      ));

    // Paying users
    const payingUsersResult = await db
      .select({ count: count(sql.distinct(premiumSubscriptions.userId)) })
      .from(premiumSubscriptions)
      .where(and(
        gte(premiumSubscriptions.createdAt, startDate),
        lt(premiumSubscriptions.createdAt, endDate),
        eq(premiumSubscriptions.status, 'succeeded')
      ));

    // Revenue by source (plan type)
    const revenueBySource = await db
      .select({
        source: premiumSubscriptions.planType,
        amount: sum(premiumSubscriptions.amount)
      })
      .from(premiumSubscriptions)
      .where(and(
        gte(premiumSubscriptions.createdAt, startDate),
        lt(premiumSubscriptions.createdAt, endDate),
        eq(premiumSubscriptions.status, 'succeeded')
      ))
      .groupBy(premiumSubscriptions.planType);

    const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    const totalUsers = totalUsersResult[0]?.count || 0;
    const payingUsers = payingUsersResult[0]?.count || 0;

    const metrics: MonetizationMetrics = {
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

    await redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Get ad performance metrics
   */
  async getAdPerformanceMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<AdPerformanceMetrics> {
    const cacheKey = `ad_performance_${startDate.toISOString()}_${endDate.toISOString()}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Ad events summary
    const adMetrics = await db
      .select({
        eventType: adEvents.eventType,
        count: count(),
        revenue: sum(sql<number>`CAST(${adEvents.revenue} AS DECIMAL)`)
      })
      .from(adEvents)
      .where(and(
        gte(adEvents.timestamp, startDate),
        lt(adEvents.timestamp, endDate)
      ))
      .groupBy(adEvents.eventType);

    const impressions = adMetrics.find(m => m.eventType === 'impression')?.count || 0;
    const clicks = adMetrics.find(m => m.eventType === 'click')?.count || 0;
    const rewards = adMetrics.find(m => m.eventType === 'reward')?.count || 0;
    const totalRevenue = adMetrics.reduce((sum, m) => sum + Number(m.revenue || 0), 0);

    // Performance by network
    const performanceByNetwork = await db
      .select({
        network: adEvents.adNetwork,
        impressions: count(),
        revenue: sum(sql<number>`CAST(${adEvents.revenue} AS DECIMAL)`)
      })
      .from(adEvents)
      .where(and(
        gte(adEvents.timestamp, startDate),
        lt(adEvents.timestamp, endDate),
        eq(adEvents.eventType, 'impression')
      ))
      .groupBy(adEvents.adNetwork);

    // Calculate derived metrics
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    
    // CPI and CPA would typically come from external ad platforms
    // For now, we'll calculate estimated values based on revenue
    const estimatedCPI = impressions > 0 ? totalRevenue / impressions : 0;
    const estimatedCPA = rewards > 0 ? totalRevenue / rewards : 0;
    
    // ROAS calculation would require cost data from ad platforms
    const estimatedROAS = totalRevenue > 0 ? totalRevenue / (totalRevenue * 0.7) : 0; // Assuming 70% cost

    const metrics: AdPerformanceMetrics = {
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

    await redisService.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
    return metrics;
  }

  /**
   * Get comprehensive user dashboard metrics
   */
  async getUserDashboardMetrics(userId: string): Promise<UserDashboardMetrics> {
    const cacheKey = `user_dashboard_${userId}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get user data
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
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

    const metrics: UserDashboardMetrics = {
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

    await redisService.setex(cacheKey, 60, JSON.stringify(metrics)); // 1 minute cache
    return metrics;
  }

  /**
   * Get user's top deals
   */
  private async getUserTopDeals(userId: string, limit: number): Promise<TopDeal[]> {
    const topDealsResult = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        sql`${deals.profit} IS NOT NULL`
      ))
      .orderBy(desc(sql<number>`CAST(${deals.profit} AS DECIMAL)`))
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
        direction: deal.direction as 'up' | 'down',
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
  private async getUserProfitLossChart(userId: string, days: number): Promise<ProfitLossDataPoint[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const dailyData = await db
      .select({
        date: sql<string>`DATE(${deals.closedAt})`,
        totalProfit: sum(sql<number>`CASE WHEN CAST(${deals.profit} AS DECIMAL) > 0 THEN CAST(${deals.profit} AS DECIMAL) ELSE 0 END`),
        totalLoss: sum(sql<number>`CASE WHEN CAST(${deals.profit} AS DECIMAL) < 0 THEN ABS(CAST(${deals.profit} AS DECIMAL)) ELSE 0 END`),
        netProfit: sum(sql<number>`CAST(${deals.profit} AS DECIMAL)`),
        tradesCount: count()
      })
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        gte(deals.closedAt, startDate),
        lt(deals.closedAt, endDate),
        sql`${deals.profit} IS NOT NULL`
      ))
      .groupBy(sql`DATE(${deals.closedAt})`)
      .orderBy(sql`DATE(${deals.closedAt})`);

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
  private async getUserTradingPerformance(userId: string): Promise<TradingPerformanceMetrics> {
    const closedDeals = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        sql`${deals.profit} IS NOT NULL`
      ));

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

    for (const deal of closedDeals.sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime())) {
      runningTotal += Number(deal.profit);
      if (runningTotal > peak) {
        peak = runningTotal;
        currentDrawdown = 0;
      } else {
        currentDrawdown = peak - runningTotal;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }
      }
    }

    // Get best/worst trading days
    const dailyResults = await db
      .select({
        date: sql<string>`DATE(${deals.closedAt})`,
        dailyProfit: sum(sql<number>`CAST(${deals.profit} AS DECIMAL)`)
      })
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        sql`${deals.profit} IS NOT NULL`
      ))
      .groupBy(sql`DATE(${deals.closedAt})`);

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
  private async getUserRealtimeStats(userId: string): Promise<RealtimeStats> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) throw new Error('User not found');

    const userData = user[0];

    // Open deals count
    const openDealsResult = await db
      .select({ count: count() })
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'open')
      ));

    // Today's profit and trades
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const todayResults = await db
      .select({
        profit: sum(sql<number>`CAST(${deals.profit} AS DECIMAL)`),
        count: count()
      })
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        gte(deals.closedAt, today),
        lt(deals.closedAt, tomorrow)
      ));

    // Calculate current streak
    const recentDeals = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        sql`${deals.profit} IS NOT NULL`
      ))
      .orderBy(desc(deals.closedAt))
      .limit(50);

    let currentStreak = 0;
    let streakType: 'win' | 'loss' = 'win';

    if (recentDeals.length > 0) {
      const isFirstWin = Number(recentDeals[0].profit) > 0;
      streakType = isFirstWin ? 'win' : 'loss';

      for (const deal of recentDeals) {
        const isWin = Number(deal.profit) > 0;
        if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
          currentStreak++;
        } else {
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
  private calculateTotalProfit(chartData: ProfitLossDataPoint[]): string {
    const total = chartData.reduce((sum, point) => sum + Number(point.netProfit), 0);
    return total.toString();
  }

  /**
   * Generate daily metrics aggregation (scheduled job)
   */
  async generateDailyMetrics(date: Date): Promise<void> {
    const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    // Get all metrics for the day
    const [
      userAcquisition,
      engagement,
      retention,
      monetization,
      adPerformance
    ] = await Promise.all([
      this.getUserAcquisitionMetrics(date, nextDay),
      this.getEngagementMetrics(date, nextDay),
      this.getRetentionMetrics(date, nextDay),
      this.getMonetizationMetrics(date, nextDay),
      this.getAdPerformanceMetrics(date, nextDay)
    ]);

    // Insert or update daily metrics
    await db
      .insert(dailyMetrics)
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
        target: dailyMetrics.date,
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

export const analyticsService = new AnalyticsService();