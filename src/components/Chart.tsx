import { useState, useRef, useEffect } from 'react';
import { createChart, CandlestickSeries, BarSeries, LineSeries } from 'lightweight-charts';
import type { ISeriesApi, Time } from 'lightweight-charts';

const TIMEFRAMES = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: '1d', value: '1d' },
];

const CRYPTOCURRENCY = [
  { label: 'BTC/USDT', value: 'BTCUSDT', coingeckoId: 'bitcoin', name: 'Bitcoin' },
  { label: 'ETH/USDT', value: 'ETHUSDT', coingeckoId: 'ethereum', name: 'Ethereum' },
  { label: 'SOL/USDT', value: 'SOLUSDT', coingeckoId: 'solana', name: 'Solana' },
  { label: 'XRP/USDT', value: 'XRPUSDT', coingeckoId: 'ripple', name: 'XRP' },
  { label: 'DOGE/USDT', value: 'DOGEUSDT', coingeckoId: 'dogecoin', name: 'Dogecoin' },
];

const CHART_TYPE = [
    { label: 'Line', value: 'line', icon: '/trade/chart-line.svg' },
    { label: 'Candlestick', value: 'candlestick', icon: '/trade/chart-candlestick.svg' },
    { label: 'Bar', value: 'bar', icon: '/trade/chart-bar.svg' },
];

type Crypto = { label: string; value: string; coingeckoId: string; name: string };
type ChartProps = {
    onProModeClick: () => void;
    onCryptoChange?: (crypto: Crypto) => void;
}

type Candle = {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
};

type ChartType = 'candlestick' | 'bar' | 'line';

