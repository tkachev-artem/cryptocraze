import type { 
  Notification, 
  CreateNotificationData, 
  NotificationResponse, 
  UnreadCountResponse,
  CreateNotificationRequest,
  TradeClosedNotificationRequest,
  DailyRewardNotificationRequest,
  AchievementNotificationRequest,
  SystemNotificationRequest
} from '../types/notifications';

import { API_BASE_URL } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace NotificationService {
  // Получить все уведомления пользователя
  export async function getNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const data: NotificationResponse = await response.json() as NotificationResponse;
      return data.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Получить количество непрочитанных уведомлений
  export async function getUnreadCount(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const data: UnreadCountResponse = await response.json() as UnreadCountResponse;
      return data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  }

  // Отметить уведомление как прочитанное
  export async function markAsRead(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id.toString()}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Отметить все уведомления как прочитанные
  export async function markAllAsRead(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Удалить уведомление
  export async function deleteNotification(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Создать уведомление (для бэкенда)
  export async function createNotification(data: CreateNotificationData): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const notification: Notification = await response.json() as Notification;
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Создать уведомление о ежедневной награде
  export async function createDailyRewardNotification(userId: string, rewardAmount: number): Promise<Notification> {
    return createNotification({
      type: 'daily_reward',
      title: 'Ежедневная награда',
      message: `Получите ${rewardAmount.toString()} монет за ежедневный вход!`,
      user_id: userId,
    });
  }

  // Создать уведомление о закрытии сделки
  export async function createTradeClosedNotification(
    userId: string, 
    _tradeId: string, 
    symbol: string, 
    profit: number
  ): Promise<Notification> {
    const profitText = profit >= 0 ? `+${profit.toString()}` : profit.toString();
    const title = profit >= 0 ? 'Сделка закрыта с прибылью' : 'Сделка закрыта с убытком';
    
    return createNotification({
      type: 'trade_closed',
      title,
      message: `Сделка ${symbol} закрыта. Прибыль: ${profitText} USDT`,
      user_id: userId,
    });
  }

  // Создать уведомление об открытии сделки
  export async function createTradeOpenedNotification(
    userId: string, 
    _tradeId: string, 
    symbol: string, 
    amount: number
  ): Promise<Notification> {
    return createNotification({
      type: 'trade_opened',
      title: 'Новая сделка открыта',
      message: `Открыта сделка ${symbol} на сумму ${amount.toString()} USDT`,
      user_id: userId,
    });
  }

  // Создать уведомление о достижении
  export async function createAchievementNotification(
    userId: string, 
    achievementName: string, 
    description: string
  ): Promise<Notification> {
    return createNotification({
      type: 'achievement_unlocked',
      title: `Достижение разблокировано: ${achievementName}`,
      message: description,
      user_id: userId,
    });
  }

  // Создать системное уведомление
  export async function createSystemAlertNotification(
    userId: string, 
    title: string, 
    message: string
  ): Promise<Notification> {
    return createNotification({
      type: 'system_alert',
      title,
      message,
      user_id: userId,
    });
  }

  // Новые API эндпоинты для создания уведомлений

  // POST /api/notifications/create - создание обычного уведомления
  export async function createNotificationViaAPI(data: CreateNotificationRequest): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const notification: Notification = await response.json() as Notification;
      return notification;
    } catch (error) {
      console.error('Error creating notification via API:', error);
      throw error;
    }
  }

  // POST /api/notifications/trade-closed - уведомление о закрытии сделки
  export async function createTradeClosedNotificationViaAPI(data: TradeClosedNotificationRequest): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/trade-closed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const notification: Notification = await response.json() as Notification;
      return notification;
    } catch (error) {
      console.error('Error creating trade closed notification via API:', error);
      throw error;
    }
  }

  // POST /api/notifications/daily-reward - уведомление о ежедневной награде
  export async function createDailyRewardNotificationViaAPI(data: DailyRewardNotificationRequest): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/daily-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const notification: Notification = await response.json() as Notification;
      return notification;
    } catch (error) {
      console.error('Error creating daily reward notification via API:', error);
      throw error;
    }
  }

  // POST /api/notifications/achievement - уведомление о достижении
  export async function createAchievementNotificationViaAPI(data: AchievementNotificationRequest): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/achievement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const notification: Notification = await response.json() as Notification;
      return notification;
    } catch (error) {
      console.error('Error creating achievement notification via API:', error);
      throw error;
    }
  }

  // POST /api/notifications/system - системное уведомление
  export async function createSystemNotificationViaAPI(data: SystemNotificationRequest): Promise<Notification> {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status.toString()}`);
      }

      const notification: Notification = await response.json() as Notification;
      return notification;
    } catch (error) {
      console.error('Error creating system notification via API:', error);
      throw error;
    }
  }
}