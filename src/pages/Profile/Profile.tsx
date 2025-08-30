import type React from 'react';
import { useTranslation } from '../../lib/i18n';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch } from '../../app/hooks';
import { fetchUserStats } from '../../app/userSlice';
import { openCoinExchange } from '../../app/coinExchangeSlice';
import { useEffect, useState, lazy, Suspense } from 'react';
import BottomNavigation from '../../components/ui/BottomNavigation';
import TopMenu from '../../components/ui/TopMenu';
import { Grid } from '@/components/ui/grid';
const ProfileDashboard = lazy(() => import('../../components/ProfileDashboard'));
const ProfileCryptoData = lazy(() => import('../../components/ProfileCryptoData'));
import { formatMoneyShort } from '../../lib/numberUtils';

const fmtMoney = (v: string | number) => formatMoneyShort(v);

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { 
    user, 
    isLoading, 
    isAuthenticated
  } = useUser();
  const [isDashboardVisible, setIsDashboardVisible] = useState(false);


  // Загружаем статистику пользователя при монтировании компонента
  useEffect(() => {
    if (isAuthenticated && user) {
      void dispatch(fetchUserStats());
    }
  }, [dispatch, isAuthenticated, user]);



  if (isLoading) {
    return (
      <Grid className='py-2'>
        <div className="min-h-screen bg-[#F1F7FF] pb-[70px] overscroll-y-contain">
          {/* Top App Bar */}
          <div className="bg-white px-2 py-2">
            <TopMenu variant="profile" />
          </div>

          {/* Personal Information Skeleton */}
          <div className="bg-white pb-6">
            <div className="flex flex-col items-center gap-2 px-4 animate-pulse">
              {/* Avatar */}
              <div className="w-[110px] h-[110px] bg-gray-200 rounded-[55px]" />

              {/* Name */}
              <div className="h-5 w-40 bg-gray-200 rounded mt-2" />

              {/* Contacts */}
              <div className="flex flex-col items-center gap-3 opacity-50 mt-2">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-4 w-32 bg-gray-200 rounded" />
              </div>
            </div>

            {/* Wallet summary skeleton */}
            <div className="px-4 pt-4">
              <div className="bg-[#EAF3FF] rounded-full p-1 flex items-center gap-2">
                <div className="bg-white border border-gray-200 rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[120px]">
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
                <div className="bg-white border border-gray-200 rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[100px]">
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  <div className="h-4 w-12 bg-gray-200 rounded" />
                </div>
                <div className="bg-white border border-gray-200 rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[80px] flex-1">
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  <div className="h-4 w-10 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Children are lazy-loaded; their own skeletons will render */}
          <div className="px-4 py-4">
            <div className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
          </div>
        </div>
        <BottomNavigation />
      </Grid>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('auth.loginRequired')}</div>
      </div>
    );
  }

  return (
    <Grid className='py-2'>
      <div className="min-h-screen bg-[#F1F7FF] pb-[70px] overscroll-y-contain">
        {/* Top App Bar */}
        <div className="bg-white px-2 py-2">
          <TopMenu variant="profile" />
        </div>

        {/* Personal Information */}
        <div className="bg-white pb-6">
          <div className="flex flex-col items-center gap-2 px-4">
            {/* Avatar */}
            <div className="w-[110px] h-[110px] bg-[#F1F7FF] rounded-[55px] flex items-center justify-center overflow-hidden">
              {user.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <img 
                src="/avatar-big.svg" 
                alt="Default Avatar" 
                className={`w-[72px] h-[74px] ${user.profileImageUrl ? 'hidden' : ''}`}
              />
            </div>
            
            {/* Name */}
            <h1 className="text-xl font-bold text-center">
              {user.firstName} {user.lastName}
            </h1>



            {/* Contacts */}
            <div className="flex flex-col items-center gap-3 opacity-50">
              {user.phone && (
                <div className="flex items-center gap-3">
                  <img src="/phone-small.svg" alt="phone" className="w-4 h-4" />
                  <span className="text-xs font-semibold">{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <img src="/email.svg" alt="email" className="w-4 h-4" />
                <span className="text-xs font-semibold">{user.email}</span>
              </div>
            </div>
          </div>

          {/* Wallet summary */}
          <div className="px-4 pt-4">
            <div className="bg-[#EAF3FF] rounded-full p-1 flex items-center gap-2">
              {/* Деньги */}
              <div className="bg-white border border-gray-200 rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[120px]">
                <img src="/statistics/money.svg" alt="money" className="w-6 h-6" />
                <span className="text-base font-bold whitespace-nowrap">{fmtMoney(user.balance)}</span>
              </div>
              {/* Монеты */}
              <button 
                onClick={() => dispatch(openCoinExchange())}
                className="bg-white border border-gray-200 rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[100px] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src="/money.svg" alt="coins" className="w-6 h-6" />
                <span className="text-base font-bold whitespace-nowrap">{user.coins || 0}</span>
              </button>
              {/* Награды */}
              <div className="bg-white border border-gray-200 rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[80px] flex-1">
                <img src="/awards.svg" alt="rewards" className="w-6 h-6" />
                <span className="text-base font-bold whitespace-nowrap">{user.rewardsCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Data (ленивая загрузка) */}
        <Suspense fallback={<div className="px-4 py-4"><div className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" /></div>}>
          <ProfileCryptoData onShowAnalytics={() => { setIsDashboardVisible((v) => !v); }} />
        </Suspense>

        {/* Dashboard (ленивая загрузка) */}
        {isDashboardVisible && (
          <Suspense fallback={<div className="px-4 py-4"><div className="h-40 bg-white rounded-xl border border-gray-200 animate-pulse" /></div>}>
            <ProfileDashboard />
          </Suspense>
        )}


      </div>
      <BottomNavigation />
    </Grid>
  );
};
