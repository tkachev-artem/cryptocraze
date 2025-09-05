import { useState, useRef, useEffect, useCallback } from 'react';
import { Slider } from './ui/slider';
import { useTradingWithNotifications } from '../hooks/useTradingWithNotifications';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { openDealModal, closeDealModal, openMoreInfo } from '../app/dealModalSlice';
import { fetchUserBalance } from '../app/userSlice';
import { openEditDeal } from '../app/dealModalSlice';
import type { Deal as DealModel } from '../services/dealService';
import type { RootState } from '../app/store';
import { store } from '../app/store';
import AlertDeal from './AlertDeal';
import MoreInfo from './MoreInfo';
import { dealService, type OpenDealResponse, type OpenDealRequest } from '../services/dealService';
import { fundsService } from '../services/fundsService';
import { toast } from '../hooks/use-toast';
import { formatMoneyShort } from '../lib/numberUtils';
import { useTranslation } from '@/lib/i18n';
import { analyticsService } from '../services/analyticsService';
 

// Унифицированный парсер денежных значений
const parseMoney = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  return parseFloat(String(value).replace(/[^\d.]/g, '')) || 0;
};

type DealProps = {
    isOpen: boolean;
    onClose: () => void;
    cryptoData: {
        symbol: string;
        name: string;
        price: string;
        iconUrl?: string;
    };
    userBalance: string;
    direction: 'up' | 'down';
    bottomOffset?: number;
};

type DealStatus = 'creating' | 'open';

