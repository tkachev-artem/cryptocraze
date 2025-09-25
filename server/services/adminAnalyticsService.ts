import { db } from '../db.js';
import { sql } from 'drizzle-orm';

/**
 * Admin Analytics Service
 * Сервис для администраторской аналитики с использованием raw SQL запросов
 * для избежания проблем с Drizzle ORM schema кэшированием
 */
export class AdminAnalyticsService {
  
  /**
   * Получить обзор аналитики для админ панели
   */
  async getOverview() {
    try {
      console.log('[AdminAnalytics] Getting overview data...');

      // Получаем данные параллельно для лучшей производительности
      const [
        engagementResult,
        revenueResult,
        acquisitionResult,
        usersResult,
        dealsResult
      ] = await Promise.all([
        // Последние метрики вовлеченности
        db.execute(sql`
          SELECT 
            daily_active_users,
            weekly_active_users,
            monthly_active_users,
            avg_session_duration,
            avg_screens_per_session,
            avg_trades_per_user,
            avg_virtual_balance_used,
            total_trades,
            total_volume,
            date
          FROM engagement_metrics 
          ORDER BY date DESC 
          LIMIT 1
        `),
        
        // Последние метрики доходов
        db.execute(sql`
          SELECT 
            total_revenue,
            premium_revenue,
            ad_revenue,
            total_paying_users,
            new_paying_users,
            arpu,
            arppu,
            conversion_rate,
            churn_rate,
            lifetime_value,
            date
          FROM revenue_metrics 
          ORDER BY date DESC 
          LIMIT 1
        `),
        
        // Последние метрики привлечения
        db.execute(sql`
          SELECT 
            total_installs,
            total_signups,
            total_first_trades,
            total_first_deposits,
            signup_rate,
            trade_open_rate,
            avg_time_to_first_trade,
            date
          FROM user_acquisition_metrics 
          ORDER BY date DESC 
          LIMIT 1
        `),
        
        // Общее количество пользователей
        db.execute(sql`SELECT COUNT(*) as count FROM users`),
        
        // Активные сделки
        db.execute(sql`SELECT COUNT(*) as count FROM deals WHERE status = 'open'`)
      ]);

      // Безопасное извлечение данных с проверкой наличия
      const engagement = engagementResult.rows?.[0] as any || null;
      const revenue = revenueResult.rows?.[0] as any || null;
      const acquisition = acquisitionResult.rows?.[0] as any || null;
      const totalUsers = Number((usersResult.rows?.[0] as any)?.count || 0);
      const activeDeals = Number((dealsResult.rows?.[0] as any)?.count || 0);

      console.log('[AdminAnalytics] Overview data retrieved successfully');

      return {
        engagement: engagement ? {
          dailyActiveUsers: Number(engagement.daily_active_users || 0),
          weeklyActiveUsers: Number(engagement.weekly_active_users || 0),
          monthlyActiveUsers: Number(engagement.monthly_active_users || 0),
          avgSessionDuration: Number(engagement.avg_session_duration || 0),
          avgScreensPerSession: Number(engagement.avg_screens_per_session || 0),
          avgTradesPerUser: Number(engagement.avg_trades_per_user || 0),
          avgVirtualBalanceUsed: String(engagement.avg_virtual_balance_used || '0'),
          totalTrades: Number(engagement.total_trades || 0),
          totalVolume: String(engagement.total_volume || '0'),
          date: engagement.date
        } : null,
        
        revenue: revenue ? {
          totalRevenue: String(revenue.total_revenue || '0'),
          premiumRevenue: String(revenue.premium_revenue || '0'),
          adRevenue: String(revenue.ad_revenue || '0'),
          totalPayingUsers: Number(revenue.total_paying_users || 0),
          activePayingUsers: Number(revenue.total_paying_users || 0), // Используем total_paying_users как fallback
          newPayingUsers: Number(revenue.new_paying_users || 0),
          arpu: String(revenue.arpu || '0'),
          arppu: String(revenue.arppu || '0'),
          conversionRate: Number(revenue.conversion_rate || 0),
          churnRate: Number(revenue.churn_rate || 0),
          lifetimeValue: String(revenue.lifetime_value || '0'),
          date: revenue.date
        } : null,
        
        acquisition: acquisition ? {
          totalInstalls: Number(acquisition.total_installs || 0),
          totalSignups: Number(acquisition.total_signups || 0),
          totalFirstTrades: Number(acquisition.total_first_trades || 0),
          totalFirstDeposits: Number(acquisition.total_first_deposits || 0),
          signupRate: Number(acquisition.signup_rate || 0),
          tradeOpenRate: Number(acquisition.trade_open_rate || 0),
          avgTimeToFirstTrade: Number(acquisition.avg_time_to_first_trade || 0),
          date: acquisition.date
        } : null,
        
        overview: {
          totalUsers,
          activeDeals
        }
      };

    } catch (error) {
      console.error('[AdminAnalytics] Error in getOverview:', error);
      
      // Возвращаем fallback данные вместо ошибки для стабильности фронтенда
      return {
        engagement: null,
        revenue: null,
        acquisition: null,
        overview: {
          totalUsers: 0,
          activeDeals: 0
        },
        error: 'Failed to retrieve analytics data'
      };
    }
  }

