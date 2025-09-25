import { Router } from 'express';
import { isAdminWithAuth } from '../simpleOAuth.js';
import { clickhouseAnalyticsService } from '../services/clickhouseAnalyticsService.js';
import { db } from '../db.js';
import { users, analytics, deals } from '../../shared/schema.js';
import { inArray, sql, and, desc, asc } from 'drizzle-orm';
import { GeoLocationService } from '../services/geoLocationService.js';
import { adminAnalyticsService } from '../services/adminAnalyticsService.js';
import { ClickHouseClient } from '@clickhouse/client'; // Добавляем импорт ClickHouseClient

const router = Router();

console.log('[DashboardRoute] Module loaded and router created');

// Простая система кеширования для мгновенных ответов
class SimpleDataCache {
  private data: any = {};
  private lastUpdate: Date | null = null;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 минут

  constructor() {
    this.startLoading();
  }

  // Проверка retention для пользователя
  private async checkUserRetention(client: any, userId: string, installDate: string, days: number): Promise<boolean> {
    const checkDate = new Date(installDate);
    checkDate.setDate(checkDate.getDate() + days);
    
    const query = `
      SELECT 1 FROM cryptocraze_analytics.user_events
      WHERE user_id = '${userId}'
        AND date >= '${checkDate.toISOString().slice(0,10)}'
        AND date < '${new Date(checkDate.getTime() + 86400000).toISOString().slice(0,10)}'
      LIMIT 1
    `;
    
    try {
      const response = await (client as any).query({ query, format: 'JSONEachRow' });
      const result = await response.json();
      return result.length > 0;
    } catch (error) {
      console.error(`[SimpleCache] Error checking retention for user ${userId}, day ${days}:`, error);
      return false;
    }
  }

  private async startLoading(): Promise<void> {
    console.log('[SimpleCache] Starting initial data load...');
    await this.loadData();
    
    // Обновляем каждые 10 минут
    setInterval(async () => {
      await this.loadData();
    }, this.CACHE_TTL);
  }

  private async loadData(): Promise<void> {
    try {
      console.log('[SimpleCache] Loading data...');
      await clickhouseAnalyticsService.initializeSchema();
      const client = clickhouseAnalyticsService.getClient();

      // Вызываем функцию сохранения снимка баланса
      await this.saveDailyBalanceSnapshot();

      // Получаем общую статистику
      const statsQuery = `
        SELECT 
          count(DISTINCT user_id) as total_users,
          count(*) as total_events,
          min(date) as first_date,
          max(date) as last_date
        FROM cryptocraze_analytics.user_events
        WHERE user_id != '999999999' AND length(user_id) > 5
      `;

      const statsResponse = await (client as any).query({ query: statsQuery, format: 'JSONEachRow' });
      const stats = await statsResponse.json() as any[];

      // Получаем данные по дням за последние 30 дней
      const dailyQuery = `
        SELECT 
          date,
          count(DISTINCT user_id) as daily_users,
          count(*) as daily_events
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10)}'
          AND user_id != '999999999' 
          AND length(user_id) > 5
        GROUP BY date
        ORDER BY date DESC
      `;

      const dailyResponse = await (client as any).query({ query: dailyQuery, format: 'JSONEachRow' });
      const dailyData = await dailyResponse.json() as any[];

      // Получаем реальные данные пользователей для retention таблицы
      const usersQuery = `
        SELECT DISTINCT
          user_id,
          min(date) as install_date
            FROM cryptocraze_analytics.user_events
        WHERE date >= '${new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10)}'
              AND user_id != '999999999'
              AND length(user_id) > 5
            GROUP BY user_id
        ORDER BY install_date DESC
      `;

      const usersResponse = await (client as any).query({ query: usersQuery, format: 'JSONEachRow' });
      const usersData = await usersResponse.json() as any[];

      // Получаем данные пользователей из PostgreSQL
      const userIds = usersData.map((user: any) => user.user_id);
      let userDataMap = new Map<string, any>();
      
      if (userIds.length > 0) {
        try {
          // Получаем данные пользователей
          const pgUsers = await (db as any).select({
            id: users.id,
            email: users.email,
            isPremium: users.isPremium
          }).from(users).where(inArray(users.id, userIds));

          // Получаем страны из analytics или определяем по IP
          const userCountries = await (db as any).select({
            userId: analytics.userId,
            country: analytics.country
          }).from(analytics).where(inArray(analytics.userId, userIds));
          
          pgUsers.forEach(user => {
            const userCountry = userCountries.find(uc => uc.userId === user.id);
            let country = userCountry?.country;
            
            // Если нет страны в analytics, пробуем определить по IP (если есть)
            if (!country) {
              // Здесь можно добавить логику получения IP пользователя
              // Пока используем 'Unknown'
              country = 'Unknown';
            }
            
            userDataMap.set(user.id, {
              ...user,
              country: country || 'Unknown'
            });
          });
        } catch (error) {
          console.error('[SimpleCache] Error loading user data from PostgreSQL:', error);
        }
      }

      // Рассчитываем retention для каждого пользователя
      const retentionTable: any[] = [];
      for (const user of usersData) {
        const userId = user.user_id;
        const installDate = user.install_date;
        const pgUser = userDataMap.get(userId);
        
        // Проверяем retention для каждого окна
        const d1Check = await this.checkUserRetention(client, userId, installDate, 1);
        const d3Check = await this.checkUserRetention(client, userId, installDate, 3);
        const d7Check = await this.checkUserRetention(client, userId, installDate, 7);
        const d30Check = await this.checkUserRetention(client, userId, installDate, 30);
        
        retentionTable.push({
          userId: userId,
          email: pgUser?.email || `${userId}@unknown.com`,
          installDate: installDate,
          isPremium: pgUser?.isPremium || false,
          country: pgUser?.country || 'Unknown',
          d1Returned: d1Check,
          d3Returned: d3Check,
          d7Returned: d7Check,
          d30Returned: d30Check
        });
      }

      // Сохраняем данные
      this.data = {
        overview: {
          totalUsers: stats[0]?.total_users || 0,
          totalEvents: stats[0]?.total_events || 0,
          firstDate: stats[0]?.first_date,
          lastDate: stats[0]?.last_date,
          // Рассчитываем реальные retention проценты
          d1Retention: this.calculateRetentionPercentage(retentionTable, 'd1Returned'),
          d3Retention: this.calculateRetentionPercentage(retentionTable, 'd3Returned'),
          d7Retention: this.calculateRetentionPercentage(retentionTable, 'd7Returned'),
          d30Retention: this.calculateRetentionPercentage(retentionTable, 'd30Returned')
        },
        daily: dailyData,
        trends: {
          D1: await this.calculateRetentionTrend(client, 1),
          D3: await this.calculateRetentionTrend(client, 3), 
          D7: await this.calculateRetentionTrend(client, 7),
          D30: await this.calculateRetentionTrend(client, 30),
          churn_rate: await this.calculateChurnRateTrend(client)
        },
        retentionTable: retentionTable
      };

      this.lastUpdate = new Date();
      console.log(`[SimpleCache] Data loaded successfully. Total users: ${this.data.overview.totalUsers}`);

    } catch (error) {
      console.error('[SimpleCache] Error loading data:', error);
      // Устанавливаем базовые данные при ошибке
      this.data = {
        overview: {
          totalUsers: 0,
          totalEvents: 0,
          d1Retention: 0,
          d3Retention: 0,
          d7Retention: 0,
          d30Retention: 0
        },
        daily: [],
        trends: { D1: [], D3: [], D7: [], D30: [], churn_rate: [] },
        retentionTable: []
      };
    }
  }