const Deal = ({ isOpen, onClose, cryptoData, userBalance, direction, bottomOffset = 0 }: DealProps) => {
    const [amount, setAmount] = useState('500');
    const [multiplier, setMultiplier] = useState('5');
    const [takeProfit, setTakeProfit] = useState('0');
    const [stopLoss, setStopLoss] = useState('0');
    const [dealStatus, setDealStatus] = useState<DealStatus>('creating');
    const [dealStartTime, setDealStartTime] = useState<Date | null>(null);
    const [openPrice, setOpenPrice] = useState<string>('');
    const [localDirection, setLocalDirection] = useState<'up' | 'down'>(direction);
    const [pendingOpenedDealId, setPendingOpenedDealId] = useState<number | null>(null);

    const dispatch = useAppDispatch();
    const modalRef = useRef<HTMLDivElement | null>(null);
    const touchStartXRef = useRef<number | null>(null);
    const isPremium = useAppSelector((state: RootState) => {
      const user = state.user.user;
      if (user && typeof user === 'object' && 'isPremium' in user) {
        return Boolean((user as { isPremium?: boolean }).isPremium);
      }
      return false;
    });
    const freeBalance = useAppSelector((state: RootState) => parseMoney(state.user.user?.freeBalance));
    const { t } = useTranslation();

    // Live цены для отображения текущей цены — не используются в модалке, удалено

    // Для слайдера и базовой суммы используем свободный баланс; если его нет — падаем обратно на общий баланс из пропсов
    const sliderBaseBalance = freeBalance > 0 ? freeBalance : parseMoney(userBalance);

    useEffect(() => {
        if (isOpen) {
            setLocalDirection(direction);
            dispatch(openDealModal());
            // Событие для обучения: модалка сделки открыта
            window.dispatchEvent(new Event('trade:tutorial:dealModalOpened'));
            // Устанавливаем базовое значение 5% от свободного баланса
            const baseAmount = (sliderBaseBalance * 5) / 100;
            setAmount(String(Math.round(baseAmount)));
            
            // Блокируем скролл на body
            document.body.style.overflow = 'hidden';
        } else {
            dispatch(closeDealModal());
            // Восстанавливаем скролл на body
            document.body.style.overflow = '';
        }
        
        // Очистка при размонтировании
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, direction, dispatch, sliderBaseBalance]);

    

    const { createNotificationViaAPI } = useTradingWithNotifications();

    // Расчёт объёма и предварительной комиссии для отображения
    const volume = parseFloat(amount) * parseFloat(multiplier);
    const estimatedCommission = volume * 0.0005; // 0.05% предварительная комиссия для UI

    const handleAmountChange = (value: string) => {
        setAmount(value);
    };

    const handleSliderChange = (percentage: number) => {
        const clamped = Math.max(0, Math.min(percentage, 100));
        if (clamped === 100) {
            setAmount(String(Math.round(sliderBaseBalance * 100) / 100));
            return;
        }
        const newAmount = (sliderBaseBalance * clamped) / 100;
        setAmount(String(Math.round(newAmount)));
    };

    const handleMultiplierChange = (value: string) => {
        setMultiplier(value);
    };

    const handleTakeProfitChange = (value: string) => {
        setTakeProfit(value);
    };

    const handleStopLossChange = (value: string) => {
        setStopLoss(value);
    };

    const handleBuy = useCallback(async () => {
        try {
            // Notify tutorial that user clicked the buy button (for step 9)
            window.dispatchEvent(new Event('trade:tutorial:buyButtonClicked'));
            
            // Проверяем и при необходимости пополняем свободные средства до 30%
            const requiredAmount = Number(amount) || 0;

            const stateBefore = store.getState();
            const freeBefore = parseMoney(stateBefore.user.user?.freeBalance);

            if (requiredAmount > 0 && freeBefore < requiredAmount) {
                try {
                    await fundsService.ensureFreeFunds(requiredAmount);
                } catch (err: unknown) {
                    console.error('ensure-free request failed:', err);
                }
                await dispatch(fetchUserBalance());

                const stateAfter = store.getState();
                const freeAfter = parseMoney(stateAfter.user.user?.freeBalance);

                if (freeAfter < requiredAmount) {
                    toast({ title: t('trading.insufficientBalance'), description: `${t('home.free')}: $${freeAfter.toFixed(2)}. ${t('trading.amount')}: $${requiredAmount.toFixed(2)}.`, variant: 'destructive' });
                    return;
                }
            }

            // Формируем строго типизированный объект
            const dealData: OpenDealRequest = {
                symbol: cryptoData.symbol,
                direction: localDirection,
                amount: Number(amount),
                multiplier: Number(multiplier),
            };
            if (takeProfit && Number(takeProfit) > 0) {
                dealData.takeProfit = Number(takeProfit);
            }
            if (stopLoss && Number(stopLoss) > 0) {
                dealData.stopLoss = Number(stopLoss);
            }

            

            const response: OpenDealResponse = await dealService.openDeal(dealData);
            
            // Track analytics event
            analyticsService.trackTradeOpen(
                cryptoData.symbol,
                parseFloat(amount),
                localDirection,
                parseFloat(multiplier)
            );
            
            // Сохраняем данные сделки
            setDealStartTime(new Date(response.openedAt));
            setOpenPrice(response.openPrice);
            setDealStatus('open');
            setPendingOpenedDealId(response.id);

            // Обновляем баланс пользователя
            await dispatch(fetchUserBalance());

            // Создаём уведомление об открытии сделки
            await createNotificationViaAPI({ type: 'trade_opened', title: t('trading.tradeOpened'), message: `${t('trading.openTrade')}: ${cryptoData.symbol} ${t('trading.amount')}: ${amount} USDT` });

            
        } catch (error: unknown) {
            console.error('Error opening deal:', error);
            // Здесь можно добавить обработку ошибок (показать toast, etc.)
        }
    }, [amount, cryptoData.symbol, localDirection, multiplier, takeProfit, stopLoss, dispatch, createNotificationViaAPI, t]);

    // Симуляция нажатия Купить/Продать из обучения (шаг 10)
    useEffect(() => {
      if (!isOpen) return;
      const handler = () => { void handleBuy(); };
      window.addEventListener('trade:tutorial:simulateBuy', handler);
      return () => { window.removeEventListener('trade:tutorial:simulateBuy', handler); };
    }, [isOpen, handleBuy]);

    const handleCloseModal = () => {
        setDealStatus('creating');
        onClose();
        dispatch(closeDealModal());
    };

    const handleAlertOk = async () => {
        // Закрываем текущее окно сделки
        setDealStatus('creating');
        onClose();
        dispatch(closeDealModal());

        // Затем открываем EditDealModal для только что открытой сделки
        if (!pendingOpenedDealId) return;
        try {
            if (store.getState().dealModal.isDealInfoOpen) return;
            const userDeals = await dealService.getUserDeals();
            const newlyOpened = userDeals.find((d): d is DealModel => d.id === pendingOpenedDealId);
            if (newlyOpened) {
                dispatch(openEditDeal(newlyOpened));
            }
        } catch (e) {
            console.error('Не удалось открыть редактирование после подтверждения алерта:', e);
        } finally {
            setPendingOpenedDealId(null);
        }
    };

    // Форматирование чисел
    const fmtMoney = (v: string | number) => formatMoneyShort(v);

    // Массив вариантов мультипликатора (обновлён)
    const MULTIPLIERS = [
      { label: 'X1', value: '1' },
      { label: 'X5', value: '5' },
      { label: 'X8', value: '8', premium: true },
      { label: 'X10', value: '10', premium: true },
      { label: 'X13', value: '13', premium: true },
      { label: 'X20', value: '20', premium: true },
    ];

    const [multiplierDropdownOpen, setMultiplierDropdownOpen] = useState(false);
    const multiplierDropdownRef = useRef<HTMLDivElement>(null);

    // Закрытие по клику вне
    useEffect(() => {
      if (!multiplierDropdownOpen) return;
      const handleClick = (e: MouseEvent) => {
        if (multiplierDropdownRef.current && !multiplierDropdownRef.current.contains(e.target as Node)) {
          setMultiplierDropdownOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClick);
      return () => { document.removeEventListener('mousedown', handleClick); };
    }, [multiplierDropdownOpen]);

    // Блокируем системный свайп-назад (iOS, слева-направо) внутри модалки
    useEffect(() => {
        if (!isOpen) return;
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            touchStartXRef.current = e.touches[0].clientX;
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (touchStartXRef.current == null) return;
            const deltaX = e.touches[0].clientX - touchStartXRef.current;
            const startFromEdge = touchStartXRef.current <= 20;
            if (startFromEdge && deltaX > 10) {
                e.preventDefault();
            }
        };
        const handleTouchEnd = () => { touchStartXRef.current = null; };
        const el = modalRef.current ?? document.body;
        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        return () => {
            el.removeEventListener('touchstart', handleTouchStart as EventListener);
            el.removeEventListener('touchmove', handleTouchMove as EventListener);
            el.removeEventListener('touchend', handleTouchEnd as EventListener);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
        {dealStatus === 'creating' && (
        <div ref={modalRef} className="absolute inset-0 z-[60] flex items-end justify-center overflow-hidden" style={{ bottom: `calc(${String(bottomOffset)}px + env(safe-area-inset-bottom))` }}>
            {/* Overlay */}
            <div
                className={"absolute inset-0 bg-black/40"}
                onClick={handleCloseModal}
                aria-label={t('common.close')}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Escape') { handleCloseModal(); } }}
            />

            {/* Deal Modal */}
            <div className="relative w-full max-w-none mx-0 sm:max-w-md min-h-[350px] sm:min-h-[400px] bg-white rounded-t-xl sm:rounded-t-2xl pt-2 sm:pt-3 pb-[35px] sm:pb-[40px] px-3 sm:px-4 overflow-y-auto overscroll-contain touch-pan-y">
                
                {dealStatus === 'creating' ? (
                    // Состояние создания сделки
                    <div className="space-y-1.5 sm:space-y-2">
                        {/* Направление сделки */}
                        <div className="flex items-center justify-center gap-2 sm:gap-3" data-tutorial-target="deal-direction-toggle">
                            <span className="text-xs sm:text-sm font-medium text-black">{t('trading.short')}</span>
                            <div className="relative h-[24px] sm:h-[27px] flex items-center justify-center">
                                <button
                                    onClick={() => { setLocalDirection(localDirection === 'up' ? 'down' : 'up'); }}
                                    className={`relative w-8 h-4 sm:w-10 sm:h-5 rounded-full transition-all duration-200 ${localDirection === 'up'
                                        ? 'bg-[#2EBD85]'
                                        : 'bg-[#F6465D]'
                                    }`}
                                    aria-label={localDirection === 'up' ? t('trading.short') : t('trading.long')}
                                    tabIndex={0}
                                >
                                    <div className={`absolute top-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full transition-all duration-200 shadow-sm flex items-center justify-center ${localDirection === 'up' ? 'right-0.5' : 'left-0.5'
                                        }`}>
                                        {localDirection === 'up' ? (
                                            <img src="/deal/up.svg" alt="up" className="w-[5px] h-[7px] sm:w-[6px] sm:h-[9px]" />
                                        ) : (
                                            <img src="/deal/down.svg" alt="down" className="w-[6px] h-[9px]" />
                                        )}
                                    </div>
                                </button>
                            </div>
                            <span className="text-sm font-medium text-black">{t('trading.long')}</span>
                        </div>

                        {/* Сумма */}
                        <div className="flex flex-col items-start justify-center gap-1">
                            <label className="text-sm font-medium text-black opacity-50">{t('trading.amount')}</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => { handleAmountChange(e.target.value); }}
                                placeholder={t('placeholders.number')}
                                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 outline-none focus:border-[#0C46BE]"
                                data-tutorial-target="deal-amount"
                                aria-label={t('trading.amount')}
                            />
                        </div>

                        {/* Слайдер процентов */}
                        <div className="space-y-4 mt-4" data-tutorial-target="deal-slider">
                            <Slider
                                value={[(() => {
                                    const amountValue = parseFloat(amount) || 0;
                                    if (sliderBaseBalance === 0) return 5; // Базовое значение 5%
                                    const percentage = (amountValue / sliderBaseBalance) * 100;
                                    // Находим ближайшее значение из allowedPercents: [0, 5, 10, 25, 50, 75, 90, 100]
                                    const allowedPercents = [0, 5, 10, 25, 50, 75, 90, 100];
                                    const nearest = allowedPercents.reduce((prev, curr) => 
                                        Math.abs(curr - percentage) < Math.abs(prev - percentage) ? curr : prev
                                    );
                                    return Math.max(5, nearest); // Минимум 5%
                                })()]}
                                onValueChange={(value) => { handleSliderChange(value[0]); }}
                                className="w-full"
                                    aria-label={t('home.free')}
                            />
                        </div>

                        {/* Мультипликатор */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-1">
                                <label className="text-sm font-medium text-black opacity-50">{t('trading.leverage')}</label>
                                <button 
                                    onClick={() => { 
                                        dispatch(openMoreInfo('multiplier')); 
                                    }}
                                    className="w-4 h-4 opacity-50 hover:opacity-100 transition-opacity"
                                        aria-label={t('trading.leverage')}
                                >
                                    <img src="/deal/alert.svg" alt="Информация" className="w-4 h-4" />
                                </button>
                            </div>
                            <div className='flex flex-row items-start justify-center gap-4'>
                                {/* Кастомный dropdown */}
                                <div className="relative flex-1" ref={multiplierDropdownRef}>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 h-[44px] justify-between px-4 py-2 border border-[#0C46BE] rounded-lg bg-white focus:outline-none w-full min-w-[90px]"
                                        aria-haspopup="listbox"
                                        aria-expanded={multiplierDropdownOpen}
                                        tabIndex={0}
                                        aria-label={t('trading.leverage')}
                                        data-tutorial-target="deal-multiplier"
                                        onClick={() => { setMultiplierDropdownOpen((v) => !v); }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') setMultiplierDropdownOpen((v) => !v);
                                            if (e.key === 'Escape') setMultiplierDropdownOpen(false);
                                        }}
                                    >
                                        <span className="text-base font-medium text-black flex items-center">
                                                {MULTIPLIERS.find(m => m.value === multiplier)?.label ?? (t('common.select') || 'Select')}
                                        </span>
                                        <img
                                            src="/trade/down-arrow.svg"
                                            alt=""
                                            className={`w-3 h-3 transition-transform duration-200 ${multiplierDropdownOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {multiplierDropdownOpen && (
                                        <ul
                                            className="absolute z-10 w-full bg-white border border-gray-200 rounded shadow-lg animate-fade-in"
                                            role="listbox"
                                            tabIndex={-1}
                                        >
                                            {MULTIPLIERS.map((m) => {
                                                const isPremiumMultiplier = m.premium;
                                                const disabled = isPremiumMultiplier && !isPremium;
                                                return (
                                                    <li
                                                        key={m.value}
                                                        role="option"
                                                        aria-selected={multiplier === m.value}
                                                        className={`px-4 py-1 cursor-pointer text-sm border-t border-t-[#F1F7FF] hover:bg-blue-50 text-left flex items-center relative ${multiplier === m.value ? 'bg-blue-100 font-bold' : ''} ${disabled ? ' pointer-events-none cursor-not-allowed' : ''}`}
                                                        tabIndex={0}
                                                        onClick={() => {
                                                            if (!disabled) {
                                                                handleMultiplierChange(m.value);
                                                                setMultiplierDropdownOpen(false);
                                                            }
                                                        }}
                                                        onKeyDown={e => {
                                                            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                                                                handleMultiplierChange(m.value);
                                                                setMultiplierDropdownOpen(false);
                                                            }
                                                        }}
                                                    >
                                                        {m.label}
                                                        {isPremiumMultiplier && !isPremium && (
                                                            <span className="flex h-[16px] px-[10px] ml-2 justify-center items-center gap-[10px] absolute right-[16px] top-1/2 -translate-y-1/2 rounded-[4px] bg-[#0C54EA] text-white text-xs font-bold">
                                                                {t('common.premium')}
                                                            </span>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                                {/* Video bonus */}
                                <button
                                    className="flex-1 h-[44px] bg-[#F5A600] hover:bg-orange-600 text-black font-medium rounded-full"
                                    data-tutorial-target="deal-video-bonus"
                                    aria-label={t('trading.watchAd')}
                                >
                                    {t('trading.watchAd')}
                                </button>
                            </div>
                        </div>

                        {/* Take Profit / Stop Loss */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                <label className="text-sm font-medium text-black opacity-50">{t('trading.takeProfit')}</label>
                                    <button 
                                        onClick={() => { 
                                            dispatch(openMoreInfo('takeProfit')); 
                                        }}
                                        className="w-4 h-4 opacity-50 hover:opacity-100 transition-opacity"
                                        aria-label={t('trading.takeProfit')}
                                    >
                                        <img src="/deal/alert.svg" alt="Информация" className="w-4 h-4" />
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={takeProfit}
                                    onChange={e => { handleTakeProfitChange(e.target.value); }}
                                    placeholder={t('placeholders.number')}
                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 outline-none focus:border-[#0C46BE]"
                                    data-tutorial-target="deal-take-profit"
                                        aria-label={t('trading.takeProfit')}
                                />
                            </div>
                            <div className="space-y-2 pb-2">
                                <div className="flex items-center gap-1">
                                <label className="text-sm font-medium text-black opacity-50">{t('trading.stopLoss')}</label>
                                    <button 
                                        onClick={() => { 
                                            dispatch(openMoreInfo('stopLoss')); 
                                        }}
                                        className="w-4 h-4 opacity-50 hover:opacity-100 transition-opacity"
                                        aria-label={t('trading.stopLoss')}
                                    >
                                        <img src="/deal/alert.svg" alt="Информация" className="w-4 h-4" />
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={stopLoss}
                                    onChange={e => { handleStopLossChange(e.target.value); }}
                                    placeholder={t('placeholders.number')}
                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 outline-none focus:border-[#0C46BE]"
                                    data-tutorial-target="deal-stop-loss"
                                        aria-label={t('trading.stopLoss')}
                                />
                            </div>
                        </div>

                        {/* Объём, комиссия и кнопка Купить/Продать */}
                        <div className='flex flex-row items-center justify-between gap-3 sm:gap-1' data-tutorial-target="deal-volume-buy">
                        
                        
                        <div className="flex flex-col items-start justify-center gap-1">
                            <div className="flex justify-start text-base font-bold">
                                <span className="text-black text-start">{t('trading.tradeDetails')}: {fmtMoney(volume)}</span>
                            </div>
                            <div className="flex justify-start gap-1 text-xs font-medium">
                                <span className="text-black opacity-50">{t('deal.commission')}: ${estimatedCommission.toFixed(2)}</span>
                                <button 
                                    onClick={() => { 
                                        dispatch(openMoreInfo('commission')); 
                                    }}
                                    className="w-4 h-4 opacity-50 hover:opacity-100 transition-opacity"
                                     aria-label={t('deal.commission')}
                                >
                                    <img src="/deal/alert.svg" alt="Информация" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Кнопка покупки */}
                        <button
                            onClick={() => { void handleBuy(); }}
                            className={`w-full max-w-[175px] font-medium py-3 rounded-full text-white text-base flex items-center justify-center gap-2 ${localDirection === 'up' ? 'bg-[#2EBD85] hover:bg-green-600' : 'bg-[#F6465D] hover:bg-red-600'}`}
                            aria-label={localDirection === 'up' ? t('trading.buy') : t('trading.sell')}
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { void handleBuy(); } }}
                        >
                            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                {localDirection === 'up' ? (
                                    <img src="/deal/up.svg" alt="up" className="w-[8px] h-[12px]" />
                                ) : (
                                    <img src="/deal/down.svg" alt="down" className="w-[8px] h-[12px]" />
                                )}
                            </div>
                            {localDirection === 'up' ? t('trading.buy') : t('trading.sell')}
                        </button>
                        </div>
                    </div>
                ) : null}
            </div>

            <MoreInfo />
        </div>
        )}
        
        {dealStatus !== 'creating' && (
            <AlertDeal
              onClose={() => { void handleAlertOk(); }}
              localDirection={localDirection}
              dealStartTime={dealStartTime}
              amount={amount}
              multiplier={multiplier}
              volume={volume}
              takeProfit={takeProfit}
              openPrice={openPrice}
            />
        )}
        </>
  );
};

export default Deal;
