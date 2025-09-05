"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.premiumService = exports.PremiumService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
const analyticsLogger_js_1 = __importDefault(require("../middleware/analyticsLogger.js"));
class PremiumService {
    /**
     * Создать платеж через ЮKassa
     */
    static async createPayment(data) {
        try {
            // Получаем план
            const plan = await this.getPlanByType(data.planType);
            if (!plan) {
                throw new Error(`Plan type ${data.planType} not found`);
            }
            // Создаем запись в БД
            const [subscription] = await db_js_1.db.insert(schema_1.premiumSubscriptions).values({
                userId: data.userId,
                telegramId: data.telegramId,
                paymentId: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                planType: data.planType,
                amount: data.amount.toString(),
                currency: data.currency || 'USD',
                status: 'pending',
                metadata: data.metadata || {}
            }).returning();
            // Здесь будет интеграция с ЮKassa API
            // Пока возвращаем заглушку
            const paymentUrl = `https://yoomoney.ru/checkout/payments/v2/contract?orderId=${subscription.paymentId}`;
            return {
                subscription,
                paymentUrl,
                confirmationUrl: paymentUrl
            };
        }
        catch (error) {
            console.error('❌ Ошибка создания платежа:', error);
            throw error;
        }
    }
    /**
     * Создать подписку напрямую (без платежа)
     */
    static async createDirectSubscription(data) {
        try {
            // Получаем текущие данные пользователя
            const [currentUser] = await db_js_1.db
                .select({
                isPremium: schema_1.users.isPremium,
                premiumExpiresAt: schema_1.users.premiumExpiresAt
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, data.userId));
            // Вычисляем дату истечения с учетом существующего премиума
            const now = new Date();
            let baseDate = now;
            // Если у пользователя уже есть активный премиум, добавляем время к нему
            if (currentUser && currentUser.premiumExpiresAt) {
                const existingExpiration = new Date(currentUser.premiumExpiresAt);
                if (existingExpiration > now) {
                    baseDate = existingExpiration;
                }
            }
            const expiresAt = new Date(baseDate);
            if (data.planType === 'month') {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
            }
            else if (data.planType === 'year') {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            }
            // Создаем запись в БД
            const [subscription] = await db_js_1.db.insert(schema_1.premiumSubscriptions).values({
                userId: data.userId,
                telegramId: data.telegramId,
                paymentId: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                planType: data.planType,
                amount: data.amount.toString(),
                currency: data.currency || 'USD',
                status: 'succeeded',
                isActive: true,
                expiresAt,
                metadata: {}
            }).returning();
            // Обновляем статус пользователя
            await db_js_1.db
                .update(schema_1.users)
                .set({
                isPremium: true,
                premiumExpiresAt: expiresAt,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, data.userId));
            // Log revenue from premium subscription
            try {
                const userIdNumber = Number(BigInt(data.userId));
                await analyticsLogger_js_1.default.logRevenue(userIdNumber, 'premium', data.amount, data.currency || 'USD');
                console.log(`[Premium] Logged premium revenue: ${data.amount} ${data.currency || 'USD'} for user ${data.userId}`);
            }
            catch (analyticsError) {
                console.error('[Premium] Failed to log premium revenue analytics:', analyticsError);
                // Don't fail the whole process due to analytics error
            }
            console.log(`✅ Прямая подписка создана для пользователя ${data.userId}: ${data.planType}`);
            return subscription;
        }
        catch (error) {
            console.error('❌ Ошибка создания прямой подписки:', error);
            throw error;
        }
    }
    /**
     * Обработать webhook от ЮKassa
     */
    static async handleWebhook(webhookData, signature) {
        try {
            // Проверка подписи webhook'а (если есть)
            if (signature && !this.verifyWebhookSignature(webhookData, signature)) {
                throw new Error('Invalid webhook signature');
            }
            const { event, object } = webhookData;
            console.log(`📥 Webhook получен: ${event} для платежа ${object.id}`);
            if (event === 'payment.succeeded') {
                await this.processSuccessfulPayment(object);
            }
            else if (event === 'payment.canceled') {
                await this.processCanceledPayment(object);
            }
            else {
                console.log(`⚠️ Неизвестное событие: ${event}`);
            }
            return { success: true };
        }
        catch (error) {
            console.error('❌ Ошибка обработки webhook:', error);
            throw error;
        }
    }
    /**
     * Обработать успешный платеж
     */
    static async processSuccessfulPayment(paymentObject) {
        try {
            const paymentId = paymentObject.id;
            // Находим подписку по payment_id
            const [subscription] = await db_js_1.db
                .select()
                .from(schema_1.premiumSubscriptions)
                .where((0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.paymentId, paymentId));
            if (!subscription) {
                console.log(`⚠️ Subscription not found for payment ${paymentId}, skipping...`);
                return;
            }
            // Получаем текущие данные пользователя
            const [currentUser] = await db_js_1.db
                .select({
                isPremium: schema_1.users.isPremium,
                premiumExpiresAt: schema_1.users.premiumExpiresAt
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, subscription.userId));
            // Вычисляем дату истечения с учетом существующего премиума
            const now = new Date();
            let baseDate = now;
            // Если у пользователя уже есть активный премиум, добавляем время к нему
            if (currentUser && currentUser.premiumExpiresAt) {
                const existingExpiration = new Date(currentUser.premiumExpiresAt);
                if (existingExpiration > now) {
                    baseDate = existingExpiration;
                }
            }
            const expiresAt = new Date(baseDate);
            if (subscription.planType === 'month') {
                expiresAt.setMonth(expiresAt.getMonth() + 1);
            }
            else if (subscription.planType === 'year') {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            }
            // Обновляем статус подписки
            await db_js_1.db
                .update(schema_1.premiumSubscriptions)
                .set({
                status: 'succeeded',
                isActive: true,
                expiresAt,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.paymentId, paymentId));
            // Обновляем статус пользователя
            await db_js_1.db
                .update(schema_1.users)
                .set({
                isPremium: true,
                premiumExpiresAt: expiresAt,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, subscription.userId));
            // Log revenue from premium payment
            try {
                const userIdNumber = Number(BigInt(subscription.userId));
                const revenueAmount = parseFloat(subscription.amount);
                await analyticsLogger_js_1.default.logRevenue(userIdNumber, 'premium', revenueAmount, subscription.currency || 'USD');
                console.log(`[Premium] Logged premium payment revenue: ${revenueAmount} ${subscription.currency} for user ${subscription.userId}`);
            }
            catch (analyticsError) {
                console.error('[Premium] Failed to log premium payment revenue analytics:', analyticsError);
                // Don't fail the whole process due to analytics error
            }
            console.log(`✅ Платеж ${paymentId} обработан успешно`);
        }
        catch (error) {
            console.error('❌ Ошибка обработки успешного платежа:', error);
            throw error;
        }
    }
    /**
     * Обработать отмененный платеж
     */
    static async processCanceledPayment(paymentObject) {
        try {
            const paymentId = paymentObject.id;
            await db_js_1.db
                .update(schema_1.premiumSubscriptions)
                .set({
                status: 'canceled',
                isActive: false,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.paymentId, paymentId));
            console.log(`❌ Платеж ${paymentId} отменен`);
        }
        catch (error) {
            console.error('❌ Ошибка обработки отмененного платежа:', error);
            throw error;
        }
    }
    /**
     * Получить статус подписки пользователя
     */
    static async getSubscriptionStatus(userId) {
        try {
            const [subscription] = await db_js_1.db
                .select()
                .from(schema_1.premiumSubscriptions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.isActive, true), (0, drizzle_orm_1.gte)(schema_1.premiumSubscriptions.expiresAt, new Date())))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.premiumSubscriptions.createdAt));
            return {
                hasActiveSubscription: !!subscription,
                subscription: subscription || null,
                isExpired: subscription ? new Date() > subscription.expiresAt : true
            };
        }
        catch (error) {
            console.error('❌ Ошибка получения статуса подписки:', error);
            throw error;
        }
    }
    /**
     * Получить план по типу
     */
    static async getPlanByType(planType) {
        try {
            const [plan] = await db_js_1.db
                .select()
                .from(schema_1.premiumPlans)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.premiumPlans.planType, planType), (0, drizzle_orm_1.eq)(schema_1.premiumPlans.isActive, true)));
            return plan;
        }
        catch (error) {
            console.error('❌ Ошибка получения плана:', error);
            throw error;
        }
    }
    /**
     * Получить все активные планы
     */
    static async getActivePlans() {
        try {
            return await db_js_1.db
                .select()
                .from(schema_1.premiumPlans)
                .where((0, drizzle_orm_1.eq)(schema_1.premiumPlans.isActive, true))
                .orderBy(schema_1.premiumPlans.price);
        }
        catch (error) {
            console.error('❌ Ошибка получения планов:', error);
            throw error;
        }
    }
    /**
     * Проверить подпись webhook'а от ЮKassa
     */
    static verifyWebhookSignature(data, signature) {
        try {
            const secret = process.env.YOOKASSA_WEBHOOK_SECRET;
            if (!secret) {
                console.warn('⚠️ YOOKASSA_WEBHOOK_SECRET not set, skipping signature verification');
                return true;
            }
            const payload = JSON.stringify(data);
            const expectedSignature = crypto_1.default
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
        }
        catch (error) {
            console.error('❌ Ошибка проверки подписи:', error);
            return false;
        }
    }
    /**
     * Восстановить покупки (для мобильных приложений)
     */
    static async restorePurchases(userId) {
        try {
            const subscriptions = await db_js_1.db
                .select()
                .from(schema_1.premiumSubscriptions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.userId, userId), (0, drizzle_orm_1.eq)(schema_1.premiumSubscriptions.status, 'succeeded')))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.premiumSubscriptions.createdAt));
            return subscriptions;
        }
        catch (error) {
            console.error('❌ Ошибка восстановления покупок:', error);
            throw error;
        }
    }
}
exports.PremiumService = PremiumService;
exports.premiumService = PremiumService;
