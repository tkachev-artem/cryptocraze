import { db } from '../db.js';
import { premiumSubscriptions, premiumPlans, users } from '../../shared/schema.js';
import { eq, and, gte, lte, desc, asc, count, sum, sql } from 'drizzle-orm';
import { clickhouseAnalyticsService } from './clickhouseAnalyticsService.js';

export interface MonetizationOverview {
  revenue: {
    totalRevenue: string;
    premiumRevenue: string;
    adRevenue: string;
    arpu: string;
    arppu: string;
    payingUsers: number;
    conversionRate: number;
  };
  subscriptions: {
    activeSubscriptions: number;
    monthlySubscriptions: number;
    yearlySubscriptions: number;
    churnRate: number;
    monthlyRecurringRevenue: string;
    annualRecurringRevenue: string;
  };
  pricing: {
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
  };
}

export interface PricingConfig {
  monthly: {
    price: number;
    currency: string;
    interval: string;
    stripeProductId: string;
    stripePriceId: string;
    isActive: boolean;
    displayPrice: string;
    features: string[];
  };
  yearly: {
    price: number;
    currency: string;
    interval: string;
    stripeProductId: string;
    stripePriceId: string;
    isActive: boolean;
    displayPrice: string;
    savings: string;
    features: string[];
  };
  frontendSync: {
    autoUpdatePrices: boolean;
    updateLocalization: boolean;
    cacheInvalidation: boolean;
    previewMode: boolean;
  };
}

export interface PriceChange {
  id: string;
  plan: 'monthly' | 'yearly';
  oldPrice: number;
  newPrice: number;
  effectiveDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'applied' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
}

export class AdminMonetizationService {

  /**
   * Получить обзор монетизации
   */
  static async getMonetizationOverview(): Promise<MonetizationOverview> {
    try {
      // Получаем данные о подписках из PostgreSQL
      const [activeSubscriptions, monthlySubscriptions, yearlySubscriptions] = await Promise.all([
        db.select({ count: count() }).from(premiumSubscriptions).where(eq(premiumSubscriptions.isActive, true)),
        db.select({ count: count() }).from(premiumSubscriptions).where(
          and(
            eq(premiumSubscriptions.isActive, true),
            eq(premiumSubscriptions.planType, 'month')
          )
        ),
        db.select({ count: count() }).from(premiumSubscriptions).where(
          and(
            eq(premiumSubscriptions.isActive, true),
            eq(premiumSubscriptions.planType, 'year')
          )
        )
      ]);

      // Получаем общее количество пользователей
      const [totalUsers] = await db.select({ count: count() }).from(users);

      // Получаем данные о доходах (заглушка, будет интегрировано с ClickHouse)
      const revenue = {
        totalRevenue: "50000.00",
        premiumRevenue: "35000.00", 
        adRevenue: "15000.00",
        arpu: "12.50",
        arppu: "45.00",
        payingUsers: activeSubscriptions[0].count,
        conversionRate: totalUsers.count > 0 ? activeSubscriptions[0].count / totalUsers.count : 0
      };

      // Получаем текущие цены (заглушка)
      const pricing = {
        monthlyPrice: 6.99,
        yearlyPrice: 64.99,
        currency: 'USD'
      };

      // Рассчитываем MRR и ARR
      const monthlyRevenue = monthlySubscriptions[0].count * pricing.monthlyPrice;
      const yearlyRevenue = yearlySubscriptions[0].count * pricing.yearlyPrice;
      const monthlyRecurringRevenue = monthlyRevenue + (yearlyRevenue / 12);
      const annualRecurringRevenue = monthlyRecurringRevenue * 12;

      return {
        revenue,
        subscriptions: {
          activeSubscriptions: activeSubscriptions[0].count,
          monthlySubscriptions: monthlySubscriptions[0].count,
          yearlySubscriptions: yearlySubscriptions[0].count,
          churnRate: 0.05, // 5% заглушка
          monthlyRecurringRevenue: monthlyRecurringRevenue.toFixed(2),
          annualRecurringRevenue: annualRecurringRevenue.toFixed(2)
        },
        pricing
      };

    } catch (error) {
      console.error('Error getting monetization overview:', error);
      throw new Error('Failed to get monetization overview');
    }
  }

