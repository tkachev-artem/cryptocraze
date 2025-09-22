import { Router } from 'express';
import { isAdminWithAuth } from '../simpleOAuth.js';
import { clickhouseAnalyticsService } from '../services/clickhouseAnalyticsService.js';
import { db } from '../db.js';
import { users, analytics } from '../../shared/schema.js';
import { inArray } from 'drizzle-orm';
import { GeoLocationService } from '../services/geoLocationService.js';

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
      const response = await client.query({ query, format: 'JSONEachRow' });
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
      const client = (clickhouseAnalyticsService as any).getClient();

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

      const statsResponse = await client.query({ query: statsQuery, format: 'JSONEachRow' });
      const stats = await statsResponse.json();

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

      const dailyResponse = await client.query({ query: dailyQuery, format: 'JSONEachRow' });
      const dailyData = await dailyResponse.json();

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

      const usersResponse = await client.query({ query: usersQuery, format: 'JSONEachRow' });
      const usersData = await usersResponse.json();

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
          D30: await this.calculateRetentionTrend(client, 30)
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
        trends: { D1: [], D3: [], D7: [], D30: [] },
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
        const installResponse = await client.query({ query: installQuery, format: 'JSONEachRow' });
        const installUsers = await installResponse.json();
        
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
        
        const retentionResponse = await client.query({ query: retentionQuery, format: 'JSONEachRow' });
        const retentionUsers = await retentionResponse.json();
        
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
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };
    // Обработка tutorial-метрик отдельной веткой (проценты + количество пользователей)
    const tutorialMetricIds = new Set([
      'tutorial_start', 'tutorial_complete', 'tutorial_skip_rate',
      'pro_tutorial_start', 'pro_tutorial_complete', 'pro_tutorial_skip_rate'
    ]);
    
    if (tutorialMetricIds.has(metricId)) {
      const client = (clickhouseAnalyticsService as any).getClient();
      const start = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 6 * 86400000);
      const end = filters.endDate ? new Date(filters.endDate) : new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Условия фильтрации по странам и типу пользователя пока опускаем (страна в ClickHouse не хранится напрямую)
      const isPro = metricId.startsWith('pro_');
      const action = metricId.includes('start') ? 'start' : metricId.includes('complete') ? 'complete' : 'skip';

      // Получаем общие данные за весь период
      const dateFrom = start.toISOString().slice(0, 10);
      const dateTo = end.toISOString().slice(0, 10);

      // Общий числитель: количество уникальных пользователей с событием за весь период
      const totalUsersQuery = `
        SELECT
          countDistinct(user_id) AS user_count
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${dateFrom}' AND date <= '${dateTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
          AND (
            (event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = '${action}' ${isPro ? "AND JSONExtractString(event_data, 'step') = 'pro_tutorial'" : "AND JSONExtractString(event_data, 'step') != 'pro_tutorial'"})
          )
      `;

      // Общий знаменатель: общее количество уникальных пользователей за весь период
      const totalUsersDenomQuery = `
        SELECT
          countDistinct(user_id) AS total_user_count
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${dateFrom}' AND date <= '${dateTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
      `;

      const [numResp, denResp] = await Promise.all([
        client.query({ query: totalUsersQuery, format: 'JSONEachRow' }),
        client.query({ query: totalUsersDenomQuery, format: 'JSONEachRow' })
      ]);
      const numerators = await numResp.json();
      const denominators = await denResp.json();

      const totalUsers = numerators[0]?.user_count || 0;
      const totalDenom = denominators[0]?.total_user_count || 0;
      const percent = totalDenom > 0 ? Math.round((totalUsers / totalDenom) * 100) : 0;

      // Получаем данные по дням для правильного графика
      const dailyUsersQuery = `
        SELECT
          date,
          countDistinct(user_id) AS user_count
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${dateFrom}' AND date <= '${dateTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
          AND (
            (event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = '${action}' ${isPro ? "AND JSONExtractString(event_data, 'step') = 'pro_tutorial'" : "AND JSONExtractString(event_data, 'step') != 'pro_tutorial'"})
          )
        GROUP BY date
        ORDER BY date
      `;

      const dailyUsersResponse = await client.query({ query: dailyUsersQuery, format: 'JSONEachRow' });
      const dailyUsers = await dailyUsersResponse.json();

      const byDateUsers = new Map<string, number>();
      dailyUsers.forEach((r: any) => byDateUsers.set(r.date, Number(r.user_count) || 0));

      // Получаем общее количество пользователей по дням
      const dailyTotalUsersQuery = `
        SELECT
          date,
          countDistinct(user_id) AS total_count
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${dateFrom}' AND date <= '${dateTo}'
          AND user_id != '999999999'
          AND length(user_id) > 5
        GROUP BY date
        ORDER BY date
      `;

      const dailyTotalResponse = await client.query({ query: dailyTotalUsersQuery, format: 'JSONEachRow' });
      const dailyTotal = await dailyTotalResponse.json();

      const byDateTotal = new Map<string, number>();
      dailyTotal.forEach((r: any) => byDateTotal.set(r.date, Number(r.total_count) || 0));

      // Создаем данные по дням для графика
      const result: Array<{
        date: string;
        percent: number;
        userCount: number;
        totalUsers: number;
      }> = [];

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().slice(0, 10);

        const userCount = byDateUsers.get(dateStr) || 0;

        result.push({
          date: dateStr,
          percent,
          userCount,
          totalUsers: totalDenom
        });
      }

      return res.json(result);
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
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 6 * 86400000).toISOString();
    const endDate = (req.query.endDate as string) || new Date().toISOString();
    const filters = {
      userType: req.query.userType as string,
      country: req.query.country ? (req.query.country as string).split(',') : [],
      search: req.query.search as string
    };

    const client = (clickhouseAnalyticsService as any).getClient();
    const dateFrom = new Date(startDate).toISOString().slice(0, 10);
    const dateTo = new Date(endDate).toISOString().slice(0, 10);

    const isPro = metricId.startsWith('pro_');
    const action = metricId.includes('start') ? 'start' : metricId.includes('complete') ? 'complete' : 'skip';

    const whereEvent = `event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = '${action}' ` +
      (isPro ? "AND JSONExtractString(event_data, 'step') = 'pro_tutorial'" : "AND (JSONExtractString(event_data, 'step') != 'pro_tutorial' OR JSONExtractString(event_data, 'step') IS NULL)");

    // Основные данные по пользователям из ClickHouse
    const baseQuery = `
      SELECT 
        user_id,
        any(timestamp) AS event_date,
        any(JSONExtractString(event_data, 'action')) AS action,
        '${isPro ? 'pro' : 'regular'}' AS tutorial_type
      FROM cryptocraze_analytics.user_events
      WHERE date >= '${dateFrom}' AND date <= '${dateTo}'
        AND user_id != '999999999'
        AND length(user_id) > 5
        AND (${whereEvent})
      GROUP BY user_id
      ORDER BY event_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT 
        countDistinct(user_id) AS total
      FROM cryptocraze_analytics.user_events
      WHERE date >= '${dateFrom}' AND date <= '${dateTo}'
        AND user_id != '999999999'
        AND length(user_id) > 5
        AND (${whereEvent})
    `;

    const [baseResp, countResp] = await Promise.all([
      client.query({ query: baseQuery, format: 'JSONEachRow' }),
      client.query({ query: countQuery, format: 'JSONEachRow' })
    ]);
    const baseRows = await baseResp.json();
    const totalRows = (await countResp.json())[0]?.total || 0;

    // Подтянем email и страну из PostgreSQL
    const userIds = baseRows.map((r: any) => r.user_id);
    let userDataMap = new Map<string, any>();
    if (userIds.length > 0) {
      const pgUsers = await (db as any).select({ id: users.id, email: users.email, isPremium: users.isPremium })
        .from(users)
        .where(inArray(users.id, userIds));
      const userCountries = await (db as any).select({ userId: analytics.userId, country: analytics.country })
        .from(analytics)
        .where(inArray(analytics.userId, userIds));

      pgUsers.forEach(u => {
        const c = userCountries.find(uc => uc.userId === u.id);
        userDataMap.set(u.id, { email: u.email, isPremium: u.isPremium, country: c?.country || 'Unknown' });
      });
    }

    // Применим фильтры по userType/country/search на результирующем наборе
    let rows = baseRows.map((r: any) => {
      const ud = userDataMap.get(r.user_id) || {};
      return {
        userId: r.user_id,
        email: ud.email || `${r.user_id}@unknown.com`,
        country: ud.country || 'Unknown',
        isPremium: !!ud.isPremium,
        eventDate: r.event_date,
        action: r.action,
        tutorialType: r.tutorial_type
      };
    });

    if (filters.userType === 'premium') rows = rows.filter(r => r.isPremium);
    if (filters.userType === 'free') rows = rows.filter(r => !r.isPremium);
    if (filters.country.length > 0) rows = rows.filter(r => filters.country.includes(r.country));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      rows = rows.filter(r => r.email?.toLowerCase().includes(s) || r.userId.toLowerCase().includes(s));
    }

    res.json({
      data: rows,
      total: totalRows,
      page,
      limit,
      totalPages: Math.ceil(totalRows / limit)
    });
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

export default router;
