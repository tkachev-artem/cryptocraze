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
  preloadedData?: any;
};

const ProfileCryptoData: React.FC<ProfileCryptoDataProps> = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const { t } = useTranslation();
  const [ratingPlace, setRatingPlace] = useState<string>(t('profile.notAvailable'));
  const [lastDealPnL, setLastDealPnL] = useState<number | null>(null);

  // Fetch rating data
  useEffect(() => {
    if (user?.id) {
      const fetchRating = async () => {
        try {
          const url = `${API_BASE_URL}/rating?period=month&offset=0&limit=50`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            const leaders = Array.isArray(data) ? data as Leader[] : [];
            const me = leaders.find(l => l.userId === user.id);
            if (me && typeof me.rank === 'number' && me.rank >= 1) {
              setRatingPlace(`#${String(me.rank)}`);
            } else {
              // Пользователь не найден в рейтинге
              setRatingPlace(t('profile.notAvailable'));
            }
          }
        } catch (error) {
          console.error('Failed to fetch rating:', error);
        }
      };
      fetchRating();
    }
  }, [user?.id]);

  // Fetch last deal data
  useEffect(() => {
    if (user?.id) {
      const fetchLastDeal = async () => {
        try {
          const url = `${API_BASE_URL}/deals/user`;
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            console.log('All deals:', data);
            if (data && data.length > 0) {
              // Сортируем по дате создания и берем последнюю
              const sortedDeals = data.sort((a: any, b: any) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
              const lastDeal = sortedDeals[0];
              console.log('Last deal:', lastDeal);
              
              // Вычисляем P&L последней сделки
              if (lastDeal.status === 'closed' && lastDeal.profit !== undefined) {
                console.log('Using profit:', lastDeal.profit);
                setLastDealPnL(Number(lastDeal.profit));
              } else if (lastDeal.status === 'closed' && lastDeal.pnl !== undefined) {
                console.log('Using pnl:', lastDeal.pnl);
                setLastDealPnL(Number(lastDeal.pnl));
              } else if (lastDeal.status === 'closed' && lastDeal.result !== undefined) {
                console.log('Using result:', lastDeal.result);
                setLastDealPnL(Number(lastDeal.result));
              } else {
                console.log('No PnL data, using 0. Status:', lastDeal.status);
                setLastDealPnL(0); // Открытая сделка или без результата
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch last deal:', error);
        }
      };
      fetchLastDeal();
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 h-28 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-2">
        {/* Rating Card */}
        <div
          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between gap-5 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/rating')}
        >
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">{t('profile.rating30Days')}</p>
              <p className="text-2xl font-bold">{ratingPlace}</p>
            </div>
          </div>
          <div className="flex items-center flex-row gap-1 justify-end w-full">
            <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
              {t('profile.top')}
            </div>
          </div>
        </div>

        {/* Analytics Card */}
        <div
          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/analytics')}
        >
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">{t('profile.analytics')}</p>
              <p className="text-2xl font-bold mt-5">{user?.tradesCount || 0}</p>
            </div>
            <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center">
              <img src="/pickaxe.svg" alt="analytics" className="w-[32px] h-[32px]" />
            </div>
          </div>
          <div className="flex items-center flex-row justify-end mt-3">
            <div className="bg-[#0C54EA] text-white text-xs font-bold px-3 py-1.5 rounded-full h-7 flex items-center justify-center">
              {t('profile.analytics')}
            </div>
          </div>
        </div>

        {/* Rewards Card */}
        <div
          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/rewards')}
        >
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">{t('profile.rewards')}</p>
              <p className="text-2xl font-bold mt-5">{user?.rewardsCount || 2}</p>
            </div>
            <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center">
              <img src="/w-cup.svg" alt="awards" className="w-[32px] h-[26px]" />
            </div>
          </div>
          <div className="flex items-center flex-row justify-end mt-3">
            <div className="bg-[#0C54EA] text-white text-xs font-bold px-3 py-1.5 rounded-full h-7 flex items-center justify-center">
              {t('profile.rewards')}
            </div>
          </div>
        </div>

        {/* Deals Card */}
        <div
          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-between relative cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => navigate('/deals')}
        >
          <div className="flex items-start justify-between">
            <div className='flex flex-col justify-start items-start'>
              <p className="text-xs text-black opacity-50">{t('profile.allDeals')}</p>
              <p className="text-2xl font-bold mt-5">{user?.tradesCount || 0}</p>
            </div>
          </div>
          <div className="flex items-center flex-row gap-1 justify-between">
            <div className='flex flex-row justify-start items-center'>
              <div className="w-[54px] h-[54px] bg-[#E4F0FF] rounded-full flex items-center justify-center absolute top-3 right-3">
                <img src="/transactions.svg" alt="transactions" className="w-[32px] h-[30px]" />
              </div>
            </div>
            <div className='flex flex-row justify-between items-center gap-1 w-full'>
              <p className={`text-sm font-medium ${lastDealPnL && lastDealPnL < 0 ? 'text-red-500' : lastDealPnL && lastDealPnL > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                {lastDealPnL != null ? 
                  `${lastDealPnL >= 0 ? '+' : ''}${formatMoneyShort(lastDealPnL)}` : 
                  t('profile.notAvailable')
                }
              </p>
              <div className="bg-[#0C54EA] text-white text-xs font-bold px-2.5 py-2.5 rounded-full w-16 h-6 flex items-center justify-center">
                {t('profile.allDeals')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCryptoData;