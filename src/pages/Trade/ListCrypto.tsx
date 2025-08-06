import { useState, useEffect } from 'react';
import { useCoinGeckoIcon } from '../../hooks/useCoinGeckoIcon';
import { useNavigate } from 'react-router-dom';

type BinanceStats = {
  symbol: string;
  priceChange: number;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  volume: number;
  quoteVolume: number;
  count: number;
};

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

// Компонент для отображения криптовалюты с иконкой
const CryptoItem: React.FC<{ crypto: CryptoData; index: number; total: number }> = ({ crypto, index, total }) => {
  const { iconUrl, loading } = useCoinGeckoIcon(crypto.id);
  
  return (
    <div
      onClick={() => {
        console.log('Selected crypto:', crypto);
      }}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        index < total - 1 ? 'border-b border-gray-200' : ''
      }`}
    >
      {/* Left side: Icon and Name */}
      <div className="flex items-center justify-between flex-1">
        <div className="flex items-center gap-2">
          {/* Crypto Icon */}
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: crypto.color }}
          >
            {loading ? (
              <div className="w-7 h-7 bg-gray-300 rounded-full animate-pulse"></div>
            ) : iconUrl ? (
              <img src={iconUrl} alt={crypto.name} className="w-7 h-7 rounded-full" />
            ) : (
              <img src={crypto.icon} alt={crypto.name} className="w-7 h-7" />
            )}
          </div>
          
          {/* Crypto Name */}
          <span className="text-base font-bold text-black">{crypto.name}</span>
        </div>
        
        {/* Price */}
        <span className="text-xs font-bold text-black opacity-50">
          {crypto.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      </div>
      
      {/* Right side: Change Percentage */}
      <div className="w-9 h-3 flex items-center justify-center">
        <span 
          className="text-[10px] font-semibold"
          style={{ color: crypto.change24h >= 0 ? '#2EBD85' : '#F6465D' }}
        >
          {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
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


  // Функция для получения статистики криптовалюты
  const fetchCryptoStats = async (symbol: string): Promise<BinanceStats | null> => {
    try {
      const response = await fetch(`http://localhost:8000/api/binance/stats/${symbol}`);
      if (!response.ok) {
        console.error(`Ошибка получения данных для ${symbol}:`, response.status);
        return null;
      }
      return await response.json() as BinanceStats;
    } catch (error) {
      console.error(`Ошибка запроса для ${symbol}:`, error);
      return null;
    }
  };

  // Функция для получения всех данных криптовалют
  const fetchAllCryptoData = async () => {
    setLoading(true);
    
    // Список символов для API запросов
    const symbols = [
      'ALGOUSDT', 'AVAXUSDT', 'BNBUSDT', 'BTCUSDT', 'BCHUSDT', 'ADAUSDT', 'COMPUSDT',
      'DASHUSDT', 'DOGEUSDT', 'EGLDUSDT', 'ETHUSDT', 'ETCUSDT', 'FTTUSDT', 'KLAYUSDT',
      'MKRUSDT', 'NEOUSDT', 'DOTUSDT', 'XRPUSDT', 'SOLUSDT', 'XLMUSDT', 'THETAUSDT',
      'GRTUSDT', 'UNIUSDT', 'ZECUSDT'
    ];

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
      'AVAXUSDT': 'avalanche-2',
      'MATICUSDT': 'matic-network',
      'LTCUSDT': 'litecoin',
      'UNIUSDT': 'uniswap',
      'LINKUSDT': 'chainlink',
      'ATOMUSDT': 'cosmos',
      'ETCUSDT': 'ethereum-classic',
      'XLMUSDT': 'stellar',
      'BCHUSDT': 'bitcoin-cash',
      'FILUSDT': 'filecoin',
      'VETUSDT': 'vechain',
      'THETAUSDT': 'theta-token',
      'TRXUSDT': 'tron',
      'ALGOUSDT': 'algorand',
      'NEOUSDT': 'neo',
      'FTTUSDT': 'ftx-token',
      'KLAYUSDT': 'klaytn',
      'MKRUSDT': 'maker',
      'COMPUSDT': 'compound-governance-token',
      'DASHUSDT': 'dash',
      'EGLDUSDT': 'elrond-erd-2',
      'GRTUSDT': 'the-graph',
      'ZECUSDT': 'zcash',
    };

    // Маппинг символов на названия и цвета
    const symbolToName: Record<string, string> = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'BNBUSDT': 'Binance Coin',
      'ADAUSDT': 'Cardano',
      'SOLUSDT': 'Solana',
      'XRPUSDT': 'Ripple',
      'DOTUSDT': 'Polkadot',
      'DOGEUSDT': 'Dogecoin',
      'AVAXUSDT': 'Avalanche',
      'MATICUSDT': 'Polygon',
      'LTCUSDT': 'Litecoin',
      'UNIUSDT': 'Uniswap',
      'LINKUSDT': 'Chainlink',
      'ATOMUSDT': 'Cosmos',
      'ETCUSDT': 'Ethereum Classic',
      'XLMUSDT': 'Stellar',
      'BCHUSDT': 'Bitcoin Cash',
      'FILUSDT': 'Filecoin',
      'VETUSDT': 'VeChain',
      'THETAUSDT': 'THETA',
      'TRXUSDT': 'TRON',
      'ALGOUSDT': 'Algorand',
      'NEOUSDT': 'Neo',
      'FTTUSDT': 'FTX Token',
      'KLAYUSDT': 'Klaytn',
      'MKRUSDT': 'Maker',
      'COMPUSDT': 'Compound',
      'DASHUSDT': 'Dash',
      'EGLDUSDT': 'Elrond',
      'GRTUSDT': 'The Graph',
      'ZECUSDT': 'Zcash',
    };



    const cryptoDataPromises = symbols.map(async (symbol) => {
      const stats = await fetchCryptoStats(symbol);
      const coinId = symbolToCoinId[symbol];
      const name = symbolToName[symbol];
      
      if (stats) {
        return {
          id: coinId,
          name: name,
          symbol: symbol,
          price: stats.lastPrice,
          change24h: stats.priceChangePercent,
          icon: '/trade/bitcoin.svg',
          color: '#ffffff',
        };
      }
      // Fallback данные если API недоступен
      return {
        id: coinId,
        name: name,
        symbol: symbol,
        price: Math.random() * 1000,
        change24h: (Math.random() - 0.5) * 10,
        icon: '/trade/bitcoin.svg',
        color: '#000000',
      };
    });

    const results = await Promise.all(cryptoDataPromises);
    setCryptoData(results);
    setLoading(false);
  };



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
  const filterCrypto = (cryptos: CryptoData[]) => {
    switch (selectedFilter) {
      case 'gain':
        return cryptos.filter(crypto => crypto.change24h > 0);
      case 'loss':
        return cryptos.filter(crypto => crypto.change24h < 0);
      default:
        return cryptos;
    }
  };

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    void fetchAllCryptoData();
  }, []);

  // Обновление групп при изменении фильтра или данных
  useEffect(() => {
    const filteredData = filterCrypto(cryptoData);
    const grouped = groupCryptoByLetter(filteredData);
    setCryptoGroups(grouped);
  }, [selectedFilter, cryptoData]);



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-400 text-lg">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#F1F7FF] min-h-screen">
      {/* Navigation Bar */}
      <div className="bg-white">


        {/* Top App Bar */}
        <div className="flex items-center gap-1 px-2 pt-4 pb-2 ">
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            onClick={() => {
              void navigate('/trade');
            }}
          >
            <img src="/top-menu/back.svg" alt="Back" className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-black">Выбор торговой пары</h1>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-4 py-4 bg-white">
        <div className="flex bg-gray-100 rounded-full gap-1">
          <button
            onClick={() => {
              setSelectedFilter('all');
            }}
            className={`flex-1 py-3.5 px-3 rounded-full text-sm font-bold transition-colors ${
              selectedFilter === 'all' 
                ? 'bg-[#0C54EA] text-white' 
                : 'text-black opacity-30'
            }`}
          >
            Крипта
          </button>
          <button
            onClick={() => {
              setSelectedFilter('loss');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-full text-sm font-bold transition-colors ${
              selectedFilter === 'loss' 
                ? 'bg-[#0C54EA]' 
                : 'text-black'
            }`}
          >
            <span className={selectedFilter === 'loss' ? 'text-white' : 'text-black opacity-30'}>
              Падение
            </span>
            <div className="w-4 h-4 bg-[#F6465D] rounded-2xl flex items-center justify-center">
              <img src="/dashboard/up.svg" alt="Down" className="w-2.5 h-3.5 rotate-180" />
            </div>
          </button>
          <button
            onClick={() => {
              setSelectedFilter('gain');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 rounded-full text-sm font-bold transition-colors ${
              selectedFilter === 'gain' 
                ? 'bg-[#0C54EA]' 
                : 'text-black'
            }`}
          >
            <span className={selectedFilter === 'gain' ? 'text-white' : 'text-black opacity-30'}>
              Рост
            </span>
            <div className="w-4 h-4 bg-[#2EBD85] rounded-2xl flex items-center justify-center">
              <img src="/dashboard/up.svg" alt="Up" className="w-2.5 h-3.5" />
            </div>
          </button>
        </div>
      </div>

      {/* Crypto List */}
      <div className="px-4 pb-4 space-y-3 py-4">
        {cryptoGroups.map((group) => (
          <div key={group.letter} className="space-y-3">
            {/* Letter Header */}
            <h2 className="text-base font-bold text-black">{group.letter}</h2>
            
            {/* Crypto Items */}
            <div className="bg-white rounded-xl overflow-hidden">
              {group.cryptos.map((crypto, index) => (
                <CryptoItem
                  key={crypto.id}
                  crypto={crypto}
                  index={index}
                  total={group.cryptos.length}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListCrypto;
