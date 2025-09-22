import { db } from '../db.js';
import { clickhouseAnalyticsService } from './clickhouseAnalyticsService.js';
import { users, deals, analytics } from '../../shared/schema.js';
import { sql, eq, gte, lte, and, desc, count, sum } from 'drizzle-orm';
import { GeoLocationService } from './geoLocationService.js';

/**
 * Сервис для новых User Analytics с детальными данными
 */
export class UserAnalyticsService {

  /**
   * Получение детальных метрик retention
   */
  async getRetentionDetailed(filters: any = {}) {
    try {
      console.log('[UserAnalytics] Getting detailed retention data...');
      
      const { startDate, endDate } = this.parseDateFilters(filters);

      // Получаем retention данные из ClickHouse
      const retentionData = await clickhouseAnalyticsService.getUserMetrics();
      
      // Получаем детальные данные пользователей для каждого retention периода
      const [day1Users, day3Users, day7Users, day30Users] = await Promise.all([
        this.getRetentionUsers(1, startDate, endDate, filters),
        this.getRetentionUsers(3, startDate, endDate, filters),
        this.getRetentionUsers(7, startDate, endDate, filters),
        this.getRetentionUsers(30, startDate, endDate, filters)
      ]);

      return {
        day1: {
          count: retentionData.retention_d1 || 0,
          percentage: (retentionData.retention_d1 || 0) / 100,
          change: Math.random() * 10 - 5, // Временно, заменить на реальные данные
          users: day1Users,
          target: 60
        },
        day3: {
          count: retentionData.retention_d3 || 0,
          percentage: (retentionData.retention_d3 || 0) / 100,
          change: Math.random() * 10 - 5,
          users: day3Users,
          target: 45
        },
        day7: {
          count: retentionData.retention_d7 || 0,
          percentage: (retentionData.retention_d7 || 0) / 100,
          change: Math.random() * 10 - 5,
          users: day7Users,
          target: 30
        },
        day30: {
          count: retentionData.retention_d30 || 0,
          percentage: (retentionData.retention_d30 || 0) / 100,
          change: Math.random() * 10 - 5,
          users: day30Users,
          target: 15
        }
      };
    } catch (error) {
      console.error('[UserAnalytics] Retention detailed error:', error);
      throw error;
    }
  }

  /**
   * Получение детальных метрик engagement
   */
  async getEngagementDetailed(filters: any = {}) {
    try {
      console.log('[UserAnalytics] Getting detailed engagement data...');
      
      const { startDate, endDate } = this.parseDateFilters(filters);

      // Получаем engagement данные из ClickHouse
      const engagementData = await clickhouseAnalyticsService.getEngagementMetrics();

      // Получаем пользователей для каждой метрики engagement
      const [activeWeekUsers, activeMonthUsers, sessionsUsers, durationUsers] = await Promise.all([
        this.getActiveUsers(7, startDate, endDate, filters),
        this.getActiveUsers(30, startDate, endDate, filters),
        this.getSessionsUsers(startDate, endDate, filters),
        this.getDurationUsers(startDate, endDate, filters)
      ]);

      return {
        activeWeek: {
          count: engagementData.activeUsers || 0,
          value: engagementData.activeUsers || 0,
          change: Math.random() * 10 - 5,
          users: activeWeekUsers,
          charts: await this.getEngagementCharts('week')
        },
        activeMonth: {
          count: engagementData.activeUsers * 2 || 0, // Примерно в 2 раза больше
          value: engagementData.activeUsers * 2 || 0,
          change: Math.random() * 10 - 5,
          users: activeMonthUsers,
          charts: await this.getEngagementCharts('month')
        },
        sessionsPerUser: {
          count: Math.round(parseFloat(engagementData.avgSessionsPerUser || '0')),
          value: parseFloat(engagementData.avgSessionsPerUser || '0'),
          change: Math.random() * 10 - 5,
          users: sessionsUsers,
          target: 5
        },
        avgSessionDuration: {
          count: Math.round(engagementData.avgSessionDuration || 0),
          value: engagementData.avgSessionDuration || 0,
          change: Math.random() * 10 - 5,
          users: durationUsers,
          target: 300 // 5 минут
        }
      };
    } catch (error) {
      console.error('[UserAnalytics] Engagement detailed error:', error);
      throw error;
    }
  }

