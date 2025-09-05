"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDeal = exports.logRevenue = exports.logUserEvent = exports.AnalyticsLogger = void 0;
const clickhouseAnalyticsService_js_1 = require("../services/clickhouseAnalyticsService.js");
const uuid_1 = require("uuid");
/**
 * Middleware для автоматического логирования событий пользователей в ClickHouse
 */
class AnalyticsLogger {
    /**
     * Логирует событие пользователя
     */
    static async logUserEvent(userId, eventType, eventData = {}, sessionId) {
        console.log(`[Analytics Logger] Received request: userId=${userId}, eventType=${eventType}, sessionId=${sessionId}`);
        console.log(`[Analytics Logger] Event data:`, JSON.stringify(eventData, null, 2));
        try {
            console.log(`[Analytics Logger] About to call clickhouseAnalyticsService.logUserEvent with userId: ${userId}`);
            const result = await clickhouseAnalyticsService_js_1.clickhouseAnalyticsService.logUserEvent(userId, eventType, eventData, sessionId);
            console.log(`[Analytics] ✅ Successfully logged event: ${eventType} for user ${userId}, result:`, result);
        }
        catch (error) {
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
        return async (req, res, next) => {
            const originalJson = res.json;
            res.json = function (body) {
                // Если успешная авторизация
                if (res.statusCode === 200 && body.user?.id) {
                    setImmediate(async () => {
                        // Используем BigInt для больших ID, затем Number для ClickHouse
                        const userIdNumber = Number(BigInt(body.user.id));
                        const sessionId = (0, uuid_1.v4)();
                        // Логируем login событие
                        await AnalyticsLogger.logUserEvent(userIdNumber, 'login', {
                            ip: req.ip,
                            userAgent: req.get('User-Agent'),
                            timestamp: new Date().toISOString()
                        }, sessionId);
                        // Если это новый пользователь (по наличию created или isNewUser флага), логируем user_register
                        if (body.user?.created || body.user?.isNewUser) {
                            await AnalyticsLogger.logUserEvent(userIdNumber, 'user_register', {
                                ip: req.ip,
                                userAgent: req.get('User-Agent'),
                                registrationMethod: 'google_oauth',
                                timestamp: new Date().toISOString()
                            }, sessionId);
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
        return async (req, res, next) => {
            const originalJson = res.json;
            res.json = function (body) {
                const userId = req.user?.id ?? req.user?.claims?.sub ?? req.session?.userId ?? req.session?.user?.id;
                if (res.statusCode === 200 && userId && body.success) {
                    setImmediate(async () => {
                        // Определяем тип торговой операции по URL
                        let eventType = 'trade_action';
                        let eventData = { endpoint: req.path };
                        if (req.path.includes('/deals/open')) {
                            eventType = 'trade_open';
                            eventData = {
                                symbol: body.deal?.symbol || req.body?.symbol,
                                amount: body.deal?.amount || req.body?.amount,
                                direction: body.deal?.direction || req.body?.direction,
                                leverage: body.deal?.leverage || req.body?.leverage
                            };
                        }
                        else if (req.path.includes('/deals/close')) {
                            eventType = 'trade_close';
                            eventData = {
                                dealId: body.deal?.id || req.body?.dealId,
                                pnl: body.deal?.pnl
                            };
                        }
                        // Используем BigInt для больших ID, затем Number для ClickHouse
                        const userIdNumber = Number(BigInt(userId));
                        // Используем sessionId из HTTP сессии или создаем один на основе userId для консистентности
                        const sessionId = req.session?.id || `user-session-${userId}`;
                        await AnalyticsLogger.logUserEvent(userIdNumber, eventType, eventData, sessionId);
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
        return async (req, res, next) => {
            const originalJson = res.json;
            res.json = function (body) {
                const userId = req.user?.id ?? req.user?.claims?.sub ?? req.session?.userId ?? req.session?.user?.id;
                if (res.statusCode === 200 && userId && body.success) {
                    setImmediate(async () => {
                        // Используем BigInt для больших ID, затем Number для ClickHouse
                        const userIdNumber = Number(BigInt(userId));
                        // Используем sessionId из HTTP сессии или создаем один на основе userId для консистентности
                        const sessionId = req.session?.id || `user-session-${userId}`;
                        await AnalyticsLogger.logUserEvent(userIdNumber, 'ad_watch', {
                            adType: req.body?.adType || 'unknown',
                            reward: body.reward || 0,
                            placement: req.path
                        }, sessionId);
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
        return async (req, res, next) => {
            const userId = req.user?.id ?? req.user?.claims?.sub ?? req.session?.userId ?? req.session?.user?.id;
            // Логируем только GET запросы к основным страницам пользователей
            if (req.method === 'GET' && userId && (req.path.includes('/api/user/') ||
                req.path === '/api/auth/user' ||
                req.path.includes('/api/deals/user'))) {
                setImmediate(async () => {
                    // Используем BigInt для больших ID, затем Number для ClickHouse
                    const userIdNumber = Number(BigInt(userId));
                    // Используем sessionId из HTTP сессии или создаем один на основе userId для консистентности
                    const sessionId = req.session?.id || `user-session-${userId}`;
                    await AnalyticsLogger.logUserEvent(userIdNumber, 'page_view', {
                        path: req.path,
                        query: req.query,
                        referer: req.get('Referer')
                    }, sessionId);
                });
            }
            next();
        };
    }
    /**
     * Логирование revenue событий
     */
    static async logRevenue(userId, type, amount, currency = 'USD') {
        try {
            await clickhouseAnalyticsService_js_1.clickhouseAnalyticsService.logRevenueEvent(userId, type, amount, currency);
            console.log(`[Analytics] Logged revenue: ${type} $${amount} for user ${userId}`);
        }
        catch (error) {
            console.error('[Analytics] Failed to log revenue:', error);
        }
    }
    /**
     * Синхронизация сделки в ClickHouse
     */
    static async syncDeal(deal) {
        try {
            await clickhouseAnalyticsService_js_1.clickhouseAnalyticsService.syncDeal(deal);
            console.log(`[Analytics] Synced deal ${deal.id} to ClickHouse`);
        }
        catch (error) {
            console.error('[Analytics] Failed to sync deal:', error);
        }
    }
}
exports.AnalyticsLogger = AnalyticsLogger;
// Экспорт для обратной совместимости
exports.logUserEvent = AnalyticsLogger.logUserEvent, exports.logRevenue = AnalyticsLogger.logRevenue, exports.syncDeal = AnalyticsLogger.syncDeal;
exports.default = AnalyticsLogger;
