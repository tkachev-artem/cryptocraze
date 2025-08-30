import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { 
  fetchNotifications, 
  markAsRead, 
  deleteNotification, 
  markAllAsRead,
  selectNotifications, 
  selectUnreadCount,
  type Notification
} from '../app/userSlice';
import { useTranslation } from '../lib/i18n';
import { translateNotifications } from '../lib/translationUtils';

type UseNotificationsReturn = {
  notifications: Notification[];
  activeNotifications: Notification[];
  unreadCount: number;
  handleMarkAsRead: (id: number) => void;
  handleDeleteNotification: (id: number) => void;
  handleMarkAllAsRead: () => void;
  handleRefresh: () => void;
};

export const useNotifications = (autoRefresh = true): UseNotificationsReturn => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const notifications = useAppSelector(selectNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);

  // Загружаем уведомления при инициализации
  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  // Автоматическое обновление каждые 30 секунд
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      void dispatch(fetchNotifications());
    }, 30000);

    return () => { clearInterval(interval); };
  }, [dispatch, autoRefresh]);

  const handleMarkAsRead = (id: number) => {
    void dispatch(markAsRead(id));
  };

  const handleDeleteNotification = (id: number) => {
    void dispatch(deleteNotification(id));
  };

  const handleMarkAllAsRead = () => {
    void dispatch(markAllAsRead());
  };

  const handleRefresh = () => {
    void dispatch(fetchNotifications());
  };

  const activeNotifications = notifications.filter((n) => n.is_active);
  
  // Переводим уведомления
  const translatedActiveNotifications = translateNotifications(activeNotifications, t) as Notification[];

  return {
    notifications,
    activeNotifications: translatedActiveNotifications,
    unreadCount,
    handleMarkAsRead,
    handleDeleteNotification,
    handleMarkAllAsRead,
    handleRefresh,
  };
}; 