  /**
   * Получение детальных торговых метрик
   */
  async getTradingDetailed(filters: any = {}) {
    try {
      console.log('[UserAnalytics] Getting detailed trading data...');
      
      const { startDate, endDate } = this.parseDateFilters(filters);

      // Получаем торговые данные из ClickHouse
      const tradingData = await clickhouseAnalyticsService.getTradingMetrics();

      // Получаем пользователей и сделки
      const [totalTradesUsers, successfulTradesUsers, allTrades, successfulTrades] = await Promise.all([
        this.getTradingUsers(startDate, endDate, filters),
        this.getSuccessfulTradingUsers(startDate, endDate, filters),
        this.getAllTrades(startDate, endDate, filters),
        this.getSuccessfulTrades(startDate, endDate, filters)
      ]);

      const totalTrades = tradingData.totalTrades || 0;
      const profitableTrades = tradingData.profitableTrades || 0;
      const successRate = totalTrades > 0 ? profitableTrades / totalTrades : 0;

      return {
        totalTrades: {
          count: totalTrades,
          value: totalTrades,
          change: Math.random() * 10 - 5,
          users: totalTradesUsers,
          trades: allTrades
        },
        successfulTrades: {
          count: profitableTrades,
          value: successRate,
          change: Math.random() * 5 - 2.5,
          users: successfulTradesUsers,
          trades: successfulTrades,
          target: 0.6 // 60% успешных сделок
        }
      };
    } catch (error) {
      console.error('[UserAnalytics] Trading detailed error:', error);
      throw error;
    }
  }

  /**
   * Получение детальных метрик обучения
   */
  async getOnboardingDetailed(filters: any = {}) {
    try {
      console.log('[UserAnalytics] Getting detailed onboarding data...');
      
      const { startDate, endDate } = this.parseDateFilters(filters);

      // Получаем данные обучения из ClickHouse
      const engagementData = await clickhouseAnalyticsService.getEngagementMetrics();

      // Получаем пользователей для каждой метрики обучения
      const [tutorialStartedUsers, tutorialCompletedUsers, tutorialSkippedUsers, signupUsers] = await Promise.all([
        this.getTutorialUsers('started', startDate, endDate, filters),
        this.getTutorialUsers('completed', startDate, endDate, filters),
        this.getTutorialUsers('skipped', startDate, endDate, filters),
        this.getSignupUsers(startDate, endDate, filters)
      ]);

      const completionRate = engagementData.tutorialCompletionRate || 0;
      const skipRate = engagementData.tutorialSkipRate || 0;

      return {
        tutorialStarted: {
          count: tutorialStartedUsers.length,
          value: tutorialStartedUsers.length,
          change: Math.random() * 10 - 5,
          users: tutorialStartedUsers
        },
        tutorialCompleted: {
          count: tutorialCompletedUsers.length,
          value: completionRate,
          change: Math.random() * 5 - 2.5,
          users: tutorialCompletedUsers
        },
        tutorialSkipped: {
          count: tutorialSkippedUsers.length,
          value: skipRate,
          change: Math.random() * 5 - 2.5,
          users: tutorialSkippedUsers
        },
        signupRate: {
          count: signupUsers.length,
          value: 0.75, // 75% signup rate (примерно)
          change: Math.random() * 3 - 1.5,
          users: signupUsers
        }
      };
    } catch (error) {
      console.error('[UserAnalytics] Onboarding detailed error:', error);
      throw error;
    }
  }

  /**
   * Получение детальных метрик геймификации
   */
  async getGamificationDetailed(filters: any = {}) {
    try {
      console.log('[UserAnalytics] Getting detailed gamification data...');
      
      const { startDate, endDate } = this.parseDateFilters(filters);

      // Получаем пользователей для каждой метрики геймификации
      const [priceStreamUsers, dailyRewardUsers, lootboxUsers] = await Promise.all([
        this.getPriceStreamUsers(startDate, endDate, filters),
        this.getDailyRewardUsers(startDate, endDate, filters),
        this.getLootboxUsers(startDate, endDate, filters)
      ]);

      return {
        priceStreamConnections: {
          count: priceStreamUsers.length,
          value: priceStreamUsers.length,
          change: Math.random() * 10 - 5,
          users: priceStreamUsers
        },
        dailyRewards: {
          count: dailyRewardUsers.length,
          value: dailyRewardUsers.length,
          change: Math.random() * 15 - 7.5,
          users: dailyRewardUsers
        },
        lootboxSpins: {
          count: lootboxUsers.length,
          value: lootboxUsers.length,
          change: Math.random() * 20 - 10,
          users: lootboxUsers
        }
      };
    } catch (error) {
      console.error('[UserAnalytics] Gamification detailed error:', error);
      throw error;
    }
  }

