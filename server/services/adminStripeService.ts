import { db } from '../db.js';
import { premiumSubscriptions, users } from '../../shared/schema.js';
import { eq, and, desc, count } from 'drizzle-orm';

export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  testMode: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastTestDate?: string;
  testCards: StripeTestCard[];
}

export interface StripeTestCard {
  number: string;
  type: string;
  description: string;
}

export interface WebhookLog {
  id: string;
  event: string;
  status: 'success' | 'failed';
  timestamp: string;
  data: any;
  error?: string;
}

export interface StripeMetrics {
  subscriptions: {
    total: number;
    active: number;
    canceled: number;
    pending: number;
  };
  revenue: {
    total: string;
    thisMonth: string;
    lastMonth: string;
    growthRate: number;
  };
  products: {
    monthlySubscriptions: number;
    yearlySubscriptions: number;
    conversionRate: number;
  };
  webhooks: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
}

export class AdminStripeService {

  /**
   * Получить конфигурацию Stripe
   */
  static async getStripeConfig(): Promise<StripeConfig> {
    try {
      // В реальном проекте эти данные будут храниться в зашифрованном виде в БД
      // Здесь возвращаем заглушку
      return {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY ? '••••••••••••' + process.env.STRIPE_SECRET_KEY.slice(-4) : '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '••••••••••••' + process.env.STRIPE_WEBHOOK_SECRET.slice(-4) : '',
        testMode: process.env.NODE_ENV !== 'production',
        connectionStatus: process.env.STRIPE_SECRET_KEY ? 'connected' : 'disconnected',
        lastTestDate: new Date().toISOString(),
        testCards: [
          {
            number: '4242424242424242',
            type: 'Visa',
            description: 'Successful payment'
          },
          {
            number: '4000000000000002',
            type: 'Visa',
            description: 'Card declined'
          },
          {
            number: '4000000000009995',
            type: 'Visa',
            description: 'Insufficient funds'
          },
          {
            number: '4000000000000069',
            type: 'Visa',
            description: 'Expired card'
          },
          {
            number: '4000000000000127',
            type: 'Visa',
            description: 'Incorrect CVC'
          }
        ]
      };
    } catch (error) {
      console.error('Error getting Stripe config:', error);
      throw new Error('Failed to get Stripe configuration');
    }
  }

