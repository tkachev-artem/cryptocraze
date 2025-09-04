import type React from 'react';
import { useTranslation } from '../../lib/i18n';
import { useUser } from '../../hooks/useUser';
import { useAppDispatch } from '../../app/hooks';
import { fetchUserStats } from '../../app/userSlice';
import { openCoinExchange } from '../../app/coinExchangeSlice';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '../../components/ui/BottomNavigation';
import ProfileCryptoData from '../../components/ProfileCryptoData';
import { formatMoneyShort } from '../../lib/numberUtils';

const fmtMoney = (v: string | number) => formatMoneyShort(v);

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { 
    user, 
    isLoading, 
    isAuthenticated
  } = useUser();

  // Загружаем статистику пользователя при монтировании компонента
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(fetchUserStats(user.id));
    }
  }, [dispatch, user?.id, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F1F7FF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C54EA]"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#F1F7FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t('auth.pleaseLogin')}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-[#0C54EA] text-white px-4 py-2 rounded-lg"
          >
            {t('auth.login')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F7FF] pb-[70px] overscroll-y-contain">
      {/* Edit Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => navigate('/edit-profile')}
          className="p-2 hover:bg-gray-50 transition-colors"
          aria-label={t('profile.editTitle') || 'Edit Profile'}
        >
          <img src="/top-menu/edit.svg" alt="edit" className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col">
        {/* Profile Header */}
        <div className="bg-white pb-6 pt-12">
          <div className="flex flex-col items-center gap-2 px-4">
            {/* Avatar */}
            <div className="relative w-[110px] h-[110px] rounded-[55px] overflow-hidden bg-gray-100 flex items-center justify-center">
              {user.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="User Avatar" 
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
            
            {/* User Name */}
            <h1 className="text-xl font-bold text-black mt-2">{user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || user.username || user.email?.split('@')[0] || t('profile.defaultUsername') || 'User'}</h1>
            
            {/* Contact Info */}
            <div className="flex flex-col items-center gap-3 opacity-50 mt-2">
              {user.email && (
                <div className="flex items-center gap-3">
                  <img src="/email.svg" alt="email" className="w-4 h-4" />
                  <span className="text-sm text-black">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-3">
                  <img src="/phone.svg" alt="phone" className="w-4 h-4" />
                  <span className="text-sm text-black">{user.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Summary */}
          <div className="px-4 pt-4">
            <div className="bg-[#EAF3FF] rounded-full p-1 flex items-center gap-2">
              {/* Баланс */}
              <div className="bg-white rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[120px]">
                <img src="/dollar.svg" alt="balance" className="w-6 h-6" />
                <span className="text-base font-bold whitespace-nowrap">{fmtMoney(user.balance)}</span>
              </div>
              {/* Монеты */}
              <button 
                onClick={() => dispatch(openCoinExchange())}
                className="bg-white rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[100px] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src="/money.svg" alt="coins" className="w-6 h-6" />
                <span className="text-base font-bold whitespace-nowrap">{user.coins || 0}</span>
              </button>
              {/* Награды */}
              <button 
                onClick={() => navigate('/rewards')}
                className="bg-white rounded-full px-3 py-2 flex items-center justify-center gap-2 h-12 min-w-[80px] flex-1 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src="/awards.svg" alt="rewards" className="w-6 h-6" />
                <span className="text-base font-bold whitespace-nowrap">{user.rewardsCount || 0}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Crypto Data */}
        <ProfileCryptoData />

      </div>
      <BottomNavigation />
    </div>
  );
};