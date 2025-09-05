"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const translations_js_1 = require("../lib/translations.js");
class NotificationService {
    /**
     * Создать новое уведомление
     */
    static async createNotification(data) {
        try {
            // Auto-cleanup: remove old notifications if we have 9 or more
            await this.cleanupOldNotifications(data.userId);
            const [notification] = await db_js_1.db.insert(schema_1.userNotifications).values({
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                isActive: true,
                isRead: false
            }).returning();
            // info: notification created
            return notification;
        }
        catch (error) {
            console.error('❌ Ошибка создания уведомления:', error);
            throw error;
        }
    }
    /**
     * Получить активные уведомления пользователя
     */
    static async getActiveNotifications(userId) {
        try {
            const notifications = await db_js_1.db
                .select()
                .from(schema_1.userNotifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isActive, true)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.userNotifications.createdAt));
            // Фильтруем системные уведомления, оставляем только ежедневные награды и уведомления о сделках
            const filteredNotifications = notifications.filter(notification => notification.type === 'daily_reward' ||
                notification.type === 'trade_opened' ||
                notification.type === 'trade_closed');
            return filteredNotifications;
        }
        catch (error) {
            console.error('❌ Ошибка получения уведомлений:', error);
            throw error;
        }
    }
    /**
     * Получить количество непрочитанных уведомлений
     */
    static async getUnreadCount(userId) {
        try {
            const result = await db_js_1.db
                .select()
                .from(schema_1.userNotifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isActive, true), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isRead, false)));
            // Фильтруем системные уведомления, оставляем только ежедневные награды и уведомления о сделках
            const filteredNotifications = result.filter(notification => notification.type === 'daily_reward' ||
                notification.type === 'trade_opened' ||
                notification.type === 'trade_closed');
            return filteredNotifications.length;
        }
        catch (error) {
            console.error('❌ Ошибка получения количества непрочитанных уведомлений:', error);
            throw error;
        }
    }
    /**
     * Отметить уведомление как прочитанное
     */
    static async markAsRead(notificationId, userId) {
        try {
            const [notification] = await db_js_1.db
                .update(schema_1.userNotifications)
                .set({
                isRead: true,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.id, notificationId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId)))
                .returning();
            if (notification) {
                // info: notification marked as read
            }
            return notification;
        }
        catch (error) {
            console.error('❌ Ошибка отметки уведомления как прочитанного:', error);
            throw error;
        }
    }
    /**
     * Отметить все уведомления пользователя как прочитанные
     */
    static async markAllAsRead(userId) {
        try {
            const result = await db_js_1.db
                .update(schema_1.userNotifications)
                .set({
                isRead: true,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isActive, true), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isRead, false)));
            // info: all notifications marked as read
            return result;
        }
        catch (error) {
            console.error('❌ Ошибка отметки всех уведомлений как прочитанных:', error);
            throw error;
        }
    }
    /**
     * Деактивировать старые уведомления (старше 7 дней)
     */
    static async deactivateOldNotifications() {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const result = await db_js_1.db
                .update(schema_1.userNotifications)
                .set({
                isActive: false,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.isActive, true), (0, drizzle_orm_1.lt)(schema_1.userNotifications.createdAt, sevenDaysAgo)));
            // info: old notifications deactivated
            return result;
        }
        catch (error) {
            console.error('❌ Ошибка деактивации старых уведомлений:', error);
            throw error;
        }
    }
    /**
     * Удалить уведомление (только для пользователя)
     */
    static async deleteNotification(notificationId, userId) {
        try {
            const [notification] = await db_js_1.db
                .delete(schema_1.userNotifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.id, notificationId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId)))
                .returning();
            if (notification) {
                // info: notification deleted
            }
            return notification;
        }
        catch (error) {
            console.error('❌ Ошибка удаления уведомления:', error);
            throw error;
        }
    }
    /**
     * Автоматическая очистка старых уведомлений (оставляем только 10 самых новых отфильтрованных уведомлений)
     */
    static async cleanupOldNotifications(userId) {
        try {
            // Get all active notifications for user, ordered by creation date (newest first)
            // Only consider filtered notification types when determining cleanup
            const notifications = await db_js_1.db
                .select({ id: schema_1.userNotifications.id, type: schema_1.userNotifications.type })
                .from(schema_1.userNotifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isActive, true)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.userNotifications.createdAt));
            // Filter to only count allowed notification types
            const filteredNotifications = notifications.filter(notification => notification.type === 'daily_reward' ||
                notification.type === 'trade_opened' ||
                notification.type === 'trade_closed');
            // If we have 10 or more filtered notifications, delete the oldest ones
            if (filteredNotifications.length >= 10) {
                const notificationsToDelete = filteredNotifications.slice(9); // Keep only first 9, delete the rest
                const idsToDelete = notificationsToDelete.map(n => n.id);
                if (idsToDelete.length > 0) {
                    await db_js_1.db
                        .update(schema_1.userNotifications)
                        .set({ isActive: false, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId), 
                    // Use drizzle's inArray function for multiple IDs
                    (0, drizzle_orm_1.sql) `${schema_1.userNotifications.id} = ANY(ARRAY[${idsToDelete.join(',')}])`));
                    console.log(`[NotificationService] Auto-cleanup: deactivated ${idsToDelete.length} old filtered notifications for user ${userId}`);
                }
            }
        }
        catch (error) {
            console.error('❌ Ошибка автоматической очистки уведомлений:', error);
            // Don't throw error to avoid blocking notification creation
        }
    }
    /**
     * Создать уведомление об открытии сделки
     */
    static async createTradeOpenedNotification(userId, tradeId, symbol, amount, direction) {
        const directionText = direction === 'up' ? 'LONG' : 'SHORT';
        const title = 'Сделка открыта';
        const message = `Открыта новая позиция ${directionText} по ${symbol} на $${amount.toFixed(2)}`;
        return this.createNotification({
            userId,
            type: 'trade_opened',
            title,
            message
        });
    }
    /**
     * Создать уведомление о закрытии сделки
     */
    static async createTradeClosedNotification(userId, tradeId, symbol, profit) {
        const title = profit >= 0 ? translations_js_1.serverTranslations.notificationTitle('trade_closed_profit') : translations_js_1.serverTranslations.notificationTitle('trade_closed_loss');
        const message = `Сделка #${tradeId} (${symbol}) закрыта. ${profit >= 0 ? 'Прибыль' : 'Убыток'}: $${Math.abs(profit).toFixed(2)}`;
        return this.createNotification({
            userId,
            type: 'trade_closed',
            title,
            message
        });
    }
    /**
     * Создать уведомление о ежедневной награде
     */
    static async createDailyRewardNotification(userId, rewardAmount) {
        return this.createNotification({
            userId,
            type: 'daily_reward',
            title: translations_js_1.serverTranslations.notificationTitle('daily_reward'),
            message: `Ваша ежедневная награда готова! Получите ${rewardAmount} монет.`
        });
    }
    /**
     * Создать уведомление о достижении
     */
    static async createAchievementNotification(userId, achievementName) {
        return this.createNotification({
            userId,
            type: 'achievement_unlocked',
            title: translations_js_1.serverTranslations.notificationTitle('achievement_unlocked'),
            message: `Поздравляем! Вы получили достижение "${achievementName}".`
        });
    }
    /**
     * Создать уведомление о появлении новой ежедневной задачи
     */
    static async createDailyTaskNotification(userId, taskTitle, taskDescription) {
        return this.createNotification({
            userId,
            type: 'daily_reward',
            title: translations_js_1.serverTranslations.notificationTitle('daily_task'),
            message: `Доступна новая задача: "${taskTitle}" - ${taskDescription}`
        });
    }
    /**
     * Создать системное уведомление
     */
    static async createSystemNotification(userId, title, message) {
        return this.createNotification({
            userId,
            type: 'system_alert',
            title,
            message
        });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = NotificationService;
