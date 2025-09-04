import type { FC } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useTranslation } from '@/lib/i18n';
import { translateNotifications } from '@/lib/translationUtils';

const Notifications: FC = () => {
  const navigate = useNavigate();
  const {
    activeNotifications,
    handleMarkAsRead,
    handleDeleteNotification,
    handleMarkAllAsRead,
  } = useNotifications();
  const { t } = useTranslation();

  // Отмечаем все уведомления как прочитанные при заходе на страницу
  useEffect(() => {
    handleMarkAllAsRead();
  }, [handleMarkAllAsRead]);

  // Переводим уведомления, сохраняя все поля
  const translatedNotifications = activeNotifications.map(notification => ({
    ...notification,
    ...translateNotifications([notification], t)[0]
  }));

  const handleBackClick = () => {
    void navigate('/home/settings');
  };

  const handleDelete = (notificationId: number) => {
    handleDeleteNotification(notificationId);
  };

  return (
    <>
      <div className="bg-white min-h-screen pb-[env(safe-area-inset-bottom)]">

      {/* Top App Bar */}
      <div className="sticky top-0 z-10 bg-white px-2 py-4 flex items-center gap-1">
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          onClick={handleBackClick}
          aria-label={t('common.back')}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleBackClick();
            }
          }}
        >
          <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-black">{t('settings.notifications')}</h1>
      </div>

      {/* Notification List */}
      <div className="px-4 py-4 space-y-2">
          {translatedNotifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">{t('notifications.emptyTitle') || '—'}</p>
            <p className="text-gray-400 text-xs mt-1">{t('notifications.emptySubtitle') || ''}</p>
          </div>
        ) : (
          translatedNotifications.map((notification) => (
            <div 
              key={String(notification.id)}
              className="bg-[#F1F7FF] rounded-[20px] p-4 flex items-center gap-3.5 cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkAsRead(Number(notification.id));
                }
              }}
                aria-label={`${notification.is_read ? (t('notifications.read') || 'Read') : (t('notifications.unread') || 'Unread')}: ${notification.title}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (!notification.is_read) {
                    handleMarkAsRead(Number(notification.id));
                  }
                }
              }}
            >

              
              {/* Notification Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-black font-medium text-base truncate">
                  {notification.title}
                </h3>
                {notification.message && (
                  <p className="text-gray-600 text-sm leading-relaxed mt-1 break-words">
                    {notification.message}
                  </p>
                )}
                <p className="text-gray-400 text-xs mt-2">
                  {new Date(String(notification.created_at)).toLocaleString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(Number(notification.id));
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label={t('notifications.delete') || 'Delete'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Bottom Spacing handled by safe-area padding */}
    </div>
    </>
  );
};

export default Notifications;
