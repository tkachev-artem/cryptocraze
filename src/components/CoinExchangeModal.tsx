import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchUser } from '../app/userSlice';
import { useTranslation } from '../lib/i18n';
import { formatMoneyShort } from '../lib/numberUtils';

type CoinExchangeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const COIN_TO_DOLLAR_RATE = 100; // 1 coin = $100

export const CoinExchangeModal: React.FC<CoinExchangeModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.user.user);
  const { t } = useTranslation();
  
  const [coinsToExchange, setCoinsToExchange] = useState(1);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  
  const userCoins = user?.coins ?? 0;
  const minCoins = userCoins > 0 ? 1 : 0;
  const maxCoins = userCoins; // allow full balance to be exchanged
  const exchangeValue = coinsToExchange * COIN_TO_DOLLAR_RATE;

  // Clamp current slider value if user coins change
  useEffect(() => {
    if (coinsToExchange > maxCoins) {
      setCoinsToExchange(maxCoins || 0);
      return;
    }
    if (coinsToExchange < minCoins) {
      setCoinsToExchange(minCoins);
    }
  }, [coinsToExchange, maxCoins, minCoins]);

  const handleExchange = useCallback(async () => {
    if (isExchanging || coinsToExchange <= 0 || coinsToExchange > userCoins) return;

    setIsExchanging(true);
    
    try {
      console.log('[CoinExchange] Sending request with:', { coinsToExchange });
      
      const response = await fetch('/api/exchange-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          coinsToExchange
        }),
      });

      console.log('[CoinExchange] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CoinExchange] Error response:', errorText);
        throw new Error(`Exchange failed: ${String(response.status)} - ${errorText}`);
      }

      const result = await response.json() as unknown;
      console.log('[CoinExchange] Exchange successful:', result);

      // Refresh user data
      await dispatch(fetchUser({}));
      
      // Close modal after successful exchange
      onClose();
      
    } catch (error) {
      console.error('[CoinExchange] Exchange error:', error);
      // Could add error toast notification here
    } finally {
      setIsExchanging(false);
    }
  }, [isExchanging, coinsToExchange, userCoins, dispatch, onClose]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCoinsToExchange(parseInt(e.target.value));
  }, []);

  const updateValueFromClientX = useCallback((clientX: number) => {
    const container = sliderContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = minCoins + ratio * (maxCoins - minCoins);
    const next = Math.round(raw);
    setCoinsToExchange(next);
  }, [maxCoins, minCoins]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (userCoins === 0) return;
    setIsDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* empty */ }
    updateValueFromClientX(e.clientX);
    e.preventDefault();
  }, [updateValueFromClientX, userCoins]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateValueFromClientX(e.clientX);
    e.preventDefault();
  }, [isDragging, updateValueFromClientX]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* empty */ }
    e.preventDefault();
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exchange-modal-title"
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-auto shadow-xl">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-6">
          <h2 id="exchange-modal-title" className="text-xl font-bold text-gray-900">
            {t('exchange.title')}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('common.close')}
          >
            <img src="/close.svg" alt="close" className="w-6 h-6" />
          </button>
        </div>

        {/* Exchange rate info */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">{t('exchange.rate')}</p>
            <p className="text-lg font-bold text-[#0C54EA]">1 {t('common.coin')} = ${COIN_TO_DOLLAR_RATE}</p>
          </div>
        </div>

        {/* Current balance info */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{t('exchange.available')}:</span>
            <span className="font-bold">{userCoins.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('exchange.currentBalance')}:</span>
            <span className="font-bold">{formatMoneyShort(parseFloat(user?.balance ?? '0'))}</span>
          </div>
        </div>

        {/* Exchange amount selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('exchange.amount')}
          </label>
          
          {/* Slider */}
          <div className="mb-4">
            <div
              ref={sliderContainerRef}
              className="py-4 px-2"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none', userSelect: 'none' }}
            >
              <input
                type="range"
                min={minCoins}
                max={maxCoins}
                step={1}
                value={coinsToExchange}
                onChange={handleSliderChange}
                className="w-full bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={isExchanging || userCoins === 0}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1 px-2">
              <span>{minCoins}</span>
              <span>{maxCoins}</span>
            </div>
          </div>

          {/* Display selected amount */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">{coinsToExchange.toLocaleString()} {t('common.coins')}</span>
              <span className="font-bold text-[#0C54EA] text-lg">
                ${exchangeValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Exchange button */}
        <button
          onClick={() => void handleExchange()}
          disabled={isExchanging || coinsToExchange <= 0 || coinsToExchange > userCoins || userCoins === 0}
          className="w-full bg-[#0C54EA] text-white py-3 px-6 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExchanging ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {t('exchange.exchanging')}
            </div>
          ) : (
            t('exchange.exchange')
          )}
        </button>

        {/* Disclaimer */}
        <p className="text-xs text-gray-500 text-center mt-4">
          {t('exchange.disclaimer')}
        </p>
      </div>
    </div>
  );
};

export default CoinExchangeModal;