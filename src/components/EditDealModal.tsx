import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { closeEditDeal, updateEditDealData, openDealInfo, setLastDismissedEditDealId } from '../app/dealModalSlice';
import { dealService, type UpdateDealRequest } from '../services/dealService';
import { useLiveDealProfits } from '@/hooks/useLiveDealProfits';
import { Button } from './ui/button';
import { ScrollLock } from './ui/ScrollLock';
import { useToast } from '../hooks/use-toast';
import { formatMoneyShort } from '../lib/numberUtils';
import { symbolToCoinId } from '../hooks/symbolToCoinId';
import { useCoinGeckoIcon } from '../hooks/useCoinGeckoIcon';
import type { AppDispatch, RootState } from '../app/store';
import type { Deal } from '../services/dealService';
import { useTranslation } from '@/lib/i18n';
import useLivePrices from '@/hooks/useLivePrices';

type EditDealDataLocal = { deal: Deal; takeProfit: string; stopLoss: string };
const selectIsEditDealOpen = (state: RootState): boolean => state.dealModal.isEditDealOpen;
const selectEditDealData = (state: RootState): EditDealDataLocal | null => state.dealModal.editDealData as unknown as EditDealDataLocal | null;

const getCryptoIcon = (symbol: string) => {
    const symbolMap: Record<string, string> = {
        'BTC': '/trade/bitcoin.svg',
        'ETH': '/trade/bitcoin.svg',
        'SOL': '/trade/bitcoin.svg',
        'XRP': '/trade/bitcoin.svg',
        'DOGE': '/trade/bitcoin.svg'
    };

    const baseSymbol = symbol.replace('USDT', '').replace('USD', '');
    return symbolMap[baseSymbol] || '/trade/chart.svg';
};

const getCryptoName = (symbol: string) => {
    const nameMap: Record<string, string> = {
        BTC: 'Bitcoin',
        ETH: 'Ethereum',
        SOL: 'Solana',
        XRP: 'XRP',
        DOGE: 'Dogecoin',
        BNB: 'BNB',
        ADA: 'Cardano',
        MATIC: 'Polygon',
        DOT: 'Polkadot',
        TRX: 'TRON',
        LTC: 'Litecoin',
        AVAX: 'Avalanche',
        SHIB: 'Shiba Inu',
        LINK: 'Chainlink',
        ATOM: 'Cosmos',
        XMR: 'Monero',
        UNI: 'Uniswap',
        BCH: 'Bitcoin Cash',
        ETC: 'Ethereum Classic',
        FIL: 'Filecoin',
        APT: 'Aptos',
        NEAR: 'NEAR',
        LDO: 'Lido DAO',
        ARB: 'Arbitrum',
        OP: 'Optimism',
        SUI: 'Sui',
        PEPE: 'Pepe',
        INJ: 'Injective',
        STX: 'Stacks',
        RUNE: 'Thorchain',
    };
    const baseSymbol = symbol.replace('USDT', '').replace('USD', '').toUpperCase();
    return nameMap[baseSymbol] || baseSymbol || '—';
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const fmtMoney = (v: string | number) => formatMoneyShort(v);

const formatTPSL = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num === 0) return '0.00';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
};

type EditDealModalProps = {
  bottomOffset?: number;
};

