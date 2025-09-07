import { Card } from '../../components/ui/card';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { lazy, Suspense } from 'react';
const Chart = lazy(() => import('../../components/Chart'));
import { formatMoneyShort, formatNumberShort } from '../../lib/numberUtils';
import Deal from '../../components/Deal';
import { EditDealModal } from '../../components/EditDealModal';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import type { AppDispatch, RootState } from '../../app/store';
import type { Deal as DealModel } from '../../services/dealService';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchUser, fetchUserBalance } from '../../app/userSlice';
import { fetchBinanceStats } from '../../app/binanceSlice';
import useLiveStats from '@/hooks/useLiveStats';
import useLivePrices from '@/hooks/useLivePrices';
import { selectBinanceStats, selectBinanceLoading, selectBinanceError } from '../../app/binanceSlice';
import { useCoinGeckoIcon } from '../../hooks/useCoinGeckoIcon';
import { FastImage } from '../../components/ui/FastImage';
import { symbolToCoinId } from '../../hooks/symbolToCoinId';
import { openEditDeal } from '../../app/dealModalSlice';
import { dealService } from '../../services/dealService';
// import { useAppSelector as useSelector } from '../../app/hooks';
import UniversalTutorial from '../../components/UniversalTutorial';
import { useTranslation } from '@/lib/i18n';
import { useBottomNavigationHeight } from '@/hooks/useBottomNavigationHeight';
 

// Форматирование чисел: 2K, 4.95K, 1.2M
const fmtMoney = (v: string | number) => formatMoneyShort(v);
const fmtNum = (v: string | number) => formatNumberShort(v);

const CRYPTOCURRENCY = [
  { label: 'BTC/USDT', value: 'BTCUSDT', coingeckoId: 'bitcoin', name: 'Bitcoin' },
  { label: 'ETH/USDT', value: 'ETHUSDT', coingeckoId: 'ethereum', name: 'Ethereum' },
  { label: 'SOL/USDT', value: 'SOLUSDT', coingeckoId: 'solana', name: 'Solana' },
  { label: 'XRP/USDT', value: 'XRPUSDT', coingeckoId: 'ripple', name: 'XRP' },
  { label: 'DOGE/USDT', value: 'DOGEUSDT', coingeckoId: 'dogecoin', name: 'Dogecoin' },
];

const Trade = () => {
  const dispatch: AppDispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const reduxStats = useAppSelector(selectBinanceStats);
  const loadingStats = useAppSelector(selectBinanceLoading);
  const statsError = useAppSelector(selectBinanceError);
  const [selectedCrypto, setSelectedCrypto] = useState(CRYPTOCURRENCY[0]);
  const [isDealOpen, setIsDealOpen] = useState(false);
  const [dealDirection, setDealDirection] = useState<'up' | 'down'>('up');
  const coinId = symbolToCoinId[selectedCrypto.value] || selectedCrypto.coingeckoId || '';
  const { iconUrl, loading } = useCoinGeckoIcon(coinId);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const touchStartXRef = useRef<number | null>(null);
  // Забираем состояние dealModal одним селектором
  const dealModalState = useAppSelector((state: RootState) => state.dealModal) as { isEditDealOpen: boolean; isDealInfoOpen: boolean; lastDismissedEditDealId: number | null; editDealData?: { deal?: { symbol?: string } } };
  const { isEditDealOpen, isDealInfoOpen, lastDismissedEditDealId, editDealData } = dealModalState;
// Tutorial is now handled by UniversalTutorial component
const { height: bottomNavHeight, ref: bottomNavRef } = useBottomNavigationHeight();
  
  useEffect(() => {
    void dispatch(fetchUser({}));
    void dispatch(fetchUserBalance());
    void dispatch(fetchBinanceStats(selectedCrypto.value));
    const interval = setInterval(() => {
      void dispatch(fetchBinanceStats(selectedCrypto.value));
    }, 60000);
    const handleOpenDealFromTutorial = () => {
      setDealDirection('up');
      setIsDealOpen(true);
    };
    window.addEventListener('trade:tutorial:openDealModal', handleOpenDealFromTutorial);
    return () => { 
      clearInterval(interval);
      window.removeEventListener('trade:tutorial:openDealModal', handleOpenDealFromTutorial);
    };
  }, [dispatch, selectedCrypto]);

  // Поддержка выбора пары через query (?pair=SYMBOL)
  useEffect(() => {
    const pair = searchParams.get('pair');
    if (!pair) return;
    const found = CRYPTOCURRENCY.find(c => c.value.toUpperCase() === pair.toUpperCase());
    if (found) {
      setSelectedCrypto(found);
    }
  }, [searchParams]);

  // Live price via socket + REST fallback каждую секунду
  const { prices } = useLivePrices([selectedCrypto.value]);
  const { stats: liveStatsMap } = useLiveStats([selectedCrypto.value]);
  const priceData = prices[selectedCrypto.value];
  const livePrice = priceData && priceData.price;
  const live24h = liveStatsMap[selectedCrypto.value.toUpperCase()];

  // Блокируем свайп-назад (iOS Safari жест слева направо)
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartXRef.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartXRef.current === null) return;
      const deltaX = e.touches[0].clientX - touchStartXRef.current;
      const startFromEdge = touchStartXRef.current <= 20; // жест от левого края
      if (startFromEdge && deltaX > 10) {
        e.preventDefault();
      }
    };
    const handleTouchEnd = () => {
      touchStartXRef.current = null;
    };
    const el = document.getElementById('trade-root') ?? document.body;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, []);