  // Рассчитываем реальный retention trend
  private async calculateRetentionTrend(client: any, days: number): Promise<any[]> {
    const trendData: any[] = [];
    const periodDays = 30;
    
    for (let i = periodDays - 1; i >= 0; i--) {
      const targetDate = new Date(Date.now() - i * 86400000);
      const targetDateStr = targetDate.toISOString().slice(0, 10);
      
      // Получаем пользователей которые ВПЕРВЫЕ появились в этот день
      const installQuery = `
        SELECT DISTINCT user_id
        FROM cryptocraze_analytics.user_events
        WHERE user_id != '999999999'
          AND length(user_id) > 5
          AND user_id IN (
            SELECT user_id
            FROM cryptocraze_analytics.user_events
            WHERE date = '${targetDateStr}'
              AND user_id != '999999999'
              AND length(user_id) > 5
          )
          AND user_id NOT IN (
            SELECT user_id
            FROM cryptocraze_analytics.user_events
            WHERE date < '${targetDateStr}'
              AND user_id != '999999999'
              AND length(user_id) > 5
          )
      `;
      
      try {
        const installResponse = await (client as any).query({ query: installQuery, format: 'JSONEachRow' });
        const installUsers = await installResponse.json() as any[];
        
        if (installUsers.length === 0) {
          trendData.push({
            date: targetDateStr,
            value: 0
          });
          continue;
        }
        
        // Проверяем retention для этих пользователей
        const checkDate = new Date(targetDate.getTime() + days * 86400000);
        const checkDateStr = checkDate.toISOString().slice(0, 10);
        
        const retentionQuery = `
          SELECT DISTINCT user_id
          FROM cryptocraze_analytics.user_events
          WHERE date = '${checkDateStr}'
            AND user_id IN (${installUsers.map((u: any) => `'${u.user_id}'`).join(',')})
        `;
        
        const retentionResponse = await (client as any).query({ query: retentionQuery, format: 'JSONEachRow' });
        const retentionUsers = await retentionResponse.json() as any[];
        
        // Показываем дату возврата и количество пользователей, которые вернулись
        const returnDate = new Date(targetDate.getTime() + days * 86400000);
        const returnDateStr = returnDate.toISOString().slice(0, 10);
        
        trendData.push({
          date: returnDateStr,
          value: Math.floor(retentionUsers.length) // Целое число пользователей
        });
    } catch (error) {
        console.error(`[SimpleCache] Error calculating retention trend for ${targetDateStr}:`, error);
        trendData.push({
          date: targetDateStr,
          value: 0
        });
      }
    }
    
    return trendData;
  }

  // Рассчитываем реальный churn rate trend
  private async calculateChurnRateTrend(client: any): Promise<any[]> {
    const trendData: any[] = [];
    const periodDays = 30; // Берем последние 30 дней для расчета тренда

    for (let i = periodDays - 1; i >= 0; i--) {
      const targetDate = new Date(Date.now() - i * 86400000); // День установки
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      try {
        // Получаем всех пользователей, которые установили приложение в targetDate
        const installQuery = `
          SELECT DISTINCT user_id
          FROM cryptocraze_analytics.user_events
          WHERE user_id != '999999999'
            AND length(user_id) > 5
            AND user_id IN (
              SELECT user_id
              FROM cryptocraze_analytics.user_events
              WHERE date = '${targetDateStr}'
                AND user_id != '999999999'
                AND length(user_id) > 5
            )
            AND user_id NOT IN (
              SELECT user_id
              FROM cryptocraze_analytics.user_events
              WHERE date < '${targetDateStr}'
                AND user_id != '999999999'
                AND length(user_id) > 5
            )
        `;
        const installResponse = await (client as any).query({ query: installQuery, format: 'JSONEachRow' });
        const installUsers = await installResponse.json() as any[];
        const totalInstallUsers = installUsers.length;

        if (totalInstallUsers === 0) {
          trendData.push({ date: targetDateStr, value: 0 });
          continue;
        }

        // Получаем пользователей, которые вернулись хотя бы один раз за 30 дней после targetDate
        const thirtyDaysLater = new Date(targetDate.getTime() + 30 * 86400000); // 30 дней после установки
        const thirtyDaysLaterStr = thirtyDaysLater.toISOString().slice(0, 10);

        const returnedQuery = `
          SELECT DISTINCT user_id
          FROM cryptocraze_analytics.user_events
          WHERE user_id IN (${installUsers.map((u: any) => `'${u.user_id}'`).join(',')})
            AND date > '${targetDateStr}' AND date < '${thirtyDaysLaterStr}'
        `;
        const returnedResponse = await (client as any).query({ query: returnedQuery, format: 'JSONEachRow' });
        const returnedUsers = await returnedResponse.json() as any[];
        const totalReturnedUsers = returnedUsers.length;

        // Отток = (Общее количество установивших - Вернувшихся) / Общее количество установивших * 100
        const churnedUsers = totalInstallUsers - totalReturnedUsers;
        const churnRate = totalInstallUsers > 0 ? (churnedUsers / totalInstallUsers) * 100 : 0;

        trendData.push({
          date: targetDateStr,
          value: parseFloat(churnRate.toFixed(2)) // Процент оттока
        });

      } catch (error) {
        console.error(`[SimpleCache] Error calculating churn rate trend for ${targetDateStr}:`, error);
        trendData.push({ date: targetDateStr, value: 0 });
      }
    }
    return trendData;
  }

  // Helper function to get filtered user IDs and their attributes
  public async getFilteredUserAttributes(client: any, tsFrom: string, tsTo: string, filters: any = {}): Promise<Map<string, any>> {
    console.log('[getFilteredUserAttributes] Filters received:', filters);
    console.log('[getFilteredUserAttributes] Date range (tsFrom, tsTo): ', { tsFrom, tsTo });
    // 1. Get all unique user_ids from ClickHouse within the date range
    const clickhouseUserIdsQuery = `
      SELECT DISTINCT user_id
      FROM cryptocraze_analytics.user_events
      WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        AND user_id != '999999999'
        AND length(user_id) > 5
    `;
    console.log('[getFilteredUserAttributes] ClickHouse User IDs Query:', clickhouseUserIdsQuery);
    const chUserIdsResp = await client.query({ query: clickhouseUserIdsQuery, format: 'JSONEachRow' });
    const chUserIds = (await chUserIdsResp.json()).map((r: any) => r.user_id);
    console.log('[getFilteredUserAttributes] Initial ClickHouse User IDs count:', chUserIds.length);
    console.log('[getFilteredUserAttributes] Initial ClickHouse User IDs (first 5):', chUserIds.slice(0, 5));

    let userDataMap = new Map<string, any>();

    if (chUserIds.length > 0) {
      // 2. Get user attributes (isPremium, country) from PostgreSQL for these user_ids
      console.log('[getFilteredUserAttributes] Fetching PostgreSQL user attributes...');
      const pgUsers = await (db as any).select({ id: users.id, email: users.email, isPremium: users.isPremium })
        .from(users)
        .where(inArray(users.id, chUserIds));
      const userCountries = await (db as any).select({ userId: analytics.userId, country: analytics.country })
        .from(analytics)
        .where(inArray(analytics.userId, chUserIds));
      console.log('[getFilteredUserAttributes] PostgreSQL Users count:', pgUsers.length);
      console.log('[getFilteredUserAttributes] PostgreSQL User Countries count:', userCountries.length);

      pgUsers.forEach((u: any) => {
        const c = userCountries.find((uc: any) => uc.userId === u.id);
        userDataMap.set(u.id, { email: u.email, isPremium: u.isPremium, country: c?.country || 'Unknown' });
      });
      console.log('[getFilteredUserAttributes] UserDataMap size after PG fetch:', userDataMap.size);

      // 3. Apply filters (userType, country) in JavaScript (since ClickHouse doesn't have isPremium/country directly)
      let filteredUserIds: string[] = [];
      userDataMap.forEach((userAttrs, userId) => {
        let include = true;
        if (filters.userType) {
          if (filters.userType === 'premium' && !userAttrs.isPremium) include = false;
          if (filters.userType === 'free' && userAttrs.isPremium) include = false;
        }
        if (Array.isArray(filters.country) && filters.country.length > 0 && !filters.country.includes(userAttrs.country)) {
          include = false;
        }
        if (include) {
          filteredUserIds.push(userId);
        }
      });
      console.log('[getFilteredUserAttributes] Filtered User IDs count after JS filtering:', filteredUserIds.length);
      console.log('[getFilteredUserAttributes] Filtered User IDs (first 5) after JS filtering:', filteredUserIds.slice(0, 5));

      // Return a map of filtered user attributes (only those passing the filters)
      const finalFilteredMap = new Map<string, any>();
      filteredUserIds.forEach(userId => {
        finalFilteredMap.set(userId, userDataMap.get(userId));
      });
      console.log('[getFilteredUserAttributes] Final filtered UserDataMap size:', finalFilteredMap.size);
      return finalFilteredMap;
    }
    console.log('[getFilteredUserAttributes] No ClickHouse User IDs found, returning empty map.');
    return new Map<string, any>(); // Return empty map if no user IDs
  }

