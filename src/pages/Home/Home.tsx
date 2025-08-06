import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useUser } from '../../hooks/useUser';
import { Grid } from '@/components/ui/grid';
import BlockButton from '../../components/BlockButton';
import BottomNavigation from '../../components/ui/BottomNavigation';
import TopMenu from '../../components/ui/TopMenu';

const formatNumberToK = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2).replace(/\.00$/, '') + 'K';
  return num.toString();
};

export function Home() {
  const { user, isAuthenticated, isLoading } = useUser();
  const navigate = useNavigate();

  console.log('Home component - user:', user, 'isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);

  // Показываем загрузку пока проверяем авторизацию
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  // Если пользователь не авторизован, показываем сообщение
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Требуется авторизация</div>
      </div>
    );
  }

  return (
    <Grid className='p-2'>
      <div className='flex flex-col gap-4 pb-[70px]'>
        <TopMenu />

        {/* баланс */}
        <div className='flex flex-col w-full h-full p-4 gap-4 items-start justify-between rounded-xl bg-[#0C54EA] relative'>

          <div className='flex flex-col gap-0 items-start justify-center'> {/* сумма */}
            <p className='text-xs text-white'>Свободно</p>
            <p className='text-4xl font-semibold text-white'>${formatNumberToK(user.balance)}</p>
          </div>

          <div className='flex flex-row gap-2 min-w-[198px]'>
            <Button variant='outline' className='w-full h-9 border-1 border-gray-300 bg-white text-black'>
              <div className='flex flex-row gap-2 items-center w-full justify-center'>
                <img src="/money.svg" alt="money" className='w-6 h-6' />
                <p className='text-[16px] font-semibold text-black'>{user.coins}</p>
              </div>
            </Button>

            <Button variant='outline' className='w-full h-9 border-1 border-gray-300 bg-white text-black'>
              <div className='flex flex-row gap-2 items-center w-full justify-center'>
                <img src="/awards.svg" alt="awards" className='w-6 h-6' />
                <p className='text-[16px] font-semibold text-black'>{user.ratingScore}</p>
              </div>
            </Button> 
          </div>

          <div className='absolute right-4 top-4'> {/* сейф */}
             <img src="/vault.png" alt="vault" className='w-[113px] h-[77px]' />
          </div>

        </div>

        {/* меню действий */}

          <div className='w-full grid grid-cols-3 grid-rows-2 gap-4'> {/* сетка меню */}
            <BlockButton title="Дивиденды" icon="/more-money.svg" size='w-[60px] h-[31px]' />
            <BlockButton title="Испытания" icon="/phone.svg" size='w-[23px] h-[43px]' />
            <BlockButton title="Топ инвесторов" icon="/pickaxe.svg" size='w-[42px] h-[38px]' />
            <BlockButton title="Награды" icon="/awards-arm.svg" size='w-[42px] h-[35px]' />
            <BlockButton title="Premium" icon="/premium-lock.svg" size='w-[32px] h-[42px]' />
            <BlockButton title="Сделки" icon="/trade.svg" size='w-[42px] h-[42px]' />
          </div>

        {/* кнопка начать торговлю */}

        <div className='flex py-[20px] items-center justify-center'
          onClick={() => {
            void navigate('/trade');
          }}
        >
          <Button className='w-full h-[48px] text-[16px] font-semibold text-white'>Начать торговлю</Button>
        </div>

      </div>
      <BottomNavigation />
    </Grid>
  );
}