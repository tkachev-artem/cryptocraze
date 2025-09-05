import { Request, Response, NextFunction } from 'express';
import { clickhouseAnalyticsService } from '../services/clickhouseAnalyticsService.js';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    claims?: {
      sub?: string;
    };
  };
  session?: {
    userId?: string; // Google OAuth сессия  
    user?: {
      id: string;
    };
  };
}

/**
 * Middleware для автоматического логирования событий пользователей в ClickHouse
 */
export class AnalyticsLogger {
  
  /**
   * Преобразует строковый user ID в числовой hash для ClickHouse
   * Использует простую hash функцию для стабильного преобразования
   */
  private static stringToNumericId(strId: string): number {
    let hash = 0;
    for (let i = 0; i < strId.length; i++) {
      const char = strId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Делаем положительным и ограничиваем размером
    return Math.abs(hash) % Number.MAX_SAFE_INTEGER;
  }

  /**
   * Логирует событие пользователя
   */
  static async logUserEvent(
    userId: number,
    eventType: string,
    eventData: any = {},
    sessionId?: string
  ): Promise<void> {
    console.log(`[Analytics Logger] Received request: userId=${userId}, eventType=${eventType}, sessionId=${sessionId}`);
    console.log(`[Analytics Logger] Event data:`, JSON.stringify(eventData, null, 2));
    
    try {
      console.log(`[Analytics Logger] About to call clickhouseAnalyticsService.logUserEvent with userId: ${userId}`);
      const result = await clickhouseAnalyticsService.logUserEvent(
        userId,
        eventType,
        eventData,
        sessionId
      );
      console.log(`[Analytics] ✅ Successfully logged event: ${eventType} for user ${userId}, result:`, result);
    } catch (error) {
      console.error('[Analytics] ❌ Failed to log event:', error);
      console.error('[Analytics] ❌ Error type:', typeof error);
      console.error('[Analytics] ❌ Error message:', error?.message);
      console.error('[Analytics] ❌ Error stack:', error?.stack);
      throw error; // Перебрасываем ошибку для отладки
    }
  }

  /**
   * Middleware для логирования входов пользователей
   */
  static loginLogger() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const originalJson = res.json;
      
      res.json = function(body: any) {
        // Если успешная авторизация
        if (res.statusCode === 200 && body.user?.id) {
          setImmediate(async () => {
            // Используем hash функцию для безопасного преобразования строкового ID
            const userIdNumber = AnalyticsLogger.stringToNumericId(body.user.id);
            const sessionId = uuidv4();
            
            // Логируем login событие
            await AnalyticsLogger.logUserEvent(
              userIdNumber,
              'login',
              {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
              },
              sessionId
            );
            
            // Если это новый пользователь (по наличию created или isNewUser флага), логируем user_register
            if (body.user?.created || body.user?.isNewUser) {
              await AnalyticsLogger.logUserEvent(
                userIdNumber,
                'user_register',
                {
                  ip: req.ip,
                  userAgent: req.get('User-Agent'),
                  registrationMethod: 'google_oauth',
                  timestamp: new Date().toISOString()
                },
                sessionId
              );
            }
          });
        }
        return originalJson.call(this, body);
      };
      
      next();
    };
  }

  /**
   * Middleware для логирования торговых операций
   */
  static tradeLogger() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const originalJson = res.json;
      
      res.json = function(body: any) {
        const userId = req.user?.id ?? req.user?.claims?.sub ?? req.session?.userId ?? req.session?.user?.id;
        
        if (res.statusCode === 200 && userId && body.success) {
          setImmediate(async () => {
            // Определяем тип торговой операции по URL
            let eventType = 'trade_action';
            let eventData: any = { endpoint: req.path };

            if (req.path.includes('/deals/open')) {
              eventType = 'trade_open';
              eventData = {
                symbol: body.deal?.symbol || req.body?.symbol,
                amount: body.deal?.amount || req.body?.amount,
                direction: body.deal?.direction || req.body?.direction,
                leverage: body.deal?.leverage || req.body?.leverage
              };
            } else if (req.path.includes('/deals/close')) {
              eventType = 'trade_close';
              eventData = {
                dealId: body.deal?.id || req.body?.dealId,
                pnl: body.deal?.pnl
              };
            }

            // Используем hash функцию для безопасного преобразования строкового ID
            const userIdNumber = AnalyticsLogger.stringToNumericId(userId);
            // Используем sessionId из HTTP сессии или создаем один на основе userId для консистентности
            const sessionId = (req as any).session?.id || `user-session-${userId}`;
            await AnalyticsLogger.logUserEvent(
              userIdNumber,
              eventType,
              eventData,
              sessionId
            );
          });
        }
        
        return originalJson.call(this, body);
      };
      
      next();
    };
  }

  /**
   * Middleware для логирования просмотров рекламы
   */
  static adLogger() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const originalJson = res.json;
      
      res.json = function(body: any) {
        const userId = req.user?.id ?? req.user?.claims?.sub ?? req.session?.userId ?? req.session?.user?.id;
        
        if (res.statusCode === 200 && userId && body.success) {
          setImmediate(async () => {
            // Используем hash функцию для безопасного преобразования строкового ID
            const userIdNumber = AnalyticsLogger.stringToNumericId(userId);
            // Используем sessionId из HTTP сессии или создаем один на основе userId для консистентности
            const sessionId = (req as any).session?.id || `user-session-${userId}`;
            await AnalyticsLogger.logUserEvent(
              userIdNumber,
              'ad_watch',
              {
                adType: req.body?.adType || 'unknown',
                reward: body.reward || 0,
                placement: req.path
              },
              sessionId
            );
          });
        }
        
        return originalJson.call(this, body);
      };
      
      next();
    };
  }

  /**
   * Универсальный middleware для логирования навигации
   */
  static pageLogger() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const userId = req.user?.id ?? req.user?.claims?.sub ?? req.session?.userId ?? req.session?.user?.id;
      
      // Логируем только GET запросы к основным страницам пользователей
      if (req.method === 'GET' && userId && (
        req.path.includes('/api/user/') || 
        req.path === '/api/auth/user' ||
        req.path.includes('/api/deals/user')
      )) {
        setImmediate(async () => {
          // Используем hash функцию для безопасного преобразования строкового ID
          const userIdNumber = AnalyticsLogger.stringToNumericId(userId);
          // Используем sessionId из HTTP сессии или создаем один на основе userId для консистентности
          const sessionId = (req as any).session?.id || `user-session-${userId}`;
          await AnalyticsLogger.logUserEvent(
            userIdNumber,
            'page_view',
            {
              path: req.path,
              query: req.query,
              referer: req.get('Referer')
            },
            sessionId
          );
        });
      }
      
      next();
    };
  }

  /**
   * Логирование revenue событий
   */
  static async logRevenue(
    userId: number,
    type: 'premium' | 'ad' | 'subscription' | 'purchase',
    amount: number,
    currency: string = 'USD'
  ): Promise<void> {
    try {
      await clickhouseAnalyticsService.logRevenueEvent(
        userId,
        type,
        amount,
        currency
      );
      console.log(`[Analytics] Logged revenue: ${type} $${amount} for user ${userId}`);
    } catch (error) {
      console.error('[Analytics] Failed to log revenue:', error);
    }
  }

  /**
   * Синхронизация сделки в ClickHouse
   */
  static async syncDeal(deal: any): Promise<void> {
    try {
      await clickhouseAnalyticsService.syncDeal(deal);
      console.log(`[Analytics] Synced deal ${deal.id} to ClickHouse`);
    } catch (error) {
      console.error('[Analytics] Failed to sync deal:', error);
    }
  }
}

// Экспорт для обратной совместимости
export const { logUserEvent, logRevenue, syncDeal } = AnalyticsLogger;
export default AnalyticsLogger;