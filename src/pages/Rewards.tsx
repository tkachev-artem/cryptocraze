import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

type RewardTier = {
  level: number;
  accountMoney: number;
  reward: number;
  proDays?: number;
};

const Rewards: React.FC = () => {
  const [tiers, setTiers] = useState<RewardTier[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [myRewardsCount, setMyRewardsCount] = useState<number | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => { void navigate(-1); };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) {
      const millions = num / 1000000;
      return millions % 1 === 0 ? `${millions.toFixed(0)}М` : `${millions.toFixed(1)}М`;
    } else if (num >= 1000) {
      const thousands = num / 1000;
      return thousands % 1 === 0 ? `${thousands.toFixed(0)}К` : `${thousands.toFixed(1)}К`;
    } else {
      return num.toLocaleString();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const [rewardsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/rewards`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/user/stats`, { credentials: 'include' })
        ]);
        const data = (await rewardsRes.json()) as RewardTier[];
        if (!cancelled) setTiers(data);
        if (statsRes.ok) {
          const stats = await statsRes.json() as { rewardsCount?: number };
          if (!cancelled) setMyRewardsCount(typeof stats.rewardsCount === 'number' ? stats.rewardsCount : null);
        }
      } catch (e) {
        console.error('Rewards API error:', e);
        if (!cancelled) setTiers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-30 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <button onClick={handleBack} className="flex items-center gap-2" aria-label={t('nav.back')}>
            <img src="/top-menu/back.svg" alt={t('nav.back')} className="w-6 h-6" />
            <span className="text-xl font-extrabold text-black">{t('nav.back')}</span>
          </button>
          <div className="w-6 h-6" />
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center w-full h-[44px] px-4 rounded-[12px] border border-gray-200">
          <span className="text-sm font-bold w-[84px]">{t('rewards.level') || 'Уровень'}</span>
          <span className="text-sm font-bold flex-1 text-left pl-4">{t('rewards.accountMoney') || 'Деньги на аккаунте'}</span>
          <span className="text-sm font-bold">{t('rewards.reward') || 'Награда'}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pt-2 pb-6">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-[6px]">
                <div className="h-10 rounded-[12px] bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && tiers && tiers.length > 0 && (
          <div className="space-y-2">
            {tiers.map((tier) => {
              const isCurrent = myRewardsCount != null && tier.level === myRewardsCount;
              return (
                <div key={tier.level} className="py-[6px]">
                  <div className={`relative flex items-center h-10 rounded-[12px] px-4 ${isCurrent ? 'bg-[#F1F7FF] ring-2 ring-[#0C54EA]' : 'bg-[#F1F7FF]'}`}>
                    <span className={`text-base font-bold w-[84px] ${isCurrent ? 'text-[#0C54EA]' : 'text-[#0C46BE] opacity-50'}`}>{tier.level}</span>
                    <span className="text-sm font-medium text-black flex-1 text-left pl-4">{formatLargeNumber(tier.accountMoney)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-black">{formatLargeNumber(tier.reward)}</span>
                      {tier.proDays != null && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-[#F5A600] text-black text-[11px] font-extrabold px-2 py-[2px] shrink-0"
                          aria-label={t('rewards.proDays', { count: tier.proDays }) || `Про-Режим на ${String(tier.proDays)} дня`}
                          title={t('rewards.proDays', { count: tier.proDays }) || `Про-Режим на ${String(tier.proDays)} дня`}
                        >
                          <span>PRO {tier.proDays} {t('rewards.daysShort')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && tiers && tiers.length === 0 && (
          <div className="py-8 text-center text-sm text-black opacity-50">{t('common.noData')}</div>
        )}
      </div>
    </div>
  );
};

export default Rewards;

