import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { formatMoneyShort } from '../../lib/numberUtils';
import { symbolToCoinId } from '../../hooks/symbolToCoinId';
import { useCoinGeckoIcon } from '../../hooks/useCoinGeckoIcon';
import { dealService, type Deal } from '../../services/dealService';
import { useLiveDealProfits } from '@/hooks/useLiveDealProfits';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { useAppDispatch } from '../../app/hooks';
import { openDealInfo } from '../../app/dealModalSlice';
import LoadingScreen from '../../components/LoadingScreen';
import { useTranslation } from '@/lib/i18n';
import useLivePrices from '@/hooks/useLivePrices';
import { analyticsService } from '../../services/analyticsService';

type DealWithLiveData = Deal & {
  currentPrice?: string;
  liveProfit?: number;
};

type DealTab = 'active' | 'closed';

const fmtMoney = (v: string | number): string => formatMoneyShort(v);

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

const getCryptoIcon = (symbol: string): string => {
  const symbolMap: Record<string, string> = {
    BTC: '/trade/bitcoin.svg',
  };
  const baseSymbol = symbol.replace('USDT', '').replace('USD', '').toUpperCase();
  return symbolMap[baseSymbol] || '/trade/bitcoin.svg';
};

const getCryptoName = (symbol: string, t: (key: string, params?: Record<string, string | number>) => string): string => {
  const baseSymbol = symbol.replace('USDT', '').replace('USD', '');
  return t(`crypto.names.${baseSymbol}`) || t('crypto.names.default') || baseSymbol;
};

const safeNumber = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

