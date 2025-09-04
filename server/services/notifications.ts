import { db } from '../db.js';
import { userNotifications, notificationTypeEnum } from '../../shared/schema';
import { eq, and, desc, lt, sql } from 'drizzle-orm';

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
      // Auto-cleanup: remove old notifications if we have 9 or more
      await this.cleanupOldNotifications(data.userId);

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

      // Фильтруем системные уведомления, оставляем только ежедневные награды и уведомления о сделках
      const filteredNotifications = notifications.filter(notification => 
        notification.type === 'daily_reward' || 
        notification.type === 'trade_opened' || 
        notification.type === 'trade_closed'
      );

      return filteredNotifications;
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
        .select()
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.isActive, true),
            eq(userNotifications.isRead, false)
          )
        );

      // Фильтруем системные уведомления, оставляем только ежедневные награды и уведомления о сделках
      const filteredNotifications = result.filter(notification => 
        notification.type === 'daily_reward' || 
        notification.type === 'trade_opened' || 
        notification.type === 'trade_closed'
      );

      return filteredNotifications.length;
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
   * Автоматическая очистка старых уведомлений (оставляем только 10 самых новых отфильтрованных уведомлений)
   */
  static async cleanupOldNotifications(userId: string) {
    try {
      // Get all active notifications for user, ordered by creation date (newest first)
      // Only consider filtered notification types when determining cleanup
      const notifications = await db
        .select({ id: userNotifications.id, type: userNotifications.type })
        .from(userNotifications)
        .where(
          and(
            eq(userNotifications.userId, userId),
            eq(userNotifications.isActive, true)
          )
        )
        .orderBy(desc(userNotifications.createdAt));

      // Filter to only count allowed notification types
      const filteredNotifications = notifications.filter(notification => 
        notification.type === 'daily_reward' || 
        notification.type === 'trade_opened' || 
        notification.type === 'trade_closed'
      );

      // If we have 10 or more filtered notifications, delete the oldest ones
      if (filteredNotifications.length >= 10) {
        const notificationsToDelete = filteredNotifications.slice(9); // Keep only first 9, delete the rest
        const idsToDelete = notificationsToDelete.map(n => n.id);
        
        if (idsToDelete.length > 0) {
          await db
            .update(userNotifications)
            .set({ isActive: false, updatedAt: new Date() })
            .where(
              and(
                eq(userNotifications.userId, userId),
                // Use drizzle's inArray function for multiple IDs
                sql`${userNotifications.id} = ANY(ARRAY[${idsToDelete.join(',')}])`
              )
            );
          
          console.log(`[NotificationService] Auto-cleanup: deactivated ${idsToDelete.length} old filtered notifications for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка автоматической очистки уведомлений:', error);
      // Don't throw error to avoid blocking notification creation
    }
  }

  /**
   * Создать уведомление об открытии сделки
   */
  static async createTradeOpenedNotification(userId: string, tradeId: number, symbol: string, amount: number, direction: 'up' | 'down') {
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
   * Создать уведомление о появлении новой ежедневной задачи
   */
  static async createDailyTaskNotification(userId: string, taskTitle: string, taskDescription: string) {
    return this.createNotification({
      userId,
      type: 'daily_reward',
      title: 'Новая ежедневная задача!',
      message: `Доступна новая задача: "${taskTitle}" - ${taskDescription}`
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