"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.DatabaseStorage = void 0;
const schema_1 = require("../shared/schema");
const db_js_1 = require("./db.js");
const autoRewards_js_1 = require("./services/autoRewards.js");
const drizzle_orm_1 = require("drizzle-orm");
class DatabaseStorage {
    // User operations
    async getUser(id) {
        const [user] = await db_js_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        return user;
    }
    async getAllUsers(limit = 100, offset = 0) {
        return await db_js_1.db
            .select()
            .from(schema_1.users)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))
            .limit(limit)
            .offset(offset);
    }
    async upsertUser(userData) {
        const [user] = await db_js_1.db
            .insert(schema_1.users)
            .values(userData)
            .onConflictDoUpdate({
            target: schema_1.users.id,
            set: {
                ...userData,
                updatedAt: new Date(),
            },
        })
            .returning();
        return user;
    }
    // Analytics
    async recordAnalyticsEvent(userId, eventType, eventData, sessionId, userAgent, ipAddress) {
        await db_js_1.db.insert(schema_1.analytics).values({
            userId,
            eventType,
            eventData,
            sessionId,
            userAgent,
            ipAddress,
        });
    }
    // User balance operations
    async updateUserBalance(userId, amount) {
        await db_js_1.db
            .update(schema_1.users)
            .set({
            balance: (0, drizzle_orm_1.sql) `${schema_1.users.balance} + ${amount}`,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        // Триггер автоначисления уровней
        await (0, autoRewards_js_1.applyAutoRewards)(userId);
    }
    async updateUserFreeBalance(userId, amount) {
        await db_js_1.db
            .update(schema_1.users)
            .set({
            freeBalance: (0, drizzle_orm_1.sql) `${schema_1.users.freeBalance} + ${amount}`,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        // Триггер автоначисления уровней
        await (0, autoRewards_js_1.applyAutoRewards)(userId);
    }
    async updateUserCoins(userId, amount) {
        await db_js_1.db
            .update(schema_1.users)
            .set({
            coins: (0, drizzle_orm_1.sql) `${schema_1.users.coins} + ${amount}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    }
    async getUserDeals(userId) {
        const rows = await db_js_1.db
            .select()
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.deals.openedAt));
        return rows.map((r) => ({
            id: r.id,
            userId: String(r.userId),
            symbol: String(r.symbol),
            direction: r.direction,
            amount: String(r.amount),
            multiplier: Number(r.multiplier),
            openPrice: String(r.openPrice),
            takeProfit: r.takeProfit != null ? String(r.takeProfit) : undefined,
            stopLoss: r.stopLoss != null ? String(r.stopLoss) : undefined,
            openedAt: r.openedAt,
            status: r.status,
            closedAt: r.closedAt ?? undefined,
            closePrice: r.closePrice != null ? String(r.closePrice) : undefined,
            profit: r.profit != null ? String(r.profit) : undefined,
        }));
    }
    async getUserActiveDeals(userId) {
        const rows = await db_js_1.db
            .select()
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'open')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.deals.openedAt));
        return rows.map((r) => ({
            id: r.id,
            userId: String(r.userId),
            symbol: String(r.symbol),
            direction: r.direction,
            amount: String(r.amount),
            multiplier: Number(r.multiplier),
            openPrice: String(r.openPrice),
            takeProfit: r.takeProfit != null ? String(r.takeProfit) : undefined,
            stopLoss: r.stopLoss != null ? String(r.stopLoss) : undefined,
            openedAt: r.openedAt,
            status: r.status,
            closedAt: r.closedAt ?? undefined,
            closePrice: r.closePrice != null ? String(r.closePrice) : undefined,
            profit: r.profit != null ? String(r.profit) : undefined,
        }));
    }
    async updateDealTpSl(dealId, userId, takeProfit, stopLoss) {
        // Проверяем, что сделка существует и принадлежит пользователю
        const [existingDeal] = await db_js_1.db.select().from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId), (0, drizzle_orm_1.eq)(schema_1.deals.userId, userId)));
        if (!existingDeal) {
            return null;
        }
        // Подготавливаем данные для обновления
        const updateData = {};
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
                direction: existingDeal.direction,
                amount: String(existingDeal.amount),
                multiplier: Number(existingDeal.multiplier),
                openPrice: String(existingDeal.openPrice),
                takeProfit: existingDeal.takeProfit != null ? String(existingDeal.takeProfit) : undefined,
                stopLoss: existingDeal.stopLoss != null ? String(existingDeal.stopLoss) : undefined,
                openedAt: existingDeal.openedAt,
                status: existingDeal.status,
                closedAt: existingDeal.closedAt ?? undefined,
                closePrice: existingDeal.closePrice != null ? String(existingDeal.closePrice) : undefined,
                profit: existingDeal.profit != null ? String(existingDeal.profit) : undefined,
            };
        }
        // Обновляем сделку
        const [updatedDeal] = await db_js_1.db.update(schema_1.deals)
            .set(updateData)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId), (0, drizzle_orm_1.eq)(schema_1.deals.userId, userId)))
            .returning();
        if (!updatedDeal)
            return null;
        return {
            id: updatedDeal.id,
            userId: String(updatedDeal.userId),
            symbol: String(updatedDeal.symbol),
            direction: updatedDeal.direction,
            amount: String(updatedDeal.amount),
            multiplier: Number(updatedDeal.multiplier),
            openPrice: String(updatedDeal.openPrice),
            takeProfit: updatedDeal.takeProfit != null ? String(updatedDeal.takeProfit) : undefined,
            stopLoss: updatedDeal.stopLoss != null ? String(updatedDeal.stopLoss) : undefined,
            openedAt: updatedDeal.openedAt,
            status: updatedDeal.status,
            closedAt: updatedDeal.closedAt ?? undefined,
            closePrice: updatedDeal.closePrice != null ? String(updatedDeal.closePrice) : undefined,
            profit: updatedDeal.profit != null ? String(updatedDeal.profit) : undefined,
        };
    }
    async getDealById(dealId, userId) {
        const [deal] = await db_js_1.db.select().from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId), (0, drizzle_orm_1.eq)(schema_1.deals.userId, userId)));
        if (!deal)
            return null;
        return {
            id: deal.id,
            userId: String(deal.userId),
            symbol: String(deal.symbol),
            direction: deal.direction,
            amount: String(deal.amount),
            multiplier: Number(deal.multiplier),
            openPrice: String(deal.openPrice),
            takeProfit: deal.takeProfit != null ? String(deal.takeProfit) : undefined,
            stopLoss: deal.stopLoss != null ? String(deal.stopLoss) : undefined,
            openedAt: deal.openedAt,
            status: deal.status,
            closedAt: deal.closedAt ?? undefined,
            closePrice: deal.closePrice != null ? String(deal.closePrice) : undefined,
            profit: deal.profit != null ? String(deal.profit) : undefined,
        };
    }
    async incrementUserTradesCount(userId) {
        await db_js_1.db
            .update(schema_1.users)
            .set({
            tradesCount: (0, drizzle_orm_1.sql) `${schema_1.users.tradesCount} + 1`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    }
    async updateUserTradingStats(userId, profit, amount) {
        // Получаем текущие данные пользователя
        const [user] = await db_js_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        if (!user)
            return;
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
        }
        else {
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
        await db_js_1.db
            .update(schema_1.users)
            .set({
            totalTradesVolume: newTotalVolume.toString(),
            successfulTradesPercentage: newSuccessfulPercentage.toFixed(2),
            maxProfit: newMaxProfit.toString(),
            maxLoss: newMaxLoss.toString(),
            averageTradeAmount: newAvgAmount.toFixed(2),
            ratingScore: newRatingScore,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        // Update user's rating rank after stats update
        await this.updateUserRatingRank(userId);
    }
    /**
     * Calculate user's total P&L from all closed deals
     */
    async getUserTotalPnl(userId) {
        const result = await db_js_1.db
            .select({
            totalPnl: (0, drizzle_orm_1.sql) `COALESCE(SUM((${schema_1.deals.profit})::numeric), 0)`
        })
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed')));
        return Number(result[0]?.totalPnl || 0);
    }
    /**
     * Calculate user's rating score based on performance metrics
     */
    async calculateUserRatingScore(userId, stats) {
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
        const totalScore = Math.round((pnlScore * 0.4) +
            (winRateScore * 0.3) +
            (volumeScore * 0.2) +
            (tradesScore * 0.1));
        return Math.max(0, totalScore);
    }
    /**
     * Update user's rating rank based on their current rating score
     */
    async updateUserRatingRank(userId) {
        try {
            // Get user's current rating score
            const [user] = await db_js_1.db.select({ ratingScore: schema_1.users.ratingScore }).from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            if (!user)
                return;
            const userRatingScore = Number(user.ratingScore || 0);
            // Count users with higher rating scores
            const higherRatedUsers = await db_js_1.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.sql) `${schema_1.users.ratingScore} > ${userRatingScore}`);
            const rank = Number(higherRatedUsers[0]?.count || 0) + 1;
            // Update user's rank
            await db_js_1.db
                .update(schema_1.users)
                .set({
                ratingRank30Days: rank,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            console.log(`Updated rating rank for user ${userId}: #${rank} (score: ${userRatingScore})`);
        }
        catch (error) {
            console.error(`Error updating rating rank for user ${userId}:`, error);
        }
    }
    /**
     * Полное удаление аккаунта пользователя и связанных данных
     */
    async deleteUserAccount(userId) {
        // Удаляем зависимые сущности, которые не имеют onDelete: 'cascade'
        await db_js_1.db.delete(schema_1.analytics).where((0, drizzle_orm_1.eq)(schema_1.analytics.userId, userId));
        // В deals нет FK, удаляем явно
        await db_js_1.db.delete(schema_1.deals).where((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId));
        // Удаление подписок и уведомлений происходит каскадно при удалении пользователя (если настроено)
        // На всякий случай можно почистить тоже, если FK без cascade в окружении
        try {
            // Optional defensive cleanups (ignored if tables are empty or FK differs)
            const { premiumSubscriptions, userNotifications } = await Promise.resolve().then(() => __importStar(require('../shared/schema')));
            // @ts-ignore dynamic import types
            await db_js_1.db.delete(premiumSubscriptions).where((0, drizzle_orm_1.eq)(premiumSubscriptions.userId, userId));
            // @ts-ignore dynamic import types
            await db_js_1.db.delete(userNotifications).where((0, drizzle_orm_1.eq)(userNotifications.userId, userId));
        }
        catch { }
        // В конце удаляем пользователя
        await db_js_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    }
    // Trading statistics
    async getUserTradingStats(userId) {
        const closedDeals = await db_js_1.db
            .select({
            id: schema_1.deals.id,
            amount: schema_1.deals.amount,
            profit: schema_1.deals.profit,
        })
            .from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.userId, userId), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'closed')));
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
            if (pnl > maxPnl)
                maxPnl = pnl;
            if (pnl < minPnl)
                minPnl = pnl;
            if (pnl > 0)
                winCount += 1;
        }
        const avgTradeAmount = totalTrades > 0 ? totalAmount / totalTrades : 0;
        if (maxPnl === Number.NEGATIVE_INFINITY)
            maxPnl = 0;
        if (minPnl === Number.POSITIVE_INFINITY)
            minPnl = 0;
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
exports.DatabaseStorage = DatabaseStorage;
exports.storage = new DatabaseStorage();