  // Рассчитываем процент retention
  private calculateRetentionPercentage(table: any[], field: string): number {
    if (table.length === 0) return 0;
    const returned = table.filter(user => user[field]).length;
    return Math.round((returned / table.length) * 100);
  }

  // Публичные методы для получения данных
  getOverview(): any {
    return this.data.overview || {};
  }

  getTrend(metricId: string, filters: any = {}): any[] {
    // Если это не одна из retention метрик, отдаём подготовленный тренд без изменений
    if (!['D1', 'D3', 'D7', 'D30'].includes(metricId)) {
      return this.data.trends?.[metricId] || [];
    }

    // Извлекаем диапазон дат (если передан)
    const startDate: Date | null = filters.startDate ? new Date(filters.startDate) : null;
    const endDate: Date | null = filters.endDate ? new Date(filters.endDate) : null;

    // Получаем таблицу retention без пагинации, с учётом фильтров
    const baseTable: any[] = (this.data.retentionTable || []).filter((item: any) => {
      if (filters.userType === 'premium' && !item.isPremium) return false;
      if (filters.userType === 'free' && item.isPremium) return false;
      if (Array.isArray(filters.country) && filters.country.length > 0 && !filters.country.includes(item.country)) return false;
      return true;
    });

    // Дни смещения в зависимости от метрики
    const daysOffset = parseInt(metricId.replace('D', '')) || 1;

    // Агрегируем по датам возврата
    const countsByDate = new Map<string, number>();
    for (const row of baseTable) {
      const returned =
        metricId === 'D1' ? row.d1Returned :
        metricId === 'D3' ? row.d3Returned :
        metricId === 'D7' ? row.d7Returned :
        row.d30Returned;
      if (!returned) continue;

      const install = new Date(row.installDate);
      const returnDate = new Date(install.getTime() + daysOffset * 86400000);
      // Нормализуем к YYYY-MM-DD
      const dateStr = returnDate.toISOString().slice(0, 10);

      // Фильтр по диапазону дат (если задан)
      if (startDate && new Date(dateStr) < new Date(startDate.toISOString().slice(0, 10))) continue;
      if (endDate && new Date(dateStr) > new Date(endDate.toISOString().slice(0, 10))) continue;

      countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
    }

    // Строим непрерывный ряд от startDate до endDate; если не заданы — используем даты из подготовленного тренда
    let seriesStart: Date;
    let seriesEnd: Date;
    if (startDate && endDate) {
      seriesStart = new Date(startDate);
      seriesStart.setHours(0, 0, 0, 0);
      seriesEnd = new Date(endDate);
      seriesEnd.setHours(0, 0, 0, 0);
    } else {
      const prepared = this.data.trends?.[metricId] || [];
      if (prepared.length > 0) {
        seriesStart = new Date(prepared[0].date);
        seriesEnd = new Date(prepared[prepared.length - 1].date);
      } else {
        seriesEnd = new Date();
        seriesStart = new Date(seriesEnd.getTime() - 6 * 86400000);
      }
    }

    const out: any[] = [];
    for (let d = new Date(seriesStart); d <= seriesEnd; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, value: Math.floor(countsByDate.get(key) || 0) });
    }
    return out;
  }

  getRetentionTable(filters: any = {}): any {
    let data = this.data.retentionTable || [];
    
    // Применяем фильтры
    if (filters.userType) {
      if (filters.userType === 'premium') {
        data = data.filter((item: any) => item.isPremium);
      } else if (filters.userType === 'free') {
        data = data.filter((item: any) => !item.isPremium);
      }
    }

    if (filters.country && filters.country.length > 0) {
      data = data.filter((item: any) => filters.country.includes(item.country));
    }

    // Фильтрация по периоду и окну (если переданы)
    if (filters.startDate && filters.endDate && filters.window) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      const daysOffset = parseInt(String(filters.window).replace('D', '')) || 1;
      data = data.filter((item: any) => {
        const install = new Date(item.installDate);
        const returnDate = new Date(install.getTime() + daysOffset * 86400000);
        const inRange = returnDate >= start && returnDate <= end;
        const returned =
          filters.window === 'D1' ? item.d1Returned :
          filters.window === 'D3' ? item.d3Returned :
          filters.window === 'D7' ? item.d7Returned :
          item.d30Returned;
        return inRange && returned;
      });
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      data = data.filter((item: any) => 
        item.email.toLowerCase().includes(search) ||
        item.userId.toLowerCase().includes(search)
      );
    }

    // Пагинация
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    return {
      data: data.slice(offset, offset + limit),
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit)
    };
  }

  isReady(): boolean {
    return this.lastUpdate !== null && Object.keys(this.data).length > 0;
  }

  getStatus(): any {
    return {
      ready: this.isReady(),
      lastUpdate: this.lastUpdate,
      dataKeys: Object.keys(this.data),
      totalUsers: this.data.overview?.totalUsers || 0
    };
  }

  // Публичный доступ к данным для эндпоинтов
  getData() {
    return this.data;
  }

  private async saveDailyBalanceSnapshot(): Promise<void> {
    try {
      const client = clickhouseAnalyticsService.getClient();
      if (!client) {
        console.log('[SimpleCache] ClickHouse client is not available. Skipping daily balance snapshot.');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      // Проверяем, был ли уже сделан снимок за сегодня
      const checkQuery = `
        SELECT 1
        FROM cryptocraze_analytics.balance_history
        WHERE date = '${today}'
        LIMIT 1
      `;
      const checkResponse = await (client as any).query({ query: checkQuery, format: 'JSONEachRow' });
      const checkResult = await checkResponse.json();

      if (checkResult.length > 0) {
        console.log(`[SimpleCache] Daily balance snapshot for ${today} already exists. Skipping.`);
        return;
      }

      console.log(`[SimpleCache] Creating daily balance snapshot for ${today}...`);

      // Получаем актуальные балансы всех пользователей из PostgreSQL
      let allUsersBalances: any[] = [];
      if (db) {
        allUsersBalances = await (db as any).select({
          id: users.id,
          balance: users.balance,
          freeBalance: users.freeBalance,
        }).from(users);
      } else {
        console.log('[SimpleCache] PostgreSQL DB is not available. Skipping balance snapshot.');
        return;
      }

      if (allUsersBalances.length === 0) {
        console.log('[SimpleCache] No users found in PostgreSQL for balance snapshot.');
        return;
      }

      const values = allUsersBalances.map((user: any) => {
        const totalBalance = Math.floor(Number(user.balance || 0) + Number(user.freeBalance || 0));
        return {
          date: today,
          user_id: user.id,
          balance: Number(user.balance || 0),
          free_balance: Number(user.freeBalance || 0),
          total_balance: totalBalance,
          ver: 1, // Добавляем версию для ReplacingMergeTree
        };
      });

      await (client as any).insert({
        table: 'cryptocraze_analytics.balance_history',
        values: values,
        format: 'JSONEachRow'
      });

      console.log(`[SimpleCache] Daily balance snapshot for ${today} created successfully with ${values.length} records.`);
    } catch (error) {
      console.error('[SimpleCache] Error creating daily balance snapshot:', error);
    }
  }
}

