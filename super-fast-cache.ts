import { clickhouseAnalyticsService } from './server/services/clickhouseAnalyticsService';
import { db } from './server/db';
import { users, analytics } from './shared/schema';
import { inArray, desc } from 'drizzle-orm';
import { GeoLocationService } from './server/services/geoLocationService';

// Система предварительного кеширования для мгновенной загрузки
class SuperFastCache {
  private cache: Record<string, { data: any; timestamp: number }> = {};
  private isWarming = false;
  
  // Время жизни кеша - 5 минут
  private readonly CACHE_TTL = 5 * 60 * 1000;
  
  // Предварительно прогреваем кеш каждые 3 минуты
  private readonly WARMUP_INTERVAL = 3 * 60 * 1000;

  constructor() {
    // Запускаем прогрев кеша при старте
    this.warmupCache();
    
    // Устанавливаем интервал для регулярного прогрева
    setInterval(() => {
      this.warmupCache();
    }, this.WARMUP_INTERVAL);
  }

  // Получение данных из кеша
  get(key: string): any | null {
    const cached = this.cache[key];
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  // Сохранение в кеш
  set(key: string, data: any): void {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
  }

  // Предварительный прогрев кеша
  async warmupCache(): Promise<void> {
    if (this.isWarming) return;
    
    this.isWarming = true;
    console.log('[SuperFastCache] Starting cache warmup...');
    
    try {
      // Прогреваем основные retention данные
      await this.warmupRetentionData();
      
      // Прогреваем trend данные
      await this.warmupTrendData();
      
      console.log('[SuperFastCache] Cache warmup completed');
    } catch (error) {
      console.error('[SuperFastCache] Cache warmup failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  // Прогрев retention данных
  private async warmupRetentionData(): Promise<void> {
    const startDate = new Date(Date.now() - 30 * 86400000);
    const endDate = new Date();
    
    for (const window of ['D1', 'D3', 'D7', 'D30']) {
      const days = { D1: 1, D3: 3, D7: 7, D30: 30 }[window] || 1;
      
      try {
        await clickhouseAnalyticsService.initializeSchema();
        const client = (clickhouseAnalyticsService as any).getClient();
        
        // Супер-оптимизированный запрос с минимальными данными
        const query = `
          WITH 
            user_installs AS (
              SELECT user_id, min(date) AS install_date
              FROM cryptocraze_analytics.user_events
              WHERE date >= '${startDate.toISOString().slice(0,10)}'
                AND date <= '${endDate.toISOString().slice(0,10)}'
                AND user_id != '999999999'
                AND length(user_id) > 5
              GROUP BY user_id
              LIMIT 100
            ),
            user_returns AS (
              SELECT DISTINCT 
                ui.user_id,
                ui.install_date,
                min(e.date) as returned_date
              FROM user_installs ui
              JOIN cryptocraze_analytics.user_events e ON ui.user_id = e.user_id
              WHERE e.date >= addDays(ui.install_date, ${days})
                AND e.date < addDays(ui.install_date, ${days + 1})
              GROUP BY ui.user_id, ui.install_date
              LIMIT 50
            )
          SELECT 
            user_id,
            install_date, 
            returned_date
          FROM user_returns
          ORDER BY install_date DESC
          LIMIT 30
        `;

        const response = await client.query({ query, format: 'JSONEachRow' });
        const rows = await response.json();
        
        // Обогащаем данными из PostgreSQL
        const userIds = rows.map((r: any) => String(r.user_id)).filter(Boolean);
        let enrichedData = rows;
        
        if (userIds.length > 0 && db) {
          const [pgUsers, analyticsData] = await Promise.all([
            db.select({
              id: users.id,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              isPremium: users.isPremium
            }).from(users).where(inArray(users.id, userIds)),
            
            db.select({
              userId: analytics.userId,
              country: analytics.country
            }).from(analytics)
            .where(inArray(analytics.userId, userIds))
            .orderBy(desc(analytics.timestamp))
          ]);

          const countryMap = new Map<string, string>();
          for (const a of analyticsData) {
            if (a.userId && a.country && !countryMap.has(a.userId)) {
              countryMap.set(a.userId, a.country);
            }
          }

          const usersMap: Record<string, any> = {};
          for (const u of pgUsers) {
            const countryCode = countryMap.get(u.id) || 'Unknown';
            usersMap[u.id] = {
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              is_premium: u.isPremium || false,
              region: GeoLocationService.getCountryName(countryCode),
              regionCode: countryCode
            };
          }

          enrichedData = rows.map((r: any) => ({
            userId: String(r.user_id),
            email: usersMap[String(r.user_id)]?.email || null,
            username: usersMap[String(r.user_id)] ? 
              `${usersMap[String(r.user_id)].firstName || ''} ${usersMap[String(r.user_id)].lastName || ''}`.trim() || null : null,
            region: usersMap[String(r.user_id)]?.region || 'Unknown',
            regionCode: usersMap[String(r.user_id)]?.regionCode || 'Unknown',
            is_premium: usersMap[String(r.user_id)]?.is_premium || false,
            install_date: r.install_date,
            returned_at: r.returned_date || null,
            return_window: window
          }));
        }

        // Кешируем результат
        const cacheKey = `retention_table_${window}_${startDate.toISOString().slice(0,10)}_${endDate.toISOString().slice(0,10)}_1_30__`;
        this.set(cacheKey, {
          total: enrichedData.length,
          page: 1,
          size: 30,
          data: enrichedData
        });

        console.log(`[SuperFastCache] Cached ${window} retention data: ${enrichedData.length} rows`);
        
      } catch (error) {
        console.error(`[SuperFastCache] Failed to cache ${window} retention:`, error);
      }
    }
  }

  // Прогрев trend данных  
  private async warmupTrendData(): Promise<void> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate.getTime() - 7 * 86400000);

    for (const metricId of ['D1', 'D3', 'D7', 'D30']) {
      try {
        await clickhouseAnalyticsService.initializeSchema();
        const client = (clickhouseAnalyticsService as any).getClient();
        
        const retentionDays = { D1: 1, D3: 3, D7: 7, D30: 30 }[metricId] || 1;
        
        // Супер-быстрый trend запрос
        const query = `
          WITH 
            user_installs AS (
              SELECT user_id, min(date) AS install_date
              FROM cryptocraze_analytics.user_events
              WHERE user_id != '999999999'
                AND length(user_id) > 5
              GROUP BY user_id
              LIMIT 200
            ),
            retention_achievements AS (
              SELECT DISTINCT 
                ui.user_id,
                ui.install_date,
                addDays(ui.install_date, ${retentionDays}) as achievement_date
              FROM user_installs ui
              JOIN cryptocraze_analytics.user_events e ON ui.user_id = e.user_id
              WHERE e.date >= addDays(ui.install_date, 1)
                AND e.date < addDays(ui.install_date, ${retentionDays + 1})
                AND e.user_id != '999999999'
              GROUP BY ui.user_id, ui.install_date
              HAVING count(DISTINCT e.date) >= ${retentionDays}
              LIMIT 100
            )
          SELECT 
            achievement_date as date,
            count(DISTINCT user_id) as value
          FROM retention_achievements
          WHERE achievement_date >= '${startDate.toISOString().slice(0,10)}'
            AND achievement_date <= '${endDate.toISOString().slice(0,10)}'
          GROUP BY achievement_date
          ORDER BY achievement_date
        `;

        const response = await client.query({ query, format: 'JSONEachRow' });
        const rows = await response.json();

        const trend = rows.map((row: any) => ({
          date: row.date,
          value: parseInt(row.value) || 0
        }));

        // Кешируем trend данные
        const cacheKey = `${metricId}_7__`;
        this.set(cacheKey, { trend });

        console.log(`[SuperFastCache] Cached ${metricId} trend data: ${trend.length} points`);
        
      } catch (error) {
        console.error(`[SuperFastCache] Failed to cache ${metricId} trend:`, error);
      }
    }
  }

  // Очистка старых записей кеша
  cleanup(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp > this.CACHE_TTL * 2) {
        delete this.cache[key];
      }
    });
  }
}

// Экспортируем singleton
export const superFastCache = new SuperFastCache();

// Периодическая очистка кеша
setInterval(() => {
  superFastCache.cleanup();
}, 10 * 60 * 1000); // Каждые 10 минут
