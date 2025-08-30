import type React from 'react';
import { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { formatMoneyShort } from '../lib/numberUtils';
import { API_BASE_URL } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';

type Leader = {
  userId: string;
  rank: number;
  username?: string;
};

type ProfileCryptoDataProps = {
  onShowAnalytics?: () => void;
};

const ProfileCryptoData: React.FC<ProfileCryptoDataProps> = ({ onShowAnalytics }) => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const { t } = useTranslation();

  // Используем реальные данные пользователя или значения по умолчанию
  const [ratingPlace, setRatingPlace] = useState<string>(t('common.na'));

  useEffect(() => {
    const loadRating = async () => {
      if (!user?.id) {
        setRatingPlace(t('common.na'));
        return;
      }
      try {
        const url = `${API_BASE_URL}/rating?period=month&offset=0&limit=50`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          setRatingPlace(t('common.na'));
          return;
        }
        const json = (await res.json()) as unknown;
        const leaders = Array.isArray(json) ? (json as Leader[]) : [];
        const me = leaders.find(l => l.userId === user.id);
        if (me && typeof me.rank === 'number' && me.rank >= 1) {
          setRatingPlace(`#${String(me.rank)}`);
        } else {
          setRatingPlace(t('common.na'));
        }
      } catch {
        setRatingPlace(t('common.na'));
      }
    };
    void loadRating();
  }, [user?.id, t]);
  const awards = user?.rewardsCount ?? 0;
  // const analytics = user?.tradesCount ?? 1;
  const transactions = user?.tradesCount ?? 1;
  const loss = user?.maxLoss != null ? `-${formatMoneyShort(Math.abs(Number(user.maxLoss)))}` : (t('common.na'));

  const handleOpenRating = () => { void navigate('/rating'); };

  const handleOpenDeals = () => { void navigate('/deals'); };

  const handleOpenRewards = () => { void navigate('/rewards'); };

  const handleRatingKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenRating();
    }
  };

  const handleDealsKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpenDeals();
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2">
        {(isLoading || !user) ? (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-3 h-28 animate-pulse order-1" />
            <div className="bg-white border border-gray-200 rounded-xl p-3 h-28 animate-pulse order-2" />
            <div className="bg-white border border-gray-200 rounded-xl p-3 h-28 animate-pulse order-3" />
            <div className="bg-white border border-gray-200 rounded-xl p-3 h-28 animate-pulse order-4" />
          </>
        ) : (
          <>
            {/* Рейтинг за 30 дней (левая колонка, верх) */}
            <div
              className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between gap-5 cursor-pointer order-1"
              onClick={handleOpenRating}
              onKeyDown={handleRatingKeyDown}
              role="button"
              tabIndex={0}
              aria-label={t('rating.open30d')}
            >
              <div className="flex items-start  justify-between">
                <div className='flex flex-col justify-start items-start'>
                  <p className="text-xs text-black opacity-50">{t('rating.last30d')}</p>
                  <p className="text-2xl font-bold">{ratingPlace}</p>
                </div>
              </div>

              <div className="flex items-center flex-row gap-1 justify-end w-full">
                <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
                  Топ
                </div>
              </div>

            </div> 

            {/* Аналитика (правая колонка, верх) */}
            <div
              className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative order-2 cursor-pointer"
              onClick={() => { navigate('/analytics'); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/analytics');
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={t('profile.analytics') || 'Аналитика'}
            >
              <div className="flex items-start justify-between">
                <div className='flex flex-col justify-start items-start'>
                  <p className="text-xs text-black opacity-50">{t('profile.analytics') || 'Аналитика'}</p>
                  <p className="text-2xl font-bold mt-5">{transactions}</p>
                </div>
                <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center">
                  <img src="/pickaxe.svg" alt="analytics" className="w-[32px] h-[32px]" />
                </div>
              </div>
              <div className="flex items-center flex-row justify-end mt-3">
                <div
                  className="bg-[#0C54EA] text-white text-xs font-bold px-3 py-1.5 rounded-full h-7 flex items-center justify-center"
                >
                  Аналитика
                </div>
              </div>
            </div>

            {/* Награды (левая колонка, низ) */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative order-3">
              <div className="flex items-start justify-between">
                <div className='flex flex-col justify-start items-start'>
                  <p className="text-xs text-black opacity-50">{t('profile.rewards') || 'Награды'}</p>
                  <p className="text-2xl font-bold mt-5">{awards}</p>
                </div>
                <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center">
                  <img src="/w-cup.svg" alt="awards" className="w-[32px] h-[26px]" />
                </div>
              </div>
              <div className="flex items-center flex-row justify-end mt-3">
                <button
                  type="button"
                  className="bg-[#0C54EA] text-white text-xs font-bold px-3 py-1.5 rounded-full h-7 flex items-center justify-center"
                  aria-label={t('profile.rewards') || 'Награды'}
                  onClick={handleOpenRewards}
                >
                  {t('profile.rewards') || 'Награды'}
                </button>
              </div>
            </div>

            {/* Сделки (правая колонка, низ) */}
            <div
              className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative cursor-pointer order-4"
              onClick={handleOpenDeals}
              onKeyDown={handleDealsKeyDown}
              role="button"
              tabIndex={0}
              aria-label={t('deals.openList')}
            >
              <div className="flex items-start justify-between">
                <div className='flex flex-col justify-start items-start'>
                  <p className="text-xs text-black opacity-50">{t('trading.tradesShort')}</p>
                  <p className="text-2xl font-bold mt-5">{transactions}</p>
                </div>
              </div>
              <div className="flex items-center flex-row gap-1 justify-between">
                <div className='flex flex-row justify-start items-center'>
                  <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center absolute top-3 right-3">
                    <img src="/transactions.svg" alt="transactions" className="w-[32px] h-[30px]" />
                  </div>
                </div>

                <div className='flex flex-row justify-between items-center gap-1 w-full'>
                  <p className="text-sm font-medium text-red-500">{loss}</p>
                  <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
                    Сделки
                  </div>
                </div>

              </div>
            
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileCryptoData; 