export const EditDealModal = ({ bottomOffset = 0 }: EditDealModalProps) => {
    // Убеждаемся, что bottomOffset всегда является числом
    const safeBottomOffset = typeof bottomOffset === 'number' ? bottomOffset : 0;
    const dispatch: AppDispatch = useAppDispatch();
    // Типобезопасные селекторы
    const isEditDealOpen = useAppSelector(selectIsEditDealOpen);
    const editDealData = useAppSelector(selectEditDealData);
    const isDealInfoOpen = useAppSelector((state: RootState) => state.dealModal.isDealInfoOpen);
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [showEditFields, setShowEditFields] = useState(false);
    const [liveProfit, setLiveProfit] = useState<string>('');
    const [dealCommission, setDealCommission] = useState<string>('');
    const [isCommissionLoading, setIsCommissionLoading] = useState(false);

    // Свайп для закрытия (справа налево)
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);
    const [translateX, setTranslateX] = useState<number>(0);
    const [isSwiping, setIsSwiping] = useState<boolean>(false);
    const [isHorizontalSwipe, setIsHorizontalSwipe] = useState<boolean>(false);

    const SWIPE_ACTIVATE_THRESHOLD_PX = 8;
    const SWIPE_CLOSE_THRESHOLD_PX = 50;

    // Live PnL через сокет
    // Данные активной сделки (объявляем раньше использования в зависимостях)
    const deal = editDealData?.deal;
    const takeProfit = editDealData?.takeProfit ?? '';
    const stopLoss = editDealData?.stopLoss ?? '';
    const currentDealId = deal?.id;
    const coinId = (deal?.symbol ? symbolToCoinId[deal.symbol] : undefined) ?? '';
    const { iconUrl: coinIconUrl } = useCoinGeckoIcon(coinId);

    const dealId = currentDealId;
    const { profits, isConnected } = useLiveDealProfits(dealId ? [dealId] : []);
    const { prices: livePrices } = useLivePrices(deal?.symbol ? [deal.symbol] : []);
    const [commissionNum, setCommissionNum] = useState<number | null>(null);

    // Функция для получения комиссии сделки
    const fetchDealCommission = useCallback(async () => {
        if (!editDealData?.deal) return;
        const currentDeal = editDealData.deal;
        setIsCommissionLoading(true);
        try {
            const commissionData: { commission: string } = await dealService.getDealCommission(currentDeal.id);
            setDealCommission(commissionData.commission);
            const num = Number.parseFloat(commissionData.commission);
            if (Number.isFinite(num)) setCommissionNum(num);
        } catch (error) {
            console.error('Ошибка при получении комиссии:', error);
            const volume = parseFloat(currentDeal.amount) * currentDeal.multiplier;
            const estimatedCommission = volume * 0.0005;
            setDealCommission(estimatedCommission.toFixed(2));
            setCommissionNum(estimatedCommission);
        } finally {
            setIsCommissionLoading(false);
        }
    }, [editDealData?.deal]);

    // Получаем комиссию через REST; прибыль — через сокет
    useEffect(() => {
        if (!isEditDealOpen || !dealId) return;
        void fetchDealCommission();
    }, [isEditDealOpen, dealId, fetchDealCommission]);

    useEffect(() => {
        if (!dealId) return;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const profit = profits[dealId]?.profit;
        if (profit) {
            setLiveProfit(String(profit));
        }
        // Клиентский пересчёт из live-цены
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (deal?.symbol) {
            const tick = livePrices[deal.symbol.toUpperCase()];
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (tick) {
                const open = Number.parseFloat(String(deal.openPrice));
                const amount = Number.parseFloat(String(deal.amount));
                const multiplier = Number(deal.multiplier);
                const current = Number(tick.price);
                if (Number.isFinite(open) && Number.isFinite(amount) && Number.isFinite(multiplier) && Number.isFinite(current)) {
                    const ratio = deal.direction === 'up'
                        ? (current - open) / open
                        : (open - current) / open;
                    const pnl = ratio * amount * multiplier;
                    const commission = Number.isFinite(Number(deal.commission))
                      ? Number(deal.commission)
                      : (commissionNum ?? (amount * multiplier * 0.0005));
                    const net = pnl - commission;
                    setLiveProfit(net.toFixed(2));
                }
            }
        }
    }, [profits, dealId, livePrices, deal, commissionNum]);

    // ПОЛНОСТЬЮ ОТКЛЮЧЕННЫЙ REST polling - используем ТОЛЬКО WebSocket
    useEffect(() => {
        console.log('EditDealModal: REST polling COMPLETELY DISABLED. Using only WebSocket. Connected:', isConnected, 'DealId:', dealId, 'Modal open:', isEditDealOpen);
        
        // НЕ ДЕЛАЕМ НИКАКИХ REST ЗАПРОСОВ!
        // Полагаемся только на WebSocket данные и клиентские расчеты
        
        return; // Просто выходим, никаких запросов
    }, [dealId, isEditDealOpen, isConnected]);

    // Событие для обучения: модалка редактирования открыта (стабильный порядок хуков)
    useEffect(() => {
      if (isEditDealOpen) {
        window.dispatchEvent(new Event('trade:tutorial:editDealOpened'));
      }
    }, [isEditDealOpen]);

    //

    const handleEditClick = () => {
        setShowEditFields((prev) => !prev);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleEditClick();
        }
    };

    const handleTakeProfitChange = (value: string) => {
        dispatch(updateEditDealData({ takeProfit: value }));
    };

    const handleStopLossChange = (value: string) => {
        dispatch(updateEditDealData({ stopLoss: value }));
    };

    const handleSave = async () => {
        const tpStr = (takeProfit || '').trim();
        const slStr = (stopLoss || '').trim();
        const hasTP = tpStr !== '' && tpStr !== '0';
        const hasSL = slStr !== '' && slStr !== '0';

        // Если пользователь ничего не ввёл, просто закрываем поля редактирования без запроса
        if (!hasTP && !hasSL) {
            setShowEditFields(false);
            return;
        }

        if (!currentDealId) return;
        setIsLoading(true);
        try {
            const updateData: UpdateDealRequest = { dealId: currentDealId };

            if (hasTP) {
                updateData.takeProfit = parseFloat(tpStr);
            }

            if (hasSL) {
                updateData.stopLoss = parseFloat(slStr);
            }

            const response = await dealService.updateDeal(updateData);

            // Обновляем данные в Redux store
            dispatch(updateEditDealData({
                takeProfit: response.takeProfit ?? takeProfit,
                stopLoss: response.stopLoss ?? stopLoss
            }));

            toast({ title: t('common.success'), description: t('deal.updated') || 'TP/SL обновлены' });

            // Скрываем поля редактирования
            setShowEditFields(false);
        } catch (error) {
            console.error('Ошибка при обновлении сделки:', error);
            toast({ title: t('common.error'), description: error instanceof Error ? error.message : (t('deal.updateFail') || 'Не удалось обновить сделку'), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseDeal = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!currentDealId) return;
            const closeResponse = await dealService.closeDeal({ dealId: currentDealId });

            const profitValue = parseFloat(closeResponse.profit);
            dispatch(openDealInfo({
                profit: parseFloat(profitValue.toFixed(2)),
                isProfit: profitValue >= 0,
            }));

            // Скрываем модалку редактирования после показа DealInfo (без отметки ручного закрытия)
            dispatch(closeEditDeal());
        } catch (error) {
            console.error('Ошибка при закрытии сделки:', error);
            toast({ title: t('common.error'), description: error instanceof Error ? error.message : (t('deal.closeFail') || 'Не удалось закрыть сделку'), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [currentDealId, dispatch, toast, t]);

    // Симуляция нажатия на "Закрыть сделку" из обучения (шаг 11)
    useEffect(() => {
      if (!isEditDealOpen) return;
      const handler = () => { void handleCloseDeal(); };
      window.addEventListener('trade:tutorial:simulateCloseDeal', handler);
      return () => { window.removeEventListener('trade:tutorial:simulateCloseDeal', handler); };
    }, [isEditDealOpen, handleCloseDeal]);

    // Обработчики жеста свайпа (справа налево) для закрытия
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        setTouchStartX(touch.clientX);
        setTouchStartY(touch.clientY);
        setTranslateX(0);
        setIsSwiping(true);
        setIsHorizontalSwipe(false);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStartX === null || touchStartY === null) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        if (!isHorizontalSwipe) {
            const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_ACTIVATE_THRESHOLD_PX;
            if (isHorizontal) {
                setIsHorizontalSwipe(true);
            } else {
                return; // не перехватываем вертикальный скролл
            }
        }

        // Для свайпа закрытия учитываем только движение влево (deltaX < 0)
        if (deltaX < 0) {
            console.log('Swiping left:', deltaX);
            setTranslateX(deltaX);
        } else {
            setTranslateX(0);
        }
    }, [touchStartX, touchStartY, isHorizontalSwipe]);

    const handleTouchEnd = useCallback(() => {
        console.log('TouchEnd:', { isHorizontalSwipe, translateX, threshold: SWIPE_CLOSE_THRESHOLD_PX, shouldClose: isHorizontalSwipe && Math.abs(translateX) > SWIPE_CLOSE_THRESHOLD_PX });
        if (isHorizontalSwipe && Math.abs(translateX) > SWIPE_CLOSE_THRESHOLD_PX) {
            console.log('Closing deal modal via swipe');
            // Скрываем модалку свайпом без запоминания как "отклоненную"
            // Это позволит пользователю открыть новую сделку
            dispatch(closeEditDeal());
        } else {
            console.log('Returning to place:', { isHorizontalSwipe, translateX });
            // Возвращаем на место
            setIsSwiping(false);
            setTranslateX(0);
        }
        setTouchStartX(null);
        setTouchStartY(null);
        setIsHorizontalSwipe(false);
    }, [isHorizontalSwipe, translateX, dispatch, SWIPE_CLOSE_THRESHOLD_PX]);

    // Проверяем открытые модалки Deal (AlertDeal)
    const isDealModalOpen = useAppSelector((state: RootState) => state.dealModal.isDealModalOpen);
    
    // Рендерим только при наличии данных, чтобы избежать состояния "Crypto" без инфо
    // Не показываем, если открыт DealInfo или Deal модалка (AlertDeal)
    if (!isEditDealOpen || !deal || isDealInfoOpen || isDealModalOpen) {
        return null;
    }

    return (
        <div 
            className="absolute inset-x-0 bottom-0 flex items-end justify-center z-50 pointer-events-none" 
            style={{ bottom: `${String(safeBottomOffset)}px` }}
            data-modal="edit-deal"
        >
            {showEditFields && (
                <div
                    className="fixed inset-0 bg-black/40 pointer-events-auto z-10"
                    aria-hidden="true"
                />
            )}
            <div
                className="rounded-t-2xl w-full mx-0 max-h-[calc(100dvh-120px)] overflow-y-auto pointer-events-auto px-0 relative z-20 border border-gray-200 shadow-sm"
                data-tutorial-target="edit-deal-card"
                onClick={(e) => { e.stopPropagation(); }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ 
                    transform: `translateX(${String(translateX)}px)`, 
                    transition: isSwiping ? 'none' : 'transform 200ms ease-out',
                    maxHeight: `calc(100dvh - ${String(safeBottomOffset + 120)}px)`
                }}
            >
                <ScrollLock enabled={isEditDealOpen} />
                
                <div className="space-y-4 bg-white">
                    {/* Deal Details */}
                    <div className="p-3">

                        {/* Header: Icon + Pair + Direction + Profit */}
                        <div className="flex justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <img
                                    src={coinIconUrl ?? getCryptoIcon(deal.symbol)}
                                    alt={getCryptoName(deal.symbol)}
                                    className="w-9 h-9"
                                />
                                <div className="flex flex-col text-left">
                                    <span className="text-base font-bold text-black">
                                        {getCryptoName(deal.symbol)}
                                    </span>
                                    <div className="flex items-center">
                                        <span className="text-xs font-medium text-black opacity-50 uppercase">
                                            {deal.symbol.replace('USDT', '/USD')}
                                        </span>
                                        <div className={`w-3 h-3 ${deal.direction === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                            <img
                                                src={deal.direction === 'up' ? '/deal/up.svg' : '/deal/down.svg'}
                                                alt={deal.direction === 'up' ? (t('trading.up') || 'Up') : (t('trading.down') || 'Down')}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1">
                                    <span className={`text-lg font-extrabold ${(() => {
                                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                        const src = liveProfit ?? deal.profit ?? '';
                                        const n = typeof src === 'number' ? src : Number.parseFloat(String(src));
                                        if (!Number.isFinite(n)) return 'text-green-500';
                                        return n >= 0 ? 'text-green-500' : 'text-red-500';
                                    })()}`}>
                                        {(() => {
                                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                            const src = liveProfit ?? deal.profit ?? '';
                                            const n = typeof src === 'number' ? src : Number.parseFloat(String(src));
                                            const value = Number.isFinite(n) ? n : 0;
                                            const s = value >= 0 ? '+' : '-';
                                            return `${s}${formatMoneyShort(Math.abs(value))}`;
                                        })()}
                                    </span>
                                </div>
            <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-black opacity-50">
                    {isCommissionLoading ? t('common.loading') : `${t('deal.commission')}: $${dealCommission}`}
                </span>
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        {isCommissionLoading ? (
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <img src="/about/about.svg" alt={t('common.info')} className="w-4 h-4 opacity-50" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Container: Open price (left) + Time (right) */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex flex-col text-left">
                                <span className="text-sm font-medium text-black opacity-50">{t('deal.openedAt')}</span>
                                <span className="text-sm font-bold text-black">{parseFloat(deal.openPrice).toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-left">
                                <span className="text-sm font-medium text-black">{t('deal.time')}</span>
                                <span className="text-sm font-bold text-black">{formatDate(deal.openedAt)}</span>
                            </div>
                        </div>

                        {/* Container: Sum/Multiplier */}
                        <div className="flex flex-col gap-1 text-left mb-5">
                            <span className="text-sm font-medium text-black opacity-50">{t('deal.sumAndMultiplier')}</span>
                            <span className="text-sm font-bold text-black">{fmtMoney(deal.amount)}, x{deal.multiplier}</span>
                        </div>

                        {/* TP/SL + Close Deal Button Section */}
                        <div className="flex flex-col gap-3 items-center justify-center w-full sm:flex-row sm:max-w-none max-w-xs mx-auto">
                            {/* TP/SL Container with background */}
                            <div className="bg-white border border-gray-200 rounded-[20px] p-1 flex items-center gap-2">
                                <div className="flex items-center gap-1 opacity-50">
                                    <div className="bg-white border border-black rounded-l-[20px] px-2.5 py-2 min-h-7 flex items-center justify-center">
                                        <span className="text-xs font-extrabold text-black uppercase text-center">TP: ${formatTPSL(takeProfit)}</span>
                                    </div>
                                    <div className="bg-white border border-black rounded-r-[20px] px-2.5 py-2 min-h-7 flex items-center justify-center">
                                        <span className="text-xs font-extrabold text-black uppercase text-center">
                                            SL: ${formatTPSL(stopLoss)}
                                        </span>
                                    </div>
                                </div>
                                <div 
                                    className="w-8 h-8 bg-white border border-gray-200 rounded-[20px] flex items-center justify-center shadow-sm cursor-pointer"
                                    onClick={handleEditClick}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={t('deal.editTpSl') || 'Edit TP/SL'}
                                    onKeyDown={handleEditKeyDown}
                                >
                                    <img src="/deal/edit.svg" alt={t('deal.edit') || 'Edit'} className="w-4 h-4" />
                                </div>
                            </div>
                            
                            {/* Close Deal Button without background */}
                            <Button
                                onClick={() => { void handleCloseDeal(); }}
                                disabled={isLoading}
                                className="min-h-[35px] bg-[#0C54EA] text-white !font-bold text-xs rounded-[20px] hover:bg-blue-700 disabled:bg-gray-400 px-8 py-2 w-full sm:w-auto"
                                data-tutorial-target="edit-deal-close"
                            >
                                {isLoading ? t('deal.closing') : t('deal.closeTrade')}
                            </Button>
                        </div>
                    </div>

                    {/* Edit Fields */}
                    {showEditFields && (
                        <div className="bg-white border border-gray-200 rounded-xl p-3">
                            <div className="flex flex-row gap-3">
                                {/* Take Profit */}
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-medium text-black opacity-50">{t('trading.takeProfit')}</span>
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            <img src="/about/about.svg" alt={t('common.info')} className="w-4 h-4 opacity-50" />
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder={t('placeholders.amount')}
                                        value={takeProfit}
                                        onChange={(e) => { handleTakeProfitChange(e.target.value); }}
                                        className="w-full h-11 border border-gray-300 rounded-lg px-2 text-base font-medium focus:outline-none focus:ring-1 focus:ring-[#0C46BE] focus:border-[#0C46BE]"
                                    />
                                </div>

                                {/* Stop Loss */}
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-medium text-black opacity-50">{t('trading.stopLoss')}</span>
                                        <div className="w-4 h-4 flex items-center justify-center">
                                            <img src="/about/about.svg" alt={t('common.info')} className="w-4 h-4 opacity-50" />
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder={t('placeholders.amount')}
                                        value={stopLoss}
                                        onChange={(e) => { handleStopLossChange(e.target.value); }}
                                        className="w-full h-11 border border-gray-300 rounded-lg px-2 text-base font-medium focus:outline-none focus:ring-1 focus:ring-[#0C46BE] focus:border-[#0C46BE]"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="pt-3">
                                <Button
                                    onClick={() => { void handleSave(); }}
                                    disabled={isLoading}
                                    className="w-full h-12 bg-[#0C54EA] text-white font-bold text-base rounded-full hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {isLoading ? t('common.loading') : t('common.save')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 