"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.NotificationService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
class NotificationService {
    /**
     * Создать новое уведомление
     */
    static async createNotification(data) {
        try {
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
            return notifications;
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
                .select({ count: schema_1.userNotifications.id })
                .from(schema_1.userNotifications)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userNotifications.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isActive, true), (0, drizzle_orm_1.eq)(schema_1.userNotifications.isRead, false)));
            return result.length;
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
     * Создать уведомление о закрытии сделки
     */
    static async createTradeClosedNotification(userId, tradeId, symbol, profit) {
        const title = profit >= 0 ? 'Сделка закрыта с прибылью' : 'Сделка закрыта с убытком';
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
            title: 'Ежедневная награда',
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
            title: 'Новое достижение!',
            message: `Поздравляем! Вы получили достижение "${achievementName}".`
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