// Создаем глобальный кеш
const dataCache = new SimpleDataCache();

// Эндпоинт для проверки статуса кеша
router.get('/cache-status', isAdminWithAuth, async (req, res) => {
  try {
    res.json(dataCache.getStatus());
  } catch (error) {
    console.error('Cache status error:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// Основной эндпоинт обзора (используем кеш)
router.get('/overview-v2', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const overview = dataCache.getOverview();
    res.json(overview);
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Failed to get overview data' });
  }
});

// Эндпоинт для трендов метрик (используем кеш)
router.get('/metric/:metricId/trend', isAdminWithAuth, async (req, res) => {
  try {
    const { metricId } = req.params;
    
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    // Извлекаем фильтры из query параметров
    const filters = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
      tradeActivity: req.query.tradeActivity as string,
    };

    const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endParam = (req.query.endDate as string) || new Date().toISOString();
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);
    const formatUTCDate = (d: Date) => new Date(d).toISOString().slice(0, 10);
    const startUTC = formatUTCDate(startDateObj);
    const endUTC = formatUTCDate(endDateObj);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    const tutorialMetricIds = new Set([
      'tutorial_start', 'tutorial_complete', 'tutorial_skip', 'tutorial_skip_rate',
      'pro_tutorial_start', 'pro_tutorial_complete', 'pro_tutorial_skip', 'pro_tutorial_skip_rate'
    ]);
    
    if (tutorialMetricIds.has(metricId)) {
      const client = clickhouseAnalyticsService.getClient();
      if (!client) {
        return res.json([]);
      }

      const isPro = metricId.startsWith('pro_');
      const action = metricId.endsWith('start')
        ? 'start'
        : metricId.endsWith('complete')
        ? 'complete'
        : 'skip';

      const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      const filteredUserIds = Array.from(userAttributesMap.keys());

      if (filteredUserIds.length === 0) {
        return res.json([]);
      }

      const userIdsCondition = `user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

      const whereEvent = `event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = '${action}' ` +
        (isPro
          ? "AND JSONExtractString(event_data, 'step') = 'pro_tutorial'"
          : "AND (JSONExtractString(event_data, 'step') != 'pro_tutorial' OR JSONExtractString(event_data, 'step') IS NULL)");

      // Все события (user_id, event_date) за период для метрики
      const baseQuery = `
        SELECT
          user_id,
          min(toDate(timestamp)) AS date
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
          AND ${userIdsCondition} /* Применяем фильтр по user_id */
          AND (${whereEvent})
        GROUP BY user_id
      `;

      const baseResp = await (client as any).query({ query: baseQuery, format: 'JSONEachRow' });
      const baseRows = await baseResp.json() as any[];

      // Агрегируем по датам БЕЗ дополнительных фильтров (только период)
      const countsByDate = new Map<string, number>();
      for (const row of baseRows) {
        const dateStr = row.date; // already YYYY-MM-DD
        countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
      }

      // Собираем непрерывный ряд дат
      const out: any[] = [];
      const seriesStart = new Date(`${startUTC}T00:00:00.000Z`);
      seriesStart.setHours(0, 0, 0, 0);
      const seriesEnd = new Date(`${endUTC}T00:00:00.000Z`);
      seriesEnd.setHours(0, 0, 0, 0);
      for (let d = new Date(seriesStart); d <= seriesEnd; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, value: Math.floor(countsByDate.get(key) || 0) });
      }
      return res.json(out);
    }
    else if (metricId === 'sessions') {
      const client = clickhouseAnalyticsService.getClient();
      if (!client) {
        return res.json({ trend: [], totalSessions: 0, totalUsers: 0 });
      }

      const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      const filteredUserIds = Array.from(userAttributesMap.keys());

      if (filteredUserIds.length === 0) {
        return res.json({ trend: [], totalSessions: 0, totalUsers: 0 });
      }

      const userIdsCondition = `AND user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

      const trendQuery = `
        SELECT
          toDate(timestamp) AS date,
          count(DISTINCT session_id) AS value
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${startUTC} 00:00:00' AND timestamp < '${endNextUTC} 00:00:00'
          AND user_id != '999999999'
          AND length(user_id) > 5
          ${userIdsCondition}
        GROUP BY date
        ORDER BY date
      `;

      const totalSessionsUsersQuery = `
        SELECT
          count(DISTINCT session_id) AS total_sessions,
          count(DISTINCT user_id) AS total_users
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${startUTC} 00:00:00' AND timestamp < '${endNextUTC} 00:00:00'
          AND user_id != '999999999'
          AND length(user_id) > 5
          ${userIdsCondition}
      `;

      const [trendResp, totalResp] = await Promise.all([
        (client as any).query({ query: trendQuery, format: 'JSONEachRow' }),
        (client as any).query({ query: totalSessionsUsersQuery, format: 'JSONEachRow' })
      ]);

      const trendData = await trendResp.json() as any[];
      const totalData = ((await totalResp.json()) as any[])[0] || { total_sessions: 0, total_users: 0 };

      // Добавляем информацию о общем количестве сессий и пользователей в ответ
      return res.json({ trend: trendData, totalSessions: totalData.total_sessions, totalUsers: totalData.total_users });
    }
    else if (metricId === 'screens_opened') {
      const client = clickhouseAnalyticsService.getClient();
      if (!client) {
        return res.json({ trend: [], totalScreensOpened: 0 });
      }

      const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      const filteredUserIds = Array.from(userAttributesMap.keys());

      if (filteredUserIds.length === 0) {
        return res.json({ trend: [], totalScreensOpened: 0 });
      }

      const userIdsCondition = `AND user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

      const trendQuery = `
        SELECT
          toDate(timestamp) AS date,
          count(*) AS total_screens_opened_daily,
          count(DISTINCT user_id) AS total_users_daily
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
          AND event_type = 'screen_view'
          AND user_id != '999999999'
          AND length(user_id) > 5
          ${userIdsCondition}
        GROUP BY date
        ORDER BY date
      `;
      const totalScreensQuery = `
        SELECT
          count(*) AS total_screens_opened_overall,
          count(DISTINCT user_id) AS total_users_overall
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
          AND event_type = 'screen_view'
          AND user_id != '999999999'
          AND length(user_id) > 5
          ${userIdsCondition}
      `;

      const [trendResp, totalResp] = await Promise.all([
        (client as any).query({ query: trendQuery, format: 'JSONEachRow' }),
        (client as any).query({ query: totalScreensQuery, format: 'JSONEachRow' })
      ]);

      const rawTrendData = await trendResp.json() as any[];
      const totalRawData = ((await totalResp.json()) as any[])[0] || { total_screens_opened_overall: 0, total_users_overall: 0 };

      const trendData = rawTrendData.map((row: any) => ({
        date: row.date,
        value: row.total_users_daily > 0 ? Math.floor(row.total_screens_opened_daily / row.total_users_daily) : 0,
      }));

      const totalScreensOpened = totalRawData.total_users_overall > 0
        ? Math.floor(totalRawData.total_screens_opened_overall / totalRawData.total_users_overall)
        : 0;

      return res.json({ trend: trendData, totalScreensOpened: totalScreensOpened });
    }
    else if (metricId === 'trades_per_user') {
      // Удалены локальные определения дат, используем глобальные
      const client = clickhouseAnalyticsService.getClient();

      // Удалены отладочные console.log
      const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      const filteredUserIds = Array.from(userAttributesMap.keys());

      if (filteredUserIds.length === 0) {
        return res.json({ trend: [], totalTradingUsers: 0 });
      }

      let whereConditions: any[] = [
        inArray(deals.userId, filteredUserIds as string[]),
        and(sql`${deals.closedAt} >= ${tsFrom}`, sql`${deals.closedAt} < ${tsTo}`),
        sql`${deals.status} = 'closed'`,
      ];

      if (filters.tradeActivity === 'profit') {
        whereConditions.push(sql`${deals.profit} > 0`);
      } else if (filters.tradeActivity === 'loss') {
        whereConditions.push(sql`${deals.profit} < 0`);
      }

      // Получаем трендовые данные (количество уникальных пользователей в день)
      const rawDealsQuery = (db as any).select({
        closedAt: deals.closedAt,
        userId: deals.userId,
      })
      .from(deals)
      .where(and(...whereConditions));
      // .groupBy(sql`DATE(${deals.closedAt}::timestamptz AT TIME ZONE 'UTC')`)
      // .orderBy(sql`DATE(${deals.closedAt}::timestamptz AT TIME ZONE 'UTC')`);

      // Получаем общее количество уникальных пользователей
      const totalTradingUsersQuery = (db as any).select({ count: sql<number>`count(DISTINCT ${deals.userId})` })
        .from(deals)
        .where(and(...whereConditions));

      const [rawDealsData, totalTradingUsersResult] = await Promise.all([
        rawDealsQuery,
        totalTradingUsersQuery
      ]);

      console.log('[Trades/User Trend] rawDealsData:', rawDealsData); // Отладочный вывод

      const trendMap = new Map<string, number>();
      for (const row of rawDealsData) {
        if (row.closedAt) {
          // Приводим к UTC и получаем дату в формате YYYY-MM-DD
          const utcDate = new Date(row.closedAt); // PostgreSQL timestamp (without time zone) считается локальным временем сервера
          const dateKey = utcDate.toISOString().slice(0, 10); // Преобразуем в UTC-дату
          trendMap.set(dateKey, (trendMap.get(dateKey) || 0) + 1);
        }
      }

      const totalTradingUsers = totalTradingUsersResult[0]?.count || 0;

      // Формируем непрерывный ряд дат
      const out: any[] = [];
      const seriesStart = new Date(`${startUTC}T00:00:00.000Z`);
      seriesStart.setHours(0, 0, 0, 0);
      const seriesEnd = new Date(`${endUTC}T00:00:00.000Z`);
      seriesEnd.setHours(0, 0, 0, 0);

      for (let d = new Date(seriesStart); d <= seriesEnd; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        out.push({ date: key, value: Math.floor(Number(trendMap.get(key) || 0)) });
      }

      return res.json({ trend: out, totalTradingUsers: totalTradingUsers });
    }
    else if (metricId === 'avg_virtual_balance') {
      const client = clickhouseAnalyticsService.getClient();

      if (!client) {
        return res.json({ trend: [], avgBalance: 0 });
      }

      const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
      const endParam = (req.query.endDate as string) || new Date().toISOString();
      const startDateObj = new Date(startParam);
      const endDateObj = new Date(endParam);
      const formatUTCDate = (d: Date) => new Date(d).toISOString().slice(0, 10);
      const startUTC = formatUTCDate(startDateObj);
      const endUTC = formatUTCDate(endDateObj);
      const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
      nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
      const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

      const tsFrom = `${startUTC} 00:00:00`;
      const tsTo = `${endNextUTC} 00:00:00`;

      const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      const filteredUserIds = Array.from(userAttributesMap.keys());

      if (filteredUserIds.length === 0) {
        return res.json({ trend: [], avgBalance: 0 });
      }

      const userIdsCondition = `AND user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

      // Запрос к balance_history для получения среднего баланса по дням
      const trendQuery = `
        SELECT
          date,
          floor(avg(total_balance)) AS value
        FROM cryptocraze_analytics.balance_history
        WHERE date >= '${startUTC}' AND date <= '${endUTC}'
          ${userIdsCondition}
        GROUP BY date
        ORDER BY date ASC
      `;

      // Запрос для получения общего среднего баланса за период
      const overallAvgBalanceQuery = `
        SELECT
          floor(avg(total_balance)) AS avg_balance
        FROM cryptocraze_analytics.balance_history
        WHERE date >= '${startUTC}' AND date <= '${endUTC}'
          ${userIdsCondition}
      `;

      const [trendResp, overallAvgResp] = await Promise.all([
        (client as any).query({ query: trendQuery, format: 'JSONEachRow' }),
        (client as any).query({ query: overallAvgBalanceQuery, format: 'JSONEachRow' })
      ]);

      const trendData = await trendResp.json() as any[];
      const overallAvgBalanceResult: any[] = await overallAvgResp.json() as any[];
      const overallAvgBalance = overallAvgBalanceResult.length > 0 ? overallAvgBalanceResult[0].avg_balance : 0;

      return res.json({ trend: trendData, avgBalance: overallAvgBalance });
    }

    // Остальные метрики — как раньше (кешированные)
    const trendData = dataCache.getTrend(metricId, filters);
    res.json(trendData);
  } catch (error) {
    console.error('Trend error:', error);
    res.status(500).json({ error: 'Failed to get trend data' });
  }
});

