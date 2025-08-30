import { db } from '../db.js';
import { 
  users, 
  deals, 
  analytics,
  userDailyStats,
  cohortAnalysis,
  userAcquisitionMetrics,
  engagementMetrics,
  revenueMetrics,
  premiumSubscriptions
} from '../../shared/schema.js';
import { eq, gte, lte, sql, and, desc, asc, count } from 'drizzle-orm';

export class BiAnalyticsService {
  /**
   * USER ACQUISITION METRICS
   */
  async calculateDailyUserAcquisition(date: Date): Promise<void> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // Count new signups
    const signupsResult = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, startOfDay),
        lte(users.createdAt, endOfDay)
      ));

    // Count users who made their first trade
    const firstTradesResult = await db
      .select({ count: count() })
      .from(deals)
      .innerJoin(users, eq(deals.userId, users.id))
      .where(and(
        gte(deals.openedAt, startOfDay),
        lte(deals.openedAt, endOfDay),
        sql`deals.id = (SELECT MIN(id) FROM deals d2 WHERE d2.user_id = deals.user_id)`
      ));

    // Calculate average time to first trade (in minutes)
    const avgTimeToFirstTradeResult = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM deals.opened_at - users.created_at) / 60)`
      })
      .from(deals)
      .innerJoin(users, eq(deals.userId, users.id))
      .where(and(
        gte(users.createdAt, startOfDay),
        lte(users.createdAt, endOfDay),
        sql`deals.id = (SELECT MIN(id) FROM deals d2 WHERE d2.user_id = deals.user_id)`
      ));

    const totalSignups = signupsResult[0]?.count || 0;
    const totalFirstTrades = firstTradesResult[0]?.count || 0;
    const avgTimeToFirstTrade = Math.round(avgTimeToFirstTradeResult[0]?.avgTime || 0);

    // Insert or update metrics
    await db.insert(userAcquisitionMetrics).values({
      date: startOfDay,
      totalInstalls: totalSignups, // We don't differentiate installs/signups yet
      totalSignups: totalSignups,
      totalFirstTrades: totalFirstTrades,
      totalFirstDeposits: 0, // Not implemented yet
      signupRate: 1.0, // 100% since signup = install for web
      tradeOpenRate: totalSignups > 0 ? totalFirstTrades / totalSignups : 0,
      avgTimeToFirstTrade: avgTimeToFirstTrade
    }).onConflictDoUpdate({
      target: userAcquisitionMetrics.date,
      set: {
        totalSignups: totalSignups,
        totalFirstTrades: totalFirstTrades,
        tradeOpenRate: totalSignups > 0 ? totalFirstTrades / totalSignups : 0,
        avgTimeToFirstTrade: avgTimeToFirstTrade
      }
    });
  }

  /**
   * ENGAGEMENT METRICS
   */
  async calculateDailyEngagement(date: Date): Promise<void> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily Active Users - users who did any activity today
    const dauResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(analytics)
      .where(and(
        gte(analytics.timestamp, startOfDay),
        lte(analytics.timestamp, endOfDay)
      ));

    // Weekly Active Users  
    const wauResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(analytics)
      .where(and(
        gte(analytics.timestamp, weekAgo),
        lte(analytics.timestamp, endOfDay)
      ));

    // Monthly Active Users
    const mauResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(analytics)
      .where(and(
        gte(analytics.timestamp, monthAgo),
        lte(analytics.timestamp, endOfDay)
      ));

    // Average session duration (from analytics events)
    const sessionDurationResult = await db
      .select({
        avgDuration: sql<number>`AVG(session_duration_minutes)`
      })
      .from(
        sql`(
          SELECT 
            user_id,
            session_id,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 as session_duration_minutes
          FROM analytics 
          WHERE timestamp >= ${startOfDay} AND timestamp <= ${endOfDay}
            AND session_id IS NOT NULL
          GROUP BY user_id, session_id
        ) sessions`
      );

    // Trading metrics for the day
    const tradingMetrics = await db
      .select({
        totalTrades: count(),
        totalVolume: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        avgTradesPerUser: sql<number>`COALESCE(COUNT(*) / NULLIF(COUNT(DISTINCT user_id), 0), 0)`,
        avgVirtualBalanceUsed: sql<number>`COALESCE(AVG(CAST(amount AS DECIMAL)), 0)`
      })
      .from(deals)
      .where(and(
        gte(deals.openedAt, startOfDay),
        lte(deals.openedAt, endOfDay)
      ));

    const dau = dauResult[0]?.count || 0;
    const wau = wauResult[0]?.count || 0; 
    const mau = mauResult[0]?.count || 0;
    const avgSessionDuration = Math.round(sessionDurationResult[0]?.avgDuration || 0);
    const trading = tradingMetrics[0];

    await db.insert(engagementMetrics).values({
      date: startOfDay,
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      monthlyActiveUsers: mau,
      avgSessionDuration: avgSessionDuration,
      avgScreensPerSession: 0, // Will calculate from screen_view events later
      avgTradesPerUser: Number(trading?.avgTradesPerUser || 0),
      avgVirtualBalanceUsed: Number(trading?.avgVirtualBalanceUsed || 0),
      totalTrades: Number(trading?.totalTrades || 0),
      totalVolume: Number(trading?.totalVolume || 0)
    }).onConflictDoUpdate({
      target: engagementMetrics.date,
      set: {
        dailyActiveUsers: dau,
        weeklyActiveUsers: wau,
        monthlyActiveUsers: mau,
        avgSessionDuration: avgSessionDuration,
        avgTradesPerUser: Number(trading?.avgTradesPerUser || 0),
        avgVirtualBalanceUsed: Number(trading?.avgVirtualBalanceUsed || 0),
        totalTrades: Number(trading?.totalTrades || 0),
        totalVolume: Number(trading?.totalVolume || 0)
      }
    });
  }

  /**
   * RETENTION ANALYSIS
   */
  async calculateCohortAnalysis(cohortWeek: Date): Promise<void> {
    const startOfWeek = new Date(cohortWeek.setDate(cohortWeek.getDate() - cohortWeek.getDay()));
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    // Get users who registered in this cohort week
    const cohortUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        gte(users.createdAt, startOfWeek),
        lte(users.createdAt, endOfWeek)
      ));

    const cohortUserIds = cohortUsers.map(u => u.id);
    const totalCohortUsers = cohortUserIds.length;

    if (totalCohortUsers === 0) return;

    // Calculate retention for each week (0-12 weeks)
    for (let weekNumber = 0; weekNumber <= 12; weekNumber++) {
      const periodStart = new Date(startOfWeek.getTime() + weekNumber * 7 * 24 * 60 * 60 * 1000);
      const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

      // Count how many cohort users were active in this period
      const activeUsersResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
        .from(analytics)
        .where(and(
          sql`user_id = ANY(${cohortUserIds})`,
          gte(analytics.timestamp, periodStart),
          lte(analytics.timestamp, periodEnd)
        ));

      const activeUsers = activeUsersResult[0]?.count || 0;
      const retentionRate = activeUsers / totalCohortUsers;

      // Calculate revenue metrics for this cohort in this period
      const revenueResult = await db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
          avgRevenue: sql<number>`COALESCE(AVG(CAST(amount AS DECIMAL)), 0)`
        })
        .from(premiumSubscriptions)
        .where(and(
          sql`user_id = ANY(${cohortUserIds})`,
          gte(premiumSubscriptions.startDate, periodStart),
          lte(premiumSubscriptions.startDate, periodEnd)
        ));

      await db.insert(cohortAnalysis).values({
        cohortWeek: startOfWeek,
        periodNumber: weekNumber,
        usersCount: activeUsers,
        retentionRate: retentionRate,
        totalRevenue: Number(revenueResult[0]?.totalRevenue || 0),
        avgRevenuePerUser: Number(revenueResult[0]?.avgRevenue || 0)
      }).onConflictDoUpdate({
        target: [cohortAnalysis.cohortWeek, cohortAnalysis.periodNumber],
        set: {
          usersCount: activeUsers,
          retentionRate: retentionRate,
          totalRevenue: Number(revenueResult[0]?.totalRevenue || 0),
          avgRevenuePerUser: Number(revenueResult[0]?.avgRevenue || 0)
        }
      });
    }
  }

  /**
   * REVENUE & MONETIZATION METRICS
   */
  async calculateDailyRevenue(date: Date): Promise<void> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // Premium subscription revenue
    const premiumRevenueResult = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        newPayingUsers: count()
      })
      .from(premiumSubscriptions)
      .where(and(
        gte(premiumSubscriptions.startDate, startOfDay),
        lte(premiumSubscriptions.startDate, endOfDay)
      ));

    // Total active users for ARPU calculation
    const totalActiveUsersResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(analytics)
      .where(and(
        gte(analytics.timestamp, startOfDay),
        lte(analytics.timestamp, endOfDay)
      ));

    // Total paying users (ever)
    const totalPayingUsersResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT user_id)` })
      .from(premiumSubscriptions);

    const premiumRevenue = Number(premiumRevenueResult[0]?.totalRevenue || 0);
    const newPayingUsers = premiumRevenueResult[0]?.newPayingUsers || 0;
    const totalActiveUsers = totalActiveUsersResult[0]?.count || 0;
    const totalPayingUsers = totalPayingUsersResult[0]?.count || 0;

    const totalRevenue = premiumRevenue; // + adRevenue when implemented
    const arpu = totalActiveUsers > 0 ? totalRevenue / totalActiveUsers : 0;
    const arppu = totalPayingUsers > 0 ? totalRevenue / totalPayingUsers : 0;
    const conversionRate = totalActiveUsers > 0 ? totalPayingUsers / totalActiveUsers : 0;

    await db.insert(revenueMetrics).values({
      date: startOfDay,
      totalRevenue: totalRevenue,
      premiumRevenue: premiumRevenue,
      adRevenue: 0, // To be implemented
      totalPayingUsers: totalPayingUsers,
      newPayingUsers: newPayingUsers,
      arpu: arpu,
      arppu: arppu,
      conversionRate: conversionRate,
      churnRate: 0, // Will calculate later
      lifetimeValue: 0 // Will calculate later
    }).onConflictDoUpdate({
      target: revenueMetrics.date,
      set: {
        totalRevenue: totalRevenue,
        premiumRevenue: premiumRevenue,
        totalPayingUsers: totalPayingUsers,
        newPayingUsers: newPayingUsers,
        arpu: arpu,
        arppu: arppu,
        conversionRate: conversionRate
      }
    });
  }

  /**
   * USER DASHBOARD METRICS
   */
  async getUserDashboardStats(userId: string): Promise<any> {
    // Get user's trading performance
    const tradingStats = await db
      .select({
        totalTrades: count(),
        totalVolume: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
        totalProfit: sql<number>`COALESCE(SUM(CASE WHEN status = 'closed' THEN CAST(profit AS DECIMAL) ELSE 0 END), 0)`,
        successfulTrades: sql<number>`COUNT(CASE WHEN status = 'closed' AND CAST(profit AS DECIMAL) > 0 THEN 1 END)`,
        maxProfit: sql<number>`COALESCE(MAX(CASE WHEN status = 'closed' THEN CAST(profit AS DECIMAL) END), 0)`,
        maxLoss: sql<number>`COALESCE(MIN(CASE WHEN status = 'closed' THEN CAST(profit AS DECIMAL) END), 0)`,
        avgTradeAmount: sql<number>`COALESCE(AVG(CAST(amount AS DECIMAL)), 0)`
      })
      .from(deals)
      .where(eq(deals.userId, userId));

    const stats = tradingStats[0];
    const successRate = stats.totalTrades > 0 ? (stats.successfulTrades / stats.totalTrades) * 100 : 0;

    return {
      totalTrades: stats.totalTrades,
      totalVolume: Number(stats.totalVolume),
      totalProfit: Number(stats.totalProfit),
      successRate: Math.round(successRate * 100) / 100,
      maxProfit: Number(stats.maxProfit),
      maxLoss: Number(stats.maxLoss),
      avgTradeAmount: Number(stats.avgTradeAmount)
    };
  }

  /**
   * TOP DEALS FOR USER DASHBOARD
   */
  async getUserTopDeals(userId: string, limit: number = 5): Promise<any[]> {
    const topDeals = await db
      .select({
        id: deals.id,
        symbol: deals.symbol,
        amount: deals.amount,
        profit: deals.profit,
        multiplier: deals.multiplier,
        openedAt: deals.openedAt,
        closedAt: deals.closedAt,
        status: deals.status
      })
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        sql`CAST(profit AS DECIMAL) > 0`
      ))
      .orderBy(desc(sql`CAST(profit AS DECIMAL)`))
      .limit(limit);

    return topDeals.map(deal => ({
      ...deal,
      profit: Number(deal.profit),
      amount: Number(deal.amount),
      duration: deal.closedAt && deal.openedAt 
        ? Math.round((deal.closedAt.getTime() - deal.openedAt.getTime()) / 1000 / 60) // minutes
        : 0
    }));
  }

  /**
   * PROFIT/LOSS CHART DATA
   */
  async getUserProfitChart(userId: string, days: number = 30): Promise<any[]> {
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const chartData = await db
      .select({
        date: sql<string>`DATE(closed_at)`,
        totalProfit: sql<number>`COALESCE(SUM(CAST(profit AS DECIMAL)), 0)`,
        tradesCount: count()
      })
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.status, 'closed'),
        gte(deals.closedAt, daysAgo)
      ))
      .groupBy(sql`DATE(closed_at)`)
      .orderBy(sql`DATE(closed_at)`);

    return chartData.map(item => ({
      date: item.date,
      profit: Number(item.totalProfit),
      trades: item.tradesCount
    }));
  }

  /**
   * ADMIN BI DASHBOARD DATA
   */
  async getAdminOverview(): Promise<any> {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get latest metrics
    const [
      latestEngagement,
      latestRevenue,
      latestAcquisition
    ] = await Promise.all([
      db.select().from(engagementMetrics).orderBy(desc(engagementMetrics.date)).limit(1),
      db.select().from(revenueMetrics).orderBy(desc(revenueMetrics.date)).limit(1),
      db.select().from(userAcquisitionMetrics).orderBy(desc(userAcquisitionMetrics.date)).limit(1)
    ]);

    return {
      engagement: latestEngagement[0] || null,
      revenue: latestRevenue[0] || null,
      acquisition: latestAcquisition[0] || null,
      overview: {
        totalUsers: await db.select({ count: count() }).from(users).then(r => r[0]?.count || 0),
        activeDeals: await db.select({ count: count() }).from(deals).where(eq(deals.status, 'active')).then(r => r[0]?.count || 0),
      }
    };
  }

  /**
   * BATCH PROCESS - Run all daily calculations
   */
  async processDailyMetrics(date: Date = new Date()): Promise<void> {
    console.log(`Processing metrics for ${date.toDateString()}`);
    
    try {
      await Promise.all([
        this.calculateDailyUserAcquisition(new Date(date)),
        this.calculateDailyEngagement(new Date(date)),
        this.calculateDailyRevenue(new Date(date))
      ]);
      
      console.log(`Daily metrics processed successfully for ${date.toDateString()}`);
    } catch (error) {
      console.error('Error processing daily metrics:', error);
      throw error;
    }
  }
}

export const biAnalyticsService = new BiAnalyticsService();