import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoneyShort } from '../../lib/numberUtils';
import { API_BASE_URL } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/hooks/useUser';
import BottomNavigation from '../../components/ui/BottomNavigation';

type Leader = {
  userId: string;
  username: string;
  avatarUrl?: string;
  pnlUsd: number; // совокупный PnL за период
  winRate: number; // 0..100
  trades: number;
  rank: number;
  isPremium?: boolean;
};

type Period = 'day' | 'week' | 'month' | 'all';

// Период зафиксирован: 1 месяц

const fmtMoney = (v: number) => formatMoneyShort(v);

const skeletonRow = (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded bg-gray-200 animate-pulse" />
      <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
      <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
    </div>
    <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
  </div>
);

const Row = ({ leader }: { leader: Leader }) => {
  const { t } = useTranslation();
  const isTop3 = leader.rank <= 3;
  const showPremium = !!leader.isPremium;
  const isNegative = leader.pnlUsd < 0;
  return (
    <div className={`relative bg-white rounded-xl ${showPremium ? 'border border-transparent ring-inset ring-2 ring-[#F5A600]' : 'border border-gray-200'} overflow-hidden`}>
      {/* Premium badge */}
      {showPremium && (
        <div className="absolute top-0 left-0 z-10">
          <div className="flex items-center gap-1 bg-[#F5A600] text-black px-1 py-1 rounded-full">
            <img src="/crown.png" alt={t('rating.premium')} className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Right Top-3 overlay */}
       {isTop3 && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 flex min-w-[121px] h-full p-0 items-center gap-[12px] rounded-none"
          style={{ backgroundImage: 'url(/rating/top-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="flex w-full items-center justify-end gap-2 px-3">
            <span className="text-[12px] font-extrabold text-[#F5A600]">
              {isNegative ? '-' : ''}{fmtMoney(Math.abs(leader.pnlUsd))}
            </span>
            <img
              src={isNegative ? '/rating/arrow-down.svg' : '/rating/arrow-up.svg'}
              alt={isNegative ? t('trading.loss') : t('trading.gain')}
              className="w-3 h-3"
            />
            <div className="min-w-[28px] h-6 px-2 rounded-full bg-[#F5A600] text-black flex items-center justify-center text-xs font-bold flex-shrink-0">
              {leader.rank}
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center justify-between p-3 ${isTop3 ? 'pr-[132px]' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={leader.avatarUrl ?? '/avatar.png'}
            alt={leader.username}
            className="w-12 h-12 rounded-full object-cover"
            onError={(e) => { e.currentTarget.src = '/avatar.png'; }}
          />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-black truncate max-w-[160px]">{leader.username}</span>
          </div>
        </div>
         {!isTop3 && (
          <div className="flex items-center gap-2">
             <span className="text-sm font-extrabold text-[#0C46BE]">
              {isNegative ? '-' : ''}{fmtMoney(Math.abs(leader.pnlUsd))}
            </span>
            <img
              src={isNegative ? '/rating/arrow-down.svg' : '/rating/arrow-up.svg'}
              alt={isNegative ? t('trading.loss') : t('trading.gain')}
              className="w-3 h-3"
            />
            <div className="min-w-[28px] h-6 px-2 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-[#F1F7FF] text-black">
              {leader.rank}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Rating = () => {
  const [period] = useState<Period>('month');
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [myLeader, setMyLeader] = useState<Leader | null>(null);
  const [myLoading, setMyLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();

  const handleBack = () => {
    void navigate(-1);
  };

  const OFFSET = 0;
  const LIMIT = 50;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          period,
          offset: String(OFFSET),
          limit: String(LIMIT),
        });
        const res = await fetch(`${API_BASE_URL}/rating?${params.toString()}`, { credentials: 'include' });
        const data = (await res.json()) as Leader[];
        setLeaders(data);
      } catch (e) {
        console.error('Rating API error:', e);
        setLeaders([]);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [period]);

  // Загружаем и закрепляем строку текущего пользователя
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setMyLeader(null);
      return;
    }

    // Если мы уже получили список лидеров — попробуем найти текущего пользователя
    if (leaders && leaders.length > 0) {
      const meInList = leaders.find(l => l.userId === user.id) ?? null;
      if (meInList) {
        setMyLeader(meInList);
        return;
      }
    }

    let cancelled = false;
    const loadMyRow = async () => {
      setMyLoading(true);
      try {
        // Use new dedicated user rating endpoint
        const myRatingRes = await fetch(`${API_BASE_URL}/rating/user/${user.id}?period=${period}`, { 
          credentials: 'include' 
        });
        
        if (!myRatingRes.ok) {
          console.error('Failed to fetch user rating:', myRatingRes.status);
          // Fallback: show user card without P&L if rank is unknown
          const username = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : (user.email || user.id);
          const fallback: Leader = {
            userId: user.id,
            username,
            avatarUrl: user.profileImageUrl,
            pnlUsd: 0,
            winRate: 0,
            trades: 0,
            rank: 0,
            isPremium: Boolean(user.isPremium),
          };
          if (!cancelled) setMyLeader(fallback);
          return;
        }

        const userRating = await myRatingRes.json() as Leader;
        if (!cancelled) {
          console.log('User rating loaded:', userRating);
          setMyLeader(userRating);
        }
      } catch (e) {
        console.error('My rating row load error:', e);
        // Fallback on error
        const username = user.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : (user.email || user.id);
        const fallback: Leader = {
          userId: user.id,
          username,
          avatarUrl: user.profileImageUrl,
          pnlUsd: 0,
          winRate: 0,
          trades: 0,
          rank: 0,
          isPremium: Boolean(user.isPremium),
        };
        if (!cancelled) setMyLeader(fallback);
      } finally {
        if (!cancelled) setMyLoading(false);
      }
    };

    void loadMyRow();
    return () => { cancelled = true; };
  }, [isAuthenticated, user, leaders, period]);

  return (
    <div className="min-h-screen bg-white flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* Top Navigation + Rating Banner - Fixed */}
      <div className="sticky top-0 z-30 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <img src="/top-menu/back.svg" alt={t('nav.back')} className="w-6 h-6" />
            <span className="text-xl font-extrabold text-black">{t('nav.back')}</span>
          </button>
          <div className="w-6 h-6" />
        </div>
        
        <div className="px-4 pb-4">
          <div 
            className="flex w-full h-[50px] p-[16px] justify-center items-center gap-[10px] flex-shrink-0 rounded-[16px] mx-auto"
            style={{ backgroundImage: 'url(/rating/rating-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <span className="text-[#FFF] text-center text-[16px] font-bold tracking-[0px]">{t('rating.last30d')}</span>
          </div>
        </div>
      </div>

      {/* Tabs удалены: период фиксирован месяц */}

      {/* List */}
      <div className="flex-1 px-4 space-y-3 pb-4">
        {(loading || !leaders) && (
          <div className="space-y-3">
            {skeletonRow}
            {skeletonRow}
            {skeletonRow}
            {skeletonRow}
            {skeletonRow}
          </div>
        )}
        {!loading && leaders && leaders.length === 0 && (
          <div className="py-8 text-center text-sm text-black opacity-50">{t('common.noData')}</div>
        )}
        {!loading && leaders && leaders.length > 0 && (
          <div className="space-y-3">
            {leaders.map((l) => (
              <Row key={l.userId} leader={l} />
            ))}
          </div>
        )}
      </div>

      {/* Pinned current user row above bottom navigation */}
      {!loading && (myLeader != null || myLoading) && (
        <div className="absolute left-0 right-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-10 bg-[#F1F7FF]">
          <div className="px-4 pt-3 pb-6">
            {myLeader ? (
              <Row leader={myLeader} />
            ) : (
              <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
                    <div className="flex flex-col min-w-0">
                      <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <BottomNavigation />
    </div>
  );
};

export default Rating;