// Эндпоинт для таблицы retention (используем кеш с фильтрацией)
router.get('/table/retention', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      window: req.query.window as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const result = dataCache.getRetentionTable(filters);
    res.json(result);
  } catch (error) {
    console.error('Retention table error:', error);
    res.status(500).json({ error: 'Failed to get retention table' });
  }
});

// Эндпоинт для таблицы Virtual Balance
router.get('/table/virtual_balance', isAdminWithAuth, async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || (req.query.size as string) || '30');
    const offset = (page - 1) * limit;
    const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endParam = (req.query.endDate as string) || new Date().toISOString();
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);

    const formatUTCDate = (d: Date) => d.toISOString().slice(0, 10);
    const startUTC = formatUTCDate(startDateObj);
    const endUTC = formatUTCDate(endDateObj);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
    };

    const client = clickhouseAnalyticsService.getClient();

    let userData: any[] = [];
    let total = 0;

    if (client) {
      const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      const filteredUserIds = Array.from(userAttributesMap.keys());

      if (filteredUserIds.length === 0) {
        return res.json({ data: [], total: 0, page, limit, totalPages: 0 });
      }

      let whereConditions: any[] = [
        inArray(users.id, filteredUserIds as string[]),
      ];

      if (filters.search) {
        whereConditions.push(sql`${users.email} ILIKE ${`%${filters.search}%`}`);
      }

      // Запрос для получения данных пользователей
      let query = (db as any).select({
        userId: users.id,
        email: users.email,
        isPremium: users.isPremium,
        balance: users.balance,
        freeBalance: users.freeBalance,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

      const countQuery = (db as any).select({
        count: sql<number>`count(DISTINCT ${users.id})`
      })
      .from(users)
      .where(and(...whereConditions));

      const [rows, totalResult] = await Promise.all([
        query,
        countQuery
      ]);
      
      userData = rows;
      total = totalResult[0]?.count || 0;
    }

    // Используем карту атрибутов, рассчитанную выше
    const attrsMap: Map<string, any> = new Map<string, any>();
    if (client) {
      const tmpMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
      tmpMap.forEach((v: any, k: string) => attrsMap.set(k, v));
    }

    const rows = userData.map((row: any) => {
      const userAttrs = attrsMap.get(row.userId) || {};
      return {
        userId: row.userId,
        email: row.email || '—',
        country: userAttrs.country || 'Unknown',
        isPremium: !!row.isPremium,
        balance: Math.floor(Number(row.balance || 0) + Number(row.freeBalance || 0)),
      };
    });

    res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Virtual Balance table error:', error);
    res.status(500).json({ error: 'Failed to get virtual balance table' });
  }
});

// Эндпоинт для таблицы туториалов (пользователи и события)
router.get('/table/tutorial', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const metricId = (req.query.metricId as string) || 'tutorial_start';
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || (req.query.size as string) || '20');
    const offset = (page - 1) * limit;
    const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endParam = (req.query.endDate as string) || new Date().toISOString();
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);
    // Для tutorial-таблицы учитываем ТОЛЬКО период времени

    const client = clickhouseAnalyticsService.getClient();
    // Локальные дневные границы [start 00:00; nextDay 00:00)
    const formatLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startDateStr = formatLocalDate(startDateObj);
    const nextDay = new Date(endDateObj);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = formatLocalDate(nextDay);
    const tsFrom = `${startDateStr} 00:00:00`;
    const tsTo = `${nextDayStr} 00:00:00`;

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
    };

    const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
    const filteredUserIds = Array.from(userAttributesMap.keys());

    if (filteredUserIds.length === 0) {
      return res.json({ data: [], total: 0, page, limit, totalPages: 0 });
    }

    const userIdsCondition = `AND user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

    const isPro = metricId.startsWith('pro_');
    const action = metricId.endsWith('start') ? 'start' : metricId.endsWith('complete') ? 'complete' : 'skip';
    const whereEvent = `event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = '${action}' ` +
      (isPro ? "AND JSONExtractString(event_data, 'step') = 'pro_tutorial'" : "AND (JSONExtractString(event_data, 'step') != 'pro_tutorial' OR JSONExtractString(event_data, 'step') IS NULL)");

    const baseQuery = `
      SELECT
        user_id,
        min(timestamp) AS event_date,
        any(JSONExtractString(event_data, 'action')) AS action,
        '${isPro ? 'pro' : 'regular'}' AS tutorial_type
      FROM cryptocraze_analytics.user_events
      WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        AND user_id != '999999999'
        AND length(user_id) > 5
        ${userIdsCondition}
        AND (${whereEvent})
      GROUP BY user_id
      ORDER BY event_date DESC
    `;

    const countQuery = `
      SELECT countDistinct(user_id) AS total
      FROM cryptocraze_analytics.user_events
      WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        AND user_id != '999999999'
        AND length(user_id) > 5
        ${userIdsCondition}
        AND (${whereEvent})
    `;

    const [baseResp, countResp] = await Promise.all([
      (client as any).query({ query: baseQuery, format: 'JSONEachRow' }),
      (client as any).query({ query: countQuery, format: 'JSONEachRow' })
    ]);
    const baseRows = await baseResp.json() as any[];
    const totalRows = ((await countResp.json()) as any[])[0]?.total || 0;

    // Поскольку userAttributesMap уже содержит отфильтрованных пользователей, нет необходимости в повторной фильтрации
    // Просто используем userDataMap для обогащения данных
    let userDataMap = userAttributesMap; // Используем уже отфильтрованную карту

    // Дополнительный запрос для получения activeDate (первая активность пользователя в выбранном диапазоне)
    const userActiveDateMap = new Map<string, string>();
    if (filteredUserIds.length > 0) { // Используем filteredUserIds
      const activeDateQuery = `
        SELECT
          user_id,
          max(timestamp) AS active_date
        FROM cryptocraze_analytics.user_events
        WHERE user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')}) /* Применяем фильтр по user_id */
          AND timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        GROUP BY user_id
      `;
      console.log('[Tutorial Table] activeDateQuery:', activeDateQuery);
      const activeDateResp = await (client as any).query({ query: activeDateQuery, format: 'JSONEachRow' });
      const activeDateRows = await activeDateResp.json();
      activeDateRows.forEach((r: any) => userActiveDateMap.set(r.user_id, r.active_date));
    }

    let rows: any[] = baseRows.map((r: any) => {
        const ud = userDataMap.get(r.user_id) || {};
      return {
          userId: r.user_id,
        email: ud.email || null,
          country: ud.country || 'Unknown',
          isPremium: !!ud.isPremium,
        activeDate: userActiveDateMap.get(r.user_id) || null, // Добавляем activeDate
        eventDate: r.event_date,
        action: r.action,
        tutorialType: r.tutorial_type
      };
    });

    // Так как фильтрация уже произошла через getFilteredUserAttributes, totalFilteredRows = rows.length
    const totalFilteredRows = rows.length; 

    const paged = rows.slice(offset, offset + limit);
    res.json({ data: paged, total: totalFilteredRows, page, limit, totalPages: Math.ceil(totalFilteredRows / limit) });
  } catch (error) {
    console.error('Tutorial table error:', error);
    res.status(500).json({ error: 'Failed to get tutorial table' });
  }
});

// Эндпоинт для получения списка стран
router.get('/countries', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    // Получаем уникальные страны из кеша
    const retentionTable = dataCache.getData().retentionTable || [];
    const countries = [...new Set(retentionTable.map((user: any) => user.country).filter(Boolean))]
      .map(country => ({
        id: country,
        label: country,
        value: country
      }))
      .sort((a, b) => (a.label as string).localeCompare(b.label as string));
    
    res.json(countries);
  } catch (error) {
    console.error('Countries error:', error);
    res.status(500).json({ error: 'Failed to get countries list' });
  }
});

// Новый эндпоинт для получения общего количества активных пользователей за период
router.get('/total-users-in-period', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
    };

    const client = clickhouseAnalyticsService.getClient();
    const startUTC = new Date(startDate as string).toISOString().slice(0, 10);
    const endUTC = new Date(endDate as string).toISOString().slice(0, 10);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
    const filteredUserIds = Array.from(userAttributesMap.keys());

    if (filteredUserIds.length === 0) {
      return res.json({ totalUsers: 0 });
    }

    const userIdsCondition = `AND user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

    const totalUsersQuery = `
      SELECT
        count(DISTINCT user_id) AS total_users
      FROM cryptocraze_analytics.user_events
      WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        AND user_id != '999999999'
        AND length(user_id) > 5
        ${userIdsCondition}
    `;

    const response = await (client as any).query({ query: totalUsersQuery, format: 'JSONEachRow' });
    const result = await response.json() as any[];

    res.json({ totalUsers: result[0]?.total_users || 0 });
  } catch (error) {
    console.error('Total users in period error:', error);
    res.status(500).json({ error: 'Failed to get total users in period' });
  }
});