export function DealList() {
  const [activeTab, setActiveTab] = useState<DealTab>('active');
  const [deals, setDeals] = useState<DealWithLiveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading] = useState(false);
  const [closingDeals, setClosingDeals] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  
  // Refs для предотвращения дублирования запросов
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDeals = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    try {
      setError(null);
      const userDeals = await dealService.getUserDeals();
      
      if (!mountedRef.current) return;
      
      const validDeals = userDeals.filter(deal => 
        deal && 
        typeof deal.id === 'number' && 
        deal.symbol && 
        deal.status &&
        ['open', 'closed'].includes(deal.status)
      );
      
      setDeals(validDeals);
    } catch (error) {
      console.error('Error loading deals:', error);
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to load deals');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        loadingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleEditDeal = useCallback((deal: DealWithLiveData) => {
    if (!deal.id || deal.status !== 'open') return;
    navigate(`/trade?edit=${deal.id}`);
  }, [navigate]);

  const handleTabChange = useCallback((tab: DealTab) => {
    setActiveTab(tab);
    setError(null);
  }, []);

  const handleCloseDeal = useCallback(async (dealId: number) => {
    if (closingDeals.has(dealId) || !dealId) return;
    
    try {
      setClosingDeals(prev => new Set(prev).add(dealId));
      
      const response = await dealService.closeDeal({ dealId });
      
      if (!mountedRef.current) return;
      
      const profitValue = safeNumber(response.profit);
      
      // Find the deal for analytics
      const closedDeal = deals.find(deal => deal.id === dealId);
      if (closedDeal) {
        const duration = closedDeal.openedAt 
          ? Date.now() - new Date(closedDeal.openedAt).getTime()
          : 0;
          
        analyticsService.trackTradeClosed(
          dealId,
          profitValue,
          duration,
          'manual'
        );
      }
       
      dispatch(openDealInfo({
        profit: parseFloat(profitValue.toFixed(2)),
        isProfit: profitValue >= 0,
      }));
      
      // Перезагружаем сделки после закрытия
      setTimeout(() => {
        if (mountedRef.current) {
          loadDeals();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error closing deal:', error);
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to close deal');
      }
    } finally {
      if (mountedRef.current) {
        setClosingDeals(prev => {
          const newSet = new Set(prev);
          newSet.delete(dealId);
          return newSet;
        });
      }
    }
  }, [closingDeals, dispatch, loadDeals]);

  const handleContinueTrading = useCallback(() => {
    navigate('/trade');
  }, [navigate]);

  // Live данные для активных сделок
  const openDealIds = useMemo(() => {
    return deals
      .filter(d => d.status === 'open' && typeof d.id === 'number')
      .map(d => d.id);
  }, [deals]);
  
  const { profits, isConnected } = useLiveDealProfits(openDealIds);

  // Обновление прибыли из WebSocket
  useEffect(() => {
    if (!openDealIds.length || !mountedRef.current) return;
    
    setDeals(prev => prev.map(d => {
      if (d.status !== 'open' || !d.id || !(d.id in profits)) {
        return d;
      }
      
      const liveProfit = profits[d.id];
      if (liveProfit && typeof liveProfit.profit === 'string') {
        return { 
          ...d, 
          profit: liveProfit.profit,
          liveProfit: safeNumber(liveProfit.profit)
        };
      }
      
      return d;
    }));
  }, [profits, openDealIds]);

  // Live цены для расчета прибыли на клиенте
  const openSymbols = useMemo(() => {
    const symbols = new Set<string>();
    deals.forEach(d => {
      if (d.status === 'open' && d.symbol) {
        symbols.add(d.symbol);
      }
    });
    return Array.from(symbols);
  }, [deals]);
  
  const { prices: livePrices } = useLivePrices(openSymbols);
  const [dealCommissionMap, setDealCommissionMap] = useState<Record<number, number>>({});

  // Загрузка комиссий для активных сделок
  useEffect(() => {
    if (!openDealIds.length) return;
    
    const loadCommissions = async () => {
      const missingCommissions = openDealIds.filter(id => 
        !dealCommissionMap[id] && typeof id === 'number'
      );
      
      if (!missingCommissions.length) return;
      
      const commissionPromises = missingCommissions.map(async id => {
        try {
          const res = await dealService.getDealCommission(id);
          const commission = safeNumber(res.commission);
          return { id, commission };
        } catch {
          const deal = deals.find(d => d.id === id);
          if (deal) {
            const volume = safeNumber(deal.amount) * safeNumber(deal.multiplier);
            return { id, commission: volume * 0.0005 };
          }
          return { id, commission: 0 };
        }
      });
      
      try {
        const results = await Promise.allSettled(commissionPromises);
        
        if (!mountedRef.current) return;
        
        setDealCommissionMap(prev => {
          const next = { ...prev };
          results.forEach(result => {
            if (result.status === 'fulfilled') {
              next[result.value.id] = result.value.commission;
            }
          });
          return next;
        });
      } catch (error) {
        console.error('Error loading commissions:', error);
      }
    };
    
    loadCommissions();
  }, [openDealIds, dealCommissionMap, deals]);

  // Расчет прибыли на основе live цен
  useEffect(() => {
    if (!openSymbols.length || !mountedRef.current) return;
    
    setDeals(prev => prev.map(d => {
      if (d.status !== 'open' || !d.symbol || !d.id) return d;
      
      // Если уже есть live profit от сервера, не перезаписываем
      if (d.id in profits && profits[d.id]?.profit != null) return d;
      
      const tick = livePrices[d.symbol.toUpperCase()];
      if (!tick?.price) return d;
      
      const openPrice = safeNumber(d.openPrice);
      const amount = safeNumber(d.amount);
      const multiplier = safeNumber(d.multiplier);
      const currentPrice = safeNumber(tick.price);
      
      if (!openPrice || !amount || !multiplier || !currentPrice) return d;
      
      const ratio = d.direction === 'up'
        ? (currentPrice - openPrice) / openPrice
        : (openPrice - currentPrice) / openPrice;
      
      const pnl = ratio * amount * multiplier;
      const commission = dealCommissionMap[d.id] || (amount * multiplier * 0.0005);
      const netProfit = pnl - commission;
      
      return { 
        ...d, 
        profit: netProfit.toFixed(2),
        currentPrice: currentPrice.toString(),
        liveProfit: netProfit
      };
    }));
  }, [livePrices, openSymbols, dealCommissionMap, profits]);

  // Фильтрованный список сделок
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => 
      activeTab === 'active' ? deal.status === 'open' : deal.status === 'closed'
    );
  }, [deals, activeTab]);

  const activeDealsCount = useMemo(() => 
    deals.filter(deal => deal.status === 'open').length
  , [deals]);
  
  const closedDealsCount = useMemo(() => 
    deals.filter(deal => deal.status === 'closed').length
  , [deals]);

  if (isLoading || isReloading) {
    return <LoadingScreen isLoading={true} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="text-red-500 text-center mb-4">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            loadDeals();
          }}
          className="bg-blue-500 text-white px-6 py-2 rounded"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* Top Navigation + Tab Buttons - Fixed */}
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
        
        <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="w-full flex bg-gray-100 rounded-[40px] p-1">
          <button
            onClick={() => handleTabChange('active')}
            className={`w-full px-4 py-2.5 rounded-[20px] text-sm font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-[#0C54EA] text-white'
                : 'text-black opacity-30'
            }`}
            type="button"
          >
            {t('deals.active') || 'Активные'}
          </button>
          <button
            onClick={() => handleTabChange('closed')}
            className={`w-full px-4 py-2.5 rounded-[20px] text-sm font-bold transition-all ${
              activeTab === 'closed'
                ? 'bg-[#0C54EA] text-white'
                : 'text-black opacity-30'
            }`}
            type="button"
          >
            {t('deals.closed') || 'Закрытые'}
          </button>
        </div>
        
        {/* Count Text */}
        <div className="text-left">
          <span className="text-sm text-black font-bold">
            {activeTab === 'active' 
              ? `${t('deals.activeCount') || 'Действующие'} (${activeDealsCount})` 
              : `${t('deals.closed')} (${closedDealsCount})`
            }
          </span>
        </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white">
        {/* Connection Status */}
      {activeTab === 'active' && openDealIds.length > 0 && (
        <div className="px-4 py-1">
          <div className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isConnected ? '🟢 Live updates active' : '🔴 Connecting...'}
          </div>
        </div>
      )}

      {/* Deals List */}
      <div className="flex-1 px-4 pb-[calc(80px+env(safe-area-inset-bottom))] space-y-3">
        {filteredDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-black mt-10">
            <img src="/deal/sleep-bear.svg" alt="" className="w-48 h-32 mb-6" />
            <p className="text-2xl font-bold text-center mb-6">
              {activeTab === 'active' 
                ? (t('deals.noOpenOrders') || 'У вас пока нет открытых ордеров') 
                : (t('deals.noClosedTrades') || 'У вас пока нет закрытых сделок')
              }
            </p>
            {activeTab === 'active' && (
              <Button
                onClick={handleContinueTrading}
                className="w-full px-6 py-3 bg-[#0C54EA] text-white font-bold text-base rounded-full hover:bg-blue-700"
              >
                {t('landing.getStarted')}
              </Button>
            )}
          </div>
        ) : (
          filteredDeals.map((deal) => (
            <DealCard
              key={`${deal.id}-${deal.status}`}
              deal={deal}
              closingDeals={closingDeals}
              onEdit={handleEditDeal}
              onClose={handleCloseDeal}
            />
          ))
        )}
      </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}

