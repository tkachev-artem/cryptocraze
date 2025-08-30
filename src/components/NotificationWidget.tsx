import type React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useTranslation } from '../lib/i18n';

type NotificationWidgetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { t } = useTranslation();
  const { activeNotifications, unreadCount, handleMarkAsRead } = useNotifications();

  // Показываем только последние 5 уведомлений
  const recentNotifications = activeNotifications.slice(0, 5);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNotificationClick = (notificationId: number, isRead: boolean) => {
    if (!isRead) {
      handleMarkAsRead(notificationId);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-end p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Widget */}
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            {t('settings.notifications')}
          </h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {recentNotifications.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500 text-sm">{t('notifications.emptyTitle')}</p>
              <p className="text-gray-400 text-xs mt-1">{t('notifications.emptySubtitle')}</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    notification.is_read 
                      ? 'bg-gray-50 hover:bg-gray-100' 
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                  onClick={() => { handleNotificationClick(notification.id, notification.is_read); }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium ${
                        notification.is_read ? 'text-gray-700' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h4>
                      {notification.message && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {recentNotifications.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                // Здесь можно добавить навигацию на полную страницу уведомлений
                onClose();
              }}
              className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {t('common.viewAll')} ({activeNotifications.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 