// Эндпоинт для таблицы churn (пользователи которые не вернулись)
router.get('/table/churn', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    // Получаем пользователей которые НЕ вернулись ни в один из retention окон
    const retentionTable = dataCache.getData().retentionTable || [];
    let churnUsers = retentionTable.filter((user: any) => 
      !user.d1Returned && !user.d3Returned && !user.d7Returned && !user.d30Returned
    );

    // Применяем фильтры
    if (filters.userType) {
      if (filters.userType === 'premium') {
        churnUsers = churnUsers.filter((item: any) => item.isPremium);
      } else if (filters.userType === 'free') {
        churnUsers = churnUsers.filter((item: any) => !item.isPremium);
      }
    }

    if (filters.country && filters.country.length > 0) {
      churnUsers = churnUsers.filter((item: any) => filters.country.includes(item.country));
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      churnUsers = churnUsers.filter((item: any) => 
        item.email.toLowerCase().includes(search) ||
        item.userId.toLowerCase().includes(search)
      );
    }

    // Пагинация
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    res.json({
      data: churnUsers.slice(offset, offset + limit),
      total: churnUsers.length,
      page,
      limit,
      totalPages: Math.ceil(churnUsers.length / limit)
    });
  } catch (error) {
    console.error('Churn table error:', error);
    res.status(500).json({ error: 'Failed to get churn table' });
  }
});

