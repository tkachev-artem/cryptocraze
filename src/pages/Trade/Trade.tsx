import { Card } from '../../components/ui/card';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { Grid } from '../../components/ui/grid';
import Chart from '../../components/Chart';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUser } from '../../app/userSlice';
import { fetchBinanceStats } from '../../app/binanceSlice';
import { selectBinanceStats, selectBinanceLoading, selectBinanceError } from '../../app/binanceSlice';
import { useCoinGeckoIcon } from '../../hooks/useCoinGeckoIcon';
import { symbolToCoinId } from '../../hooks/symbolToCoinId';

// Форматирование чисел: 2K, 4.95K, 1.2M
const formatNumberToK = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.]/g, '')) : value;
  if (isNaN(num)) return value;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(2).replace(/\.00$/, '') + 'K';
  return num.toString();
};

const CRYPTOCURRENCY = [
  { label: 'BTC/USDT', value: 'BTCUSDT', coingeckoId: 'bitcoin', name: 'Bitcoin' },
  { label: 'ETH/USDT', value: 'ETHUSDT', coingeckoId: 'ethereum', name: 'Ethereum' },
  { label: 'SOL/USDT', value: 'SOLUSDT', coingeckoId: 'solana', name: 'Solana' },
  { label: 'XRP/USDT', value: 'XRPUSDT', coingeckoId: 'ripple', name: 'XRP' },
  { label: 'DOGE/USDT', value: 'DOGEUSDT', coingeckoId: 'dogecoin', name: 'Dogecoin' },
];

const Trade = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const stats = useAppSelector(selectBinanceStats);
  const loadingStats = useAppSelector(selectBinanceLoading);
  const statsError = useAppSelector(selectBinanceError);
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTOCURRENCY[0]);
  const coinId = symbolToCoinId[selectedCrypto.value] || selectedCrypto.coingeckoId || '';
  const { iconUrl, loading } = useCoinGeckoIcon(coinId);
  console.log('iconUrl:', iconUrl, 'symbol:', selectedCrypto.value);
  const navigate = useNavigate();
  
  useEffect(() => {
    void dispatch(fetchUser());
    void dispatch(fetchBinanceStats(selectedCrypto.value));
    const interval = setInterval(() => {
      void dispatch(fetchBinanceStats(selectedCrypto.value));
    }, 60000);
    return () => { clearInterval(interval); };
  }, [dispatch, selectedCrypto]);

  const balance = user?.balance ?? '0.00';
  const tradesCount = user?.tradesCount ?? 0;

  const handleBuy = () => {
    console.log('Buy clicked');
  };

  const handleSell = () => {
    console.log('Sell clicked');
  };

  const handleProMode = () => {
    console.log('Pro Mode clicked');
  };

  return (
    <Grid className='p-2 pb-[70px]'>
      {/* Информация */}
      <div className="flex items-center gap-2 py-3">
        {/* Баланс */}
        <Card className="flex-1 border border-gray-200 rounded p-2">
          <div className="flex items-center justify-between gap-4">
            {/* Всего */}
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                <img src="/trade/wallet.svg" alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-black opacity-50">Всего</span>
                <span className="text-xs text-left font-extrabold text-black">${formatNumberToK(balance)}</span>
              </div>
            </div>

            {/* Свободно */}
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                <img src="/trade/money.svg" alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-black opacity-50">Свободно</span>
                <span className="text-xs text-left font-extrabold text-black">${formatNumberToK(balance)}</span>
              </div>
            </div>

            {/* Сделки */}
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                <img src="/trade/trades.svg" alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-black opacity-50">Сделки</span>
                <span className="text-xs text-left font-extrabold text-black">{tradesCount}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Список криптовалют */}
        <div>
          <img src="/top-menu/list.svg" alt="" className="w-6 h-6"
            onClick={() => {
              void navigate('/trade/list');
            }}
          />
        </div>
      </div>

      {/* Chart Section */}
      <Chart onProModeClick={handleProMode} onCryptoChange={setSelectedCrypto} />

      {/* Информация о криптовалюте */}
      <div className="py-4">
        {/* Карточка информации о криптовалюте */}
        <Card className="border border-gray-200 rounded-xl p-3 mb-2.5">
          <div className="flex items-center gap-1.5 mb-3">
            {/* Информация о криптовалюте */}
            <div className="flex items-center gap-2">
              <div className={
                !loading && iconUrl
                  ? ''
                  : 'w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center'
              }>
                {loading && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" aria-label="Загрузка иконки" tabIndex={0} />
                )}
                {!loading && iconUrl && (
                  <img
                    src={typeof iconUrl === 'string' ? iconUrl : '/avatar-big.svg'}
                    alt={selectedCrypto.name}
                    aria-label={selectedCrypto.name}
                    className="w-9 h-9"
                    tabIndex={0}
                    onError={e => { e.currentTarget.src = '/avatar-big.svg'; }}
                  />
                )}
                {!loading && !iconUrl && (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs" aria-label="Нет иконки" tabIndex={0}>?</div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-black">{selectedCrypto.name}</span>
                  <span className="text-xs font-medium text-black opacity-50 uppercase">{selectedCrypto.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-black">
                    {loadingStats ? '...' : stats?.lastPrice ? formatNumberToK(stats.lastPrice) : '—'}
                  </span>
                  <span className={`text-xs font-medium ${stats?.priceChangePercent && stats.priceChangePercent < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {loadingStats ? '...' : stats?.priceChangePercent ? `${stats.priceChangePercent > 0 ? '+' : ''}${stats.priceChangePercent.toFixed(2)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 24h Min/Max */}
          <div className="flex items-center justify-between gap-auto">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-black">
                Мин 24ч: {loadingStats ? '...' : stats?.lowPrice ? formatNumberToK(stats.lowPrice) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-black">
                Макс 24ч: {loadingStats ? '...' : stats?.highPrice ? formatNumberToK(stats.highPrice) : '—'}
              </span>
            </div>
          </div>
          {statsError && <div className="text-xs text-red-500 pt-1">{statsError}</div>}
        </Card>

        {/* Buy/Sell Buttons */}
        <div className="flex items-center gap-4 py-2">
          <button
            onClick={handleSell}
            className="flex-1 bg-[#F6465D] hover:bg-red-600 text-white font-bold text-base py-2.5 px-4 rounded-full"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                  <path d="M4 1L4 11M1 4L4 1L7 4" stroke="#F6465D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              Продать
            </div>
          </button>

          <button
            onClick={handleBuy}
            className="flex-1 bg-[#2EBD85] hover:bg-green-600 text-white font-bold text-base py-2.5 px-4 rounded-full"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                  <path d="M4 11L4 1M1 8L4 11L7 8" stroke="#2EBD85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              Купить
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </Grid>
  );
};

export default Trade; 