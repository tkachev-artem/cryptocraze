import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { selectUnreadCount, selectUser } from '../../app/userSlice';
import { useTranslation } from '@/lib/i18n';
import { forwardRef } from 'react';
import { LayoutDashboard } from 'lucide-react';

const BottomNavigation = forwardRef<HTMLDivElement>((_props, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useAppSelector(selectUnreadCount);
  const user = useAppSelector(selectUser);
  
  const { t } = useTranslation();
  const isAdmin = (user as any)?.role === 'admin';
  
  const baseTabs = [
    { id: 'home', path: '/home', activeIcon: '/menu/active/home.svg', inactiveIcon: '/menu/no-active/home.svg', aria: t('nav.home') },
    { id: 'trading', path: '/trade', activeIcon: '/menu/active/trading.svg', inactiveIcon: '/menu/no-active/trading.svg', aria: t('trading.title') },
    { id: 'rating', path: '/rating', activeIcon: '/menu/active/best.svg', inactiveIcon: '/menu/no-active/best.svg', aria: t('rating.last30d') },
    { id: 'profile', path: '/profile', activeIcon: '/menu/active/profile.svg', inactiveIcon: '/menu/no-active/profile.svg', aria: t('profile.title') }
  ];

  // Add admin tab if user is admin
  const tabs = isAdmin 
    ? [...baseTabs, { id: 'admin', path: '/admin/dashboard', activeIcon: null, inactiveIcon: null, aria: 'Admin Dashboard' }]
    : baseTabs;

  const handleTabClick = (path: string) => {
    void navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      ref={ref}
      role="navigation"
      aria-label={t('nav.home')}
      className='absolute bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 flex justify-around items-center px-3 sm:px-4 min-h-[75px] sm:min-h-[80px] pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] sm:pb-[calc(12px+env(safe-area-inset-bottom))] touch-pan-x select-none z-[70]'
      onTouchMove={(e) => {
        e.preventDefault();
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            handleTabClick(tab.path);
          }}
          className={`
            flex flex-col items-center justify-center gap-1 sm:gap-2 
            transition-all duration-200 relative rounded-lg
            min-w-[48px] min-h-[48px] 
            sm:min-w-[52px] sm:min-h-[52px]
            px-3 sm:px-4 
            py-2.5 sm:py-3
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C54EA]/50
            active:scale-95 hover:bg-gray-50/50
            ${isActive(tab.path) ? 'text-[#0C54EA]' : 'text-[#808080]'}
          `}
          aria-label={tab.aria}
        >
          <div className="relative inline-block flex-shrink-0">
            {tab.id === 'admin' ? (
              <LayoutDashboard 
                className={`w-7 h-7 sm:w-8 sm:h-8 ${isActive(tab.path) ? 'text-[#0C54EA]' : 'text-[#808080]'}`}
              />
            ) : (
              <img 
                src={isActive(tab.path) ? tab.activeIcon : tab.inactiveIcon} 
                alt={tab.id} 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                loading="eager"
              />
            )}

            {/* Notification badge for home tab */}
            {tab.id === 'home' && unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-[#F6465D] text-white text-[9px] sm:text-[10px] font-medium leading-none rounded-full min-w-[15px] sm:min-w-[16px] h-3.5 sm:h-4 flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

export default BottomNavigation; 