type DealCardProps = {
  deal: DealWithLiveData;
  closingDeals: Set<number>;
  onEdit: (deal: DealWithLiveData) => void;
  onClose: (dealId: number) => Promise<void>;
};

const DealCard = ({ deal, closingDeals, onEdit, onClose }: DealCardProps) => {
  const { t } = useTranslation();
  const coinId = symbolToCoinId[deal.symbol] || '';
  const { iconUrl: coinIconUrl } = useCoinGeckoIcon(coinId);

  const isClosing = deal.id ? closingDeals.has(deal.id) : false;
  const profitValue = safeNumber(deal.profit);
  const isProfit = profitValue >= 0;

  const handleEdit = useCallback(() => {
    if (deal.status === 'open') {
      onEdit(deal);
    }
  }, [deal, onEdit]);

  const handleClose = useCallback(() => {
    if (deal.id && deal.status === 'open' && !isClosing) {
      onClose(deal.id);
    }
  }, [deal.id, deal.status, isClosing, onClose]);

  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
      {/* Deal Header */}
      <div className="flex justify-between items-center p-1.5 sm:p-2 border-b border-gray-200">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <img 
            src={coinIconUrl || getCryptoIcon(deal.symbol)} 
            alt={getCryptoName(deal.symbol, t)} 
            className="w-8 h-8 sm:w-10 sm:h-10" 
          />
          <div className="flex flex-col">
            <div className="flex flex-col items-start gap-0.5 sm:gap-1">
              <span className="text-base sm:text-lg font-bold text-black">
                {getCryptoName(deal.symbol, t)}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] sm:text-xs font-medium text-black uppercase">
                  {deal.symbol.replace('USDT', '/USD')}
                </span>
                <div className={`w-3 h-3 sm:w-4 sm:h-4 ${deal.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  <img 
                    src={deal.direction === 'up' ? '/deal/up.svg' : '/deal/down.svg'} 
                    alt={deal.direction === 'up' ? t('trading.gain') : t('trading.loss')} 
                    className="w-full h-full" 
                  />
                </div>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs text-black opacity-50">
              {formatDate(deal.openedAt)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 sm:gap-1">
          <div className="flex items-center gap-1">
            <span className={`text-lg sm:text-xl font-extrabold uppercase ${
              isProfit ? 'text-green-500' : 'text-red-500'
            }`}>
              {isProfit ? '+' : ''}{fmtMoney(Math.abs(profitValue))}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs font-medium text-black">
              {fmtMoney(deal.amount)}
            </span>
            <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 border border-black rounded-full"></div>
            <span className="text-[10px] sm:text-xs font-medium text-black">
              {deal.multiplier}x
            </span>
          </div>
        </div>
      </div>

      {/* Deal Actions */}
      {deal.status === 'open' && (
        <div className="flex items-center justify-between p-2 sm:p-3">
          {/* TP/SL + Edit container */}
          <div className="bg-[#F1F7FF] rounded-[20px] p-1 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div
                className={`rounded-l-[999px] h-6 min-h-6 px-3 flex items-center justify-center ${
                  deal.takeProfit ? 'bg-[#2EBD85]' : 'bg-black/30'
                }`}
              >
                <span className="text-xs font-extrabold uppercase text-white">TP</span>
              </div>
              <div
                className={`rounded-r-[999px] h-6 min-h-6 px-3 flex items-center justify-center ${
                  deal.stopLoss ? 'bg-[#F6465D]' : 'bg-black/30'
                }`}
              >
                <span className="text-xs font-extrabold uppercase text-white">SL</span>
              </div>
            </div>
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-[20px] shadow-sm hover:bg-gray-50"
              aria-label={t('deal.edit') || 'Редактировать TP/SL'}
              type="button"
            >
              <img src="/deal/edit-deal.svg" alt={t('deal.edit') || 'Редактировать'} className="w-3 h-3" />
              <span className="text-xs font-bold text-blue-600">{t('deal.edit')}</span>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isClosing}
            className={`px-2 py-1.5 rounded-[40px] text-sm font-bold transition-colors ${
              isClosing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-[#0C54EA] text-white hover:bg-blue-700'
            }`}
            type="button"
          >
            {isClosing ? (t('deal.closing') || 'Закрытие...') : (t('deal.closeTrade') || 'Закрыть')}
          </button>
        </div>
      )}
    </div>
  );
};