// Эндпоинт для таблицы Sessions
router.get('/table/sessions', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || (req.query.size as string) || '20');
    const offset = (page - 1) * limit;
    const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endParam = (req.query.endDate as string) || new Date().toISOString();
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);

    // Приводим даты к UTC для ClickHouse
    const formatUTCDate = (d: Date) => d.toISOString().slice(0, 10);
    const startUTC = formatUTCDate(startDateObj);
    const endUTC = formatUTCDate(endDateObj);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    const client = clickhouseAnalyticsService.getClient();

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
    };

    const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
    const filteredUserIds = Array.from(userAttributesMap.keys());

    let sessionData: any[] = [];
    let totalSessionsUsers = 0;

    if (filteredUserIds.length > 0) {
      const userIdsCondition = `AND user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})`;

      // Получаем количество сессий для каждого уникального пользователя
      const sessionsPerUserQuery = `
        SELECT
          user_id,
          count(DISTINCT session_id) AS number_of_sessions,
          max(timestamp) AS last_active_date
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
          ${userIdsCondition}
        GROUP BY user_id
        ORDER BY number_of_sessions DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countSessionsUsersQuery = `
        SELECT count(DISTINCT user_id) AS total
        FROM cryptocraze_analytics.user_events
        WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
          ${userIdsCondition}
      `;

      const [sessionsResp, countResp] = await Promise.all([
        (client as any).query({ query: sessionsPerUserQuery, format: 'JSONEachRow' }),
        (client as any).query({ query: countSessionsUsersQuery, format: 'JSONEachRow' })
      ]);

      sessionData = await sessionsResp.json() as any[];
      totalSessionsUsers = ((await countResp.json()) as any[])[0]?.total || 0;
    } else {
      return res.json({ data: [], total: 0, page, limit, totalPages: 0 });
    }

    const userIdsWithSessions = sessionData.map((s: any) => s.user_id);
    let userDataMap = new Map<string, any>();

    if (userIdsWithSessions.length > 0) {
      const pgUsers = await (db as any).select({ id: users.id, email: users.email, isPremium: users.isPremium })
        .from(users)
        .where(inArray(users.id, userIdsWithSessions));
      const userCountries = await (db as any).select({ userId: analytics.userId, country: analytics.country })
        .from(analytics)
        .where(inArray(analytics.userId, userIdsWithSessions));
      pgUsers.forEach((u: any) => {
        const c = userCountries.find((uc: any) => uc.userId === u.id);
        userDataMap.set(u.id, { email: u.email, isPremium: u.isPremium, country: c?.country || 'Unknown' });
      });
    }

    const rows = sessionData.map((s: any) => {
      const ud = userDataMap.get(s.user_id) || {};
      return {
        userId: s.user_id,
        email: ud.email || null,
        country: ud.country || 'Unknown',
        isPremium: !!ud.isPremium,
        numberOfSessions: s.number_of_sessions,
        lastActiveDate: s.last_active_date, // Добавляем последнюю активность
      };
    });

    res.json({ data: rows, total: totalSessionsUsers, page, limit, totalPages: Math.ceil(totalSessionsUsers / limit) });
  } catch (error) {
    console.error('Sessions table error:', error);
    res.status(500).json({ error: 'Failed to get sessions table' });
  }
});

// Эндпоинт для таблицы Screens Opened
router.get('/table/screens_opened', isAdminWithAuth, async (req, res) => {
  try {
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }

    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || (req.query.size as string) || '20');
    const offset = (page - 1) * limit;
    const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endParam = (req.query.endDate as string) || new Date().toISOString();
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);

    const formatUTCDate = (d: Date) => d.toISOString().slice(0, 10);
    const startUTC = formatUTCDate(startDateObj);
    const endUTC = formatUTCDate(endDateObj);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    const client = clickhouseAnalyticsService.getClient();

    // Получаем количество открытых экранов и последнюю активность для каждого пользователя
    const screensOpenedPerUserQuery = `
      SELECT
        user_id,
        count(*) AS screens_opened_count,
        max(timestamp) AS last_active_date
      FROM cryptocraze_analytics.user_events
      WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        AND event_type = 'screen_view'
        AND user_id != '999999999'
        AND length(user_id) > 5
      GROUP BY user_id
    `;

    const totalUsersWithScreensQuery = `
      SELECT count(DISTINCT user_id) AS total
      FROM cryptocraze_analytics.user_events
      WHERE timestamp >= '${tsFrom}' AND timestamp < '${tsTo}'
        AND event_type = 'screen_view'
        AND user_id != '999999999'
        AND length(user_id) > 5
    `;

    const [screensResp, countResp] = await Promise.all([
      (client as any).query({ query: screensOpenedPerUserQuery, format: 'JSONEachRow' }),
      (client as any).query({ query: totalUsersWithScreensQuery, format: 'JSONEachRow' })
    ]);

    let screensData = await screensResp.json() as any[];
    const totalScreensUsers = ((await countResp.json()) as any[])[0]?.total || 0;

    // Применяем фильтры
    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
    };

    const userIdsWithScreens = screensData.map((s: any) => s.user_id);
    let userDataMap = new Map<string, any>();

    if (userIdsWithScreens.length > 0) {
      const pgUsers = await (db as any).select({ id: users.id, email: users.email, isPremium: users.isPremium })
        .from(users)
        .where(inArray(users.id, userIdsWithScreens));
      const userCountries = await (db as any).select({ userId: analytics.userId, country: analytics.country })
        .from(analytics)
        .where(inArray(analytics.userId, userIdsWithScreens));
      pgUsers.forEach((u: any) => {
        const c = userCountries.find((uc: any) => uc.userId === u.id);
        userDataMap.set(u.id, { email: u.email, isPremium: u.isPremium, country: c?.country || 'Unknown' });
      });
    }

    let rows = screensData.map((s: any) => {
      const ud = userDataMap.get(s.user_id) || {};
      return {
        userId: s.user_id,
        email: ud.email || null,
        country: ud.country || 'Unknown',
        isPremium: !!ud.isPremium,
        screensOpenedCount: s.screens_opened_count,
        lastActiveDate: s.last_active_date,
      };
    });

    // Применяем фильтры (userType, country, search)
    if (filters.userType) {
      if (filters.userType === 'premium') {
        rows = rows.filter((item: any) => item.isPremium);
      } else if (filters.userType === 'free') {
        rows = rows.filter((item: any) => !item.isPremium);
      }
    }

    if (filters.country && filters.country.length > 0) {
      rows = rows.filter((item: any) => filters.country.includes(item.country));
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      rows = rows.filter((item: any) => 
        item.email.toLowerCase().includes(search) ||
        item.userId.toLowerCase().includes(search)
      );
    }
    
    const totalFilteredRows = rows.length; // Общее количество строк после фильтрации

    const paged = rows.slice(offset, offset + limit);
    res.json({ data: paged, total: totalFilteredRows, page, limit, totalPages: Math.ceil(totalFilteredRows / limit) });
  } catch (error) {
    console.error('Screens Opened table error:', error);
    res.status(500).json({ error: 'Failed to get screens opened table' });
  }
});

// Эндпоинт для таблицы Trades/User
router.get('/table/trades_per_user', isAdminWithAuth, async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || (req.query.size as string) || '20');
    const offset = (page - 1) * limit;
    const startParam = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endParam = (req.query.endDate as string) || new Date().toISOString();
    const startDateObj = new Date(startParam);
    const endDateObj = new Date(endParam);

    // Приводим даты к UTC для ClickHouse
    const formatUTCDate = (d: Date) => d.toISOString().slice(0, 10);
    const startUTC = formatUTCDate(startDateObj);
    const endUTC = formatUTCDate(endDateObj);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    // Получаем отфильтрованные user_id из dataCache
    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
      tradeActivity: req.query.tradeActivity as string,
    };

    const client = clickhouseAnalyticsService.getClient();
    const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
    const filteredUserIds = Array.from(userAttributesMap.keys());

    if (filteredUserIds.length === 0) {
      return res.json({ data: [], total: 0, page, limit, totalPages: 0 });
    }

    let whereConditions: any[] = [
      inArray(deals.userId, filteredUserIds as string[]),
      and(sql`${deals.closedAt} >= ${tsFrom}`, sql`${deals.closedAt} < ${tsTo}`),
      sql`${deals.status} = 'closed'`,
    ];

    // Фильтр по прибыльности/убыточности
    if (filters.tradeActivity === 'profit') {
      whereConditions.push(sql`${deals.profit} > 0`);
    } else if (filters.tradeActivity === 'loss') {
      whereConditions.push(sql`${deals.profit} < 0`);
    }

    // Запрос для получения сделок
    const dealsQuery = (db as any).select({
      id: deals.id,
      userId: deals.userId,
      symbol: deals.symbol,
      direction: deals.direction,
      amount: deals.amount,
      multiplier: deals.multiplier,
      openPrice: deals.openPrice,
      takeProfit: deals.takeProfit,
      stopLoss: deals.stopLoss,
      openedAt: sql`(${deals.openedAt} AT TIME ZONE 'UTC')` as any,
      status: deals.status,
      closedAt: sql`(${deals.closedAt} AT TIME ZONE 'UTC')` as any,
      closePrice: deals.closePrice,
      profit: deals.profit,
    })
    .from(deals)
    .where(and(...whereConditions))
    .orderBy(desc(deals.openedAt))
    .limit(limit)
    .offset(offset);

    // Запрос для подсчета общего количества сделок
    const countDealsQuery = (db as any).select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(and(...whereConditions));

    const [dealsData, totalDealsResult] = await Promise.all([
      dealsQuery,
      countDealsQuery
    ]);

    const totalTrades = (totalDealsResult as any[])[0]?.count || 0;

    const rows = dealsData.map((d: any) => {
      const ud = userAttributesMap.get(d.userId) || {};
      return {
        userId: d.userId,
        email: ud.email || null,
        country: ud.country || 'Unknown',
        isPremium: !!ud.isPremium,
        tradeType: d.direction,
        tradeSize: parseFloat(d.amount),
        openPrice: parseFloat(d.openPrice),
        closePrice: d.closePrice ? parseFloat(d.closePrice) : null,
        profit: d.profit ? parseFloat(d.profit) : null,
        multiplier: d.multiplier,
        eventDate: d.closedAt || d.openedAt, // Используем closedAt если есть, иначе openedAt
      };
    });

    res.json({ data: rows, total: totalTrades, page, limit, totalPages: Math.ceil(totalTrades / limit) });
  } catch (error) {
    console.error('Trades/User table error:', error);
    res.status(500).json({ error: 'Failed to get trades/user table' });
  }
});

// Остальные эндпоинты (оставляем как есть для совместимости)
router.get('/overview', isAdminWithAuth, async (req, res) => {
  try {
    // Совместимость: отдадим подготовленный overview из кеша
    if (!dataCache.isReady()) {
      return res.status(503).json({ error: 'Data is loading, please wait...' });
    }
    const overview = dataCache.getOverview();
    res.json(overview);
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

router.get('/table/:tableId', isAdminWithAuth, async (req, res) => {
  try {
    const { tableId } = req.params;
    const filters = req.query;
    
    let result;
    switch (tableId) {
      case 'retention':
        // Используем кеш
        if (dataCache.isReady()) {
          result = dataCache.getRetentionTable(filters);
            } else {
          result = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
        }
        break;
      default:
        return res.status(400).json({ error: 'Invalid table ID' });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Dashboard table error:', error);
    res.status(500).json({ error: 'Failed to fetch table data' });
  }
});

router.get('/metric/:metricId', isAdminWithAuth, async (req, res) => {
  try {
    // Совместимость: для большинства случаев теперь используем кешированные данные/тренды
    const { metricId } = req.params;
    const trendData = dataCache.getTrend(metricId, req.query);
    res.json(trendData);
  } catch (error) {
    console.error('Dashboard metric error:', error);
    res.status(500).json({ error: 'Failed to fetch metric data' });
  }
});

// Новый эндпоинт для получения количества сделок по датам
router.get('/chart/trades_by_date', isAdminWithAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    // Приводим даты к UTC для ClickHouse (используем те же tsFrom/tsTo)
    const formatUTCDate = (d: Date) => new Date(d).toISOString().slice(0, 10);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const startUTC = formatUTCDate(startDateObj);
    const endUTC = formatUTCDate(endDateObj);
    const nextDayAfterEndUTC = new Date(`${endUTC}T00:00:00.000Z`);
    nextDayAfterEndUTC.setUTCDate(nextDayAfterEndUTC.getUTCDate() + 1);
    const endNextUTC = nextDayAfterEndUTC.toISOString().slice(0, 10);

    const tsFrom = `${startUTC} 00:00:00`;
    const tsTo = `${endNextUTC} 00:00:00`;

    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      tradeActivity: req.query.tradeActivity as string,
      search: req.query.search as string, // Добавляем поиск, если потребуется
    };

    const client = clickhouseAnalyticsService.getClient();
    const userAttributesMap = await dataCache.getFilteredUserAttributes(client, tsFrom, tsTo, filters);
    const filteredUserIds = Array.from(userAttributesMap.keys());

    // Если нет отфильтрованных пользователей, возвращаем пустые данные
    if (filteredUserIds.length === 0) {
      return res.json([]);
    }

    const result = await adminAnalyticsService.getTradesCountByDate(
      startDate,
      endDate,
      filteredUserIds,
      filters.tradeActivity
    );
    res.json(result.data);
  } catch (error) {
    console.error('Trades by date chart error:', error);
    res.status(500).json({ error: 'Failed to get trades by date chart data' });
  }
});

export default router;
