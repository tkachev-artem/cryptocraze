"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.biAnalyticsService = exports.BiAnalyticsService = void 0;
const db_js_1 = require("../db.js");
const schema_js_1 = require("../../shared/schema.js");
const drizzle_orm_1 = require("drizzle-orm");
class BiAnalyticsService {
    /**
     * USER ACQUISITION METRICS
     */
    async calculateDailyUserAcquisition(date) {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        // Count new signups
        const signupsResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.users.createdAt, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.users.createdAt, endOfDay)));
        // Count users who made their first trade
        const firstTradesResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.count)() })
            .from(schema_js_1.deals)
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.deals.userId, schema_js_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.deals.openedAt, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.deals.openedAt, endOfDay), (0, drizzle_orm_1.sql) `deals.id = (SELECT MIN(id) FROM deals d2 WHERE d2.user_id = deals.user_id)`));
        // Calculate average time to first trade (in minutes)
        const avgTimeToFirstTradeResult = await db_js_1.db
            .select({
            avgTime: (0, drizzle_orm_1.sql) `AVG(EXTRACT(EPOCH FROM deals.opened_at - users.created_at) / 60)`
        })
            .from(schema_js_1.deals)
            .innerJoin(schema_js_1.users, (0, drizzle_orm_1.eq)(schema_js_1.deals.userId, schema_js_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.users.createdAt, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.users.createdAt, endOfDay), (0, drizzle_orm_1.sql) `deals.id = (SELECT MIN(id) FROM deals d2 WHERE d2.user_id = deals.user_id)`));
        const totalSignups = signupsResult[0]?.count || 0;
        const totalFirstTrades = firstTradesResult[0]?.count || 0;
        const avgTimeToFirstTrade = Math.round(avgTimeToFirstTradeResult[0]?.avgTime || 0);
        // Insert or update metrics
        await db_js_1.db.insert(schema_js_1.userAcquisitionMetrics).values({
            date: startOfDay,
            totalInstalls: totalSignups, // We don't differentiate installs/signups yet
            totalSignups: totalSignups,
            totalFirstTrades: totalFirstTrades,
            totalFirstDeposits: 0, // Not implemented yet
            signupRate: 1.0, // 100% since signup = install for web
            tradeOpenRate: totalSignups > 0 ? totalFirstTrades / totalSignups : 0,
            avgTimeToFirstTrade: avgTimeToFirstTrade
        }).onConflictDoUpdate({
            target: schema_js_1.userAcquisitionMetrics.date,
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
    async calculateDailyEngagement(date) {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Daily Active Users - users who did any activity today
        const dauResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT user_id)` })
            .from(schema_js_1.analytics)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.analytics.timestamp, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.analytics.timestamp, endOfDay)));
        // Weekly Active Users  
        const wauResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT user_id)` })
            .from(schema_js_1.analytics)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.analytics.timestamp, weekAgo), (0, drizzle_orm_1.lte)(schema_js_1.analytics.timestamp, endOfDay)));
        // Monthly Active Users
        const mauResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT user_id)` })
            .from(schema_js_1.analytics)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.analytics.timestamp, monthAgo), (0, drizzle_orm_1.lte)(schema_js_1.analytics.timestamp, endOfDay)));
        // Average session duration (from analytics events)
        const sessionDurationResult = await db_js_1.db
            .select({
            avgDuration: (0, drizzle_orm_1.sql) `AVG(session_duration_minutes)`
        })
            .from((0, drizzle_orm_1.sql) `(
          SELECT 
            user_id,
            session_id,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 60 as session_duration_minutes
          FROM analytics 
          WHERE timestamp >= ${startOfDay} AND timestamp <= ${endOfDay}
            AND session_id IS NOT NULL
          GROUP BY user_id, session_id
        ) sessions`);
        // Trading metrics for the day
        const tradingMetrics = await db_js_1.db
            .select({
            totalTrades: (0, drizzle_orm_1.count)(),
            totalVolume: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
            avgTradesPerUser: (0, drizzle_orm_1.sql) `COALESCE(COUNT(*) / NULLIF(COUNT(DISTINCT user_id), 0), 0)`,
            avgVirtualBalanceUsed: (0, drizzle_orm_1.sql) `COALESCE(AVG(CAST(amount AS DECIMAL)), 0)`
        })
            .from(schema_js_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.deals.openedAt, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.deals.openedAt, endOfDay)));
        const dau = dauResult[0]?.count || 0;
        const wau = wauResult[0]?.count || 0;
        const mau = mauResult[0]?.count || 0;
        const avgSessionDuration = Math.round(sessionDurationResult[0]?.avgDuration || 0);
        const trading = tradingMetrics[0];
        await db_js_1.db.insert(schema_js_1.engagementMetrics).values({
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
            target: schema_js_1.engagementMetrics.date,
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
    async calculateCohortAnalysis(cohortWeek) {
        const startOfWeek = new Date(cohortWeek.setDate(cohortWeek.getDate() - cohortWeek.getDay()));
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        // Get users who registered in this cohort week
        const cohortUsers = await db_js_1.db
            .select({ id: schema_js_1.users.id })
            .from(schema_js_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.users.createdAt, startOfWeek), (0, drizzle_orm_1.lte)(schema_js_1.users.createdAt, endOfWeek)));
        const cohortUserIds = cohortUsers.map(u => u.id);
        const totalCohortUsers = cohortUserIds.length;
        if (totalCohortUsers === 0)
            return;
        // Calculate retention for each week (0-12 weeks)
        for (let weekNumber = 0; weekNumber <= 12; weekNumber++) {
            const periodStart = new Date(startOfWeek.getTime() + weekNumber * 7 * 24 * 60 * 60 * 1000);
            const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
            // Count how many cohort users were active in this period
            const activeUsersResult = await db_js_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT user_id)` })
                .from(schema_js_1.analytics)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `user_id = ANY(${cohortUserIds})`, (0, drizzle_orm_1.gte)(schema_js_1.analytics.timestamp, periodStart), (0, drizzle_orm_1.lte)(schema_js_1.analytics.timestamp, periodEnd)));
            const activeUsers = activeUsersResult[0]?.count || 0;
            const retentionRate = activeUsers / totalCohortUsers;
            // Calculate revenue metrics for this cohort in this period
            const revenueResult = await db_js_1.db
                .select({
                totalRevenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
                avgRevenue: (0, drizzle_orm_1.sql) `COALESCE(AVG(CAST(amount AS DECIMAL)), 0)`
            })
                .from(schema_js_1.premiumSubscriptions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `user_id = ANY(${cohortUserIds})`, (0, drizzle_orm_1.gte)(schema_js_1.premiumSubscriptions.startDate, periodStart), (0, drizzle_orm_1.lte)(schema_js_1.premiumSubscriptions.startDate, periodEnd)));
            await db_js_1.db.insert(schema_js_1.cohortAnalysis).values({
                cohortWeek: startOfWeek,
                periodNumber: weekNumber,
                usersCount: activeUsers,
                retentionRate: retentionRate,
                totalRevenue: Number(revenueResult[0]?.totalRevenue || 0),
                avgRevenuePerUser: Number(revenueResult[0]?.avgRevenue || 0)
            }).onConflictDoUpdate({
                target: [schema_js_1.cohortAnalysis.cohortWeek, schema_js_1.cohortAnalysis.periodNumber],
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
    async calculateDailyRevenue(date) {
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));
        // Premium subscription revenue
        const premiumRevenueResult = await db_js_1.db
            .select({
            totalRevenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
            newPayingUsers: (0, drizzle_orm_1.count)()
        })
            .from(schema_js_1.premiumSubscriptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.premiumSubscriptions.startDate, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.premiumSubscriptions.startDate, endOfDay)));
        // Total active users for ARPU calculation
        const totalActiveUsersResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT user_id)` })
            .from(schema_js_1.analytics)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_js_1.analytics.timestamp, startOfDay), (0, drizzle_orm_1.lte)(schema_js_1.analytics.timestamp, endOfDay)));
        // Total paying users (ever)
        const totalPayingUsersResult = await db_js_1.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT user_id)` })
            .from(schema_js_1.premiumSubscriptions);
        const premiumRevenue = Number(premiumRevenueResult[0]?.totalRevenue || 0);
        const newPayingUsers = premiumRevenueResult[0]?.newPayingUsers || 0;
        const totalActiveUsers = totalActiveUsersResult[0]?.count || 0;
        const totalPayingUsers = totalPayingUsersResult[0]?.count || 0;
        const totalRevenue = premiumRevenue; // + adRevenue when implemented
        const arpu = totalActiveUsers > 0 ? totalRevenue / totalActiveUsers : 0;
        const arppu = totalPayingUsers > 0 ? totalRevenue / totalPayingUsers : 0;
        const conversionRate = totalActiveUsers > 0 ? totalPayingUsers / totalActiveUsers : 0;
        await db_js_1.db.insert(schema_js_1.revenueMetrics).values({
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
            target: schema_js_1.revenueMetrics.date,
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
    async getUserDashboardStats(userId) {
        // Get user's trading performance
        const tradingStats = await db_js_1.db
            .select({
            totalTrades: (0, drizzle_orm_1.count)(),
            totalVolume: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
            totalProfit: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN status = 'closed' THEN CAST(profit AS DECIMAL) ELSE 0 END), 0)`,
            successfulTrades: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN status = 'closed' AND CAST(profit AS DECIMAL) > 0 THEN 1 END)`,
            maxProfit: (0, drizzle_orm_1.sql) `COALESCE(MAX(CASE WHEN status = 'closed' THEN CAST(profit AS DECIMAL) END), 0)`,
            maxLoss: (0, drizzle_orm_1.sql) `COALESCE(MIN(CASE WHEN status = 'closed' THEN CAST(profit AS DECIMAL) END), 0)`,
            avgTradeAmount: (0, drizzle_orm_1.sql) `COALESCE(AVG(CAST(amount AS DECIMAL)), 0)`
        })
            .from(schema_js_1.deals)
            .where((0, drizzle_orm_1.eq)(schema_js_1.deals.userId, userId));
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
    async getUserTopDeals(userId, limit = 5) {
        const topDeals = await db_js_1.db
            .select({
            id: schema_js_1.deals.id,
            symbol: schema_js_1.deals.symbol,
            amount: schema_js_1.deals.amount,
            profit: schema_js_1.deals.profit,
            multiplier: schema_js_1.deals.multiplier,
            openedAt: schema_js_1.deals.openedAt,
            closedAt: schema_js_1.deals.closedAt,
            status: schema_js_1.deals.status
        })
            .from(schema_js_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.deals.status, 'closed'), (0, drizzle_orm_1.sql) `CAST(profit AS DECIMAL) > 0`))
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `CAST(profit AS DECIMAL)`))
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
    async getUserProfitChart(userId, days = 30) {
        const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const chartData = await db_js_1.db
            .select({
            date: (0, drizzle_orm_1.sql) `DATE(closed_at)`,
            totalProfit: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(profit AS DECIMAL)), 0)`,
            tradesCount: (0, drizzle_orm_1.count)()
        })
            .from(schema_js_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_js_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_js_1.deals.status, 'closed'), (0, drizzle_orm_1.gte)(schema_js_1.deals.closedAt, daysAgo)))
            .groupBy((0, drizzle_orm_1.sql) `DATE(closed_at)`)
            .orderBy((0, drizzle_orm_1.sql) `DATE(closed_at)`);
        return chartData.map(item => ({
            date: item.date,
            profit: Number(item.totalProfit),
            trades: item.tradesCount
        }));
    }
    /**
     * ADMIN BI DASHBOARD DATA
     */
    async getAdminOverview() {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        // Get latest metrics
        const [latestEngagement, latestRevenue, latestAcquisition] = await Promise.all([
            db_js_1.db.select().from(schema_js_1.engagementMetrics).orderBy((0, drizzle_orm_1.desc)(schema_js_1.engagementMetrics.date)).limit(1),
            db_js_1.db.select().from(schema_js_1.revenueMetrics).orderBy((0, drizzle_orm_1.desc)(schema_js_1.revenueMetrics.date)).limit(1),
            db_js_1.db.select().from(schema_js_1.userAcquisitionMetrics).orderBy((0, drizzle_orm_1.desc)(schema_js_1.userAcquisitionMetrics.date)).limit(1)
        ]);
        return {
            engagement: latestEngagement[0] || null,
            revenue: latestRevenue[0] || null,
            acquisition: latestAcquisition[0] || null,
            overview: {
                totalUsers: await db_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.users).then(r => r[0]?.count || 0),
                activeDeals: await db_js_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_js_1.deals).where((0, drizzle_orm_1.eq)(schema_js_1.deals.status, 'active')).then(r => r[0]?.count || 0),
            }
        };
    }
    /**
     * BATCH PROCESS - Run all daily calculations
     */
    async processDailyMetrics(date = new Date()) {
        console.log(`Processing metrics for ${date.toDateString()}`);
        try {
            await Promise.all([
                this.calculateDailyUserAcquisition(new Date(date)),
                this.calculateDailyEngagement(new Date(date)),
                this.calculateDailyRevenue(new Date(date))
            ]);
            console.log(`Daily metrics processed successfully for ${date.toDateString()}`);
        }
        catch (error) {
            console.error('Error processing daily metrics:', error);
            throw error;
        }
    }
}
exports.BiAnalyticsService = BiAnalyticsService;
exports.biAnalyticsService = new BiAnalyticsService();
