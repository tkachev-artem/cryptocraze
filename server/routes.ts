import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { Server as IOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { setupSimpleOAuth, isAuthenticated, isAdmin } from "./simpleOAuth";
import { tradingEngine } from "./services/tradingEngine";
import { unifiedPriceService } from "./services/unifiedPriceService";
import { binanceApi } from "./services/binanceApi";
import { gamificationService } from "./services/gamification";
import { notificationService } from "./services/notifications";
import { premiumService } from "./services/premium";
import swaggerUi from 'swagger-ui-express';
import { specs, swaggerUiOptions, swaggerAuth } from './swagger';
import { getCoinGeckoIcon } from './services/coingeckoIconCache';
import { dealsService } from './services/dealsService';
import { EnergyService } from './services/energyService';
import { TaskService } from './services/taskService';
import { TaskTemplateService } from './services/taskTemplates';
import { TaskTemplateService as DatabaseTaskTemplateService } from './services/taskTemplateService';
import { PrizeService } from './services/prizeService';
import { spinWheel, getWheelPrizes } from './wheel';
import { db } from './db';
import { deals, users, premiumSubscriptions, rewardTiers } from '../shared/schema';
import { applyAutoRewards } from './services/autoRewards';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';

// Types for authenticated requests  
type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    isAdmin?: boolean;
    claims?: {
      sub?: string;
    };
  };
  session?: {
    destroy: (callback: (err?: Error) => void) => void;
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'CryptoCraze API is running',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      tunnel: process.env.TUNNEL_URL || null
    });
  });

  // Swagger UI с защитой паролем
  app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  

  
  // Auth middleware
  const shouldSkipAuth = ((process.env.STATIC_ONLY || process.env.DISABLE_AUTH) || '').toLowerCase() === 'true';
  if (!shouldSkipAuth) {
    setupSimpleOAuth(app);
  }

  // Account: delete user and related data
  app.delete('/api/account/delete', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user;
      const userId = user?.id ?? user?.claims?.sub;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      await storage.deleteUserAccount(userId);
      // Destroy session and clear cookie
      const finish = () => {
        const baseOptions = {
          path: '/',
          httpOnly: true,
          sameSite: 'lax' as const,
          secure: process.env.NODE_ENV === 'production',
        };
        const cookieNames = [process.env.SESSION_COOKIE_NAME || 'connection.sid', 'connect.sid'];
        for (const name of cookieNames) {
          // Clear without domain
          res.clearCookie(name, baseOptions);
          // Clear with explicit domain just in case
          res.clearCookie(name, { ...baseOptions, domain: 'localhost' });
          // Clear with /api path variants
          res.clearCookie(name, { ...baseOptions, path: '/api' });
          res.clearCookie(name, { ...baseOptions, domain: 'localhost', path: '/api' });
          // Force expire cookie
          res.cookie(name, '', { ...baseOptions, expires: new Date(0) });
          res.cookie(name, '', { ...baseOptions, domain: 'localhost', expires: new Date(0) });
          res.cookie(name, '', { ...baseOptions, path: '/api', expires: new Date(0) });
          res.cookie(name, '', { ...baseOptions, domain: 'localhost', path: '/api', expires: new Date(0) });
        }
        res.json({ success: true });
      };
      if ((req.session)?.destroy) {
        (req.session).destroy(finish);
      } else {
        finish();
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
  });

  // Auth: logout and clear cookie
  app.post('/api/auth/logout', isAuthenticated, (req: AuthenticatedRequest, res: Response) => {
    const finish = () => {
      const baseOptions = {
        path: '/',
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
      };
      const cookieNames = [process.env.SESSION_COOKIE_NAME || 'connection.sid', 'connect.sid'];
      for (const name of cookieNames) {
        res.clearCookie(name, baseOptions);
        res.clearCookie(name, { ...baseOptions, domain: 'localhost' });
        res.clearCookie(name, { ...baseOptions, path: '/api' });
        res.clearCookie(name, { ...baseOptions, domain: 'localhost', path: '/api' });
        res.cookie(name, '', { ...baseOptions, expires: new Date(0) });
        res.cookie(name, '', { ...baseOptions, domain: 'localhost', expires: new Date(0) });
        res.cookie(name, '', { ...baseOptions, path: '/api', expires: new Date(0) });
        res.cookie(name, '', { ...baseOptions, domain: 'localhost', path: '/api', expires: new Date(0) });
      }
      res.json({ success: true });
    };
    if ((req.session)?.destroy) {
      (req.session).destroy(finish);
    } else {
      finish();
    }
  });


  /**
   * @swagger
   * /api/rating:
   *   get:
   *     summary: Рейтинг пользователей по PnL за период
   *     tags: [Рейтинг]
   *     parameters:
   *       - in: query
   *         name: period
   *         required: true
   *         schema:
   *           type: string
   *           enum: [day, week, month, all]
   *         description: Период агрегации (day=24h, week=7d, month=30d, all=все время)
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *         description: Смещение (для пагинации)
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 100
   *         description: Количество записей
   *     responses:
   *       200:
   *         description: Массив лидеров
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   userId: { type: string }
   *                   username: { type: string }
   *                   avatarUrl: { type: string, nullable: true }
   *                   pnlUsd: { type: number }
   *                   winRate: { type: number }
   *                   trades: { type: integer }
   *                   rank: { type: integer }
   *                   isPremium: { type: boolean }
   *       400:
   *         description: Некорректный period
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.get('/api/rating', async (req, res) => {
    try {
      const period = String(req.query.period || '').toLowerCase();
      const allowed = new Set(['day', 'week', 'month', 'all']);
      if (!allowed.has(period)) {
        res.status(400).json({ error: 'Invalid period. Expected one of: day, week, month, all' });
        return;
      }

      // Determine time window
      let startDate: Date | null = null;
      const nowMs = Date.now();
      if (period === 'day') startDate = new Date(nowMs - 24 * 60 * 60 * 1000);
      else if (period === 'week') startDate = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
      else if (period === 'month') startDate = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
      // 'all' → startDate stays null

      const whereCond = startDate
        ? and(eq(deals.status, 'closed'), gte(deals.closedAt, startDate))
        : eq(deals.status, 'closed');

      // Aggregate by user (closed deals in period)
      const aggregates = await db
        .select({
          userId: deals.userId,
          pnlUsd: sql<number>`COALESCE(SUM((${deals.profit})::numeric), 0)`,
          trades: sql<number>`COUNT(*)`,
          wins: sql<number>`SUM(CASE WHEN ((${deals.profit})::numeric) > 0 THEN 1 ELSE 0 END)`
        })
        .from(deals)
        .where(whereCond)
        .groupBy(deals.userId);

      // Build quick lookup for aggregated stats
      const aggregateMap = new Map<string, { pnlUsd: number; trades: number; wins: number }>();
      for (const a of aggregates) {
        aggregateMap.set(a.userId as string, {
          pnlUsd: Number(a.pnlUsd || 0),
          trades: Number(a.trades || 0),
          wins: Number(a.wins || 0),
        });
      }

      // Load all users (включая тех, у кого нет сделок)
      const userRows = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
          isPremium: users.isPremium,
        })
        .from(users)
        ;

      // Determine premium by active subscriptions (authoritative)
      const now = new Date();
      const userIds = userRows.map(u => u.id as string);
      const premiumRows = await db
        .select({ userId: premiumSubscriptions.userId })
        .from(premiumSubscriptions)
        .where(
          and(
            inArray(premiumSubscriptions.userId, userIds),
            eq(premiumSubscriptions.isActive, true),
            gte(premiumSubscriptions.expiresAt, now)
          )
        );
      const premiumSet = new Set(premiumRows.map(r => r.userId));

      // Compose leaderboard: все пользователи, даже без сделок
      const leaderboard = userRows.map(u => {
        const agg = aggregateMap.get(u.id as string) || { pnlUsd: 0, trades: 0, wins: 0 };
        const winRate = agg.trades > 0 ? (agg.wins / agg.trades) * 100 : 0;
        const username = u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.email ?? u.id);
        const avatarUrl = u.profileImageUrl ?? null;
        const isPremium = premiumSet.has(u.id as string) || Boolean(u.isPremium);
        return {
          userId: u.id,
          username,
          avatarUrl,
          pnlUsd: Number(agg.pnlUsd || 0),
          winRate: Number(winRate.toFixed(2)),
          trades: Number(agg.trades || 0),
          isPremium,
        };
      });

      // Sort: pnlUsd desc, then winRate desc, then trades desc
      leaderboard.sort((a, b) => {
        if (b.pnlUsd !== a.pnlUsd) return b.pnlUsd - a.pnlUsd;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.trades - a.trades;
      });

      // Rank + pagination
      const withRank = leaderboard.map((item, idx) => ({ ...item, rank: idx + 1 }));

      const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '100'), 10) || 100));

      const paged = withRank.slice(offset, offset + limit);
      res.json(paged);
    } catch (error) {
      console.error('Error getting rating:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  /**
   * @swagger
   * /api/trading/pairs:
   *   get:
   *     summary: Получить список торговых пар
   *     tags: [Торговля]
   *     responses:
   *       200:
   *         description: Список торговых пар
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/TradingPair'
   */
  app.get('/api/trading/pairs', async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      console.error("Error fetching trading pairs:", error);
      res.status(500).json({ message: "Failed to fetch trading pairs" });
    }
  });

  /**
   * @swagger
   * /api/trading/price/{symbol}:
   *   get:
   *     summary: Получить текущую цену торговой пары
   *     tags: [Торговля]
   *     parameters:
   *       - in: path
   *         name: symbol
   *         required: true
   *         schema:
   *           type: string
   *         description: Символ торговой пары (например, BTCUSDT)
   *     responses:
   *       200:
   *         description: Данные о цене
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PriceData'
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/trading/price/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const priceData = unifiedPriceService.getPrice(symbol);
      
      if (!priceData) {
        await unifiedPriceService.addPair(symbol);
        const newPriceData = unifiedPriceService.getPrice(symbol);
        res.json(newPriceData);
        return;
      }
      
      res.json(priceData);
    } catch (error) {
      console.error("Error fetching price:", error);
      res.status(500).json({ message: "Failed to fetch price" });
    }
  });

  app.get('/api/trading/candlestick/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const { interval = '1h', limit = 100 } = req.query;
      
      const candlesticks = await tradingEngine.getCandlestickData(
        symbol,
        interval as string,
        parseInt(limit as string)
      );
      
      res.json(candlesticks);
    } catch (error) {
      console.error("Error fetching candlestick data:", error);
      res.status(500).json({ message: "Failed to fetch candlestick data" });
    }
  });

  /**
   * @swagger
   * /api/binance/candlestick/{symbol}:
   *   get:
   *     summary: Получить данные свечного графика через Binance API
   *     tags: [Binance]
   *     parameters:
   *       - in: path
   *         name: symbol
   *         required: true
   *         schema:
   *           type: string
   *         description: Символ торговой пары (например, BTCUSDT)
   *       - in: query
   *         name: interval
   *         schema:
   *           type: string
   *           default: 1h
   *           enum: [1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M]
   *         description: Интервал свечей
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *           maximum: 1000
   *         description: Количество свечей (максимум 1000)
   *     responses:
   *       200:
   *         description: Данные свечного графика
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   openTime:
   *                     type: number
   *                     description: Время открытия (timestamp)
   *                   open:
   *                     type: number
   *                     description: Цена открытия
   *                   high:
   *                     type: number
   *                     description: Максимальная цена
   *                   low:
   *                     type: number
   *                     description: Минимальная цена
   *                   close:
   *                     type: number
   *                     description: Цена закрытия
   *                   volume:
   *                     type: number
   *                     description: Объем торгов
   *                   closeTime:
   *                     type: number
   *                     description: Время закрытия (timestamp)
   *       400:
   *         description: Неверный символ или параметры
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/binance/candlestick/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const { interval = '1h', limit = 100 } = req.query;
      
      const candlesticks = await binanceApi.getCandlestickData(
        symbol,
        interval as string,
        parseInt(limit as string)
      );
      
      res.json(candlesticks);
    } catch (error) {
      console.error("Error fetching Binance candlestick data:", error);
      res.status(500).json({ 
        message: "Failed to fetch candlestick data from Binance",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/binance/price/{symbol}:
   *   get:
   *     summary: Получить текущую цену через Binance API
   *     tags: [Binance]
   *     parameters:
   *       - in: path
   *         name: symbol
   *         required: true
   *         schema:
   *           type: string
   *         description: Символ торговой пары (например, BTCUSDT)
   *     responses:
   *       200:
   *         description: Текущая цена
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 symbol:
   *                   type: string
   *                 price:
   *                   type: number
   *       400:
   *         description: Неверный символ
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/binance/price/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      
      const price = await binanceApi.getCurrentPrice(symbol);
      
      res.json({
        symbol: symbol.toUpperCase(),
        price: price
      });
    } catch (error) {
      console.error("Error fetching Binance price:", error);
      res.status(500).json({ 
        message: "Failed to fetch price from Binance",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/binance/stats/{symbol}:
   *   get:
   *     summary: Получить 24-часовую статистику через Binance API
   *     tags: [Binance]
   *     parameters:
   *       - in: path
   *         name: symbol
   *         required: true
   *         schema:
   *           type: string
   *         description: Символ торговой пары (например, BTCUSDT)
   *     responses:
   *       200:
   *         description: 24-часовая статистика
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 symbol:
   *                   type: string
   *                 priceChange:
   *                   type: number
   *                   description: Изменение цены
   *                 priceChangePercent:
   *                   type: number
   *                   description: Процент изменения цены
   *                 lastPrice:
   *                   type: number
   *                   description: Последняя цена
   *                 highPrice:
   *                   type: number
   *                   description: Максимальная цена за 24ч
   *                 lowPrice:
   *                   type: number
   *                   description: Минимальная цена за 24ч
   *                 volume:
   *                   type: number
   *                   description: Объем торгов
   *       400:
   *         description: Неверный символ
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/binance/stats/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      
      const stats = await binanceApi.get24hrStats(symbol);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching Binance stats:", error);
      res.status(500).json({ 
        message: "Failed to fetch stats from Binance",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/binance/symbols:
   *   get:
   *     summary: Получить список всех торговых пар USDT через Binance API
   *     tags: [Binance]
   *     responses:
   *       200:
   *         description: Список торговых пар
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: string
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/binance/symbols', async (req, res) => {
    try {
      const symbols = await binanceApi.getAllSymbols();
      
      res.json(symbols);
    } catch (error) {
      console.error("Error fetching Binance symbols:", error);
      res.status(500).json({ 
        message: "Failed to fetch symbols from Binance",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * @swagger
   * /api/trading/open:
   *   post:
   *     summary: Открыть новую сделку
   *     tags: [Торговля]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - pairSymbol
   *               - direction
   *               - amount
   *             properties:
   *               pairSymbol:
   *                 type: string
   *                 description: Символ торговой пары
   *               direction:
   *                 type: string
   *                 enum: [long, short]
   *                 description: Направление сделки
   *               amount:
   *                 type: number
   *                 description: Сумма сделки
   *               leverage:
   *                 type: number
   *                 default: 1
   *                 description: Плечо
   *               takeProfitPrice:
   *                 type: number
   *                 description: Цена take profit
   *               stopLossPrice:
   *                 type: number
   *                 description: Цена stop loss
   *     responses:
   *       200:
   *         description: Результат открытия сделки
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TradeResult'
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/trading/open', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Extract request body parameters (currently not used as trading is disabled)

      const result = await tradingEngine.openTrade();

      // trades disabled — достижения не проверяем

      res.json(result);
    } catch (error) {
      console.error("Error opening trade:", error);
      res.status(500).json({ message: "Failed to open trade" });
    }
  });

  app.patch('/api/trading/close/:tradeId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { tradeId: _tradeId } = req.params;

      // Verify trade ownership
      const trade = null as any; // trades API отключён
      if (!trade || trade.userId !== userId) {
        res.status(403).json({ message: "Trade not found or access denied" });
        return;
      }

      const result = await tradingEngine.closeTrade();

      // trades disabled — достижения не проверяем

      res.json(result);
    } catch (error) {
      console.error("Error closing trade:", error);
      res.status(500).json({ message: "Failed to close trade" });
    }
  });

  app.patch('/api/trading/update/:tradeId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { tradeId: _tradeId } = req.params;
      const { takeProfitPrice: _takeProfitPrice, stopLossPrice: _stopLossPrice } = req.body;

      // Verify trade ownership
      const trade = null as any; // trades API отключён
      if (!trade || trade.userId !== userId) {
        res.status(403).json({ message: "Trade not found or access denied" });
        return;
      }

      const result = await tradingEngine.updateTrade();

      res.json(result);
    } catch (error) {
      console.error("Error updating trade:", error);
      res.status(500).json({ message: "Failed to update trade" });
    }
  });

  app.get('/api/trading/trades', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { limit = 50 } = req.query;

      res.json([]);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ message: "Failed to fetch trades" });
    }
  });

  app.get('/api/trading/open-trades', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      res.json([]);
    } catch (error) {
      console.error("Error fetching open trades:", error);
      res.status(500).json({ message: "Failed to fetch open trades" });
    }
  });

  app.get('/api/trading/stats', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserTradingStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching trading stats:", error);
      res.status(500).json({ message: "Failed to fetch trading stats" });
    }
  });

  /**
   * @swagger
   * /api/gamification/progress:
   *   get:
   *     summary: Получить прогресс пользователя в геймификации
   *     tags: [Геймификация]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Прогресс пользователя
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GamificationProgress'
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/gamification/progress', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const progress = await gamificationService.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ message: "Failed to fetch user progress" });
    }
  });

  app.post('/api/gamification/daily-reward', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const result = await gamificationService.claimDailyReward(userId);
      res.json(result);
    } catch (error) {
      console.error("Error claiming daily reward:", error);
      res.status(500).json({ message: "Failed to claim daily reward" });
    }
  });

  app.post('/api/gamification/loot-box/:lootBoxId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { lootBoxId } = req.params;
      
      const result = await gamificationService.openLootBox(userId, parseInt(lootBoxId));
      res.json(result);
    } catch (error) {
      console.error("Error opening loot box:", error);
      res.status(500).json({ message: "Failed to open loot box" });
    }
  });

  app.post('/api/gamification/ad-reward', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const result = await gamificationService.giveAdReward(userId);
      res.json(result);
    } catch (error) {
      console.error("Error giving ad reward:", error);
      res.status(500).json({ message: "Failed to give ad reward" });
    }
  });

  /**
   * @swagger
   * /api/gamification/coins/balance:
   *   get:
   *     summary: Get user coins balance
   *     tags: [Gamification]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: User coins balance
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 coins:
   *                   type: number
   *       401:
   *         description: Not authenticated
   */
  app.get('/api/gamification/coins/balance', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const balance = await gamificationService.getCoinsBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error('Error getting coins balance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/gamification/coins/add:
   *   post:
   *     summary: Add coins to user account (Admin only)
   *     tags: [Gamification]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - targetUserId
   *               - amount
   *             properties:
   *               targetUserId:
   *                 type: string
   *                 description: ID of the user to add coins to
   *               amount:
   *                 type: number
   *                 description: Amount of coins to add
   *     responses:
   *       200:
   *         description: Coins added successfully
   *       400:
   *         description: Invalid amount or user ID
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Insufficient permissions
   */
  app.post('/api/gamification/coins/add', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user.id;
      const { targetUserId, amount } = req.body;
      
      if (!targetUserId) {
        res.status(400).json({ error: 'targetUserId is required' });
        return;
      }
      
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      const result = await gamificationService.addCoins(targetUserId, amount, adminId);
      res.json(result);
    } catch (error) {
      console.error('Error adding coins:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/gamification/coins/spend:
   *   post:
   *     summary: Spend coins from user account
   *     tags: [Gamification]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *             properties:
   *               amount:
   *                 type: number
   *                 description: Amount of coins to spend
   *     responses:
   *       200:
   *         description: Coins spent successfully
   *       400:
   *         description: Invalid amount or insufficient coins
   *       401:
   *         description: Not authenticated
   */
  app.post('/api/gamification/coins/spend', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      const result = await gamificationService.spendCoins(userId, amount);
      res.json(result);
    } catch (error) {
      console.error('Error spending coins:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/gamification/coins/add-self:
   *   post:
   *     summary: Add coins to own account (for testing/demo)
   *     tags: [Gamification]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *             properties:
   *               amount:
   *                 type: number
   *                 description: Amount of coins to add to own account
   *     responses:
   *       200:
   *         description: Coins added successfully
   *       400:
   *         description: Invalid amount
   *       401:
   *         description: Not authenticated
   */
  app.post('/api/gamification/coins/add-self', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      // Для добавления себе монет не нужны права администратора
      const result = await gamificationService.addCoins(userId, amount);
      res.json(result);
    } catch (error) {
      console.error('Error adding coins to self:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/exchange-coins:
   *   post:
   *     summary: Exchange coins for balance currency
   *     tags: [Gamification]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - coinsToExchange
   *             properties:
   *               coinsToExchange:
   *                 type: number
   *                 description: Number of coins to exchange (1 coin = $100)
   *     responses:
   *       200:
   *         description: Coins exchanged successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 coinsExchanged:
   *                   type: number
   *                 moneyReceived:
   *                   type: number
   *                 newCoinsBalance:
   *                   type: number
   *                 newMoneyBalance:
   *                   type: string
   *       400:
   *         description: Invalid amount or insufficient coins
   *       401:
   *         description: Not authenticated
   */
  app.post('/api/exchange-coins', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    console.log('[CoinExchange] Endpoint hit, authentication passed');
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.log('[CoinExchange] No user ID found');
        res.status(401).json({ error: 'User ID not found' });
        return;
      }
      
      const { coinsToExchange } = req.body;
      
      console.log(`[CoinExchange] Request from user ${userId}:`, { coinsToExchange });
      
      if (!coinsToExchange || coinsToExchange <= 0) {
        console.log(`[CoinExchange] Invalid amount: ${coinsToExchange}`);
        res.status(400).json({ error: 'Invalid amount of coins to exchange' });
        return;
      }

      // Allow exchanging any amount of coins user has

      // Get current user data
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const currentCoins = user.coins || 0;
      console.log(`[CoinExchange] User has ${currentCoins} coins, wants to exchange ${coinsToExchange}`);
      
      if (currentCoins < coinsToExchange) {
        console.log(`[CoinExchange] Insufficient coins: ${currentCoins} < ${coinsToExchange}`);
        res.status(400).json({ error: 'Insufficient coins' });
        return;
      }

      // Calculate exchange (1 coin = $100)
      const moneyToAdd = coinsToExchange * 100;
      const currentBalance = parseFloat(user.balance || '0');
      const newBalance = currentBalance + moneyToAdd;
      const newCoins = currentCoins - coinsToExchange;

      // Update user balance and coins
      await db.update(users)
        .set({
          balance: newBalance.toFixed(2),
          coins: newCoins
        })
        .where(eq(users.id, userId));

      console.log(`[CoinExchange] User ${userId} exchanged ${coinsToExchange} coins for $${moneyToAdd}`);

      res.json({
        success: true,
        coinsExchanged: coinsToExchange,
        moneyReceived: moneyToAdd,
        newCoinsBalance: newCoins,
        newMoneyBalance: newBalance.toFixed(2)
      });

    } catch (error) {
      console.error('[CoinExchange] Error exchanging coins:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/auth/user/game-data:
   *   put:
   *     summary: Update user game data (coins, level, balance, experience)
   *     tags: [Authentication]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               coins:
   *                 type: number
   *                 description: Number of coins
   *               level:
   *                 type: number
   *                 description: User level
   *               balance:
   *                 type: string
   *                 description: User balance
   *               experience:
   *                 type: number
   *                 description: User experience points
   *     responses:
   *       200:
   *         description: Game data updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Not authenticated
   *       404:
   *         description: User not found
   */

  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     summary: Get all users (Admin only)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 100
   *         description: Number of users to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Number of users to skip
   *     responses:
   *       200:
   *         description: List of users
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       401:
   *         description: Not authenticated
   *       403:
   *         description: Insufficient permissions
   */
  app.get('/api/admin/users', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await storage.getAllUsers(limit, offset);
      
      // Убираем чувствительные данные
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        balance: user.balance,
        coins: user.coins,
        tradesCount: user.tradesCount,
        role: user.role,
        isPremium: user.isPremium,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * @swagger
   * /api/coingecko/icon/{id}:
   *   get:
   *     summary: Получить ссылку на иконку криптовалюты через CoinGecko
   *     tags: [CoinGecko]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: CoinGecko ID (например, bitcoin, ethereum)
   *     responses:
   *       200:
   *         description: Ссылка на иконку
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 icon:
   *                   type: string
   *                   nullable: true
   *                   description: URL иконки (image.large)
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/coingecko/icon/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const icon = await getCoinGeckoIcon(id);
      res.set('Access-Control-Allow-Origin', '*');
      res.json({ icon });
    } catch (e) {
      res.set('Access-Control-Allow-Origin', '*');
      res.status(500).json({ icon: null });
    }
  });

  // Analytics routes
  app.post('/api/analytics/event', async (req, res) => {
    try {
      const { eventType, eventData, sessionId } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      
      let userId = null;
      if (typeof (req as any).isAuthenticated === 'function' && (req as any).isAuthenticated()) {
        userId = ((req as any).user)?.claims?.sub ?? null;
      }

      await storage.recordAnalyticsEvent(
        userId,
        eventType,
        eventData,
        sessionId,
        userAgent,
        ipAddress
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error recording analytics event:", error);
      res.status(500).json({ message: "Failed to record analytics event" });
    }
  });

  // Tutorial completion
  app.post('/api/tutorial/complete', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      
      // Прежде чем отдавать статистику — синхронизируем уровень с текущей суммой на счёте
      await applyAutoRewards(userId);
      const user = await storage.getUser(userId);
      if (user) {
        // В текущей схеме нет поля tutorialCompleted, просто пишем аналитику и успех
        await storage.recordAnalyticsEvent(userId, 'tutorial_completed', {});
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error completing tutorial:", error);
      res.status(500).json({ message: "Failed to complete tutorial" });
    }
  });

  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Получить активные уведомления пользователя
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список активных уведомлений
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                       type:
   *                         type: string
   *                       title:
   *                         type: string
   *                       message:
   *                         type: string
   *                       isActive:
   *                         type: boolean
   *                       isRead:
   *                         type: boolean
   *                       createdAt:
   *                         type: string
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/notifications', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const notifications = await notificationService.getActiveNotifications(userId);
      
      // Преобразуем поля в camelCase для фронтенда
      const formattedNotifications = notifications.map(notification => ({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isActive: notification.isActive,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt
      }));
      
      res.json({
        success: true,
        data: formattedNotifications
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch notifications" 
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/unread-count:
   *   get:
   *     summary: Получить количество непрочитанных уведомлений
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Количество непрочитанных уведомлений
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     count:
   *                       type: integer
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);
      
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch unread count" 
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/{id}/read:
   *   patch:
   *     summary: Отметить уведомление как прочитанное
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID уведомления
   *     responses:
   *       200:
   *         description: Уведомление отмечено как прочитанное
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         description: Не авторизован
   *       404:
   *         description: Уведомление не найдено
   *       500:
   *         description: Ошибка сервера
   */
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      
      const notification = await notificationService.markAsRead(notificationId, userId);
      
      if (!notification) {
        res.status(404).json({ 
          success: false, 
          message: "Notification not found" 
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Уведомление отмечено как прочитанное"
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to mark notification as read" 
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/read-all:
   *   patch:
   *     summary: Отметить все уведомления как прочитанные
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Все уведомления отмечены как прочитанные
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.patch('/api/notifications/read-all', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      await notificationService.markAllAsRead(userId);
      
      res.json({
        success: true,
        message: "Все уведомления отмечены как прочитанные"
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to mark all notifications as read" 
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/{id}:
   *   delete:
   *     summary: Удалить уведомление
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID уведомления
   *     responses:
   *       200:
   *         description: Уведомление удалено
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         description: Не авторизован
   *       404:
   *         description: Уведомление не найдено
   *       500:
   *         description: Ошибка сервера
   */
  app.delete('/api/notifications/:id', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      
      const notification = await notificationService.deleteNotification(notificationId, userId);
      
      if (!notification) {
        res.status(404).json({ 
          success: false, 
          message: "Notification not found" 
        });
        return;
      }
      
      res.json({
        success: true,
        message: "Уведомление удалено"
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete notification" 
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/create:
   *   post:
   *     summary: Создать новое уведомление
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - type
   *               - title
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [daily_reward, trade_closed, achievement_unlocked, system_alert, trade_opened]
   *                 description: Тип уведомления
   *               title:
   *                 type: string
   *                 description: Заголовок уведомления
   *               message:
   *                 type: string
   *                 description: Текст уведомления (опционально)
   *     responses:
   *       200:
   *         description: Уведомление создано
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Notification'
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/notifications/create', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { type, title, message } = req.body;

      // Валидация
      if (!type || !title) {
        res.status(400).json({
          success: false,
          message: "Type and title are required"
        });
        return;
      }

      const notification = await notificationService.createNotification({
        userId,
        type,
        title,
        message
      });

      res.json({
        success: true,
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isActive: notification.isActive,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        }
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create notification"
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/trade-closed:
   *   post:
   *     summary: Создать уведомление о закрытии сделки
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - tradeId
   *               - symbol
   *               - profit
   *             properties:
   *               tradeId:
   *                 type: number
   *                 description: ID сделки
   *               symbol:
   *                 type: string
   *                 description: Торговая пара
   *               profit:
   *                 type: number
   *                 description: Прибыль/убыток
   *     responses:
   *       200:
   *         description: Уведомление создано
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Notification'
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/notifications/trade-closed', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { tradeId, symbol, profit } = req.body;

      // Валидация
      if (!tradeId || !symbol || profit === undefined) {
        res.status(400).json({
          success: false,
          message: "tradeId, symbol, and profit are required"
        });
        return;
      }

      const notification = await notificationService.createTradeClosedNotification(
        userId, tradeId, symbol, profit
      );

      res.json({
        success: true,
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isActive: notification.isActive,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        }
      });
    } catch (error) {
      console.error("Error creating trade closed notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create trade closed notification"
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/daily-reward:
   *   post:
   *     summary: Создать уведомление о ежедневной награде
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - rewardAmount
   *             properties:
   *               rewardAmount:
   *                 type: number
   *                 description: Количество монет для награды
   *     responses:
   *       200:
   *         description: Уведомление создано
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Notification'
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/notifications/daily-reward', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { rewardAmount } = req.body;

      // Валидация
      if (!rewardAmount || rewardAmount <= 0) {
        res.status(400).json({
          success: false,
          message: "Valid rewardAmount is required"
        });
        return;
      }

      const notification = await notificationService.createDailyRewardNotification(
        userId, rewardAmount
      );

      res.json({
        success: true,
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isActive: notification.isActive,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        }
      });
    } catch (error) {
      console.error("Error creating daily reward notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create daily reward notification"
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/achievement:
   *   post:
   *     summary: Создать уведомление о достижении
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - achievementName
   *             properties:
   *               achievementName:
   *                 type: string
   *                 description: Название достижения
   *     responses:
   *       200:
   *         description: Уведомление создано
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Notification'
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/notifications/achievement', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { achievementName } = req.body;

      // Валидация
      if (!achievementName) {
        res.status(400).json({
          success: false,
          message: "achievementName is required"
        });
        return;
      }

      const notification = await notificationService.createAchievementNotification(
        userId, achievementName
      );

      res.json({
        success: true,
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isActive: notification.isActive,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        }
      });
    } catch (error) {
      console.error("Error creating achievement notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create achievement notification"
      });
    }
  });

  /**
   * @swagger
   * /api/notifications/system:
   *   post:
   *     summary: Создать системное уведомление
   *     tags: [Уведомления]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - message
   *             properties:
   *               title:
   *                 type: string
   *                 description: Заголовок уведомления
   *               message:
   *                 type: string
   *                 description: Текст уведомления
   *     responses:
   *       200:
   *         description: Уведомление создано
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Notification'
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/notifications/system', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { title, message } = req.body;

      // Валидация
      if (!title || !message) {
        res.status(400).json({
          success: false,
          message: "title and message are required"
        });
        return;
      }

      const notification = await notificationService.createSystemNotification(
        userId, title, message
      );

      res.json({
        success: true,
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isActive: notification.isActive,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt
        }
      });
    } catch (error) {
      console.error("Error creating system notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create system notification"
      });
    }
  });

  /**
   * @swagger
   * /api/premium/plans:
   *   get:
   *     summary: Получить доступные Premium планы
   *     tags: [Premium]
   *     responses:
   *       200:
   *         description: Список планов
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: number
   *                       name:
   *                         type: string
   *                       description:
   *                         type: string
   *                       planType:
   *                         type: string
   *                       price:
   *                         type: string
   *                       currency:
   *                         type: string
   *                       features:
   *                         type: array
   *                         items:
   *                           type: string
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/premium/plans', async (req, res) => {
    try {
      const plans = await premiumService.getActivePlans();
      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error("Error fetching premium plans:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch premium plans"
      });
    }
  });

  /**
   * @swagger
   * /api/premium/create-payment:
   *   post:
   *     summary: Создать платеж для Premium подписки
   *     tags: [Premium]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - planType
   *               - amount
   *             properties:
   *               planType:
   *                 type: string
   *                 enum: [month, year]
   *                 description: Тип плана
   *               amount:
   *                 type: number
   *                 description: Сумма платежа
   *               currency:
   *                 type: string
   *                 default: RUB
   *                 description: Валюта
   *               telegramId:
   *                 type: string
   *                 description: Telegram ID пользователя
   *     responses:
   *       200:
   *         description: Платеж создан
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     subscription:
   *                       type: object
   *                     paymentUrl:
   *                       type: string
   *                     confirmationUrl:
   *                       type: string
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/premium/create-payment', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { planType, amount, currency, telegramId } = req.body;

      // Валидация
      if (!planType || !amount) {
        res.status(400).json({
          success: false,
          message: "planType and amount are required"
        });
        return;
      }

      if (!['month', 'year'].includes(planType)) {
        res.status(400).json({
          success: false,
          message: "planType must be 'month' or 'year'"
        });
        return;
      }

      const paymentData = await premiumService.createPayment({
        userId,
        telegramId,
        planType,
        amount,
        currency
      });

      res.json({
        success: true,
        data: paymentData
      });
    } catch (error) {
      console.error("Error creating premium payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create premium payment"
      });
    }
  });

  /**
   * @swagger
   * /api/premium/status/{userId}:
   *   get:
   *     summary: Получить статус Premium подписки
   *     tags: [Premium]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID пользователя
   *     responses:
   *       200:
   *         description: Статус подписки
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     hasActiveSubscription:
   *                       type: boolean
   *                     subscription:
   *                       type: object
   *                     isExpired:
   *                       type: boolean
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.get('/api/premium/status/:userId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Проверяем, что пользователь запрашивает свой статус или является админом
      if (req.user.id !== userId && !req.user.isAdmin) {
        res.status(403).json({
          success: false,
          message: "Access denied"
        });
        return;
      }

      const status = await premiumService.getSubscriptionStatus(userId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error("Error fetching premium status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch premium status"
      });
    }
  });

  /**
   * @swagger
   * /api/premium/restore:
   *   post:
   *     summary: Восстановить покупки (для мобильных приложений)
   *     tags: [Premium]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Покупки восстановлены
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *       401:
   *         description: Не авторизован
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/premium/restore', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const purchases = await premiumService.restorePurchases(userId);
      
      res.json({
        success: true,
        data: purchases
      });
    } catch (error) {
      console.error("Error restoring purchases:", error);
      res.status(500).json({
        success: false,
        message: "Failed to restore purchases"
      });
    }
  });

  /**
   * @swagger
   * /api/premium/subscription:
   *   post:
   *     summary: Создать Premium подписку напрямую (для тестирования/админов)
   *     tags: [Premium]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - planType
   *             properties:
   *               userId:
   *                 type: string
   *                 description: ID пользователя
   *               planType:
   *                 type: string
   *                 enum: [month, year]
   *                 description: Тип плана
   *               telegramId:
   *                 type: string
   *                 description: Telegram ID (опционально)
   *               amount:
   *                 type: number
   *                 description: Сумма (опционально, берется из плана)
   *     responses:
   *       200:
   *         description: Подписка создана
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   $ref: '#/components/schemas/Notification'
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   *       403:
   *         description: Доступ запрещен
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/premium/subscription', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, planType, telegramId, amount } = req.body;
      const currentUserId = req.user.id;

      // Валидация
      if (!userId || !planType) {
        res.status(400).json({
          success: false,
          message: "userId and planType are required"
        });
        return;
      }

      if (!['month', 'year'].includes(planType)) {
        res.status(400).json({
          success: false,
          message: "planType must be 'month' or 'year'"
        });
        return;
      }

      // Проверяем права доступа (только админ или сам пользователь)
      if (currentUserId !== userId && !req.user.isAdmin) {
        res.status(403).json({
          success: false,
          message: "Access denied. Only admins can create subscriptions for other users."
        });
        return;
      }

      // Получаем план для определения цены
      const plan = await premiumService.getPlanByType(planType);
      if (!plan) {
        res.status(400).json({
          success: false,
          message: `Plan type ${planType} not found`
        });
        return;
      }

      // Создаем подписку напрямую (без платежа)
      const subscription = await premiumService.createDirectSubscription({
        userId,
        telegramId,
        planType,
         amount: amount || parseFloat(plan.price as unknown as string),
         currency: plan.currency || 'RUB'
      });

      res.json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            userId: subscription.userId,
            planType: subscription.planType,
            amount: subscription.amount,
            currency: subscription.currency,
            status: subscription.status,
            isActive: subscription.isActive,
            expiresAt: subscription.expiresAt,
            createdAt: subscription.createdAt
          },
          message: "Premium subscription created successfully"
        }
      });
    } catch (error) {
      console.error("Error creating premium subscription:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create premium subscription"
      });
    }
  });

  /**
   * @swagger
   * /api/webhooks/yookassa:
   *   post:
   *     summary: Webhook от ЮKassa для обработки платежей
   *     tags: [Premium]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               event:
   *                 type: string
   *               object:
   *                 type: object
   *     responses:
   *       200:
   *         description: Webhook обработан
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *       400:
   *         description: Неверные данные
   *       500:
   *         description: Ошибка сервера
   */
  app.post('/api/webhooks/yookassa', async (req, res) => {
    try {
      const webhookData = req.body;
      const signature = req.headers['x-yookassa-signature'] as string;

      await premiumService.handleWebhook(webhookData, signature);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing YooKassa webhook:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process webhook"
      });
    }
  });

  // --- RED BOX API ---
  app.post('/api/red-box/open', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const result = await PrizeService.openBox(userId, 'red');
      res.json(result);
    } catch (error: any) {
      console.error("Error opening red box:", error);
      res.status(500).json({ error: error.message || 'Ошибка открытия коробки' });
    }
  });

  // --- GREEN BOX API ---
  app.post('/api/green-box/open', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const result = await PrizeService.openBox(userId, 'green');
      res.json(result);
    } catch (error: any) {
      console.error("Error opening green box:", error);
      res.status(500).json({ error: error.message || 'Ошибка открытия коробки' });
    }
  });

  // --- X BOX API ---
  app.post('/api/x-box/open', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const result = await PrizeService.openBox(userId, 'x');
      res.json(result);
    } catch (error: any) {
      console.error("Error opening x box:", error);
      res.status(500).json({ error: error.message || 'Ошибка открытия коробки' });
    }
  });

  // --- WHEEL FORTUNE API ---
  /**
   * @swagger
   * /api/wheel/spin:
   *   post:
   *     tags: [Gamification]
   *     summary: Вращение рулетки фортуны
   *     description: Запуск рулетки для получения случайного приза
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: Результат вращения рулетки
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 prize:
   *                   type: number
   *                 index:
   *                   type: number
   *                 label:
   *                   type: string
   *                 newBalance:
   *                   type: string
   *       401:
   *         description: Пользователь не авторизован
   *       500:
   *         description: Внутренняя ошибка сервера
   */

  app.post('/api/wheel/spin', isAuthenticated, spinWheel);

  /**
   * @swagger
   * /api/wheel/prizes:
   *   get:
   *     tags: [Gamification]
   *     summary: Получить список призов рулетки
   *     description: Возвращает информацию о доступных призах в рулетке
   *     responses:
   *       200:
   *         description: Список призов рулетки
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 prizes:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       value:
   *                         type: number
   *                       label:
   *                         type: string
   *                       index:
   *                         type: number
   *       500:
   *         description: Внутренняя ошибка сервера
   */
  app.get('/api/wheel/prizes', getWheelPrizes);

  // --- PRIZE MANAGEMENT API ---
  
  // Получить все призы для коробки (для админа)
  app.get('/api/admin/prizes/:boxType', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { boxType } = req.params;
      if (!['red', 'green', 'x'].includes(boxType)) {
        res.status(400).json({ error: 'Неверный тип коробки' });
        return;
      }
      
      const prizes = await PrizeService.getPrizesForBox(boxType as 'red' | 'green' | 'x');
      res.json({ prizes });
    } catch (error: any) {
      console.error("Error getting prizes:", error);
      res.status(500).json({ error: error.message || 'Ошибка получения призов' });
    }
  });

  // Получить историю открытий пользователя
  app.get('/api/user/box-openings', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const openings = await PrizeService.getUserOpenings(userId, limit);
      res.json({ openings });
    } catch (error: any) {
      console.error("Error getting user openings:", error);
      res.status(500).json({ error: error.message || 'Ошибка получения истории' });
    }
  });

  // Получить статистику призов (для админа)
  app.get('/api/admin/prize-stats', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await PrizeService.getPrizeStats();
      res.json({ stats });
    } catch (error: any) {
      console.error("Error getting prize stats:", error);
      res.status(500).json({ error: error.message || 'Ошибка получения статистики' });
    }
  });

  // --- DEALS API ---
  app.get('/api/user/balance', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ error: 'Пользователь не найден' });
        return;
      }
      res.json({
        balance: Number(user.balance),
        freeBalance: Number(user.freeBalance || 0)
      });
    } catch (error: any) {
      console.error("Error getting user balance:", error);
      res.status(500).json({ error: 'Ошибка получения баланса' });
    }
  });

  app.get('/api/user/stats', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ error: 'Пользователь не найден' });
        return;
      }
      
      res.json({
        balance: Number(user.balance),
        freeBalance: Number(user.freeBalance || 0),
        tradesCount: Number(user.tradesCount || 0),
        totalTradesVolume: user.totalTradesVolume || "0.00",
        successfulTradesPercentage: user.successfulTradesPercentage || "0.00",
        maxProfit: user.maxProfit || "0.00",
        maxLoss: user.maxLoss || "0.00",
        averageTradeAmount: user.averageTradeAmount || "0.00",
        ratingScore: Number(user.ratingScore || 0),
        ratingRank30Days: user.ratingRank30Days,
        rewardsCount: Number(user.rewardsCount || 0),
        energyTasksBonus: Number(user.energyTasksBonus || 0),
        isPremium: Boolean(user.isPremium),
        premiumExpiresAt: user.premiumExpiresAt
      });
    } catch (error: any) {
      console.error("Error getting user stats:", error);
      res.status(500).json({ error: 'Ошибка получения статистики' });
    }
  });

  /**
   * @swagger
   * /api/rewards:
   *   get:
   *     summary: Список наград по количеству rewards_count
   *     tags: [Rewards]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Массив уровней наград
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   level:
   *                     type: integer
   *                     description: Требуемое значение rewards_count
   *                   accountMoney:
   *                     type: integer
   *                     description: Порог денег на аккаунте (по дизайну)
   *                   reward:
   *                     type: integer
   *                     description: Размер награды (по дизайну)
   *                   proDays:
   *                     type: integer
   *                     nullable: true
   *                     description: Доп. Про-режим на N дней
   */
  app.get('/api/rewards', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Пытаемся прочитать из БД; если пусто — генерируем дефолтные значения как раньше
      const tiersFromDb = await db.select().from(rewardTiers).orderBy(sql`level asc`);
      if (tiersFromDb.length > 0) {
        res.json(tiersFromDb.map(t => ({
          level: t.level,
          accountMoney: t.accountMoney,
          reward: t.reward,
          ...(t.proDays ? { proDays: t.proDays } : {}),
        })));
        return;
      }

      const tiersFallback = Array.from({ length: 48 }, (_, idx) => {
        const level = idx + 1;
        const accountMoney = 5000 * level;
        const reward = 500 * level;
        let proDays: number | undefined;
        if (level === 20) proDays = 3;
        if (level === 30) proDays = 5;
        if (level === 40) proDays = 10;
        return { level, accountMoney, reward, ...(proDays ? { proDays } : {}) };
      });

      res.json(tiersFallback);
    } catch (error: any) {
      console.error('Error building rewards list:', error);
      res.status(500).json({ error: 'Ошибка получения списка наград' });
    }
  });

  /**
   * @swagger
   * /api/energy/progress:
   *   get:
   *     summary: Получить текущий прогресс энергетических заданий
   *     tags: [Energy]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Текущий прогресс (0-100)
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/energy/progress', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const progress = await EnergyService.getProgress(userId);
      res.json({ progress });
    } catch (error: any) {
      console.error("Error getting energy progress:", error);
      res.status(500).json({ error: 'Ошибка получения прогресса' });
    }
  });

  /**
   * @swagger
   * /api/energy/add:
   *   post:
   *     summary: Добавить энергию к прогрессу пользователя
   *     tags: [Energy]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *                 description: Количество энергии для добавления
   *                 minimum: 1
   *     responses:
   *       200:
   *         description: Результат добавления энергии
   *       400:
   *         description: Неверные параметры
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/energy/add', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Неверное количество энергии' });
        return;
      }

      const result = await EnergyService.addEnergy(userId, amount);
      res.json(result);
    } catch (error: any) {
      console.error("Error adding energy:", error);
      res.status(500).json({ error: 'Ошибка добавления энергии' });
    }
  });

  /**
   * @swagger
   * /api/energy/reset:
   *   post:
   *     summary: Сбросить прогресс энергетических заданий
   *     tags: [Energy]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Прогресс сброшен
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/energy/reset', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      await EnergyService.resetProgress(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error resetting energy progress:", error);
      res.status(500).json({ error: 'Ошибка сброса прогресса' });
    }
  });

  // ЯВНОЕ СПИСАНИЕ ЭНЕРГИИ (для кейсов с гонками)
  app.post('/api/energy/spend', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { amount, expectedBefore } = req.body || {};
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({ error: 'Некорректное количество энергии' });
        return;
      }
      const result = await EnergyService.spendEnergy(userId, amount, typeof expectedBefore === 'number' ? expectedBefore : undefined);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Error spending energy:', error);
      res.status(500).json({ error: 'Ошибка списания энергии' });
    }
  });

  /**
   * @swagger
   * /api/tasks:
   *   get:
   *     summary: Получить все активные задания пользователя (с автоматическим созданием недостающих)
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      console.log(`[ROUTES] Getting tasks for user: ${userId}`);
      
      // Get current tasks and auto-fill if needed
      const tasks = await TaskService.autoFillTasks(userId);
      
      console.log(`[ROUTES] Returning ${tasks.length} tasks`);
      res.json({ tasks });
      
    } catch (error: any) {
      console.error("[ROUTES] Error getting tasks:", error);
      res.status(500).json({ error: 'Failed to get tasks' });
    }
  });

  /**
   * @swagger
   * /api/tasks/auto-refill:
   *   post:
   *     summary: Автоматически пополнить задания до 3 штук
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Задания пополнены
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/auto-refill', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const currentTasks = await TaskService.getUserTasks(userId);
      const currentCount = currentTasks.length;
      const maxTasks = 3;
      
      if (currentCount >= maxTasks) {
        res.json({ 
          message: 'Достигнут лимит активных заданий',
          tasks: currentTasks 
        });
        return;
      }
      
      const tasksToCreate = maxTasks - currentCount;
      const newTasks: unknown[] = [];
      
      // Пытаемся создать задания, но не более 10 попыток для каждого слота
      for (let i = 0; i < tasksToCreate; i++) {
        let attempts = 0;
        let newTask = null;
        
        while (attempts < 10 && !newTask) {
          newTask = await TaskService.createRandomTask(userId);
          attempts++;
          
          if (!newTask) {
            console.log(`[auto-refill] Попытка ${attempts}: не удалось создать задание для пользователя ${userId}`);
            // Небольшая задержка между попытками
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        if (newTask) {
          newTasks.push(newTask);
          console.log(`[auto-refill] Создано задание: ${newTask.title} для пользователя ${userId}`);
        } else {
          console.log(`[auto-refill] Не удалось создать задание после ${attempts} попыток для пользователя ${userId}`);
        }
      }
      
      // Получаем обновленный список
      const updatedTasks = await TaskService.getUserTasks(userId);
      
      res.json({ 
        message: `Создано ${newTasks.length} новых заданий`,
        createdTasks: newTasks,
        tasks: updatedTasks
      });
    } catch (error: any) {
      console.error("Error auto-refilling tasks:", error);
      res.status(500).json({ error: 'Ошибка пополнения заданий' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create:
   *   post:
   *     summary: Создать новое случайное задание
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Новое задание создано
   *       400:
   *         description: Достигнут лимит активных заданий (3)
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const newTask = await TaskService.createRandomTask(userId);
      
      if (!newTask) {
        res.status(400).json({ error: 'Достигнут лимит активных заданий (3)' });
        return;
      }
      
      res.json({ task: newTask });
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: 'Ошибка создания задания' });
    }
  });

  /**
   * @swagger
   * /api/tasks/{taskId}/replace:
   *   post:
   *     summary: Заменить задание на новое случайное
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID задания для замены
   *     responses:
   *       200:
   *         description: Задание заменено или возвращено то же
   *       400:
   *         description: Задание не найдено
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/:taskId/replace', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.taskId);

      console.log(`[ROUTES] Replacing task: taskId=${taskId}, userId=${userId}`);

      if (!taskId || isNaN(taskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }

      const result = await TaskService.replaceTask(taskId, userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error || 'Failed to replace task' });
        return;
      }

      console.log(`[ROUTES] Task replaced: taskId=${taskId}, newTask=${!!result.newTask}`);
      
      res.json({
        success: true,
        newTask: result.newTask
      });
    } catch (error: any) {
      console.error("[ROUTES] Error replacing task:", error);
      res.status(500).json({ error: 'Failed to replace task' });
    }
  });

  /**
   * @swagger
   * /api/tasks/{taskId}/progress:
   *   post:
   *     summary: Обновить прогресс задания
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID задания
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               progress:
   *                 type: number
   *                 description: Новый прогресс
   *                 minimum: 0
   *     responses:
   *       200:
   *         description: Прогресс обновлен
   *       400:
   *         description: Задание не найдено
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/:taskId/progress', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.taskId);
      const { progress } = req.body;

      console.log(`[SERVER] Обновление прогресса задания: taskId=${taskId}, userId=${userId}, progress=${progress}`);

      if (!taskId || isNaN(taskId)) {
        console.log(`[SERVER] Неверный taskId: ${req.params.taskId}`);
        res.status(400).json({ error: 'Неверный ID задания' });
        return;
      }

      if (typeof progress !== 'number' || progress < 0) {
        console.log(`[SERVER] Неверный прогресс: ${progress}`);
        res.status(400).json({ error: 'Неверный прогресс' });
        return;
      }

      const result = await TaskService.updateTaskProgress(taskId, userId, progress);
      
      if (!result) {
        console.log(`[SERVER] Задание не найдено: taskId=${taskId}, userId=${userId}`);
        res.status(400).json({ error: 'Задание не найдено' });
        return;
      }
      
      console.log(`[SERVER] Задание обновлено: taskId=${taskId}, newTask=${!!result.newTask}`);
      
      // Определяем, выполнено ли задание
      const isCompleted = result.task.status === 'completed';
      const rewardClaimed = isCompleted; // Награда выдается автоматически при завершении
      
      // Возвращаем обновленное задание с правильной структурой ответа
      const response: any = { 
        task: result.task,
        isCompleted,
        rewardClaimed
      };
      
      if (result.newTask) {
        response.newTask = result.newTask;
      }
      
      res.json(response);
    } catch (error: any) {
      console.error("Error updating task progress:", error);
      res.status(500).json({ error: 'Ошибка обновления прогресса' });
    }
  });

  // Complete task and get reward
  app.post('/api/tasks/:taskId/complete', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.taskId);
      
      console.log(`[ROUTES] Completing task: taskId=${taskId}, userId=${userId}`);
      
      if (!taskId || isNaN(taskId)) {
        res.status(400).json({ error: 'Invalid task ID' });
        return;
      }
      
      const result = await TaskService.completeTask(taskId, userId);
      
      if (!result.success) {
        res.status(400).json({ error: result.error || 'Failed to complete task' });
        return;
      }
      
      console.log(`[ROUTES] Task completed: taskId=${taskId}, newTask=${!!result.newTask}`);
      
      res.json({
        success: true,
        completedTask: result.task,
        newTask: result.newTask
      });
      
    } catch (error: any) {
      console.error("[ROUTES] Error completing task:", error);
      res.status(500).json({ error: 'Failed to complete task' });
    }
  });

  /**
   * @swagger
   * /api/tasks/{taskId}:
   *   delete:
   *     summary: Удалить задание
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID задания
   *     responses:
   *       200:
   *         description: Задание удалено
   *       400:
   *         description: Задание не найдено
   *       401:
   *         description: Не авторизован
   */
  app.delete('/api/tasks/:taskId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const taskId = parseInt(req.params.taskId);

      if (!taskId || isNaN(taskId)) {
        res.status(400).json({ error: 'Неверный ID задания' });
        return;
      }

      const deleted = await TaskService.deleteTask(taskId, userId);
      
      if (!deleted) {
        res.status(400).json({ error: 'Задание не найдено' });
        return;
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: 'Ошибка удаления задания' });
    }
  });

  /**
   * @swagger
   * /api/tasks/count:
   *   get:
   *     summary: Получить количество активных заданий
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Количество активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/count', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const count = await TaskService.getActiveTasksCount(userId);
      res.json({ count, maxTasks: 3 });
    } catch (error: any) {
      console.error("Error getting tasks count:", error);
      res.status(500).json({ error: 'Ошибка получения количества заданий' });
    }
  });

  /**
   * @swagger
   * /api/tasks/templates:
   *   get:
   *     summary: Получить все доступные шаблоны заданий
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список всех шаблонов заданий
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/templates', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = TaskTemplateService.getRandomTemplate();
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting task templates:", error);
      res.status(500).json({ error: 'Ошибка получения шаблонов заданий' });
    }
  });

  /**
   * @swagger
   * /api/tasks/templates/energy:
   *   get:
   *     summary: Получить шаблоны энергетических заданий
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список энергетических шаблонов заданий
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/templates/energy', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = TaskTemplateService.getEnergyTemplates();
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting energy task templates:", error);
      res.status(500).json({ error: 'Ошибка получения энергетических шаблонов заданий' });
    }
  });

  /**
   * @swagger
   * /api/tasks/templates/crypto:
   *   get:
   *     summary: Получить шаблоны криптовалютных заданий
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список криптовалютных шаблонов заданий
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/templates/crypto', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = TaskTemplateService.getCryptoTemplates();
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting crypto task templates:", error);
      res.status(500).json({ error: 'Ошибка получения криптовалютных шаблонов заданий' });
    }
  });

  /**
   * @swagger
   * /api/tasks/templates/energy-rewards:
   *   get:
   *     summary: Получить шаблоны заданий с наградой в виде энергии
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список шаблонов заданий с энергетическими наградами
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/templates/energy-rewards', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = TaskTemplateService.getEnergyRewardTemplates();
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting energy reward task templates:", error);
      res.status(500).json({ error: 'Ошибка получения шаблонов заданий с энергетическими наградами' });
    }
  });

  /**
   * @swagger
   * /api/tasks/templates/coin-rewards:
   *   get:
   *     summary: Получить шаблоны заданий с наградой в виде монет
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Список шаблонов заданий с наградами в монетах
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/templates/coin-rewards', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = TaskTemplateService.getCoinRewardTemplates();
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting coin reward task templates:", error);
      res.status(500).json({ error: 'Ошибка получения шаблонов заданий с наградами в монетах' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create/energy:
   *   post:
   *     summary: Создать энергетическое задание
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Энергетическое задание создано
   *       400:
   *         description: Достигнут лимит активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create/energy', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const task = await TaskService.createTaskByCategory(userId, 'energy');
      
      if (!task) {
        res.status(400).json({ error: 'Достигнут лимит активных заданий или нет доступных шаблонов' });
        return;
      }
      
      res.json({ task });
    } catch (error: any) {
      console.error("Error creating energy task:", error);
      res.status(500).json({ error: 'Ошибка создания энергетического задания' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create/crypto:
   *   post:
   *     summary: Создать криптовалютное задание
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Криптовалютное задание создано
   *       400:
   *         description: Достигнут лимит активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create/crypto', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const task = await TaskService.createTaskByCategory(userId, 'crypto');
      
      if (!task) {
        res.status(400).json({ error: 'Достигнут лимит активных заданий или нет доступных шаблонов' });
        return;
      }
      
      res.json({ task });
    } catch (error: any) {
      console.error("Error creating crypto task:", error);
      res.status(500).json({ error: 'Ошибка создания криптовалютного задания' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create/energy-reward:
   *   post:
   *     summary: Создать задание с наградой в виде энергии
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Задание с энергетической наградой создано
   *       400:
   *         description: Достигнут лимит активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create/energy-reward', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const energyTemplates = TaskTemplateService.getEnergyRewardTemplates();
      
      if (energyTemplates.length === 0) {
        res.status(400).json({ error: 'Нет доступных шаблонов с энергетическими наградами' });
        return;
      }
      
      const randomTemplate = energyTemplates[Math.floor(Math.random() * energyTemplates.length)];
      const options = TaskTemplateService.templateToCreateOptions(randomTemplate);
      const task = await TaskService.createTask(userId, options);
      
      if (!task) {
        res.status(400).json({ error: 'Достигнут лимит активных заданий' });
        return;
      }
      
      res.json({ task });
    } catch (error: any) {
      console.error("Error creating energy reward task:", error);
      res.status(500).json({ error: 'Ошибка создания задания с энергетической наградой' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create/coin-reward:
   *   post:
   *     summary: Создать задание с наградой в виде монет
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Задание с наградой в монетах создано
   *       400:
   *         description: Достигнут лимит активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create/coin-reward', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const coinTemplates = TaskTemplateService.getCoinRewardTemplates();
      
      if (coinTemplates.length === 0) {
        res.status(400).json({ error: 'Нет доступных шаблонов с наградами в монетах' });
        return;
      }
      
      const randomTemplate = coinTemplates[Math.floor(Math.random() * coinTemplates.length)];
      const options = TaskTemplateService.templateToCreateOptions(randomTemplate);
      const task = await TaskService.createTask(userId, options);
      
      if (!task) {
        res.status(400).json({ error: 'Достигнут лимит активных заданий' });
        return;
      }
      
      res.json({ task });
    } catch (error: any) {
      console.error("Error creating coin reward task:", error);
      res.status(500).json({ error: 'Ошибка создания задания с наградой в монетах' });
    }
  });

  /**
   * @swagger
   * /api/tasks/templates/category/{category}:
   *   get:
   *     summary: Получить шаблоны заданий по категории
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: category
   *         required: true
   *         schema:
   *           type: string
   *           enum: [daily, video, trade, social, premium]
   *         description: Категория заданий
   *     responses:
   *       200:
   *         description: Список шаблонов заданий по категории
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/tasks/templates/category/:category', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { category } = req.params;
      const templates = TaskTemplateService.getTemplatesByCategory(category as "trade" | "energy" | "daily" | "video" | "social" | "premium" | "crypto");
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting task templates by category:", error);
      res.status(500).json({ error: 'Ошибка получения шаблонов заданий' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create/template/{templateId}:
   *   post:
   *     summary: Создать задание по ID шаблона
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: templateId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID шаблона задания
   *     responses:
   *       200:
   *         description: Новое задание создано
   *       400:
   *         description: Шаблон не найден или достигнут лимит активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create/template/:templateId', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { templateId } = req.params;
      
      const newTask = await TaskService.createTaskByTemplateId(userId, templateId);
      
      if (!newTask) {
        res.status(400).json({ error: 'Шаблон не найден или достигнут лимит активных заданий (3)' });
        return;
      }
      
      res.json({ task: newTask });
    } catch (error: any) {
      console.error("Error creating task by template:", error);
      res.status(500).json({ error: 'Ошибка создания задания' });
    }
  });

  /**
   * @swagger
   * /api/tasks/create/category/{category}:
   *   post:
   *     summary: Создать случайное задание по категории
   *     tags: [Tasks]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: category
   *         required: true
   *         schema:
   *           type: string
   *           enum: [daily, video, trade, social, premium]
   *         description: Категория заданий
   *     responses:
   *       200:
   *         description: Новое задание создано
   *       400:
   *         description: Категория не найдена или достигнут лимит активных заданий
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/tasks/create/category/:category', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { category } = req.params;
      
      const newTask = await TaskService.createTaskByCategory(userId, category);
      
      if (!newTask) {
        res.status(400).json({ error: 'Категория не найдена или достигнут лимит активных заданий (3)' });
        return;
      }
      
      res.json({ task: newTask });
    } catch (error: any) {
      console.error("Error creating task by category:", error);
      res.status(500).json({ error: 'Ошибка создания задания' });
    }
  });

  // ===== CRUD API для управления шаблонами заданий =====

  /**
   * @swagger
   * /api/admin/task-templates:
   *   get:
   *     summary: Получить все шаблоны заданий (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *         description: Включить неактивные шаблоны
   *     responses:
   *       200:
   *         description: Список всех шаблонов
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/admin/task-templates', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const templates = await DatabaseTaskTemplateService.getAllTemplates(includeInactive);
      res.json({ templates });
    } catch (error: any) {
      console.error("Error getting task templates:", error);
      res.status(500).json({ error: 'Ошибка получения шаблонов' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates/{id}:
   *   get:
   *     summary: Получить шаблон по ID (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID шаблона
   *     responses:
   *       200:
   *         description: Шаблон найден
   *       404:
   *         description: Шаблон не найден
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/admin/task-templates/:id', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const template = await DatabaseTaskTemplateService.getTemplateById(id);
      
      if (!template) {
        res.status(404).json({ error: 'Шаблон не найден' });
        return;
      }
      
      res.json({ template });
    } catch (error: any) {
      console.error("Error getting task template:", error);
      res.status(500).json({ error: 'Ошибка получения шаблона' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates:
   *   post:
   *     summary: Создать новый шаблон задания (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - templateId
   *               - taskType
   *               - title
   *               - description
   *               - rewardType
   *               - rewardAmount
   *               - progressTotal
   *               - category
   *               - rarity
   *             properties:
   *               templateId:
   *                 type: string
   *                 description: Уникальный ID шаблона
   *               taskType:
   *                 type: string
   *                 description: Тип задания
   *               title:
   *                 type: string
   *                 description: Название задания
   *               description:
   *                 type: string
   *                 description: Описание задания
   *               rewardType:
   *                 type: string
   *                 enum: [money, coins, energy]
   *                 description: Тип награды
   *               rewardAmount:
   *                 type: string
   *                 description: Количество награды
   *               progressTotal:
   *                 type: number
   *                 description: Общее количество шагов
   *               icon:
   *                 type: string
   *                 description: Путь к иконке
   *               category:
   *                 type: string
   *                 enum: [daily, video, trade, social, premium]
   *                 description: Категория задания
   *               rarity:
   *                 type: string
   *                 enum: [common, rare, epic, legendary]
   *                 description: Редкость задания
   *               expiresInHours:
   *                 type: number
   *                 description: Время жизни задания в часах
   *     responses:
   *       201:
   *         description: Шаблон создан
   *       400:
   *         description: Неверные данные
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/admin/task-templates', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const templateData = req.body;
      
      // Проверяем обязательные поля
      const requiredFields = ['templateId', 'taskType', 'title', 'description', 'rewardType', 'rewardAmount', 'progressTotal', 'category', 'rarity'];
      for (const field of requiredFields) {
        if (!templateData[field]) {
          res.status(400).json({ error: `Поле ${field} обязательно` });
          return;
        }
      }
      
      const newTemplate = await DatabaseTaskTemplateService.createTemplate(templateData, userId);
      res.status(201).json({ template: newTemplate });
    } catch (error: any) {
      console.error("Error creating task template:", error);
      res.status(500).json({ error: 'Ошибка создания шаблона' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates/{id}:
   *   put:
   *     summary: Обновить шаблон задания (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID шаблона
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               taskType:
   *                 type: string
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               rewardType:
   *                 type: string
   *                 enum: [money, coins, energy]
   *               rewardAmount:
   *                 type: string
   *               progressTotal:
   *                 type: number
   *               icon:
   *                 type: string
   *               category:
   *                 type: string
   *                 enum: [daily, video, trade, social, premium]
   *               rarity:
   *                 type: string
   *                 enum: [common, rare, epic, legendary]
   *               expiresInHours:
   *                 type: number
   *               isActive:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Шаблон обновлен
   *       404:
   *         description: Шаблон не найден
   *       401:
   *         description: Не авторизован
   */
  app.put('/api/admin/task-templates/:id', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedTemplate = await DatabaseTaskTemplateService.updateTemplate(id, updateData);
      
      if (!updatedTemplate) {
        res.status(404).json({ error: 'Шаблон не найден' });
        return;
      }
      
      res.json({ template: updatedTemplate });
    } catch (error: any) {
      console.error("Error updating task template:", error);
      res.status(500).json({ error: 'Ошибка обновления шаблона' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates/{id}:
   *   delete:
   *     summary: Удалить шаблон задания (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID шаблона
   *     responses:
   *       200:
   *         description: Шаблон удален
   *       404:
   *         description: Шаблон не найден
   *       401:
   *         description: Не авторизован
   */
  app.delete('/api/admin/task-templates/:id', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deletedTemplate = await DatabaseTaskTemplateService.deleteTemplate(id);
      
      if (!deletedTemplate) {
        res.status(404).json({ error: 'Шаблон не найден' });
        return;
      }
      
      res.json({ success: true, template: deletedTemplate });
    } catch (error: any) {
      console.error("Error deleting task template:", error);
      res.status(500).json({ error: 'Ошибка удаления шаблона' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates/{id}/activate:
   *   post:
   *     summary: Активировать шаблон задания (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID шаблона
   *     responses:
   *       200:
   *         description: Шаблон активирован
   *       404:
   *         description: Шаблон не найден
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/admin/task-templates/:id/activate', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const activatedTemplate = await DatabaseTaskTemplateService.activateTemplate(id);
      
      if (!activatedTemplate) {
        res.status(404).json({ error: 'Шаблон не найден' });
        return;
      }
      
      res.json({ template: activatedTemplate });
    } catch (error: any) {
      console.error("Error activating task template:", error);
      res.status(500).json({ error: 'Ошибка активации шаблона' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates/search:
   *   get:
   *     summary: Поиск шаблонов заданий (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Поисковый запрос
   *       - in: query
   *         name: includeInactive
   *         schema:
   *           type: boolean
   *         description: Включить неактивные шаблоны
   *     responses:
   *       200:
   *         description: Результаты поиска
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/admin/task-templates/search', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, includeInactive } = req.query;
      
      if (!q) {
        res.status(400).json({ error: 'Поисковый запрос обязателен' });
        return;
      }
      
      const templates = await DatabaseTaskTemplateService.searchTemplates(q as string, includeInactive === 'true');
      res.json({ templates });
    } catch (error: any) {
      console.error("Error searching task templates:", error);
      res.status(500).json({ error: 'Ошибка поиска шаблонов' });
    }
  });

  /**
   * @swagger
   * /api/admin/task-templates/stats:
   *   get:
   *     summary: Получить статистику шаблонов заданий (админ)
   *     tags: [Admin]
   *     security:
   *       - sessionAuth: []
   *     responses:
   *       200:
   *         description: Статистика шаблонов
   *       401:
   *         description: Не авторизован
   */
  app.get('/api/admin/task-templates/stats', isAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await DatabaseTaskTemplateService.getTemplateStats();
      res.json({ stats });
    } catch (error: any) {
      console.error("Error getting task template stats:", error);
      res.status(500).json({ error: 'Ошибка получения статистики' });
    }
  });

  /**
   * @swagger
   * /api/funds/ensure-free:
   *   post:
   *     summary: Обеспечить 30% средств в свободном балансе при нехватке
   *     tags: [Trading]
   *     security:
   *       - sessionAuth: []
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               requiredAmount:
   *                 type: number
   *                 description: Необходимая сумма во freeBalance
   *     responses:
   *       200:
   *         description: Результат пересчёта
   *       401:
   *         description: Не авторизован
   */
  app.post('/api/funds/ensure-free', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { requiredAmount } = req.body ?? {};

      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'Пользователь не найден' });
        return;
      }

      const before = {
        balance: Number(user.balance || 0),
        freeBalance: Number(user.freeBalance || 0),
      };

      const total = Math.max(0, before.balance + before.freeBalance);
      const targetFree = Number((total * 0.3).toFixed(8));
      const targetBalance = Number((total - targetFree).toFixed(2));

      const needAmount = typeof requiredAmount === 'number' && requiredAmount > 0 ? requiredAmount : undefined;

      const hasEnough = needAmount !== undefined ? before.freeBalance >= needAmount : before.freeBalance >= targetFree;

      if (hasEnough) {
        res.json({ success: true, rebalanced: false, before, after: before });
        return;
      }

      const after = { balance: targetBalance, freeBalance: targetFree };

      await storage.upsertUser({
        ...user,
        balance: after.balance.toFixed(2),
        freeBalance: after.freeBalance.toFixed(8),
        updatedAt: new Date(),
      });

      res.json({ success: true, rebalanced: true, before, after });
    } catch (error) {
      console.error('Error ensuring free funds:', error);
      res.status(500).json({ success: false, error: 'Ошибка перераспределения средств' });
    }
  });

  app.get('/api/deals/user', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const deals = await storage.getUserDeals(userId);
      res.json(deals);
    } catch (error: any) {
      console.error("Error getting user deals:", error);
      res.status(500).json({ error: 'Ошибка получения сделок' });
    }
  });

  app.get('/api/deals/active-profit', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const activeDeals = await storage.getUserActiveDeals(userId);
      
      const profitData: { dealId: number; profit: string }[] = [];
      
      for (const deal of activeDeals) {
        try {
          // Получаем актуальную цену с Binance API
          let priceData = unifiedPriceService.getPrice(deal.symbol);
          if (!priceData) {
            await unifiedPriceService.addPair(deal.symbol);
            await new Promise(r => setTimeout(r, 500)); // Ждем обновления цены
            priceData = unifiedPriceService.getPrice(deal.symbol);
          }
          
          if (!priceData) {
            console.warn(`Не удалось получить цену для ${deal.symbol}`);
            continue;
          }
          
          // Рассчитываем прибыль по формуле с комиссией
          const amount = Number(deal.amount);
          const multiplier = deal.multiplier;
          const openPrice = Number(deal.openPrice);
          const currentPrice = priceData.price;
          
          // Рассчитываем объем сделки
          const volume = amount * multiplier;
          
          // Рассчитываем изменение цены
          const priceChange = (currentPrice - openPrice) / openPrice;
          
          // Рассчитываем прибыль в зависимости от направления
          let profit = 0;
          if (deal.direction === 'up') {
            profit = volume * priceChange;
          } else {
            profit = volume * (-priceChange);
          }
          
          // Рассчитываем комиссию (0.05%)
          const commission = volume * 0.0005;
          
          // Итоговая прибыль с учетом комиссии
          const finalProfit = profit - commission;
          
          profitData.push({
            dealId: deal.id,
            profit: finalProfit.toFixed(2)
          });
          
        } catch (error) {
          console.error(`Ошибка расчета прибыли для сделки ${deal.id}:`, error);
        }
      }
      
      res.json(profitData);
    } catch (error: any) {
      console.error("Error getting active deals profit:", error);
      res.status(500).json({ error: 'Ошибка получения прибыли активных сделок' });
    }
  });

  app.post('/api/deals/open', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { symbol, direction, amount, multiplier, takeProfit, stopLoss } = req.body;
      if (!symbol || !direction || !amount || !multiplier) {
        res.status(400).json({ error: 'symbol, direction, amount, multiplier обязательны' });
        return;
      }
      const result = await dealsService.openDeal({
        userId,
        symbol,
        direction,
        amount: Number(amount),
        multiplier: Number(multiplier),
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/deals/close', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { dealId } = req.body;
      if (!dealId) {
        res.status(400).json({ error: 'dealId обязателен' });
        return;
      }
      const result = await dealsService.closeDeal({ userId, dealId: Number(dealId) });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.put('/api/deals/update', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const { dealId, takeProfit, stopLoss } = req.body;
      
      // Валидация входных данных
      if (!dealId) {
        res.status(400).json({ success: false, error: 'dealId обязателен' });
        return;
      }
      
      if (takeProfit !== undefined && (typeof takeProfit !== 'number' || takeProfit <= 0)) {
        res.status(400).json({ success: false, error: 'Некорректное значение Take Profit' });
        return;
      }
      
      if (stopLoss !== undefined && (typeof stopLoss !== 'number' || stopLoss <= 0)) {
        res.status(400).json({ success: false, error: 'Некорректное значение Stop Loss' });
        return;
      }

      // Нечего обновлять — оба значения отсутствуют
      if (takeProfit === undefined && stopLoss === undefined) {
        res.status(400).json({ success: false, error: 'Нечего обновлять: передайте takeProfit и/или stopLoss' });
        return;
      }
      
      // Обновляем TP/SL
      const updatedDeal = await storage.updateDealTpSl(Number(dealId), userId, takeProfit, stopLoss);
      
      if (!updatedDeal) {
        res.status(404).json({ success: false, error: 'Сделка не найдена' });
        return;
      }
      
      res.json({
        success: true,
        id: updatedDeal.id,
        takeProfit: updatedDeal.takeProfit,
        stopLoss: updatedDeal.stopLoss
      });
      
    } catch (error: any) {
      console.error("Error updating deal TP/SL:", error);
      res.status(500).json({ success: false, error: 'Ошибка обновления сделки' });
    }
  });

  app.get('/api/deals/:dealId/commission', isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const dealId = Number(req.params.dealId);
      
      // Валидация dealId
      if (isNaN(dealId) || dealId <= 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Некорректный ID сделки' 
        });
        return;
      }
      
      // Получаем данные сделки
      const deal = await storage.getDealById(dealId, userId);
      
      if (!deal) {
        res.status(404).json({ 
          success: false, 
          error: 'Сделка не найдена или нет доступа' 
        });
        return;
      }
      
      // Проверяем, что сделка активна
      if (deal.status !== 'open') {
        res.status(400).json({ 
          success: false, 
          error: 'Комиссия рассчитывается только для активных сделок' 
        });
        return;
      }
      
      // Рассчитываем комиссию
      const amount = Number(deal.amount);
      const multiplier = deal.multiplier;
      const volume = amount * multiplier;
      const commissionRate = 0.0005; // 0.05% комиссия
      const commission = volume * commissionRate;
      
      res.json({
        success: true,
        commission: commission.toFixed(2),
        dealId: deal.id,
        volume: volume,
        commissionRate: commissionRate,
        amount: amount,
        multiplier: multiplier
      });
      
    } catch (error: any) {
      console.error("Error getting deal commission:", error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка получения комиссии сделки' 
      });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  // Socket.io server с Redis адаптером для масштабирования
  const io = new IOServer(httpServer, {
    path: '/socket.io',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis адаптер для кластеризации Socket.io
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis адаптер подключен');
  } catch (error) {
    console.warn('⚠️ Redis недоступен, Socket.io работает без кластеризации:', error);
  }

  type ClientSubs = { symbols: Set<string> };
  const socketSubs = new Map<string, ClientSubs>();

  io.on('connection', (socket) => {
    socketSubs.set(socket.id, { symbols: new Set() });

    socket.on('subscribe', (payload: { symbols?: string[] }) => {
      const entry = socketSubs.get(socket.id);
      if (!entry) return;
      
      const symbols = (payload?.symbols || []).map((s) => String(s).toUpperCase());
      
      // Ограничение подписок: максимум 10 символов на соединение
      const MAX_SYMBOLS = 10;
      const currentCount = entry.symbols.size;
      const newSymbols = symbols.filter(s => !entry.symbols.has(s));
      
      if (currentCount + newSymbols.length > MAX_SYMBOLS) {
        socket.emit('error', { 
          message: `Максимум ${MAX_SYMBOLS} символов на подключение. Текущее: ${currentCount}` 
        });
        return;
      }
      
      // Подписываемся только на новые символы
      for (const sym of newSymbols) {
        entry.symbols.add(sym);
        socket.join(`sym:${sym}`);
        // ensure unified service tracks it
        unifiedPriceService.addPair(sym).catch(() => {});
      }
      
      socket.emit('subscribed', { 
        symbols: Array.from(entry.symbols),
        count: entry.symbols.size,
        limit: MAX_SYMBOLS
      });
    });

    socket.on('unsubscribe', (payload: { symbols?: string[] }) => {
      const entry = socketSubs.get(socket.id);
      if (!entry) return;
      const symbols = (payload?.symbols || []).map((s) => String(s).toUpperCase());
      for (const sym of symbols) {
        entry.symbols.delete(sym);
        socket.leave(`sym:${sym}`);
        // we do not auto-remove from unified service to keep shared tracking
      }
      socket.emit('unsubscribed', { symbols });
    });

    socket.on('disconnect', () => {
      socketSubs.delete(socket.id);
    });
  });

  // Fan-out price updates to symbol rooms
  unifiedPriceService.on('priceUpdate', (priceData: any) => {
    if (!priceData?.symbol) return;
    io.to(`sym:${priceData.symbol}`).emit('priceUpdate', priceData);
  });

  // Legacy ws (kept for compatibility)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    // info: websocket connected

    // Subscribe to price updates
    const priceUpdateHandler = (priceData: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'priceUpdate',
          data: priceData,
        }));
      }
    };

    const tradeUpdateHandler = (data: unknown) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'tradeUpdate',
          data,
        }));
      }
    };

    unifiedPriceService.on('priceUpdate', priceUpdateHandler);
    tradingEngine.on('tradeOpened', tradeUpdateHandler);
    tradingEngine.on('tradeClosed', tradeUpdateHandler);
    tradingEngine.on('tradeUpdated', tradeUpdateHandler);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe' && data.symbol) {
          // Add the trading pair to unified price service
          unifiedPriceService.addPair(data.symbol).catch(console.error);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // info: websocket disconnected
      unifiedPriceService.off('priceUpdate', priceUpdateHandler);
      tradingEngine.off('tradeOpened', tradeUpdateHandler);
      tradingEngine.off('tradeClosed', tradeUpdateHandler);
      tradingEngine.off('tradeUpdated', tradeUpdateHandler);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
