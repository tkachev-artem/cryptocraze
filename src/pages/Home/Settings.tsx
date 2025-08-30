import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUser, selectUnreadCount } from '../../app/userSlice';
import { usePremium } from '../../hooks/usePremium';
import { useTranslation } from '@/lib/i18n';

const Settings: FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);
  const unreadCount = useAppSelector(selectUnreadCount);

  const { isPremium } = usePremium();
  const { t } = useTranslation();

  const handleBackClick = () => {
    void navigate('/home');
  };

  const handlePremiumClick = () => {
    void navigate('/home/premium');
  };

  const handleNotificationsClick = () => {
    void navigate('/home/notifications');
  };

  const handleShareClick = () => {
    void navigate('/home/share');
  };

  const handleLanguageClick = () => {
    void navigate('/home/language');
  };



  return (
    <div className="bg-white min-h-screen pb-[env(safe-area-inset-bottom)]">
      {/* Navigation Bar */}
      <div className="sticky top-0 z-10 bg-white">
        {/* Top App Bar */}
        <div className="flex items-center justify-between px-2 pt-4 pb-2">
          <div className="flex items-center gap-1">
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              onClick={handleBackClick}
            >
              <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-black">{t('settings.title')}</h1>
          </div>

          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            onClick={async () => {
              try {
                // Вызываем API для выхода на сервере
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  credentials: 'include'
                });
              } catch (error) {
                console.warn('Logout API failed:', error);
              }
              
              // Очищаем локальные данные
              localStorage.removeItem('auth_token');
              
              // Удаляем все cookies
              document.cookie.split(";").forEach(cookie => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
                // Удаляем cookie с разными путями и доменами
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
              });
              
              // Перенаправляем на главную
              window.location.href = '/';
            }}
          >
            <img src="/top-menu/exit.svg" alt="Logout" className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Premium Banner */}
      <div className="px-4 py-3">
        <div 
          className={`rounded-xl p-4 flex items-center justify-between cursor-pointer ${
            isPremium ? 'bg-[#F5A600]' : 'bg-[#0C54EA]'
          }`}
          onClick={handlePremiumClick}
        >
          <span className={`font-bold text-base ${
            isPremium ? 'text-black' : 'text-white'
          }`}>
             {isPremium ? t('settings.premium.pro') : t('settings.premium.goPremium')}
          </span>
          <div className="relative">
            {/* Crown icon */}
            <img src="/settings/crown.svg" alt="Crown" className="w-[64px] h-[42px]" />
          </div>
        </div>
      </div>

      {/* Settings List */}
      <div className="px-4 py-3 space-y-2">
        {/* Language */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer"
          onClick={handleLanguageClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/language.svg" alt="Language" className="w-6 h-6" />
          </div>
          <span className="text-black font-medium text-base">{t('settings.language')}</span>
        </div>

        {/* Notifications */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer relative"
          onClick={handleNotificationsClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/notifications.svg" alt="Notifications" className="w-5.5 h-5.5" />
          </div>
          <span className="text-black font-medium text-base">{t('settings.notifications')}</span>
          
          {/* Notification badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-[#F6465D] text-white text-xs rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>

        {/* Share */}
        <div 
          className="bg-white rounded-full border border-gray-200 p-4 flex items-center gap-3.5 cursor-pointer"
          onClick={handleShareClick}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <img src="/settings/share.svg" alt="Share" className="w-6 h-6" />
          </div>
          <span className="text-black font-medium text-base">{t('settings.share')}</span>
        </div>


      </div>

      {/* App Info */}
      <div className="px-4 py-4 space-y-1">
        <p className="text-black font-medium text-xs opacity-50 tracking-wide">
          {t('settings.version')} 0.1.2
        </p>
        <p className="text-black font-medium text-xs opacity-50 tracking-wide">
          {t('settings.accountId')} {user?.id ?? t('common.loading')}
        </p>
      </div>


    </div>
  );
};

export default Settings;