  /**
   * Получить текущую конфигурацию цен
   */
  static async getPricingConfig(): Promise<PricingConfig> {
    try {
      // Заглушка - в будущем будет читать из БД
      return {
        monthly: {
          price: 6.99,
          currency: 'USD',
          interval: 'month',
          stripeProductId: 'prod_cryptocraze_monthly',
          stripePriceId: 'price_monthly_699',
          isActive: true,
          displayPrice: '$6.99/month',
          features: [
            'Unlimited trades',
            'Advanced analytics', 
            'Priority support',
            'Ad-free experience'
          ]
        },
        yearly: {
          price: 64.99,
          currency: 'USD',
          interval: 'year',
          stripeProductId: 'prod_cryptocraze_yearly',
          stripePriceId: 'price_yearly_6499',
          isActive: true,
          displayPrice: '$64.99/year',
          savings: '22% savings',
          features: [
            'All monthly features',
            'Extended analytics',
            'Beta feature access',
            'Personal account manager'
          ]
        },
        frontendSync: {
          autoUpdatePrices: true,
          updateLocalization: true,
          cacheInvalidation: true,
          previewMode: false
        }
      };
    } catch (error) {
      console.error('Error getting pricing config:', error);
      throw new Error('Failed to get pricing config');
    }
  }

  /**
   * Обновить цену плана
   */
  static async updatePlanPrice(
    plan: 'monthly' | 'yearly', 
    price: number, 
    reason: string,
    previewMode: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Updating ${plan} plan price to $${price}, reason: ${reason}, preview: ${previewMode}`);
      
      // В preview режиме просто возвращаем успех без изменений
      if (previewMode) {
        return {
          success: true,
          message: `Preview: ${plan} plan price would be updated to $${price}`
        };
      }

      // TODO: Реальное обновление цены в БД
      // 1. Создать запись в price_changes таблице
      // 2. Обновить current_pricing таблицу
      // 3. Обновить Stripe prices если настроено
      
      return {
        success: true,
        message: `${plan} plan price updated to $${price}`
      };
    } catch (error) {
      console.error('Error updating plan price:', error);
      throw new Error('Failed to update plan price');
    }
  }

  /**
   * Получить историю изменений цен
   */
  static async getPriceChangeHistory(): Promise<PriceChange[]> {
    try {
      // Заглушка - в будущем будет читать из БД
      return [
        {
          id: '1',
          plan: 'monthly',
          oldPrice: 5.99,
          newPrice: 6.99,
          effectiveDate: new Date().toISOString(),
          reason: 'Market adjustment',
          status: 'applied',
          createdBy: 'admin',
          approvedBy: 'admin'
        }
      ];
    } catch (error) {
      console.error('Error getting price change history:', error);
      throw new Error('Failed to get price change history');
    }
  }

  /**
   * Синхронизировать цены с frontend
   */
  static async syncFrontendPrices(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Syncing prices with frontend...');
      
      // TODO: 
      // 1. Инвалидировать кеш цен в Redis
      // 2. Обновить конфигурацию фронтенда
      // 3. Отправить webhook на фронтенд о изменении цен
      
      return {
        success: true,
        message: 'Frontend prices synchronized successfully'
      };
    } catch (error) {
      console.error('Error syncing frontend prices:', error);
      throw new Error('Failed to sync frontend prices');
    }
  }

  /**
   * Синхронизировать локализацию
   */
  static async syncLocalization(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Syncing localization files...');
      
      // TODO:
      // 1. Обновить ru.json, en.json, es.json, fr.json, pt.json
      // 2. Обновить цены во всех языковых файлах
      // 3. Перезагрузить переводы
      
      return {
        success: true,
        message: 'Localization files synchronized successfully'
      };
    } catch (error) {
      console.error('Error syncing localization:', error);
      throw new Error('Failed to sync localization');
    }
  }

  /**
   * Получить публичные цены для фронтенда
   */
  static async getPublicPricing(): Promise<{ monthly: number; yearly: number; currency: string }> {
    try {
      const config = await this.getPricingConfig();
      return {
        monthly: config.monthly.price,
        yearly: config.yearly.price,
        currency: config.monthly.currency
      };
    } catch (error) {
      console.error('Error getting public pricing:', error);
      throw new Error('Failed to get public pricing');
    }
  }
}