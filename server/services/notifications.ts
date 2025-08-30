import { db } from '../db.js';
import { userNotifications, notificationTypeEnum } from '../../shared/schema';
import { eq, and, desc, lt } from 'drizzle-orm';

export type NotificationType = typeof notificationTypeEnum.enumValues[number];

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
}

export class NotificationService {
  /**
   * Создать новое уведомление
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const [notification] = await db.insert(userNotifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isActive: true,
        isRead: false
      }).returning();

      // info: notification created
      return notification;
    } catch (error) {
      console.error('❌ Ошибка создания уведомления:', error);
      throw error;
    }
  }

  /**
   * Получить активные уведомления пользователя
   */
  static async getActiveNotifications(userId: string) {
    try {
      const notifications = await db
        .select()
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.isActive, true)
          )
        )
        .orderBy(desc(userNotifications.createdAt));

      return notifications;
    } catch (error) {
      console.error('❌ Ошибка получения уведомлений:', error);
      throw error;
    }
  }

  /**
   * Получить количество непрочитанных уведомлений
   */
  static async getUnreadCount(userId: string) {
    try {
      const result = await db
        .select({ count: userNotifications.id })
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.isActive, true),
            eq(userNotifications.isRead, false)
          )
        );

      return result.length;
    } catch (error) {
      console.error('❌ Ошибка получения количества непрочитанных уведомлений:', error);
      throw error;
    }
  }

  /**
   * Отметить уведомление как прочитанное
   */
  static async markAsRead(notificationId: number, userId: string) {
    try {
      const [notification] = await db
        .update(userNotifications)
        .set({ 
          isRead: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userNotifications.id, notificationId),
            eq(userNotifications.userId, userId)
          )
        )
        .returning();

      if (notification) {
        // info: notification marked as read
      }

      return notification;
    } catch (error) {
      console.error('❌ Ошибка отметки уведомления как прочитанного:', error);
      throw error;
    }
  }

  /**
   * Отметить все уведомления пользователя как прочитанные
   */
  static async markAllAsRead(userId: string) {
    try {
      const result = await db
        .update(userNotifications)
        .set({ 
          isRead: true,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.isActive, true),
            eq(userNotifications.isRead, false)
          )
        );

      // info: all notifications marked as read
      return result;
    } catch (error) {
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

      const result = await db
        .update(userNotifications)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userNotifications.isActive, true),
            lt(userNotifications.createdAt, sevenDaysAgo)
          )
        );

      // info: old notifications deactivated
      return result;
    } catch (error) {
      console.error('❌ Ошибка деактивации старых уведомлений:', error);
      throw error;
    }
  }

  /**
   * Удалить уведомление (только для пользователя)
   */
  static async deleteNotification(notificationId: number, userId: string) {
    try {
      const [notification] = await db
        .delete(userNotifications)
        .where(
          and(
            eq(userNotifications.id, notificationId),
            eq(userNotifications.userId, userId)
          )
        )
        .returning();

      if (notification) {
        // info: notification deleted
      }

      return notification;
    } catch (error) {
      console.error('❌ Ошибка удаления уведомления:', error);
      throw error;
    }
  }

  /**
   * Создать уведомление о закрытии сделки
   */
  static async createTradeClosedNotification(userId: string, tradeId: number, symbol: string, profit: number) {
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
  static async createDailyRewardNotification(userId: string, rewardAmount: number) {
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
  static async createAchievementNotification(userId: string, achievementName: string) {
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
  static async createSystemNotification(userId: string, title: string, message: string) {
    return this.createNotification({
      userId,
      type: 'system_alert',
      title,
      message
    });
  }
}

export const notificationService = NotificationService; 