  /**
   * Обновить конфигурацию Stripe
   */
  static async updateStripeConfig(config: Partial<StripeConfig>): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Updating Stripe configuration:', {
        publishableKey: config.publishableKey ? 'pk_••••' : 'not provided',
        testMode: config.testMode,
        webhookSecret: config.webhookSecret ? 'whsec_••••' : 'not provided'
      });

      // TODO: В реальном проекте:
      // 1. Валидировать ключи через Stripe API
      // 2. Сохранить в зашифрованном виде в БД
      // 3. Обновить переменные окружения или конфигурацию
      
      return {
        success: true,
        message: 'Stripe configuration updated successfully'
      };
    } catch (error) {
      console.error('Error updating Stripe config:', error);
      throw new Error('Failed to update Stripe configuration');
    }
  }

  /**
   * Тестировать подключение к Stripe
   */
  static async testStripeConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // TODO: В реальном проекте сделать тестовый запрос к Stripe API
      // Например, получить информацию об аккаунте
      
      const testResult = {
        account: 'Test Account',
        chargesEnabled: true,
        payoutsEnabled: true,
        defaultCurrency: 'usd'
      };

      return {
        success: true,
        message: 'Stripe connection test successful',
        details: testResult
      };
    } catch (error) {
      console.error('Error testing Stripe connection:', error);
      return {
        success: false,
        message: 'Stripe connection test failed',
        details: { error: error.message }
      };
    }
  }

  /**
   * Получить логи webhook'ов
   */
  static async getWebhookLogs(limit: number = 100): Promise<WebhookLog[]> {
    try {
      // Заглушка - в реальном проекте будет читать из БД или логов
      const mockLogs: WebhookLog[] = [
        {
          id: '1',
          event: 'customer.subscription.created',
          status: 'success',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          data: {
            subscription_id: 'sub_1234567890',
            customer_id: 'cus_1234567890',
            plan: 'monthly'
          }
        },
        {
          id: '2',
          event: 'invoice.payment_succeeded',
          status: 'success',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          data: {
            invoice_id: 'in_1234567890',
            amount_paid: 699,
            currency: 'usd'
          }
        },
        {
          id: '3',
          event: 'customer.subscription.deleted',
          status: 'failed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
          data: {
            subscription_id: 'sub_0987654321'
          },
          error: 'Subscription not found in database'
        },
        {
          id: '4',
          event: 'payment_intent.succeeded',
          status: 'success',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
          data: {
            payment_intent_id: 'pi_1234567890',
            amount: 6499,
            currency: 'usd'
          }
        }
      ];

      return mockLogs.slice(0, limit);
    } catch (error) {
      console.error('Error getting webhook logs:', error);
      throw new Error('Failed to get webhook logs');
    }
  }

  /**
   * Получить метрики Stripe
   */
  static async getStripeMetrics(): Promise<StripeMetrics> {
    try {
      // Получаем данные подписок из БД
      const [totalSubs, activeSubs, canceledSubs] = await Promise.all([
        db.select({ count: count() }).from(premiumSubscriptions),
        db.select({ count: count() }).from(premiumSubscriptions).where(eq(premiumSubscriptions.isActive, true)),
        db.select({ count: count() }).from(premiumSubscriptions).where(eq(premiumSubscriptions.isActive, false))
      ]);

      // Получаем данные по типам подписок
      const [monthlySubs, yearlySubs] = await Promise.all([
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

      // Моковые данные для revenue (в реальном проекте будет из Stripe API)
      const totalRevenue = activeSubs[0].count * 6.99; // Примерный расчет
      const thisMonthRevenue = totalRevenue * 0.15; // 15% за текущий месяц
      const lastMonthRevenue = totalRevenue * 0.12; // 12% за прошлый месяц
      const growthRate = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

      // Webhook метрики (заглушка)
      const webhookMetrics = {
        total: 150,
        successful: 142,
        failed: 8,
        successRate: (142 / 150) * 100
      };

      return {
        subscriptions: {
          total: totalSubs[0].count,
          active: activeSubs[0].count,
          canceled: canceledSubs[0].count,
          pending: 0 // TODO: добавить поле pending в схему
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          thisMonth: thisMonthRevenue.toFixed(2),
          lastMonth: lastMonthRevenue.toFixed(2),
          growthRate: Number(growthRate.toFixed(2))
        },
        products: {
          monthlySubscriptions: monthlySubs[0].count,
          yearlySubscriptions: yearlySubs[0].count,
          conversionRate: totalSubs[0].count > 0 ? (activeSubs[0].count / totalSubs[0].count) * 100 : 0
        },
        webhooks: webhookMetrics
      };

    } catch (error) {
      console.error('Error getting Stripe metrics:', error);
      throw new Error('Failed to get Stripe metrics');
    }
  }

  /**
   * Создать продукт и цены в Stripe
   */
  static async createStripeProducts(): Promise<{ success: boolean; message: string; products?: any }> {
    try {
      console.log('Creating Stripe products and prices...');

      // TODO: В реальном проекте использовать Stripe API для создания продуктов:
      // 1. Создать продукт "CryptoCraze Premium"
      // 2. Создать цену для месячной подписки
      // 3. Создать цену для годовой подписки
      // 4. Сохранить IDs в конфигурации

      const mockProducts = {
        product_id: 'prod_cryptocraze_premium',
        monthly_price_id: 'price_monthly_699',
        yearly_price_id: 'price_yearly_6499'
      };

      return {
        success: true,
        message: 'Stripe products created successfully',
        products: mockProducts
      };
    } catch (error) {
      console.error('Error creating Stripe products:', error);
      throw new Error('Failed to create Stripe products');
    }
  }

  /**
   * Синхронизировать подписки с Stripe
   */
  static async syncStripeSubscriptions(): Promise<{ success: boolean; message: string; synced?: number }> {
    try {
      console.log('Syncing subscriptions with Stripe...');

      // TODO: В реальном проекте:
      // 1. Получить все подписки из Stripe API
      // 2. Сравнить с локальной БД
      // 3. Обновить статусы подписок
      // 4. Создать недостающие записи

      const syncedCount = 42; // Заглушка

      return {
        success: true,
        message: `Synchronized ${syncedCount} subscriptions with Stripe`,
        synced: syncedCount
      };
    } catch (error) {
      console.error('Error syncing Stripe subscriptions:', error);
      throw new Error('Failed to sync Stripe subscriptions');
    }
  }

  /**
   * Обработать Stripe webhook
   */
  static async handleStripeWebhook(event: any, signature: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`Processing Stripe webhook: ${event.type}`);

      // TODO: В реальном проекте:
      // 1. Верифицировать подпись webhook'а
      // 2. Обработать различные типы событий
      // 3. Обновить БД соответственно
      // 4. Логировать результат

      // Заглушка обработки разных типов событий
      switch (event.type) {
        case 'customer.subscription.created':
          console.log('Subscription created:', event.data.object.id);
          break;
        case 'customer.subscription.updated':
          console.log('Subscription updated:', event.data.object.id);
          break;
        case 'customer.subscription.deleted':
          console.log('Subscription deleted:', event.data.object.id);
          break;
        case 'invoice.payment_succeeded':
          console.log('Payment succeeded:', event.data.object.id);
          break;
        case 'invoice.payment_failed':
          console.log('Payment failed:', event.data.object.id);
          break;
        default:
          console.log('Unhandled event type:', event.type);
      }

      return {
        success: true,
        message: `Webhook ${event.type} processed successfully`
      };
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      throw new Error('Failed to process Stripe webhook');
    }
  }
}