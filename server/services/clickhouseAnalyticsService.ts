import { getClickHouseClient } from './clickhouseClient.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * ClickHouse Analytics Service
 * Высокопроизводительный сервис для аналитики admin dashboard
 */
export class ClickHouseAnalyticsService {
  private client = getClickHouseClient();

  /**
   * Инициализация схемы ClickHouse
   */
  async initializeSchema(): Promise<void> {
    try {
      console.log('[ClickHouse] Initializing schema...');
      
      // Создание базы данных
      await this.client.exec({
        query: 'CREATE DATABASE IF NOT EXISTS cryptocraze_analytics'
      });

      // Переключение на базу данных
      await this.client.exec({
        query: 'USE cryptocraze_analytics'
      });

      // Создание основных таблиц
      await this.createTables();
      
      console.log('[ClickHouse] Schema initialized successfully');
    } catch (error) {
      console.error('[ClickHouse] Schema initialization failed:', error);
      throw error;
    }
  }

  /**
   * Создание таблиц
   */
  private async createTables(): Promise<void> {
    const tables = [
      // Таблица событий пользователей
      `CREATE TABLE IF NOT EXISTS user_events (
        event_id String,
        user_id UInt64,
        event_type LowCardinality(String),
        event_data String,
        session_id String,
        timestamp DateTime64(3),
        date Date MATERIALIZED toDate(timestamp),
        hour UInt8 MATERIALIZED toHour(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, event_type, user_id, timestamp)
      TTL date + INTERVAL 2 YEAR`,

      // Аналитическая таблица сделок
      `CREATE TABLE IF NOT EXISTS deals_analytics (
        deal_id UInt64,
        user_id UInt64,
        symbol LowCardinality(String),
        direction LowCardinality(String),
        amount Decimal64(8),
        leverage UInt8,
        multiplier Decimal32(2),
        entry_price Decimal64(8),
        current_price Decimal64(8),
        pnl Decimal64(8),
        status LowCardinality(String),
        take_profit Nullable(Decimal64(8)),
        stop_loss Nullable(Decimal64(8)),
        commission Decimal64(8),
        created_at DateTime64(3),
        updated_at DateTime64(3),
        closed_at Nullable(DateTime64(3)),
        date Date MATERIALIZED toDate(created_at),
        is_profitable UInt8 MATERIALIZED if(pnl > 0, 1, 0)
      ) ENGINE = ReplacingMergeTree(updated_at)
      PARTITION BY toYYYYMM(date)
      ORDER BY (deal_id, user_id)
      TTL date + INTERVAL 5 YEAR`,

      // Ежедневные метрики
      `CREATE TABLE IF NOT EXISTS daily_metrics (
        date Date,
        total_users UInt64,
        new_users UInt64,
        active_users UInt64,
        daily_active_users UInt64,
        weekly_active_users UInt64,
        monthly_active_users UInt64,
        total_trades UInt64,
        total_volume Decimal64(8),
        total_pnl Decimal64(8),
        avg_session_duration_seconds UInt64,
        total_sessions UInt64,
        premium_users UInt64,
        premium_revenue Decimal64(8),
        ad_revenue Decimal64(8),
        total_revenue Decimal64(8),
        arpu Decimal64(8),
        arppu Decimal64(8),
        conversion_rate Decimal32(4)
      ) ENGINE = ReplacingMergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY date
      TTL date + INTERVAL 5 YEAR`,

      // Таблица событий доходов  
      `CREATE TABLE IF NOT EXISTS revenue_events (
        event_id String,
        user_id UInt64,
        revenue_type LowCardinality(String),
        amount Decimal64(8),
        revenue Decimal64(8),
        currency LowCardinality(String),
        payment_method Nullable(String),
        subscription_id Nullable(String),
        timestamp DateTime64(3),
        date Date MATERIALIZED toDate(timestamp),
        month UInt32 MATERIALIZED toYYYYMM(date)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, user_id, revenue_type, timestamp)
      TTL date + INTERVAL 3 YEAR`,

      // Таблица рекламных событий
      `CREATE TABLE IF NOT EXISTS ad_events (
        event_id String,
        user_id UInt64,
        ad_type LowCardinality(String),
        event_type LowCardinality(String),
        reward_amount Nullable(Decimal64(8)),
        timestamp DateTime64(3),
        date Date MATERIALIZED toDate(timestamp),
        session_id String
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, user_id, ad_type, timestamp)
      TTL date + INTERVAL 1 YEAR`
    ];

    for (const table of tables) {
      await this.client.exec({ query: table });
    }

    // Создание индексов
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events (event_type) TYPE set(100) GRANULARITY 1',
      'CREATE INDEX IF NOT EXISTS idx_deals_status ON deals_analytics (status) TYPE set(10) GRANULARITY 1'
    ];

