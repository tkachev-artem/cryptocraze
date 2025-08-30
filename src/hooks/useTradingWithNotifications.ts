import { useAppDispatch, useAppSelector } from '../app/hooks';
import { 
  selectUser, 
  createNotification,
  createTradeClosedNotification
} from '../app/userSlice';
import { useNotifications } from './useNotifications';
import { NotificationService } from '../services/notificationService';
import type {
  CreateNotificationRequest,
  TradeClosedNotificationRequest,
  DailyRewardNotificationRequest,
  AchievementNotificationRequest,
  SystemNotificationRequest
} from '../types/notifications';

export const useTradingWithNotifications = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { handleRefresh } = useNotifications();

  const createTradeNotification = async (
    type: 'opened' | 'closed',
    symbol: string,
    amount: number,
    profit?: number
  ): Promise<void> => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      if (type === 'opened') {
        await dispatch(createNotification({
          type: 'trade_opened',
          title: 'Новая сделка открыта',
          message: `Открыта сделка ${symbol} на сумму ${String(amount)} USDT`,
        })).unwrap();
      } else if (profit !== undefined) {
        await dispatch(createTradeClosedNotification({
          symbol,
          profit,
        })).unwrap();
      }

      // Обновляем уведомления после создания нового
      handleRefresh();
    } catch (error) {
      console.error('Error creating trade notification:', error);
    }
  };

  const createAchievementNotification = async (
    achievementName: string,
    description: string
  ): Promise<void> => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      await dispatch(createNotification({
        type: 'achievement_unlocked',
        title: `Достижение разблокировано: ${achievementName}`,
        message: description,
      })).unwrap();
      
      handleRefresh();
    } catch (error) {
      console.error('Error creating achievement notification:', error);
    }
  };

  const createDailyRewardNotification = async (rewardAmount: number): Promise<void> => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      await dispatch(createNotification({
        type: 'daily_reward',
        title: 'Ежедневная награда',
        message: `Получите ${String(rewardAmount)} монет за ежедневный вход!`,
      })).unwrap();
      
      handleRefresh();
    } catch (error) {
      console.error('Error creating daily reward notification:', error);
    }
  };

  const createSystemAlertNotification = async (title: string, message: string): Promise<void> => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      await dispatch(createNotification({
        type: 'system_alert',
        title,
        message,
      })).unwrap();
      
      handleRefresh();
    } catch (error) {
      console.error('Error creating system alert notification:', error);
    }
  };

  // Новые методы для работы с API эндпоинтами

  const createNotificationViaAPI = async (data: CreateNotificationRequest) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const notification = await NotificationService.createNotificationViaAPI(data);
      handleRefresh();
      return notification;
    } catch (error) {
      console.error('Error creating notification via API:', error);
      throw error;
    }
  };

  const createTradeClosedNotificationViaAPI = async (data: TradeClosedNotificationRequest) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const notification = await NotificationService.createTradeClosedNotificationViaAPI(data);
      handleRefresh();
      return notification;
    } catch (error) {
      console.error('Error creating trade closed notification via API:', error);
      throw error;
    }
  };

  const createDailyRewardNotificationViaAPI = async (data: DailyRewardNotificationRequest) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const notification = await NotificationService.createDailyRewardNotificationViaAPI(data);
      handleRefresh();
      return notification;
    } catch (error) {
      console.error('Error creating daily reward notification via API:', error);
      throw error;
    }
  };

  const createAchievementNotificationViaAPI = async (data: AchievementNotificationRequest) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const notification = await NotificationService.createAchievementNotificationViaAPI(data);
      handleRefresh();
      return notification;
    } catch (error) {
      console.error('Error creating achievement notification via API:', error);
      throw error;
    }
  };

  const createSystemNotificationViaAPI = async (data: SystemNotificationRequest) => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const notification = await NotificationService.createSystemNotificationViaAPI(data);
      handleRefresh();
      return notification;
    } catch (error) {
      console.error('Error creating system notification via API:', error);
      throw error;
    }
  };

  return {
    createTradeNotification,
    createAchievementNotification,
    createDailyRewardNotification,
    createSystemAlertNotification,
    // Новые методы для API эндпоинтов
    createNotificationViaAPI,
    createTradeClosedNotificationViaAPI,
    createDailyRewardNotificationViaAPI,
    createAchievementNotificationViaAPI,
    createSystemNotificationViaAPI,
  };
}; 