import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useUser } from '../../hooks/useUser';
import { formatMoneyShort } from '../../lib/numberUtils';
import BlockButton from '../../components/BlockButton';
import BottomNavigation from '../../components/ui/BottomNavigation';
import TopMenu from '../../components/ui/TopMenu';
import { useTranslation } from '@/lib/i18n';
import { useAppDispatch } from '@/app/hooks';
import { fetchUserStats } from '@/app/userSlice';
import { openCoinExchange } from '@/app/coinExchangeSlice';



// формат $1K вместо $1000
const fmt = (v: string | number) => formatMoneyShort(v);

export function Home() {
  const { user, isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();
  const { t, isLoading: isI18nLoading } = useTranslation();
  const dispatch = useAppDispatch();

  // Грузим расширенную статистику (rewardsCount и пр.) для корректного отображения «уровней/награды»
  useEffect(() => {
    if (isAuthenticated && user) {
      void dispatch(fetchUserStats());
    }
  }, [dispatch, isAuthenticated, user]);

  // Показываем загрузку пока проверяем авторизацию или пока не загрузились переводы
  if (isLoading || isI18nLoading) {
    return (
      <div className='p-2'>
        <div className='flex flex-col gap-4 pb-[calc(70px+env(safe-area-inset-bottom))]'>
          <div className='h-10 bg-white rounded-xl border border-gray-200 animate-pulse' />
          <div className='h-28 bg-white rounded-xl border border-gray-200 animate-pulse' />
          <div className='grid grid-cols-3 gap-4'>
            <div className='h-16 bg-white rounded-xl border border-gray-200 animate-pulse' />
            <div className='h-16 bg-white rounded-xl border border-gray-200 animate-pulse' />
            <div className='h-16 bg-white rounded-xl border border-gray-200 animate-pulse' />
          </div>
          <div className='h-12 bg-white rounded-full border border-gray-200 animate-pulse' />
        </div>
      </div>
    );
  }

  // Если пользователь не авторизован, показываем сообщение
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">{t('auth.loginRequired')}</div>
      </div>
    );
  }

  return (
    <div className='p-2'>
      <div className='flex flex-col gap-4 pb-[calc(70px+env(safe-area-inset-bottom))]'>
        <TopMenu />

        {/* баланс */}
        <div className='flex flex-col w-full h-full p-4 gap-4 items-start justify-between rounded-xl bg-[#0C54EA] relative overflow-hidden min-h-[120px]'>

          <div className='flex flex-col gap-0 items-start justify-center'> {/* сумма */}
            <p className='text-xs text-white'>{t('home.free')}</p>
            <p className='text-4xl font-semibold text-white'>{fmt(user.balance)}</p>
          </div>

          {/* Блок с монетами и уровнями/наградами */}
          <div className='flex items-center gap-3'>
            {/* Монеты */}
            <button 
              onClick={() => dispatch(openCoinExchange())}
              className='flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer'
            >
              <img src="/money.svg" alt="coins" className='w-6 h-6' />
              <span className='text-black font-semibold text-base'>{user.coins || 0}</span>
            </button>

            {/* Награды/уровни */}
            <div className='flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm'>
              <img src="/awards.svg" alt="awards" className='w-6 h-6' />
              <span className='text-black font-semibold text-base'>{user.rewardsCount || 0}</span>
            </div>
          </div>

          <div className='absolute right-4 top-4'> {/* сейф */}
             <img src="/vault.png" alt="vault" className='w-[113px] h-[77px]' />
          </div>

        </div>

        {/* меню действий */}

          <div className='w-full grid grid-cols-3 mt-3 mb-3 gap-4'> {/* сетка меню - две линии */}
            <BlockButton title={t('home.trials')} icon="/phone.svg" size='w-[23px] h-[43px]' onClick={() => void navigate('/trials')}/>
            <BlockButton 
              title={t('settings.premium.pro')}
              icon="/premium-lock.svg"
              size='w-[32px] h-[42px]' 
              onClick={() => void navigate('/home/premium')}
            />
            <BlockButton 
              title={t('home.openTrades')} 
              icon="/trade.svg" 
              size='w-[42px] h-[42px]'
              onClick={() => void navigate('/deals')}
            />
            <BlockButton title={t('nav.topInvestors')} icon="/pickaxe.svg" size='w-[42px] h-[38px]' onClick={() => void navigate('/rating')}/>
            <BlockButton 
              title={t('profile.rewards') || 'Награды'} 
              icon="/awards-arm.svg" 
              size='w-[42px] h-[35px]'
              onClick={() => void navigate('/rewards')}
            />
            <BlockButton 
              title={t('home.analytics')} 
              icon="/more-money.svg" 
              size='w-[60px] h-[31px]'
              onClick={() => void navigate('/analytics')}
            />
          </div>

        {/* кнопка начать торговлю */}

        <div className='flex items-center justify-center'
          onClick={() => {
            void navigate('/trade');
          }}
        >
          <Button className='w-full h-[48px] text-[16px] font-semibold text-white'>{t('landing.getStarted')}</Button>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}