    for (const index of indexes) {
      try {
        await this.client.exec({ query: index });
      } catch (error) {
        // Игнорируем ошибки создания индексов если они уже существуют
        console.log('[ClickHouse] Index creation note:', (error as Error).message);
      }
    }
  }

  /**
   * Логирование события пользователя
   */
  async logUserEvent(
    userId: number,
    eventType: string,
    eventData: any = {},
    sessionId?: string
  ): Promise<void> {
    const eventRecord = {
      event_id: uuidv4(),
      user_id: userId,
      event_type: eventType,
      event_data: JSON.stringify(eventData),
      session_id: sessionId || uuidv4(),
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')  // 'YYYY-MM-DD HH:MM:SS' формат
    };
    
    console.log(`[ClickHouse Service] Inserting event: ${eventType}, user: ${userId}, timestamp: ${eventRecord.timestamp}`);
    
    try {
      console.log('[ClickHouse Service] Calling client.insert...');
      await this.client.insert({
        table: 'cryptocraze_analytics.user_events',
        values: [eventRecord],
        format: 'JSONEachRow'
      });
      console.log('[ClickHouse Service] ✅ Successfully inserted user event');
      
      // Специальная обработка событий просмотра рекламы
      if (eventType === 'ad_watch') {
        console.log('[ClickHouse Service] Processing ad_watch event for revenue tracking');
        const adData = typeof eventData === 'object' ? eventData : {};
        const revenue = adData.revenue || 0; // Для симуляции revenue = 0
        
        if (typeof revenue === 'number') {
          console.log(`[ClickHouse Service] Logging ad revenue: $${revenue} (simulation: ${adData.isSimulation})`);
          await this.logRevenueEvent(userId, 'ad', revenue, 'USD');
        }
      }
      
    } catch (error) {
      console.error('[ClickHouse Service] ❌ Failed to log user event:', error);
      console.error('[ClickHouse Service] ❌ Error details:', error?.message);
      console.error('[ClickHouse Service] ❌ Event record that failed:', JSON.stringify(eventRecord, null, 2));
      throw error; // Перебрасываем ошибку для отладки
    }
  }

  /**
   * Логирование revenue события
   */
  async logRevenueEvent(
    userId: number,
    revenueType: 'premium' | 'ad' | 'subscription' | 'purchase',
    amount: number,
    currency: string = 'USD',
    paymentMethod?: string,
    subscriptionId?: string
  ): Promise<void> {
    try {
      await this.client.insert({
        table: 'cryptocraze_analytics.revenue_events',
        values: [{
          event_id: uuidv4(),
          user_id: userId,
          revenue_type: revenueType,
          amount: amount,
          revenue: amount, // Предполагаем что уже в USD
          currency: currency,
          payment_method: paymentMethod || null,
          subscription_id: subscriptionId || null,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
        }],
        format: 'JSONEachRow'
      });
    } catch (error) {
      console.error('[ClickHouse] Failed to log revenue event:', error);
    }
  }

  /**
   * Синхронизация сделки с ClickHouse
   * ReplacingMergeTree автоматически заменит дубликаты по (deal_id, user_id)
   */
  async syncDeal(deal: any): Promise<void> {
    try {
      console.log(`[ClickHouse] Syncing deal ${deal.id}, openedAt: ${deal.openedAt}, createdAt: ${deal.createdAt}, closedAt: ${deal.closedAt}`);
      
      // Вставляем запись - ReplacingMergeTree автоматически заменит дубликаты
      await this.client.insert({
        table: 'deals_analytics',
        values: [{
          deal_id: deal.id,
          user_id: deal.userId,
          symbol: deal.symbol,
          direction: deal.direction,
          amount: parseFloat(deal.amount),
          leverage: deal.leverage || 1,
          multiplier: parseFloat(deal.multiplier || '1'),
          entry_price: parseFloat(deal.openPrice || deal.entryPrice || '0'),
          current_price: parseFloat(deal.closePrice || deal.currentPrice || deal.openPrice || '0'),
          pnl: parseFloat(deal.profit || deal.pnl || '0'),
          status: deal.status,
          take_profit: deal.takeProfit ? parseFloat(deal.takeProfit) : null,
          stop_loss: deal.stopLoss ? parseFloat(deal.stopLoss) : null,
          commission: parseFloat(deal.commission || '0'),
          created_at: new Date(deal.openedAt || deal.createdAt).toISOString().slice(0, 19).replace('T', ' '),
          updated_at: new Date(deal.updatedAt || Date.now()).toISOString().slice(0, 19).replace('T', ' '),
          closed_at: deal.closedAt ? new Date(deal.closedAt).toISOString().slice(0, 19).replace('T', ' ') : null
        }],
        format: 'JSONEachRow'
      });
      
      console.log(`[ClickHouse] Successfully synced deal ${deal.id} with ReplacingMergeTree`);
    } catch (error) {
      console.error('[ClickHouse] Failed to sync deal:', error);
    }
  }

  /**
   * Получение обзорных метрик для dashboard
   */
  async getDashboardOverview(): Promise<any> {
    try {
      console.log('[ClickHouse] Getting dashboard overview...');
      
      const [
        userMetrics,
        tradingMetrics,
        revenueMetrics,
        engagementMetrics
      ] = await Promise.all([
        this.getUserMetrics(),
        this.getTradingMetrics(), 
        this.getRevenueMetrics(),
        this.getEngagementMetrics()
      ]);

      // Получение расширенных рекламных метрик
      const adMetrics = await this.getAdvancedAdMetrics();

      return {
        users: userMetrics,
        trading: tradingMetrics,
        revenue: revenueMetrics,
        engagement: engagementMetrics,
        adMetrics: adMetrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('[ClickHouse] Dashboard overview error:', error);
      throw error;
    }
  }

  /**
   * Получение метрик пользователей с retention
   */
  private async getUserMetrics(): Promise<any> {
    try {
      // Основные пользовательские метрики
      const userResult = await this.client.query({
        query: `
          SELECT 
            uniq(user_id) as total_users,
            uniqIf(user_id, date = today()) as new_users_today,
            uniqIf(user_id, date >= today() - INTERVAL 1 DAY) as daily_active_users,
            uniqIf(user_id, date >= today() - INTERVAL 7 DAY) as weekly_active_users,
            uniqIf(user_id, date >= today() - INTERVAL 30 DAY) as monthly_active_users
          FROM user_events
          WHERE date >= today() - INTERVAL 30 DAY
        `,
        format: 'JSONEachRow'
      });

      // Расчет retention метрик
      const retentionResult = await this.client.query({
        query: `
          WITH 
            installs AS (
              SELECT DISTINCT user_id, min(date) as install_date
              FROM user_events
              WHERE event_type = 'app_install' OR event_type = 'user_register'
              GROUP BY user_id
              HAVING install_date >= today() - INTERVAL 30 DAY
            ),
            day1_retention AS (
              SELECT DISTINCT i.user_id
              FROM installs i
              JOIN user_events e ON i.user_id = e.user_id
              WHERE e.date = i.install_date + INTERVAL 1 DAY
            ),
            day3_retention AS (
              SELECT DISTINCT i.user_id
              FROM installs i
              JOIN user_events e ON i.user_id = e.user_id
              WHERE e.date >= i.install_date + INTERVAL 3 DAY
                AND e.date < i.install_date + INTERVAL 4 DAY
            ),
            day7_retention AS (
              SELECT DISTINCT i.user_id
              FROM installs i
              JOIN user_events e ON i.user_id = e.user_id
              WHERE e.date >= i.install_date + INTERVAL 7 DAY
                AND e.date < i.install_date + INTERVAL 8 DAY
            ),
            day30_retention AS (
              SELECT DISTINCT i.user_id
              FROM installs i
              JOIN user_events e ON i.user_id = e.user_id
              WHERE e.date >= i.install_date + INTERVAL 30 DAY
                AND e.date < i.install_date + INTERVAL 31 DAY
            )
          SELECT 
            count(DISTINCT installs.user_id) as total_new_users,
            count(DISTINCT day1_retention.user_id) as day1_retained,
            count(DISTINCT day3_retention.user_id) as day3_retained,
            count(DISTINCT day7_retention.user_id) as day7_retained,
            count(DISTINCT day30_retention.user_id) as day30_retained
          FROM installs
          LEFT JOIN day1_retention ON installs.user_id = day1_retention.user_id
          LEFT JOIN day3_retention ON installs.user_id = day3_retention.user_id
          LEFT JOIN day7_retention ON installs.user_id = day7_retention.user_id
          LEFT JOIN day30_retention ON installs.user_id = day30_retention.user_id
        `,
        format: 'JSONEachRow'
      });

      const userData = (await userResult.json<any>())[0] || {};
      const retentionData = (await retentionResult.json<any>())[0] || {};

      const totalNewUsers = parseInt(retentionData.total_new_users || '0');
      const retention_d1 = totalNewUsers > 0 ? parseInt(retentionData.day1_retained || '0') / totalNewUsers : 0;
      const retention_d3 = totalNewUsers > 0 ? parseInt(retentionData.day3_retained || '0') / totalNewUsers : 0;
      const retention_d7 = totalNewUsers > 0 ? parseInt(retentionData.day7_retained || '0') / totalNewUsers : 0;
      const retention_d30 = totalNewUsers > 0 ? parseInt(retentionData.day30_retained || '0') / totalNewUsers : 0;

      return {
        total_users: parseInt(userData.total_users || '0'),
        new_users_today: parseInt(userData.new_users_today || '0'),
        daily_active_users: parseInt(userData.daily_active_users || '0'),
        weekly_active_users: parseInt(userData.weekly_active_users || '0'),
        monthly_active_users: parseInt(userData.monthly_active_users || '0'),
        retention_d1,
        retention_d3,
        retention_d7,
        retention_d30
      };
    } catch (error) {
      console.log('[ClickHouse] No user data found, using fallback');
      return {
        total_users: 0,
        new_users_today: 0,
        daily_active_users: 0,
        weekly_active_users: 0,
        monthly_active_users: 0,
        retention_d1: 0,
        retention_d3: 0,
        retention_d7: 0,
        retention_d30: 0
      };
    }
  }

  /**
   * Получение торговых метрик
   */
  private async getTradingMetrics(): Promise<any> {
    const result = await this.client.query({
      query: `
        SELECT 
          count() as total_trades,
          countIf(status = 'open') as active_deals,
          countIf(status = 'closed') as closed_trades,
          countIf(status = 'closed' AND is_profitable = 1) as profitable_trades,
          sum(amount) as total_volume,
          sum(pnl) as total_pnl,
          avg(pnl) as avg_pnl,
          uniq(user_id) as trading_users
        FROM deals_analytics
        WHERE date >= today() - INTERVAL 30 DAY
      `,
      format: 'JSONEachRow'
    });

    const data = await result.json<any>();
    const metrics = data[0] || {};
    
    return {
      totalTrades: parseInt(metrics.total_trades || '0'),
      activeDeals: parseInt(metrics.active_deals || '0'),
      closedTrades: parseInt(metrics.closed_trades || '0'),
      profitableTrades: parseInt(metrics.profitable_trades || '0'),
      totalVolume: parseFloat(metrics.total_volume || '0'),
      totalPnl: parseFloat(metrics.total_pnl || '0'),
      avgPnl: parseFloat(metrics.avg_pnl || '0'),
      tradingUsers: parseInt(metrics.trading_users || '0'),
      successRate: metrics.closed_trades > 0 ? 
        (parseFloat(metrics.profitable_trades || '0') / parseFloat(metrics.closed_trades || '1') * 100).toFixed(2) : '0'
    };
  }

  /**
   * Получение метрик доходов
   */
  private async getRevenueMetrics(): Promise<any> {
    try {
      // Пытаемся получить данные из ClickHouse
      const revenueResult = await this.client.query({
        query: `
          SELECT 
            sum(revenue) as total_revenue,
            sumIf(revenue, revenue_type = 'premium') as premium_revenue,
            sumIf(revenue, revenue_type = 'ad') as ad_revenue,
            count(DISTINCT user_id) as paying_users
          FROM revenue_events
          WHERE date >= today() - INTERVAL 30 DAY
        `,
        format: 'JSONEachRow'
      });
      
      const data = await revenueResult.json<any>();
      const revenue = data[0] || {};
      
      // Вычисляем ARPU и ARPPU
      const totalUsers = await this.getUsersCount();
      const arpu = totalUsers > 0 ? parseFloat(revenue.total_revenue || '0') / totalUsers : 0;
      const arppu = revenue.paying_users > 0 ? parseFloat(revenue.total_revenue || '0') / revenue.paying_users : 0;
      const conversionRate = totalUsers > 0 ? revenue.paying_users / totalUsers : 0;
      
      return {
        totalRevenue: (parseFloat(revenue.total_revenue || '0')).toFixed(2),
        premiumRevenue: (parseFloat(revenue.premium_revenue || '0')).toFixed(2),
        adRevenue: (parseFloat(revenue.ad_revenue || '0')).toFixed(2),
        arpu: arpu.toFixed(2),
        arppu: arppu.toFixed(2),
        payingUsers: parseInt(revenue.paying_users || '0'),
        conversionRate: parseFloat(conversionRate.toFixed(4))
      };
      
    } catch (error) {
      console.log('[ClickHouse] No revenue data found, returning zeros');
      return {
        totalRevenue: '0.00',
        premiumRevenue: '0.00', 
        adRevenue: '0.00',
        arpu: '0.00',
        arppu: '0.00',
        payingUsers: 0,
        conversionRate: 0
      };
    }
  }
  
  private async getUsersCount(): Promise<number> {
    try {
      const result = await this.client.query({
        query: 'SELECT count(DISTINCT user_id) as total FROM user_events',
        format: 'JSONEachRow'
      });
      const data = await result.json<any>();
      return parseInt(data[0]?.total || '0');
    } catch {
      return 0;
    }
  }

  /**
   * Получение метрик вовлеченности с дополнительными метриками
   */
  private async getEngagementMetrics(): Promise<any> {
    // Основные метрики вовлеченности
    const mainResult = await this.client.query({
      query: `
        SELECT 
          count() as total_events,
          uniq(user_id) as active_users,
          uniq(session_id) as total_sessions,
          countIf(event_type = 'login') as logins,
          countIf(event_type = 'trade_open') as trades_opened,
          countIf(event_type = 'ad_watch') as ads_watched,
          countIf(event_type = 'screen_view') as screens_opened
        FROM user_events
        WHERE date >= today() - INTERVAL 7 DAY
      `,
      format: 'JSONEachRow'
    });

    // Расчет среднего времени сессии
    const sessionDurationResult = await this.client.query({
      query: `
        WITH session_durations AS (
          SELECT 
            session_id,
            max(timestamp) - min(timestamp) as duration_seconds
          FROM user_events
          WHERE date >= today() - INTERVAL 7 DAY
            AND session_id != ''
          GROUP BY session_id
          HAVING duration_seconds > 0
        )
        SELECT 
          avg(duration_seconds) as avg_session_duration
        FROM session_durations
      `,
      format: 'JSONEachRow'
    });

    // Метрики туториала
    const tutorialResult = await this.client.query({
      query: `
        SELECT 
          countIf(event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = 'start') as tutorial_starts,
          countIf(event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = 'complete') as tutorial_completions,
          countIf(event_type = 'tutorial_progress' AND JSONExtractString(event_data, 'action') = 'skip') as tutorial_skips
        FROM user_events
        WHERE date >= today() - INTERVAL 7 DAY
      `,
      format: 'JSONEachRow'
    });

    const mainData = (await mainResult.json<any>())[0] || {};
    const sessionData = (await sessionDurationResult.json<any>())[0] || {};
    const tutorialData = (await tutorialResult.json<any>())[0] || {};
    
    const tutorialStarts = parseInt(tutorialData.tutorial_starts || '0');
    const tutorialCompletions = parseInt(tutorialData.tutorial_completions || '0');
    const tutorialSkips = parseInt(tutorialData.tutorial_skips || '0');
    
    return {
      totalEvents: parseInt(mainData.total_events || '0'),
      activeUsers: parseInt(mainData.active_users || '0'),
      totalSessions: parseInt(mainData.total_sessions || '0'),
      logins: parseInt(mainData.logins || '0'),
      tradesOpened: parseInt(mainData.trades_opened || '0'),
      adsWatched: parseInt(mainData.ads_watched || '0'),
      screensOpened: parseInt(mainData.screens_opened || '0'),
      avgSessionsPerUser: mainData.active_users > 0 ? 
        (parseFloat(mainData.total_sessions || '0') / parseFloat(mainData.active_users || '1')).toFixed(2) : '0',
      avgSessionDuration: parseFloat(sessionData.avg_session_duration || '0'),
      tutorialCompletionRate: tutorialStarts > 0 ? tutorialCompletions / tutorialStarts : 0,
      tutorialSkipRate: tutorialStarts > 0 ? tutorialSkips / tutorialStarts : 0
    };
  }

  /**
   * Получение расширенных рекламных метрик
   */
  private async getAdvancedAdMetrics(): Promise<any> {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            countIf(event_type = 'ad_watch') as total_impressions,
            countIf(event_type = 'ad_click') as total_clicks,
            countIf(event_type = 'app_install') as total_installs,
            countIf(event_type = 'ad_engagement') as total_engagements
          FROM user_events
          WHERE date >= today() - INTERVAL 7 DAY
        `,
        format: 'JSONEachRow'
      });

      const data = (await result.json<any>())[0] || {};
      
      const totalImpressions = parseInt(data.total_impressions || '0');
      const totalClicks = parseInt(data.total_clicks || '0'); 
      const totalInstalls = parseInt(data.total_installs || '0');
      const totalEngagements = parseInt(data.total_engagements || '0');
      
      return {
        totalImpressions,
        totalClicks,
        totalInstalls,
        avgCTR: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        clickToInstallRate: totalClicks > 0 ? totalInstalls / totalClicks : 0,
        adEngagementRate: totalImpressions > 0 ? totalEngagements / totalImpressions : 0
      };
    } catch (error) {
      console.log('[ClickHouse] No ad metrics data found, using fallback');
      return {
        totalImpressions: 0,
        totalClicks: 0,
        totalInstalls: 0,
        avgCTR: 0,
        clickToInstallRate: 0,
        adEngagementRate: 0
      };
    }
  }

  /**
   * Получение временных рядов для графиков
   */
  async getTimeSeriesData(metric: string, days: number = 7): Promise<any[]> {
    try {
      let query = '';
      
      switch (metric) {
        case 'users':
          query = `
            SELECT 
              date,
              uniq(user_id) as value
            FROM user_events
            WHERE date >= today() - INTERVAL ${days} DAY
            GROUP BY date
            ORDER BY date
          `;
          break;
          
        case 'trades':
          query = `
            SELECT 
              date,
              count() as value
            FROM deals_analytics
            WHERE date >= today() - INTERVAL ${days} DAY
            GROUP BY date
            ORDER BY date
          `;
          break;
          
        case 'volume':
          query = `
            SELECT 
              date,
              sum(amount) as value
            FROM deals_analytics
            WHERE date >= today() - INTERVAL ${days} DAY
            GROUP BY date
            ORDER BY date
          `;
          break;
          
        default:
          return [];
      }

      const result = await this.client.query({
        query,
        format: 'JSONEachRow'
      });

      return await result.json();
    } catch (error) {
      console.error(`[ClickHouse] Time series error for ${metric}:`, error);
      return [];
    }
  }

  /**
   * Получение статистики по символам
   */
  async getSymbolStats(days: number = 7): Promise<any[]> {
    try {
      const result = await this.client.query({
        query: `
          SELECT 
            symbol,
            count() as trades_count,
            sum(amount) as total_volume,
            sum(pnl) as total_pnl,
            countIf(is_profitable = 1) as profitable_trades,
            uniq(user_id) as unique_traders
          FROM deals_analytics
          WHERE date >= today() - INTERVAL ${days} DAY
          GROUP BY symbol
          ORDER BY total_volume DESC
          LIMIT 10
        `,
        format: 'JSONEachRow'
      });

      return await result.json();
    } catch (error) {
      console.error('[ClickHouse] Symbol stats error:', error);
      return [];
    }
  }

  /**
   * Очистка старых данных (для тестирования)
   */
  async cleanupTestData(): Promise<void> {
    try {
      await this.client.exec({
        query: 'TRUNCATE TABLE user_events'
      });
      await this.client.exec({
        query: 'TRUNCATE TABLE deals_analytics' 
      });
      console.log('[ClickHouse] Test data cleaned up');
    } catch (error) {
      console.error('[ClickHouse] Cleanup error:', error);
    }
  }

  /**
   * Проверка здоровья сервиса
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string; stats?: any }> {
    try {
      const result = await this.client.query({
        query: 'SELECT 1 as health_check',
        format: 'JSONEachRow'
      });
      
      await result.json();
      
      return {
        healthy: true,
        stats: {
          connected: true,
          lastCheck: new Date()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }
}

export const clickhouseAnalyticsService = new ClickHouseAnalyticsService();