  /**
   * Получить данные о доходах за период
   */
  async getRevenueData(days: number = 30) {
    try {
      console.log(`[AdminAnalytics] Getting revenue data for ${days} days...`);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      const result = await db.execute(sql`
        SELECT 
          date,
          total_revenue,
          premium_revenue,
          ad_revenue,
          total_paying_users,
          new_paying_users,
          arpu,
          arppu,
          conversion_rate
        FROM revenue_metrics
        WHERE date >= ${startDate} AND date <= ${endDate}
        ORDER BY date ASC
      `);

      const data = result.rows?.map((row: any) => ({
        date: this.formatDate(row.date),
        totalRevenue: String(row.total_revenue || '0'),
        premiumRevenue: String(row.premium_revenue || '0'),
        adRevenue: String(row.ad_revenue || '0'),
        totalPayingUsers: Number(row.total_paying_users || 0),
        activePayingUsers: Number(row.total_paying_users || 0), // Используем total_paying_users как fallback
        newPayingUsers: Number(row.new_paying_users || 0),
        arpu: String(row.arpu || '0'),
        arppu: String(row.arppu || '0'),
        conversionRate: Number(row.conversion_rate || 0)
      })) || [];

      console.log(`[AdminAnalytics] Retrieved ${data.length} revenue records`);

      return { data };

    } catch (error) {
      console.error('[AdminAnalytics] Error in getRevenueData:', error);
      return { 
        data: [],
        error: 'Failed to retrieve revenue data'
      };
    }
  }

  /**
   * Получить данные о рекламе
   */
  async getAdsData(days: number = 30) {
    try {
      console.log(`[AdminAnalytics] Getting ads data for ${days} days...`);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Получаем детальные данные по дням
      const dailyResult = await db.execute(sql`
        SELECT 
          date,
          total_ad_spend,
          total_installs,
          total_conversions,
          total_revenue,
          cpi,
          cpa,
          roas,
          ad_impressions,
          ad_clicks,
          click_through_rate,
          conversion_rate,
          avg_revenue_per_install
        FROM ad_performance_metrics
        WHERE date >= ${startDate} AND date <= ${endDate}
        ORDER BY date DESC
      `);

      // Получаем сводную статистику
      const summaryResult = await db.execute(sql`
        SELECT 
          SUM(total_ad_spend) as total_ad_spend,
          SUM(total_installs) as total_installs,
          SUM(total_conversions) as total_conversions,
          SUM(total_revenue) as total_revenue,
          SUM(ad_impressions) as total_impressions,
          SUM(ad_clicks) as total_clicks,
          AVG(cpi) as avg_cpi,
          AVG(cpa) as avg_cpa,
          AVG(roas) as avg_roas,
          AVG(click_through_rate) as avg_ctr,
          AVG(conversion_rate) as avg_conversion_rate,
          COUNT(DISTINCT date) as days_count
        FROM ad_performance_metrics
        WHERE date >= ${startDate} AND date <= ${endDate}
      `);

      const data = dailyResult.rows?.map((row: any) => ({
        date: this.formatDate(row.date),
        totalAdSpend: String(row.total_ad_spend || '0'),
        totalInstalls: Number(row.total_installs || 0),
        totalConversions: Number(row.total_conversions || 0),
        totalRevenue: String(row.total_revenue || '0'),
        cpi: String(row.cpi || '0'),
        cpa: String(row.cpa || '0'),
        roas: Number(row.roas || 0),
        adImpressions: Number(row.ad_impressions || 0),
        adClicks: Number(row.ad_clicks || 0),
        clickThroughRate: Number(row.click_through_rate || 0),
        conversionRate: Number(row.conversion_rate || 0),
        avgRevenuePerInstall: String(row.avg_revenue_per_install || '0')
      })) || [];

      const summaryRow = summaryResult.rows?.[0] as any;
      const summary = summaryRow ? {
        totalAdSpend: String(summaryRow.total_ad_spend || '0'),
        totalInstalls: Number(summaryRow.total_installs || 0),
        totalConversions: Number(summaryRow.total_conversions || 0),
        totalRevenue: String(summaryRow.total_revenue || '0'),
        totalImpressions: Number(summaryRow.total_impressions || 0),
        totalClicks: Number(summaryRow.total_clicks || 0),
        avgCPI: String(summaryRow.avg_cpi || '0'),
        avgCPA: String(summaryRow.avg_cpa || '0'),
        avgROAS: Number(summaryRow.avg_roas || 0),
        avgCTR: Number(summaryRow.avg_ctr || 0),
        avgConversionRate: Number(summaryRow.avg_conversion_rate || 0),
        daysAnalyzed: Number(summaryRow.days_count || 0)
      } : {
        totalAdSpend: '0',
        totalInstalls: 0,
        totalConversions: 0,
        totalRevenue: '0',
        totalImpressions: 0,
        totalClicks: 0,
        avgCPI: '0',
        avgCPA: '0',
        avgROAS: 0,
        avgCTR: 0,
        avgConversionRate: 0,
        daysAnalyzed: 0
      };

      console.log(`[AdminAnalytics] Retrieved ${data.length} ad performance records`);

      return { 
        data,
        summary
      };

    } catch (error) {
      console.error('[AdminAnalytics] Error in getAdsData:', error);
      return { 
        data: [],
        summary: {
          totalImpressions: 0,
          totalCompletions: 0,
          totalRewards: 0,
          totalFraudAttempts: 0,
          totalWatchTime: 0,
          totalRewardAmount: '0',
          totalRevenue: '0',
          avgCompletionRate: 0,
          daysAnalyzed: 0,
          totalAdSpend: '0',
          totalInstalls: 0,
          avgCPI: '0',
          avgCPA: '0',
          roas: 0
        },
        error: 'Failed to retrieve ads data'
      };
    }
  }

