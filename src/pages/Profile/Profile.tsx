import type React from 'react';
import { useTranslation } from '../../lib/i18n';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch } from '../../app/hooks';
import { clearUser } from '../../app/userSlice';
import BottomNavigation from '../../components/ui/BottomNavigation';
import TopMenu from '../../components/ui/TopMenu';
import { Grid } from '@/components/ui/grid';
import ProfileDashboard from '../../components/ProfileDashboard';
import ProfileCryptoData from '../../components/ProfileCryptoData';

const formatNumberToK = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2).replace(/\.00$/, '') + 'K';
  return num.toString();
};

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { 
    user, 
    isLoading, 
    isAuthenticated
  } = useUser();

  console.log('Profile component - user:', user, 'isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  const handleLogout = () => {
    // Очищаем Redux store перед выходом
    dispatch(clearUser());
    // Затем перенаправляем на logout
    window.location.href = 'http://localhost:8000/api/auth/logout';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Требуется авторизация</div>
      </div>
    );
  }

  return (
    <Grid className='py-2'>
      <div className="min-h-screen bg-[#F1F7FF] pb-[70px]">
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

          {/* Wallet */}
          <div className="px-4 pt-4">
            <div className="bg-[#F1F7FF] rounded-full p-1 flex items-center gap-1">
              {/* Balance */}
              <div className="bg-white border border-gray-200 rounded-full px-2 py-2 flex items-center justify-center gap-1 flex-1 h-12 w-full">
                <img src="/statistics/money.svg" alt="money" className="w-6 h-[18px]" />
                <span className="text-base font-bold">
                  ${formatNumberToK(user.balance)}
                </span>
              </div>
              
              {/* Coins */}
              <div className="bg-white border border-gray-200 rounded-full px-2 py-2 flex items-center justify-center gap-1 flex-1 h-12 w-full">
                <img src="/statistics/coin.svg" alt="coins" className="w-6 h-6" />
                <span className="text-base font-bold">
                  {user.coins}
                </span>
              </div>
              
              {/* Rating */}
              <div className="bg-white border border-gray-200 rounded-full px-2 py-2 flex items-center justify-center gap-1 flex-1 h-12 w-full">
                <img src="/statistics/reward.svg" alt="rating" className="w-5 h-7" />
                <span className="text-base font-bold">
                  {user.ratingScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Crypto Data */}
        <ProfileCryptoData />

        {/* Dashboard */}
        <ProfileDashboard />

        {/* Buttons */}
        <div className="px-5 py-5 flex gap-5">
          <button className="flex-1 px-0 py-2.5 border border-black rounded-full text-sm font-bold"
          onClick={handleLogout}>
            Выйти
          </button>

          <button className="flex-1 px-4 py-2.5 border border-black rounded-full text-sm font-bold">
            Удалить аккаунт
          </button>
        </div>
      </div>
      <BottomNavigation />
    </Grid>
  );
};
