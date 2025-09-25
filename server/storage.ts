import {
  users,
  analytics,
  deals,
  userNotifications,
  premiumSubscriptions,
  premiumPlans,
  type User,
  type UpsertUser,
  type Analytics,
  type Deal,
  type UserNotification,
  type PremiumSubscription,
  type PremiumPlan,
} from "../shared/schema";
import { db } from "./db.js";
import { applyAutoRewards } from './services/autoRewards.js';
import { eq, desc, and, sql, sum, count, avg, max } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Analytics
  recordAnalyticsEvent(userId: string | null, eventType: string, eventData: any, sessionId?: string, userAgent?: string, ipAddress?: string): Promise<void>;
  
  // User balance operations
  updateUserBalance(userId: string, amount: number): Promise<void>;
  updateUserFreeBalance(userId: string, amount: number): Promise<void>;
  updateUserCoins(userId: string, amount: number): Promise<void>;
  
  // Deals operations
  getUserDeals(userId: string): Promise<Deal[]>;
  getUserActiveDeals(userId: string): Promise<Deal[]>;
  updateDealTpSl(dealId: number, userId: string, takeProfit?: number, stopLoss?: number): Promise<Deal | null>;
  getDealById(dealId: number, userId: string): Promise<Deal | null>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(limit = 100, offset = 0): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }


  

  // Analytics
  async recordAnalyticsEvent(userId: string | null, eventType: string, eventData: any, sessionId?: string, userAgent?: string, ipAddress?: string): Promise<void> {
    await db.insert(analytics).values({
      userId,
      eventType,
      eventData,
      sessionId,
      userAgent,
      ipAddress,
    });

    // Also forward to ClickHouse for important events
    if (eventType === 'daily_reward_claimed' || 
        eventType === 'tutorial_progress' || 
        eventType === 'trade_open' || 
        eventType === 'ad_watch' || 
        eventType === 'page_view' ||
        eventType === 'login' ||
        eventType === 'engagement') {
      try {
        const { clickhouseAnalyticsService } = await import('./services/clickhouseAnalyticsService.js');
        await clickhouseAnalyticsService.logUserEvent(
          userId || "999999999",
          eventType,
          eventData || {},
          sessionId
        );
        console.log(`[Storage] Forwarded ${eventType} event to ClickHouse for user ${userId}`);
      } catch (error) {
        console.warn(`[Storage] Failed to forward ${eventType} event to ClickHouse:`, error);
      }
    }
  }

  // User balance operations
  async updateUserBalance(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${amount}`,
      })
      .where(eq(users.id, userId));
    // Триггер автоначисления уровней
    await applyAutoRewards(userId);
  }

  async updateUserFreeBalance(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({
        freeBalance: sql`${users.freeBalance} + ${amount}`,
      })
      .where(eq(users.id, userId));
    // Триггер автоначисления уровней
    await applyAutoRewards(userId);
  }

  async updateUserCoins(userId: string, amount: number): Promise<void> {
    await db
      .update(users)
      .set({
        coins: sql`${users.coins} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getUserDeals(userId: string): Promise<Deal[]> {
    const rows = await db
      .select()
      .from(deals)
      .where(eq(deals.userId, userId))
      .orderBy(desc(deals.openedAt));
    return rows.map((r: any) => ({
      id: r.id,
      userId: String(r.userId),
      symbol: String(r.symbol),
      direction: (r.direction as 'up' | 'down'),
      amount: String(r.amount),
      multiplier: Number(r.multiplier),
      openPrice: String(r.openPrice),
      takeProfit: r.takeProfit != null ? String(r.takeProfit) : undefined,
      stopLoss: r.stopLoss != null ? String(r.stopLoss) : undefined,
      openedAt: r.openedAt,
      status: r.status as 'open' | 'closed',
      closedAt: r.closedAt ?? undefined,
      closePrice: r.closePrice != null ? String(r.closePrice) : undefined,
      profit: r.profit != null ? String(r.profit) : undefined,
    }));
  }

  async getUserActiveDeals(userId: string): Promise<Deal[]> {
    const rows = await db
      .select()
      .from(deals)
      .where(and(eq(deals.userId, userId), eq(deals.status, 'open')))
      .orderBy(desc(deals.openedAt));
    return rows.map((r: any) => ({
      id: r.id,
      userId: String(r.userId),
      symbol: String(r.symbol),
      direction: (r.direction as 'up' | 'down'),
      amount: String(r.amount),
      multiplier: Number(r.multiplier),
      openPrice: String(r.openPrice),
      takeProfit: r.takeProfit != null ? String(r.takeProfit) : undefined,
      stopLoss: r.stopLoss != null ? String(r.stopLoss) : undefined,
      openedAt: r.openedAt,
      status: r.status as 'open' | 'closed',
      closedAt: r.closedAt ?? undefined,
      closePrice: r.closePrice != null ? String(r.closePrice) : undefined,
      profit: r.profit != null ? String(r.profit) : undefined,
    }));
  }

  async updateDealTpSl(dealId: number, userId: string, takeProfit?: number, stopLoss?: number): Promise<Deal | null> {
    // Проверяем, что сделка существует и принадлежит пользователю
    const [existingDeal] = await db.select().from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.userId, userId)));
    
    if (!existingDeal) {
      return null;
    }

    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (takeProfit !== undefined) {
      updateData.takeProfit = takeProfit.toString();
    }
    
    if (stopLoss !== undefined) {
      updateData.stopLoss = stopLoss.toString();
    }

    // Если нечего обновлять — возвращаем текущую сделку, избегая пустого SET
    if (Object.keys(updateData).length === 0) {
      return {
        id: existingDeal.id,
        userId: String(existingDeal.userId),
        symbol: String(existingDeal.symbol),
        direction: existingDeal.direction as 'up' | 'down',
        amount: String(existingDeal.amount),
        multiplier: Number(existingDeal.multiplier),
        openPrice: String(existingDeal.openPrice),
        takeProfit: existingDeal.takeProfit != null ? String(existingDeal.takeProfit) : undefined,
        stopLoss: existingDeal.stopLoss != null ? String(existingDeal.stopLoss) : undefined,
        openedAt: existingDeal.openedAt,
        status: existingDeal.status as 'open' | 'closed',
        closedAt: existingDeal.closedAt ?? undefined,
        closePrice: existingDeal.closePrice != null ? String(existingDeal.closePrice) : undefined,
        profit: existingDeal.profit != null ? String(existingDeal.profit) : undefined,
      } as Deal;
    }

    // Обновляем сделку
    const [updatedDeal] = await db.update(deals)
      .set(updateData)
      .where(and(eq(deals.id, dealId), eq(deals.userId, userId)))
      .returning();
    if (!updatedDeal) return null;
    return {
      id: updatedDeal.id,
      userId: String(updatedDeal.userId),
      symbol: String(updatedDeal.symbol),
      direction: updatedDeal.direction as 'up' | 'down',
      amount: String(updatedDeal.amount),
      multiplier: Number(updatedDeal.multiplier),
      openPrice: String(updatedDeal.openPrice),
      takeProfit: updatedDeal.takeProfit != null ? String(updatedDeal.takeProfit) : undefined,
      stopLoss: updatedDeal.stopLoss != null ? String(updatedDeal.stopLoss) : undefined,
      openedAt: updatedDeal.openedAt,
      status: updatedDeal.status as 'open' | 'closed',
      closedAt: updatedDeal.closedAt ?? undefined,
      closePrice: updatedDeal.closePrice != null ? String(updatedDeal.closePrice) : undefined,
      profit: updatedDeal.profit != null ? String(updatedDeal.profit) : undefined,
    } as Deal;
  }

  async getDealById(dealId: number, userId: string): Promise<Deal | null> {
    const [deal] = await db.select().from(deals)
      .where(and(eq(deals.id, dealId), eq(deals.userId, userId)));
    if (!deal) return null;
    return {
      id: deal.id,
      userId: String(deal.userId),
      symbol: String(deal.symbol),
      direction: deal.direction as 'up' | 'down',
      amount: String(deal.amount),
      multiplier: Number(deal.multiplier),
      openPrice: String(deal.openPrice),
      takeProfit: deal.takeProfit != null ? String(deal.takeProfit) : undefined,
      stopLoss: deal.stopLoss != null ? String(deal.stopLoss) : undefined,
      openedAt: deal.openedAt,
      status: deal.status as 'open' | 'closed',
      closedAt: deal.closedAt ?? undefined,
      closePrice: deal.closePrice != null ? String(deal.closePrice) : undefined,
      profit: deal.profit != null ? String(deal.profit) : undefined,
    } as Deal;
  }

  async incrementUserTradesCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        tradesCount: sql`${users.tradesCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserTradingStats(userId: string, profit: number, amount: number): Promise<void> {
    // Получаем текущие данные пользователя
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;

    const currentTotalVolume = Number(user.totalTradesVolume || 0);
    const currentSuccessfulPercentage = Number(user.successfulTradesPercentage || 0);
    const currentMaxProfit = Number(user.maxProfit || 0);
    const currentMaxLoss = Number(user.maxLoss || 0);
    const currentAvgAmount = Number(user.averageTradeAmount || 0);
    const currentTradesCount = Number(user.tradesCount || 0);

    // Обновляем общий объем торгов
    const newTotalVolume = currentTotalVolume + amount;

    // Обновляем процент успешных сделок
    let newSuccessfulPercentage = currentSuccessfulPercentage;
    if (profit > 0) {
      // Если сделка прибыльная, увеличиваем процент успешных
      const currentSuccessfulTrades = Math.round((currentSuccessfulPercentage / 100) * currentTradesCount);
      newSuccessfulPercentage = ((currentSuccessfulTrades + 1) / (currentTradesCount + 1)) * 100;
    } else {
      // Если сделка убыточная, уменьшаем процент успешных
      const currentSuccessfulTrades = Math.round((currentSuccessfulPercentage / 100) * currentTradesCount);
      newSuccessfulPercentage = (currentSuccessfulTrades / (currentTradesCount + 1)) * 100;
    }

    // Обновляем максимальный профит/убыток
    const newMaxProfit = profit > currentMaxProfit ? profit : currentMaxProfit;
    const newMaxLoss = profit < currentMaxLoss ? profit : currentMaxLoss;

    // Обновляем среднюю сумму сделки
    const newAvgAmount = (currentAvgAmount * currentTradesCount + amount) / (currentTradesCount + 1);

    // Recalculate rating score based on updated stats
    const newRatingScore = await this.calculateUserRatingScore(userId, {
      totalTrades: currentTradesCount + 1,
      totalPnl: await this.getUserTotalPnl(userId),
      totalVolume: newTotalVolume,
      winRate: newSuccessfulPercentage
    });

    await db
      .update(users)
      .set({
        totalTradesVolume: newTotalVolume.toString(),
        successfulTradesPercentage: newSuccessfulPercentage.toFixed(2),
        maxProfit: newMaxProfit.toString(),
        maxLoss: newMaxLoss.toString(),
        averageTradeAmount: newAvgAmount.toFixed(2),
        ratingScore: newRatingScore,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Update user's rating rank after stats update
    await this.updateUserRatingRank(userId);
  }

  /**
   * Calculate user's total P&L from all closed deals
   */
  async getUserTotalPnl(userId: string): Promise<number> {
    const result = await db
      .select({
        totalPnl: sql<number>`COALESCE(SUM((${deals.profit})::numeric), 0)`
      })
      .from(deals)
      .where(and(eq(deals.userId as any, userId), eq(deals.status as any, 'closed')));
    
    return Number(result[0]?.totalPnl || 0);
  }

  /**
   * Calculate user's rating score based on performance metrics
   */
  async calculateUserRatingScore(userId: string, stats?: {
    totalTrades: number;
    totalPnl: number;
    totalVolume: number;
    winRate: number;
  }): Promise<number> {
    let userStats = stats;
    
    if (!userStats) {
      const tradingStats = await this.getUserTradingStats(userId);
      userStats = {
        totalTrades: tradingStats.totalTrades,
        totalPnl: tradingStats.totalPnl,
        totalVolume: tradingStats.avgTradeAmount * tradingStats.totalTrades,
        winRate: tradingStats.winRate
      };
    }

    // Rating score calculation based on:
    // - Total P&L (40% weight)
    // - Win rate (30% weight) 
    // - Trade volume (20% weight)
    // - Number of trades (10% weight)
    
    const pnlScore = Math.max(0, userStats.totalPnl / 100); // $100 = 1 point
    const winRateScore = userStats.winRate; // Direct percentage
    const volumeScore = userStats.totalVolume / 1000; // $1000 = 1 point
    const tradesScore = Math.min(userStats.totalTrades * 2, 100); // Max 100 points from trades

    const totalScore = Math.round(
      (pnlScore * 0.4) + 
      (winRateScore * 0.3) + 
      (volumeScore * 0.2) + 
      (tradesScore * 0.1)
    );

    return Math.max(0, totalScore);
  }

  /**
   * Update user's rating rank based on their current rating score
   */
  async updateUserRatingRank(userId: string): Promise<void> {
    try {
      // Get user's current rating score
      const [user] = await db.select({ ratingScore: users.ratingScore }).from(users).where(eq(users.id, userId));
      if (!user) return;

      const userRatingScore = Number(user.ratingScore || 0);

      // Count users with higher rating scores
      const higherRatedUsers = await db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.ratingScore} > ${userRatingScore}`);

      const rank = Number(higherRatedUsers[0]?.count || 0) + 1;

      // Update user's rank
      await db
        .update(users)
        .set({
          ratingRank30Days: rank,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      console.log(`Updated rating rank for user ${userId}: #${rank} (score: ${userRatingScore})`);
    } catch (error) {
      console.error(`Error updating rating rank for user ${userId}:`, error);
    }
  }

  /**
   * Полное удаление аккаунта пользователя и связанных данных
   */
  async deleteUserAccount(userId: string): Promise<void> {
    // Удаляем зависимые сущности, которые не имеют onDelete: 'cascade'
    await db.delete(analytics).where(eq(analytics.userId as any, userId));
    // В deals нет FK, удаляем явно
    await db.delete(deals).where(eq(deals.userId as any, userId));
    // Удаление подписок и уведомлений происходит каскадно при удалении пользователя (если настроено)
    // На всякий случай можно почистить тоже, если FK без cascade в окружении
    try {
      // Optional defensive cleanups (ignored if tables are empty or FK differs)
      const { premiumSubscriptions, userNotifications } = await import('../shared/schema');
      // @ts-ignore dynamic import types
      await db.delete(premiumSubscriptions).where(eq(premiumSubscriptions.userId, userId));
      // @ts-ignore dynamic import types
      await db.delete(userNotifications).where(eq(userNotifications.userId, userId));
    } catch {}
    // В конце удаляем пользователя
    await db.delete(users).where(eq(users.id, userId));
  }

  // Trading statistics
  async getUserTradingStats(userId: string): Promise<{
    totalTrades: number;
    totalPnl: number;
    avgTradeAmount: number;
    maxPnl: number;
    minPnl: number;
    winRate: number;
  }> {
    const closedDeals = await db
      .select({
        id: deals.id,
        amount: deals.amount,
        profit: deals.profit,
      })
      .from(deals)
      .where(and(eq(deals.userId as any, userId), eq(deals.status as any, 'closed')));

    const totalTrades = closedDeals.length;
    let totalPnl = 0;
    let totalAmount = 0;
    let maxPnl = Number.NEGATIVE_INFINITY;
    let minPnl = Number.POSITIVE_INFINITY;
    let winCount = 0;

    for (const d of closedDeals) {
      const pnl = Number(d.profit || 0);
      const amt = Number(d.amount || 0);
      totalPnl += pnl;
      totalAmount += amt;
      if (pnl > maxPnl) maxPnl = pnl;
      if (pnl < minPnl) minPnl = pnl;
      if (pnl > 0) winCount += 1;
    }

    const avgTradeAmount = totalTrades > 0 ? totalAmount / totalTrades : 0;
    if (maxPnl === Number.NEGATIVE_INFINITY) maxPnl = 0;
    if (minPnl === Number.POSITIVE_INFINITY) minPnl = 0;

    return {
      totalTrades,
      totalPnl,
      avgTradeAmount,
      maxPnl,
      minPnl,
      winRate: totalTrades > 0 ? (winCount / totalTrades) * 100 : 0,
    };
  }
}

export const storage = new DatabaseStorage();