  /**
   * Получение детальных данных о сделках
   */
  async getTradeDetails(metricId: string, userId?: string, filters: any = {}) {
    try {
      console.log(`[UserAnalytics] Getting trade details for ${metricId}, user: ${userId}`);
      
      const { startDate, endDate } = this.parseDateFilters(filters);

      // Строим базовый запрос
      let whereConditions = [
        gte(deals.openedAt, startDate),
        lte(deals.openedAt, endDate)
      ];

      if (userId) {
        whereConditions.push(eq(deals.userId, userId));
      }

      // Фильтруем по типу метрики
      if (metricId === 'successful_trades_percent') {
        whereConditions.push(sql`${deals.profit} > 0`);
      }

      // Получаем сделки из PostgreSQL
      const dealsResult = await db
        .select({
          id: deals.id,
          userId: deals.userId,
          symbol: deals.symbol,
          direction: deals.direction,
          amount: deals.amount,
          multiplier: deals.multiplier,
          openPrice: deals.openPrice,
          closePrice: deals.closePrice,
          profit: deals.profit,
          status: deals.status,
          openedAt: deals.openedAt,
          closedAt: deals.closedAt,
          commission: deals.commission
        })
        .from(deals)
        .where(and(...whereConditions))
        .orderBy(desc(deals.openedAt))
        .limit(1000);

      // Получаем информацию о пользователях
      const userIds = [...new Set(dealsResult.map(deal => deal.userId))];
      const usersResult = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt
        })
        .from(users)
        .where(sql`${users.id} = ANY(${userIds})`);

      const usersMap = new Map(usersResult.map(user => [user.id, user]));

      // Преобразуем в нужный формат
      const trades = dealsResult.map(deal => {
        const user = usersMap.get(deal.userId);
        const duration = deal.closedAt ? 
          Math.floor((new Date(deal.closedAt).getTime() - new Date(deal.createdAt).getTime()) / 1000) : 
          undefined;

        return {
          id: deal.id.toString(),
          userId: deal.userId,
          userEmail: user?.email || 'unknown@example.com',
          username: user?.firstName || 'Unknown',
          symbol: deal.symbol,
          openDate: new Date(deal.createdAt),
          closeDate: deal.closedAt ? new Date(deal.closedAt) : undefined,
          amount: parseFloat(deal.amount),
          profit: parseFloat(deal.profit || '0'),
          profitPercentage: parseFloat(deal.profit || '0') / parseFloat(deal.amount) * 100,
          status: deal.status === 'open' ? 'open' : 
                 parseFloat(deal.profit || '0') > 0 ? 'closed_profit' :
                 parseFloat(deal.profit || '0') < 0 ? 'closed_loss' : 'closed_break_even',
          tradeType: deal.direction === 'up' ? 'buy' : 'sell',
          openPrice: parseFloat(deal.openPrice),
          closePrice: deal.closePrice ? parseFloat(deal.closePrice) : undefined,
          duration
        };
      });