const Chart: React.FC<ChartProps> = ({ onProModeClick, onCryptoChange }) => {
    const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[0]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [selectedCrypto, setSelectedCrypto] = useState<Crypto>(CRYPTOCURRENCY[0]);
    const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
    const cryptoDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedChartType, setSelectedChartType] = useState(CHART_TYPE[1]); // candlestick по умолчанию
    const [chartTypeDropdownOpen, setChartTypeDropdownOpen] = useState(false);
    const chartTypeDropdownRef = useRef<HTMLDivElement>(null);

    const [candles, setCandles] = useState<Candle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | ISeriesApi<'Line'> | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Закрытие по клику вне для таймфрейма
    useEffect(() => {
        if (!dropdownOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => { document.removeEventListener('mousedown', handleClick); };
    }, [dropdownOpen]);

    // Закрытие по клику вне для валюты
    useEffect(() => {
        if (!cryptoDropdownOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (cryptoDropdownRef.current && !cryptoDropdownRef.current.contains(e.target as Node)) {
                setCryptoDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => { document.removeEventListener('mousedown', handleClick); };
    }, [cryptoDropdownOpen]);

    // Закрытие по клику вне для типа графика
    useEffect(() => {
        if (!chartTypeDropdownOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (chartTypeDropdownRef.current && !chartTypeDropdownRef.current.contains(e.target as Node)) {
                setChartTypeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => { document.removeEventListener('mousedown', handleClick); };
    }, [chartTypeDropdownOpen]);

    // Загрузка исторических свечей
    useEffect(() => {
        setLoading(true);
        setError(null);
        const url = `http://localhost:8000/api/binance/candlestick/${selectedCrypto.value}?interval=${selectedTimeframe.value}&limit=100`;
        console.log('fetching:', url, selectedCrypto.value, selectedTimeframe.value);
        fetch(url)
            .then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    console.error('Server error:', r.status, url, text);
                    throw new Error(`HTTP error! status: ${String(r.status)}`);
                }
                return r.json() as Promise<{ openTime: number, open: string, high: string, low: string, close: string }[]>;
            })
            .then((data: unknown[]) => {
                const formatted: Candle[] = (data as { openTime: number, open: string, high: string, low: string, close: string }[]).map((candle) => ({
                    time: Math.floor(Number(candle.openTime) / 1000) as Time,
                    open: Number(candle.open),
                    high: Number(candle.high),
                    low: Number(candle.low),
                    close: Number(candle.close),
                }));
                setCandles(formatted);
                setLoading(false);
            })
            .catch((e: unknown) => {
                setError(e instanceof Error ? e.message : 'Ошибка');
                setLoading(false);
            });
    }, [selectedCrypto, selectedTimeframe]);

    // Chart создаётся один раз
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 360,
            layout: { background: { color: '#F9FAFB' }, textColor: '#222' },
            grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
            timeScale: { timeVisible: true, secondsVisible: selectedTimeframe.value === '1m' },
            rightPriceScale: { borderColor: '#eee' },
            crosshair: { mode: 1 },
        });
        chartRef.current = chart;
        
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.resize(chartContainerRef.current.clientWidth, 360);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Series пересоздаётся при смене типа/данных/таймфрейма
    useEffect(() => {
        if (!chartRef.current) return;
        // Безопасное удаление предыдущей серии
        if (seriesRef.current) {
            try {
                chartRef.current.removeSeries(seriesRef.current);
            } catch {
                // ignore, серия уже могла быть удалена
            }
            seriesRef.current = null;
        }
        const type: ChartType = selectedChartType.value as ChartType;
        let series: ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | ISeriesApi<'Line'>;
        if (type === 'candlestick') {
            series = chartRef.current.addSeries(CandlestickSeries, {});
            if (candles.length) series.setData(candles);
        } else if (type === 'bar') {
            series = chartRef.current.addSeries(BarSeries, {});
            if (candles.length) series.setData(candles);
        } else {
            series = chartRef.current.addSeries(LineSeries, { color: '#0C54EA', lineWidth: 2 });
            if (candles.length) {
                const lineData = candles.map(c => ({ time: c.time, value: c.close }));
                series.setData(lineData);
            }
        }
        seriesRef.current = series;
    }, [candles, selectedChartType, selectedTimeframe]);

    // Реальное обновление последней свечи
    useEffect(() => {
        if (!candles.length) return;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            const url = `http://localhost:8000/api/binance/price/${selectedCrypto.value}`;
            console.log('fetching:', url, selectedCrypto.value);
            fetch(url)
                .then(async res => {
                    if (!res.ok) {
                        const text = await res.text();
                        console.error('Server error:', res.status, url, text);
                        throw new Error(`HTTP error! status: ${String(res.status)}`);
                    }
                    return res.json() as Promise<{ price: number }>;
                })
                .then((data: { price: number }) => {
                    setCandles(prev => {
                        if (!prev.length) return prev;
                        const last = prev[prev.length - 1];
                        const now = Math.floor(Date.now() / 1000);
                        const tfSec = timeframeToSeconds(selectedTimeframe.value);
                        if (typeof last.time !== 'number' && typeof last.time !== 'string') return prev; // safety
                        if ((last.time as number) && now - (last.time as number) < tfSec) {
                            // Обновляем текущую свечу
                            return [
                                ...prev.slice(0, -1),
                                {
                                    ...last,
                                    close: Number(data.price),
                                    high: Math.max(last.high, Number(data.price)),
                                    low: Math.min(last.low, Number(data.price)),
                                },
                            ];
                        } else {
                            // Добавляем новую свечу
                            return [
                                ...prev,
                                {
                                    time: ((last.time as number) + tfSec) as Time,
                                    open: last.close,
                                    high: Number(data.price),
                                    low: Number(data.price),
                                    close: Number(data.price),
                                },
                            ];
                        }
                    });
                })
                .catch(() => { /* ignore */ });
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [candles, selectedCrypto, selectedTimeframe]);

    // Вспомогательная функция для перевода таймфрейма в секунды
    const timeframeToSeconds = (tf: string) => {
        if (tf.endsWith('m')) return parseInt(tf) * 60;
        if (tf.endsWith('h')) return parseInt(tf) * 60 * 60;
        if (tf.endsWith('d')) return parseInt(tf) * 60 * 60 * 24;
        return 60;
    };

    return (
        <div className="relative border border-gray-200">
            {/* Контролы графика */}
            <div className="flex w-full items-center justify-between p-2">
                <div className="flex items-center gap-2">
                    {/* Криптовалюта (dropdown) */}
                    <div className="relative" ref={cryptoDropdownRef}>
                        <button
                            type="button"
                            className="flex items-center gap-3 h-[28px] justify-between px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none min-w-[90px]"
                            aria-haspopup="listbox"
                            aria-expanded={cryptoDropdownOpen}
                            tabIndex={0}
                            onClick={() => { setCryptoDropdownOpen((v) => !v); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') setCryptoDropdownOpen((v) => !v);
                                if (e.key === 'Escape') setCryptoDropdownOpen(false);
                            }}
                        >
                            <span className="text-base font-medium text-black flex items-center">
                               {selectedCrypto.label}
                             </span>
                            <img
                                src="/trade/down-arrow.svg"
                                alt=""
                                className={`w-3 h-3 transition-transform duration-200 ${cryptoDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {cryptoDropdownOpen && (
                            <ul
                                className="absolute z-10 mt-1 w-28 bg-white border border-gray-200 rounded shadow-lg animate-fade-in"
                                role="listbox"
                                tabIndex={-1}
                            >
                                {CRYPTOCURRENCY.map((c) => (
                                    <li
                                        key={c.value}
                                        role="option"
                                        aria-selected={selectedCrypto.value === c.value}
                                        className={`px-3 py-1 cursor-pointer text-sm hover:bg-blue-50 text-left ${selectedCrypto.value === c.value ? 'bg-blue-100 font-bold' : ''}`}
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedCrypto(c);
                                            setCryptoDropdownOpen(false);
                                            if (onCryptoChange) onCryptoChange(c);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedCrypto(c);
                                                setCryptoDropdownOpen(false);
                                                if (onCryptoChange) onCryptoChange(c);
                                            }
                                        }}
                                    >
                                        <span className="flex items-center">
                                           {c.label}
                                         </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Время (dropdown) */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            className="flex items-center gap-2 h-[28px] justify-between px-2 py-1 border border-gray-200 rounded w-16 bg-white focus:outline-none"
                            aria-haspopup="listbox"
                            aria-expanded={dropdownOpen}
                            tabIndex={0}
                            onClick={() => { setDropdownOpen((v) => !v); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') setDropdownOpen((v) => !v);
                                if (e.key === 'Escape') setDropdownOpen(false);
                            }}
                        >
                            <span className="text-base font-medium text-black uppercase">{selectedTimeframe.label}</span>
                            <img
                                src="/trade/down-arrow.svg"
                                alt=""
                                className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {dropdownOpen && (
                            <ul
                                className="absolute z-10 mt-1 w-16 bg-white border border-gray-200 rounded shadow-lg animate-fade-in"
                                role="listbox"
                                tabIndex={-1}
                            >
                                {TIMEFRAMES.map((tf) => (
                                    <li
                                        key={tf.value}
                                        role="option"
                                        aria-selected={selectedTimeframe.value === tf.value}
                                        className={`px-3 py-1 cursor-pointer text-sm hover:bg-blue-50 text-left ${selectedTimeframe.value === tf.value ? 'bg-blue-100 font-bold' : ''}`}
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedTimeframe(tf);
                                            setDropdownOpen(false);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedTimeframe(tf);
                                                setDropdownOpen(false);
                                            }
                                        }}
                                    >
                                        {tf.label}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Тип графика (dropdown, только иконки) */}
                    <div className="relative" ref={chartTypeDropdownRef}>
                        <button
                            type="button"
                            className="flex items-center h-[24px] justify-center w-7 border border-gray-200 rounded bg-white focus:outline-none"
                            aria-haspopup="listbox"
                            aria-expanded={chartTypeDropdownOpen}
                            tabIndex={0}
                            onClick={() => { setChartTypeDropdownOpen((v) => !v); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') setChartTypeDropdownOpen((v) => !v);
                                if (e.key === 'Escape') setChartTypeDropdownOpen(false);
                            }}
                        >
                            <img src={selectedChartType.icon} alt={selectedChartType.label} className="w-6 h-6" />
                        </button>
                        {chartTypeDropdownOpen && (
                            <ul
                                className="absolute z-10 mt-1 w-7 bg-white border border-gray-200 rounded shadow-lg animate-fade-in flex flex-col items-center"
                                role="listbox"
                                tabIndex={-1}
                            >
                                {CHART_TYPE.map((type) => (
                                    <li
                                        key={type.value}
                                        role="option"
                                        aria-selected={selectedChartType.value === type.value}
                                        className={`p-1 cursor-pointer hover:bg-blue-50 rounded ${selectedChartType.value === type.value ? 'bg-blue-100' : ''}`}
                                        tabIndex={0}
                                        onClick={() => {
                                            setSelectedChartType(type);
                                            setChartTypeDropdownOpen(false);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedChartType(type);
                                                setChartTypeDropdownOpen(false);
                                            }
                                        }}
                                    >
                                        <img src={type.icon} alt={type.label} className="w-6 h-6" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Профи */}
                    <button
                        onClick={onProModeClick}
                        className="flex h-[28px] justify-center items-center gap-[10px] flex-shrink-0 rounded-[4px] bg-[#F5A600] px-3"
                    >
                        Pro Mode
                    </button>
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-92 bg-gray-50 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/70">
                        <span className="text-gray-400 text-lg">Загрузка...</span>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/70">
                        <span className="text-red-500 text-lg">{error}</span>
                    </div>
                )}
                <div
                    ref={chartContainerRef}
                    className="w-full h-full"
                    aria-label="График в реальном времени"
                    tabIndex={0}
                />
            </div>
        </div>
    );
};

export default Chart; 