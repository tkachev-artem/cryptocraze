import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCoinGeckoIcon } from '../../hooks/useCoinGeckoIcon';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../../components/LoadingScreen';
import { useTranslation } from '@/lib/i18n';
import useLivePrices from '@/hooks/useLivePrices';

type CryptoData = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  icon: string;
  color: string;
};

type CryptoGroup = {
  letter: string;
  cryptos: CryptoData[];
};

// Функция для умного форматирования цены
const formatPrice = (price: number): string => {
  if (price >= 1) {
    return price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  } else if (price >= 0.01) {
    return price.toLocaleString('ru-RU', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  } else {
    return price.toLocaleString('ru-RU', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
  }
};

// Компонент для отображения криптовалюты с иконкой
const CryptoItem: React.FC<{ crypto: CryptoData; index: number; total: number; onSelect: (symbol: string) => void }> = ({ crypto, index, total, onSelect }) => {
  const { iconUrl, loading } = useCoinGeckoIcon(crypto.id);
  
  return (
    <div
      onClick={() => { onSelect(crypto.symbol); }}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        index < total - 1 ? 'border-b border-gray-200' : ''
      }`}
    >
      {/* Left side: Icon and Name */}
      <div className="flex items-center justify-between flex-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Crypto Icon */}
          <div 
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: crypto.color }}
          >
            {loading ? (
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gray-300 rounded-full animate-pulse"></div>
            ) : iconUrl ? (
              <img src={iconUrl} alt={crypto.name} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full" onError={(e) => { e.currentTarget.src = crypto.icon; }} />
            ) : (
              <img src={crypto.icon} alt={crypto.name} className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>
          
          {/* Crypto Name */}
          <span className="text-sm sm:text-base font-bold text-black">{crypto.name}</span>
        </div>
        
        {/* Price */}
        <span className="text-xs sm:text-sm font-bold text-black opacity-50">
          {formatPrice(crypto.price)}
        </span>
      </div>
      
      {/* Right side: Change Percentage */}
      <div className="w-8 sm:w-9 h-3 flex items-center justify-center">
        <span 
          className="text-[9px] sm:text-[10px] font-semibold"
          style={{ color: crypto.change24h >= 0 ? '#2EBD85' : '#F6465D' }}
        >
          {crypto.change24h >= 0 ? '+' : ''}{Math.max(-99.99, Math.min(999.99, crypto.change24h)).toFixed(2)}%
        </span>
      </div>
    </div>
  );
};

const ListCrypto: React.FC = () => {
  const [cryptoGroups, setCryptoGroups] = useState<CryptoGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'gain' | 'loss'>('all');
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();


  const symbols = useMemo(() => ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'], []);
  const { prices } = useLivePrices(symbols);
  
  // Check if live data is available, fallback to realistic prices
  useEffect(() => {
    // For production, remove debug logs
    if (import.meta.env.DEV) {
      console.log('Live prices received:', prices);
      console.log('Available symbols:', Object.keys(prices));
    }
  }, [prices]);

  // Функция для получения всех данных криптовалют
  const fetchAllCryptoData = useCallback(() => {
    setLoading(true);

    // Маппинг символов Binance на coinId для CoinGecko
    const symbolToCoinId: Record<string, string> = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'BNBUSDT': 'binancecoin',
      'ADAUSDT': 'cardano',
      'SOLUSDT': 'solana',
      'XRPUSDT': 'ripple',
      'DOTUSDT': 'polkadot',
      'DOGEUSDT': 'dogecoin',
    };

    // Маппинг символов на названия и цвета
    const symbolToName: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'XRPUSDT': 'Ripple',
      'DOTUSDT': 'Polkadot',
      'DOGEUSDT': 'Dogecoin',
    };
    const cryptoDataPromises = symbols.map((symbol) => {
      const live = prices[symbol];
      const coinId = symbolToCoinId[symbol];
      const name = symbolToName[symbol];
      
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (live && Number.isFinite(live.price)) {
        return {
          id: coinId,
          name: name,
          symbol: symbol,
          price: live.price,
          change24h: Math.max(-99.99, Math.min(999.99, live.priceChange24h || 0)),
          icon: '/trade/bitcoin.svg',
          color: '#ffffff',
        };
      }
      // Fallback данные если API недоступен - используем актуальные примерные цены
      const fallbackPrices: Record<string, number> = {
        'BTCUSDT': 65000 + Math.random() * 5000,
        'ETHUSDT': 3200 + Math.random() * 300,
        'SOLUSDT': 140 + Math.random() * 20,
        'XRPUSDT': 0.55 + Math.random() * 0.1,
        'DOGEUSDT': 0.21 + Math.random() * 0.02, // Dogecoin текущая цена около 0.21-0.23
      };
      
      return {
        id: coinId,
        name: name,
        symbol: symbol,
        price: fallbackPrices[symbol] || Math.random() * 100,
        change24h: (Math.random() - 0.5) * 10, // Диапазон от -5% до +5%
        icon: '/trade/bitcoin.svg',
        color: '#000000',
      };
    });

    const results = cryptoDataPromises;
    // Оставляем только с корректным id и именем
    const filtered = results.filter(r => r.id && r.name);
    setCryptoData(filtered);
    setLoading(false);
  }, [prices, symbols]);



  // Группировка по алфавиту
  const groupCryptoByLetter = (cryptos: CryptoData[]): CryptoGroup[] => {
    const groups: Record<string, CryptoData[]> = {};
    
    cryptos.forEach(crypto => {
      const firstLetter = crypto.name.charAt(0).toUpperCase();
      if (!(firstLetter in groups)) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(crypto);
    });

    return Object.keys(groups)
      .sort()
      .map(letter => ({
        letter,
        cryptos: groups[letter].sort((a, b) => a.name.localeCompare(b.name))
      }));
  };

  // Фильтрация по росту/падению
  const filterCrypto = useCallback((cryptos: CryptoData[]) => {
    switch (selectedFilter) {
      case 'gain':
        return cryptos.filter(crypto => crypto.change24h > 0);
      case 'loss':
        return cryptos.filter(crypto => crypto.change24h < 0);
      default:
        return cryptos;
    }
  }, [selectedFilter]);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    fetchAllCryptoData();
  }, [fetchAllCryptoData]);

  // Обновление цен из сокета без спиннера
  useEffect(() => {
    const symbolToCoinId: Record<string, string> = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'BNBUSDT': 'binancecoin',
      'ADAUSDT': 'cardano',
      'SOLUSDT': 'solana',
      'XRPUSDT': 'ripple',
      'DOTUSDT': 'polkadot',
      'DOGEUSDT': 'dogecoin',
    };
    const symbolToName: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'XRPUSDT': 'Ripple',
      'DOTUSDT': 'Polkadot',
      'DOGEUSDT': 'Dogecoin',
    };
    const next = symbols.map((symbol) => {
      const coinId = symbolToCoinId[symbol];
      const name = symbolToName[symbol];
      const live = prices[symbol];
      
      // Use realistic fallback prices
      const fallbackPrices: Record<string, number> = {
        'BTCUSDT': 65000,
        'ETHUSDT': 3200,
        'SOLUSDT': 140,
        'XRPUSDT': 0.55,
        'DOGEUSDT': 0.218, // Current market price
      };
      
      return {
        id: coinId,
        name,
        symbol,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        price: (live && Number.isFinite(live.price)) ? live.price : (fallbackPrices[symbol] || 100),
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        change24h: (live && Number.isFinite(live.priceChange24h)) ? Math.max(-99.99, Math.min(999.99, live.priceChange24h)) : 0,
        icon: '/trade/bitcoin.svg',
        color: '#ffffff',
      } as CryptoData;
    });
    setCryptoData(next);
  }, [prices, symbols]);

  // Обновление групп при изменении фильтра или данных
  useEffect(() => {
    if (cryptoData.length > 0) {
      const filteredData = filterCrypto(cryptoData);
      const grouped = groupCryptoByLetter(filteredData);
      setCryptoGroups(grouped);
    }
  }, [selectedFilter, cryptoData, filterCrypto]);



  const handleSelect = (symbol: string) => {
    const params = new URLSearchParams(window.location.search);
    const ret = params.get('return');
    if (ret === 'pro') {
      void navigate(`/trade/pro?pair=${encodeURIComponent(symbol)}`);
    } else {
      void navigate(`/trade?pair=${encodeURIComponent(symbol)}`);
    }
  };

  return (
    <>
      <LoadingScreen isLoading={loading} />
      <div className="bg-[#F1F7FF] min-h-screen pb-[env(safe-area-inset-bottom)]">
        {/* Navigation Bar */}
        <div className="sticky top-0 z-10 bg-white">


        {/* Top App Bar */}
        <div className="flex items-center justify-between gap-1 px-2 sm:px-3 pt-3 sm:pt-4 pb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              onClick={() => {
                void navigate('/trade');
              }}
            >
              <img src="/top-menu/back.svg" alt={t('common.back')} className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-black">{t('trading.selectPair')}</h1>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-3 sm:px-4 py-3 sm:py-4 bg-white">
        <div className="flex bg-gray-100 rounded-full gap-0.5 sm:gap-1">
          <button
            onClick={() => {
              setSelectedFilter('all');
            }}
            className={`flex-1 py-2.5 sm:py-3.5 px-2 sm:px-3 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              selectedFilter === 'all' 
                ? 'bg-[#0C54EA] text-white' 
                : 'text-black opacity-30'
            }`}
          >
            {t('trading.crypto') || 'Крипта'}
          </button>
          <button
            onClick={() => {
              setSelectedFilter('loss');
            }}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3.5 px-2 sm:px-3 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              selectedFilter === 'loss' 
                ? 'bg-[#0C54EA]' 
                : 'text-black'
            }`}
          >
            <span className={selectedFilter === 'loss' ? 'text-white' : 'text-black opacity-30'}>
              {t('trading.loss') || 'Падение'}
            </span>
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#F6465D] rounded-2xl flex items-center justify-center">
              <img src="/dashboard/up.svg" alt="Down" className="w-2 h-2.5 sm:w-2.5 sm:h-3.5 rotate-180" />
            </div>
          </button>
          <button
            onClick={() => {
              setSelectedFilter('gain');
            }}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3.5 px-2 sm:px-3 rounded-full text-xs sm:text-sm font-bold transition-colors ${
              selectedFilter === 'gain' 
                ? 'bg-[#0C54EA]' 
                : 'text-black'
            }`}
          >
            <span className={selectedFilter === 'gain' ? 'text-white' : 'text-black opacity-30'}>
              {t('trading.gain') || 'Рост'}
            </span>
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#2EBD85] rounded-2xl flex items-center justify-center">
              <img src="/dashboard/up.svg" alt="Up" className="w-2 h-2.5 sm:w-2.5 sm:h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Crypto List */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 sm:space-y-3 py-3 sm:py-4">
        {cryptoGroups.map((group) => (
          <div key={group.letter} className="space-y-2 sm:space-y-3">
            {/* Letter Header */}
            <h2 className="text-sm sm:text-base font-bold text-black">{group.letter}</h2>
            
            {/* Crypto Items */}
            <div className="bg-white rounded-lg sm:rounded-xl overflow-hidden">
              {group.cryptos.map((crypto, index) => (
                <CryptoItem
                  key={crypto.id}
                  crypto={crypto}
                  index={index}
                  total={group.cryptos.length}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
};

export default ListCrypto;