  /**
   * Получить количество сделок по датам за период
   */
  async getTradesCountByDate(startDate: string, endDate: string, filteredUserIds: string[], tradeActivity?: string) {
    try {
      console.log(`[AdminAnalytics] Getting trades count by date for range: ${startDate} to ${endDate}. Users: ${filteredUserIds.length}, Activity: ${tradeActivity || 'all'}`);

      let whereConditions = [
        `deals.closed_at IS NOT NULL`,
        `deals.closed_at >= ('${startDate}'::timestamp AT TIME ZONE 'UTC')::timestamp without time zone`,
        `deals.closed_at <= ('${endDate}'::timestamp AT TIME ZONE 'UTC')::timestamp without time zone`,
        `deals.user_id IN (${filteredUserIds.map(id => `'${id}'`).join(',')})` // Применяем фильтр по user_id
      ];

      if (tradeActivity === 'profit') {
        whereConditions.push(`deals.profit > 0`);
      } else if (tradeActivity === 'loss') {
        whereConditions.push(`deals.profit < 0`);
      }

      const result = await db.execute(sql`
        SELECT 
          DATE(deals.closed_at AT TIME ZONE 'UTC') as date,
          COUNT(*) as count
        FROM deals
        WHERE ${sql.raw(whereConditions.join(' AND '))}
        GROUP BY DATE(deals.closed_at AT TIME ZONE 'UTC')
        ORDER BY DATE(deals.closed_at AT TIME ZONE 'UTC') ASC
      `);

      const data = result.rows?.map((row: any) => ({
        date: this.formatDate(row.date),
        count: this.safeNumber(row.count),
      })) || [];

      console.log(`[AdminAnalytics] Retrieved ${data.length} trade count records`);

      return { data };

    } catch (error) {
      console.error('[AdminAnalytics] Error in getTradesCountByDate:', error);
      return {
        data: [],
        error: 'Failed to retrieve trades count data'
      };
    }
  }

  /**
   * Форматирование даты для единообразия
   */
  private formatDate(date: any): string {
    if (!date) return '';
    
    try {
      const d = new Date(date);
      return d.toISOString().split('T')[0]; // YYYY-MM-DD формат
    } catch (error) {
      console.error('[AdminAnalytics] Error formatting date:', error);
      return '';
    }
  }

  /**
   * Безопасное преобразование значений в числа
   */
  private safeNumber(value: any, defaultValue: number = 0): number {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? defaultValue : num;
  }

  /**
   * Безопасное преобразование значений в строки для денежных сумм
   */
  private safeMoneyString(value: any, defaultValue: string = '0.00'): string {
    if (value === null || value === undefined) return defaultValue;
    
    try {
      const num = Number(value);
      if (isNaN(num) || !isFinite(num)) return defaultValue;
      
      return num.toFixed(2);
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * Debug: Проверить структуру таблиц
   */
  async debugTableStructure() {
    try {
      const tables = ['revenue_metrics', 'engagement_metrics', 'user_acquisition_metrics', 'ad_performance_metrics'];
      const results = {};

      for (const table of tables) {
        try {
          const result = await db.execute(sql`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = ${table}
            ORDER BY ordinal_position
          `);
          results[table] = result.rows;
        } catch (error) {
          results[table] = { error: error.message };
        }
      }

      return results;
    } catch (error) {
      console.error('[AdminAnalytics] Error in debugTableStructure:', error);
      return { error: error.message };
    }
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();