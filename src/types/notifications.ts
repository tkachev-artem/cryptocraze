export type NotificationType = 
  | 'daily_reward' 
  | 'trade_closed' 
  | 'trade_opened'
  | 'achievement_unlocked' 
  | 'system_alert';

export type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
  is_active: boolean;
  is_read: boolean;
  created_at: string;
}

export type CreateNotificationData = {
  type: NotificationType;
  title: string;
  message?: string;
  user_id: string;
}

// Новые типы для API эндпоинтов
export type CreateNotificationRequest = {
  type: NotificationType;
  title: string;
  message: string;
}

export type TradeClosedNotificationRequest = {
  symbol: string;
  profit: number;
  tradeId?: string;
}

export type DailyRewardNotificationRequest = {
  rewardAmount: number;
}

export type AchievementNotificationRequest = {
  achievementName: string;
  description: string;
}

export type SystemNotificationRequest = {
  title: string;
  message: string;
}

export type NotificationResponse = {
  data: Notification[];
  success: boolean;
  message?: string;
}

export type UnreadCountResponse = {
  count: number;
  success: boolean;
} 