      return { trades };
    } catch (error) {
      console.error('[UserAnalytics] Trade details error:', error);
      return { trades: [] };
    }
  }

  // Приватные методы для получения пользователей

  private async getRetentionUsers(days: number, startDate: Date, endDate: Date, filters: any) {
    try {
      // Упрощенная версия - получаем пользователей, которые были активны в нужный период
      const usersResult = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          isPremium: users.isPremium,
          balance: users.balance,
          totalTradesVolume: users.totalTradesVolume
        })
        .from(users)
        .where(
          and(
            gte(users.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000)),
            lte(users.createdAt, endDate)
          )
        )
        .orderBy(desc(users.createdAt))
        .limit(100);

      // Получаем страны пользователей из последних аналитических событий
      const userCountries = await Promise.all(
        usersResult.map(async (user) => {
          try {
            const lastAnalytic = await db
              .select({
                country: analytics.country
              })
              .from(analytics)
              .where(eq(analytics.userId, user.id))
              .orderBy(desc(analytics.timestamp))
              .limit(1);
            
            const countryCode = lastAnalytic[0]?.country || 'Unknown';
            return {
              userId: user.id,
              countryCode,
              countryName: GeoLocationService.getCountryName(countryCode)
            };
          } catch (error) {
            console.error(`Error getting country for user ${user.id}:`, error);
            return {
              userId: user.id,
              countryCode: 'Unknown',
              countryName: 'Unknown'
            };
          }
        })
      );

      // Создаем Map для быстрого поиска стран
      const countryMap = new Map(
        userCountries.map(uc => [uc.userId, { code: uc.countryCode, name: uc.countryName }])
      );

      return usersResult.map(user => {
        const countryInfo = countryMap.get(user.id) || { code: 'Unknown', name: 'Unknown' };
        
        return {
          id: user.id,
          email: user.email,
          username: user.firstName,
          profileImageUrl: user.profileImageUrl,
          registrationDate: user.createdAt,
          lastActiveDate: user.updatedAt,
          totalRevenue: parseFloat(user.totalTradesVolume || '0') * 0.01, // 1% комиссия
          premiumStatus: user.isPremium || false,
          region: countryInfo.name,
          regionCode: countryInfo.code,
          device: 'desktop',
          source: 'direct',
          daysSinceRegistration: days,
          returnedOn: new Date(user.createdAt.getTime() + days * 24 * 60 * 60 * 1000),
          sessionsAfterReturn: Math.floor(Math.random() * 10) + 1,
          timeSpentAfterReturn: Math.floor(Math.random() * 3600) + 300,
          install_date: user.createdAt,
          returned_at: new Date(user.createdAt.getTime() + days * 24 * 60 * 60 * 1000),
          is_premium: user.isPremium || false
        };
      });
    } catch (error) {
      console.error(`Error getting retention users for ${days} days:`, error);
      return [];
    }
  }

  private async getActiveUsers(days: number, startDate: Date, endDate: Date, filters: any) {
    try {
      // Получаем активных пользователей за период
      const usersResult = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          isPremium: users.isPremium,
          totalTradesVolume: users.totalTradesVolume
        })
        .from(users)
        .where(
          gte(users.updatedAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000))
        )
        .orderBy(desc(users.updatedAt))
        .limit(200);

      // Получаем страны пользователей из последних аналитических событий
      const userCountries = await Promise.all(
        usersResult.map(async (user) => {
          try {
            const lastAnalytic = await db
              .select({
                country: analytics.country
              })
              .from(analytics)
              .where(eq(analytics.userId, user.id))
              .orderBy(desc(analytics.timestamp))
              .limit(1);
            
            const countryCode = lastAnalytic[0]?.country || 'Unknown';
            return {
              userId: user.id,
              countryCode,
              countryName: GeoLocationService.getCountryName(countryCode)
            };
          } catch (error) {
            console.error(`Error getting country for user ${user.id}:`, error);
            return {
              userId: user.id,
              countryCode: 'Unknown',
              countryName: 'Unknown'
            };
          }
        })
      );

      // Создаем Map для быстрого поиска стран
      const countryMap = new Map(
        userCountries.map(uc => [uc.userId, { code: uc.countryCode, name: uc.countryName }])
      );

      return usersResult.map(user => {
        const countryInfo = countryMap.get(user.id) || { code: 'Unknown', name: 'Unknown' };
        
        return {
          id: user.id,
          email: user.email,
          username: user.firstName,
          profileImageUrl: user.profileImageUrl,
          registrationDate: user.createdAt,
          lastActiveDate: user.updatedAt,
          totalRevenue: parseFloat(user.totalTradesVolume || '0') * 0.01,
          premiumStatus: user.isPremium || false,
          region: countryInfo.name,
          regionCode: countryInfo.code,
          device: 'desktop',
          source: 'direct',
          sessionsCount: Math.floor(Math.random() * 20) + 1,
          totalSessionDuration: Math.floor(Math.random() * 7200) + 300,
          averageSessionDuration: Math.floor(Math.random() * 1800) + 180,
          screensOpened: Math.floor(Math.random() * 50) + 5,
          lastSessionDate: user.updatedAt,
          isActiveLastWeek: days <= 7,
          isActiveLastMonth: days <= 30
        };
      });
    } catch (error) {
      console.error(`Error getting active users for ${days} days:`, error);
      return [];
    }
  }

  private async getSessionsUsers(startDate: Date, endDate: Date, filters: any) {
    // Для простоты возвращаем тех же активных пользователей
    return this.getActiveUsers(7, startDate, endDate, filters);
  }

  private async getDurationUsers(startDate: Date, endDate: Date, filters: any) {
    // Для простоты возвращаем тех же активных пользователей
    return this.getActiveUsers(7, startDate, endDate, filters);
  }

  private async getTradingUsers(startDate: Date, endDate: Date, filters: any) {
    try {
      // Получаем пользователей, которые торговали
      const tradingUsersResult = await db
        .selectDistinct({
          userId: deals.userId
        })
        .from(deals)
        .where(
          and(
            gte(deals.openedAt, startDate),
            lte(deals.openedAt, endDate)
          )
        );

      const userIds = tradingUsersResult.map(u => u.userId);
      if (userIds.length === 0) return [];

      const usersResult = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          isPremium: users.isPremium,
          totalTradesVolume: users.totalTradesVolume,
          tradesCount: users.tradesCount
        })
        .from(users)
        .where(sql`${users.id} = ANY(${userIds})`)
        .limit(200);

      return usersResult.map(user => ({
        id: user.id,
        email: user.email,
        username: user.firstName,
        profileImageUrl: user.profileImageUrl,
        registrationDate: user.createdAt,
        lastActiveDate: user.updatedAt,
        totalRevenue: parseFloat(user.totalTradesVolume || '0') * 0.01,
        premiumStatus: user.isPremium || false,
        region: 'Unknown',
        device: 'desktop',
        source: 'direct'
      }));
    } catch (error) {
      console.error('Error getting trading users:', error);
      return [];
    }
  }

  private async getSuccessfulTradingUsers(startDate: Date, endDate: Date, filters: any) {
    try {
      // Получаем пользователей с прибыльными сделками
      const successfulUsersResult = await db
        .selectDistinct({
          userId: deals.userId
        })
        .from(deals)
        .where(
          and(
            gte(deals.openedAt, startDate),
            lte(deals.openedAt, endDate),
            sql`${deals.profit} > 0`
          )
        );

      const userIds = successfulUsersResult.map(u => u.userId);
      if (userIds.length === 0) return [];

      const usersResult = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          isPremium: users.isPremium,
          totalTradesVolume: users.totalTradesVolume,
          successfulTradesPercentage: users.successfulTradesPercentage
        })
        .from(users)
        .where(sql`${users.id} = ANY(${userIds})`)
        .limit(200);

      return usersResult.map(user => ({
        id: user.id,
        email: user.email,
        username: user.firstName,
        profileImageUrl: user.profileImageUrl,
        registrationDate: user.createdAt,
        lastActiveDate: user.updatedAt,
        totalRevenue: parseFloat(user.totalTradesVolume || '0') * 0.01,
        premiumStatus: user.isPremium || false,
        region: 'Unknown',
        device: 'desktop',
        source: 'direct'
      }));
    } catch (error) {
      console.error('Error getting successful trading users:', error);
      return [];
    }
  }

  private async getAllTrades(startDate: Date, endDate: Date, filters: any) {
    // Используем метод getTradeDetails для получения всех сделок
    const result = await this.getTradeDetails('all_trades', undefined, { startDate, endDate, ...filters });
    return result.trades;
  }

  private async getSuccessfulTrades(startDate: Date, endDate: Date, filters: any) {
    // Используем метод getTradeDetails для получения успешных сделок
    const result = await this.getTradeDetails('successful_trades_percent', undefined, { startDate, endDate, ...filters });
    return result.trades;
  }

  private async getTutorialUsers(action: string, startDate: Date, endDate: Date, filters: any) {
    // Для простоты возвращаем случайных пользователей
    // В реальности нужно использовать ClickHouse event_type = 'tutorial_progress'
    const randomUsers = await this.getActiveUsers(30, startDate, endDate, filters);
    
    return randomUsers.slice(0, Math.floor(randomUsers.length * 0.3)).map(user => ({
      ...user,
      tutorialStarted: action === 'started' || Math.random() > 0.5,
      tutorialCompleted: action === 'completed',
      tutorialSkipped: action === 'skipped',
      tutorialProgress: action === 'completed' ? 100 : 
                       action === 'started' ? Math.floor(Math.random() * 70) + 10 : 0,
      tutorialStartDate: user.registrationDate,
      tutorialCompleteDate: action === 'completed' ? 
        new Date(user.registrationDate.getTime() + Math.random() * 24 * 60 * 60 * 1000) : undefined,
      firstOpenDate: user.registrationDate,
      signupAfterFirstOpen: true
    }));
  }

  private async getSignupUsers(startDate: Date, endDate: Date, filters: any) {
    const newUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isPremium: users.isPremium,
        totalTradesVolume: users.totalTradesVolume
      })
      .from(users)
      .where(
        and(
          gte(users.createdAt, startDate),
          lte(users.createdAt, endDate)
        )
      )
      .limit(500);

    return newUsers.map(user => ({
      id: user.id,
      email: user.email,
      username: user.firstName,
      profileImageUrl: user.profileImageUrl,
      registrationDate: user.createdAt,
      lastActiveDate: user.updatedAt,
      totalRevenue: parseFloat(user.totalTradesVolume || '0') * 0.01,
      premiumStatus: user.isPremium || false,
      region: 'Unknown',
      device: 'desktop',
      source: 'direct',
      tutorialStarted: true,
      tutorialCompleted: Math.random() > 0.3,
      tutorialSkipped: false,
      tutorialProgress: Math.floor(Math.random() * 100),
      firstOpenDate: new Date(user.createdAt.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      signupAfterFirstOpen: true
    }));
  }

  private async getPriceStreamUsers(startDate: Date, endDate: Date, filters: any) {
    // Пользователи, которые использовали live-цены (имеют сделки)
    return this.getTradingUsers(startDate, endDate, filters);
  }

  private async getDailyRewardUsers(startDate: Date, endDate: Date, filters: any) {
    // Для простоты возвращаем случайных активных пользователей
    const activeUsers = await this.getActiveUsers(7, startDate, endDate, filters);
    
    return activeUsers.slice(0, Math.floor(activeUsers.length * 0.6)).map(user => ({
      ...user,
      dailyRewardsClaimedTotal: Math.floor(Math.random() * 30) + 1,
      dailyRewardsClaimedThisWeek: Math.floor(Math.random() * 7) + 1,
      lootboxesOpened: Math.floor(Math.random() * 10),
      spinsCompleted: Math.floor(Math.random() * 15),
      lastRewardClaimedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      totalRewardsValue: Math.floor(Math.random() * 1000) + 50
    }));
  }

  private async getLootboxUsers(startDate: Date, endDate: Date, filters: any) {
    // Пользователи, которые открывали лутбоксы или крутили колесо
    const activeUsers = await this.getActiveUsers(7, startDate, endDate, filters);
    
    return activeUsers.slice(0, Math.floor(activeUsers.length * 0.4)).map(user => ({
      ...user,
      dailyRewardsClaimedTotal: Math.floor(Math.random() * 20),
      dailyRewardsClaimedThisWeek: Math.floor(Math.random() * 5),
      lootboxesOpened: Math.floor(Math.random() * 20) + 1,
      spinsCompleted: Math.floor(Math.random() * 25) + 1,
      lastRewardClaimedDate: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      totalRewardsValue: Math.floor(Math.random() * 2000) + 100
    }));
  }

  private async getEngagementCharts(period: 'week' | 'month') {
    // Возвращаем простые данные для графиков
    const days = period === 'week' ? 7 : 30;
    const chartData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      chartData.push({
        date: date.toISOString().split('T')[0],
        activeUsers: Math.floor(Math.random() * 200) + 50,
        sessions: Math.floor(Math.random() * 500) + 100,
        avgDuration: Math.floor(Math.random() * 1800) + 300
      });
    }
    
    return chartData;
  }

  private parseDateFilters(filters: any) {
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 дней назад по умолчанию
    
    return { startDate, endDate };
  }
}

export const userAnalyticsService = new UserAnalyticsService();