// Автозапуск обучения при первом входе на /trade (если не завершено ранее)
// Tutorial start is now handled by UniversalTutorial component

  // Обработка параметра редактирования сделки
  useEffect(() => {
    const editDealId = searchParams.get('edit');
    // Если открыт DealInfo — не открываем EditDealModal по URL-параметру
    if (editDealId && !isDealInfoOpen) {
      const handleEditDeal = async () => {
        try {
          const deals = await dealService.getUserDeals();
          const numericId = Number(editDealId);
          const dealToEdit = deals.find((deal): deal is DealModel => deal.id === numericId);
          if (dealToEdit) {
            dispatch(openEditDeal(dealToEdit));
          }
        } catch (error) {
          console.error('Ошибка при загрузке сделки для редактирования:', error);
        }
      };
      void handleEditDeal();
    }
  }, [searchParams, dispatch, isDealInfoOpen]);

  // Если параметра edit нет — показываем последнюю активную сделку в EditDealModal
  useEffect(() => {
    const editDealId = searchParams.get('edit');
    // Не авто-открываем, если уже открыта модалка редактирования ИЛИ открыт DealInfo
    if (editDealId || isEditDealOpen || isDealInfoOpen) {
      return;
    }

    const openLastActiveDeal = async () => {
      try {
        const deals = await dealService.getUserDeals();
        const activeDeals = deals.filter((d) => d.status === 'open');
        if (activeDeals.length === 0) return;

        // Выбираем последнюю активную: по дате, fallback по id
        const lastActive = activeDeals
          .slice()
          .sort((a, b) => {
            const aTime = a.openedAt ? new Date(a.openedAt).getTime() : 0;
            const bTime = b.openedAt ? new Date(b.openedAt).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return b.id - a.id;
          })[0];

        // lastActive всегда truthy из-за проверки length и выбора [0]
        // Не открываем, если пользователь закрыл эту же сделку вручную
        if (lastDismissedEditDealId && lastActive.id === lastDismissedEditDealId) {
          return;
        }
        dispatch(openEditDeal(lastActive));
      } catch (error) {
        console.error('Ошибка при загрузке последней активной сделки:', error);
      }
    };

    void openLastActiveDeal();
  }, [searchParams, isEditDealOpen, isDealInfoOpen, lastDismissedEditDealId, dispatch]);

  const balance = user?.balance ?? '0.00';
  const freeBalance = user?.freeBalance ?? '0.00';
  const tradesCount = user?.tradesCount ?? 0;
  const isProEnabled = Boolean(user?.isPremium) || (user?.proModeUntil ? new Date(user.proModeUntil) > new Date() : false);

  const handleBuy = () => {
    setDealDirection('up');
    setIsDealOpen(true);
    window.dispatchEvent(new Event('trade:tutorial:buyOrSell'));
  };

  const handleSell = () => {
    setDealDirection('down');
    setIsDealOpen(true);
    window.dispatchEvent(new Event('trade:tutorial:buyOrSell'));
  };

  

  const handleProMode = () => {
    if (isProEnabled) {
      void navigate('/trade/pro');
      return;
    }
    void navigate('/home/premium');
  };

  // const handleGoLive = () => {
  //   void navigate('/live');
  // };


  return (
    <div id='trade-root' className="h-full bg-white relative">
    <div className={`p-2 ${isDealOpen ? 'pb-[calc(8px+env(safe-area-inset-bottom))]' : 'pb-[calc(56px+env(safe-area-inset-bottom))]'}`}>

        {/* Информация */}
      <div className="flex items-center gap-2 py-3">
        {/* Баланс */}
        <Card className="flex-1 border border-gray-200 rounded p-2" data-tutorial-target="balance-summary">
          <div className="flex items-center justify-between gap-4">
            {/* Всего */}
            <div className="flex items-center gap-1" data-tutorial-target="wallet-total">
              <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                <img src="/trade/wallet.svg" alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-black opacity-50">{t('wallet.total')}</span>
                <span className="text-xs text-left font-extrabold text-black">{fmtMoney(balance)}</span>
              </div>
            </div>

            {/* Свободно */}
            <div className="flex items-center gap-1" data-tutorial-target="wallet-free">
              <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                <img src="/trade/money.svg" alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-black opacity-50">{t('home.free')}</span>
                <span className="text-xs text-left font-extrabold text-black">{fmtMoney(freeBalance)}</span>
              </div>
            </div>

            {/* Сделки */}
              <div className="flex items-center gap-1">
              <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">
                <img src="/trade/trades.svg" alt="" className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                  <span className="text-xs font-bold text-black opacity-50">{t('trading.tradesShort')}</span>
                <span className="text-xs text-left font-extrabold text-black">{tradesCount}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Список криптовалют и переход на Live */}
        <div className="flex items-center gap-3">
          <img
            src="/top-menu/list.svg"
            alt=""
            className="w-6 h-6 cursor-pointer"
            tabIndex={0}
            aria-label={t('trading.selectPair')}
            onClick={() => { void navigate('/trade/list'); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void navigate('/trade/list');
              }
            }}
          />
        </div>
      </div>

      {/* Pro Mode кнопка отображается в Chart */}

      {/* Chart Section */}
      <Suspense fallback={
        <div className="bg-gray-50 relative">
          <div className="w-full h-[260px] bg-white rounded-md border border-gray-200 animate-pulse" />
        </div>
      }>
        <Chart
          onProModeClick={handleProMode}
          onCryptoChange={setSelectedCrypto}
          forcedCryptoValue={(isEditDealOpen && editDealData?.deal?.symbol ? editDealData.deal.symbol : selectedCrypto.value)}
          isDealOpenOverride={isDealOpen}
        />
      </Suspense>

      {/* Информация о криптовалюте */}
      <div className="py-4">
        {/* Карточка информации о криптовалюте */}
        <Card className="border border-gray-200 rounded-xl p-3 mb-2.5" data-tutorial-target="crypto-info">
          <div className="flex items-center gap-1.5 mb-3">
            {/* Информация о криптовалюте */}
            <div className="flex items-center gap-2">
              <FastImage
                src={iconUrl}
                coinId={coinId}
                alt={selectedCrypto.name}
                className="w-9 h-9 rounded-full"
                fallbackClassName="w-9 h-9 rounded-full"
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-black">{selectedCrypto.name}</span>
                  <span className="text-xs font-medium text-black opacity-50 uppercase">{selectedCrypto.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-black">
                    {Number.isFinite(livePrice) ? fmtNum(livePrice) : (loadingStats ? '...' : reduxStats?.lastPrice ? fmtNum(reduxStats.lastPrice) : '—')}
                  </span>
                  <span className={`text-xs font-medium ${((live24h?.priceChangePercent ?? reduxStats?.priceChangePercent ?? 0) < 0) ? 'text-red-500' : 'text-green-500'}`}>
                    {(live24h && Number.isFinite(live24h.priceChangePercent)) ? `${(live24h.priceChangePercent > 0 ? '+' : '')}${live24h.priceChangePercent.toFixed(2)}%` : (loadingStats ? '...' : (reduxStats && reduxStats.priceChangePercent) ? `${reduxStats.priceChangePercent > 0 ? '+' : ''}${reduxStats.priceChangePercent.toFixed(2)}%` : '—')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 24h Min/Max */}
          <div className="flex items-center justify-between gap-auto">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-black">
              {t('trading.min24h')}: {(live24h && Number.isFinite(live24h.lowPrice)) ? fmtNum(live24h.lowPrice) : (loadingStats ? '...' : (reduxStats && reduxStats.lowPrice) ? fmtNum(reduxStats.lowPrice) : '—')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-black">
              {t('trading.max24h')}: {(live24h && Number.isFinite(live24h.highPrice)) ? fmtNum(live24h.highPrice) : (loadingStats ? '...' : (reduxStats && reduxStats.highPrice) ? fmtNum(reduxStats.highPrice) : '—')}
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
            data-tutorial-target="sell-button"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                  <path d="M4 11L4 1M1 8L4 11L7 8" stroke="#F6465D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {t('trading.sell')}
            </div>
          </button>

          <button
            onClick={handleBuy}
            className="flex-1 bg-[#2EBD85] hover:bg-green-600 text-white font-bold text-base py-2.5 px-4 rounded-full"
            data-tutorial-target="buy-button"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                  <path d="M4 1L4 11M1 4L4 1L7 4" stroke="#2EBD85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {t('trading.buy')}
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation ref={bottomNavRef} />

      {/* Deal Modal */}
          <Deal
        isOpen={isDealOpen}
        onClose={() => { setIsDealOpen(false); }}
        cryptoData={{
          symbol: selectedCrypto.value,
          name: selectedCrypto.name,
              price: Number.isFinite(livePrice) ? String(livePrice) : (loadingStats ? '...' : reduxStats?.lastPrice ? reduxStats.lastPrice.toString() : '0'),
          iconUrl: iconUrl ?? undefined
        }}
        userBalance={balance}
        direction={dealDirection}
        bottomOffset={bottomNavHeight}
      />

      {/* EditDeal Modal */}
      {/* EditDealModal выводим, только если DealInfo закрыт, чтобы исключить гонку и скрытие DealInfo */}
      {!isDealInfoOpen && <EditDealModal bottomOffset={bottomNavHeight} />}

      {/* Trade Tutorial - New System */}
      <UniversalTutorial type="trade" autoStart={true} />
    </div>
    </div>
  );
};

export default Trade; 