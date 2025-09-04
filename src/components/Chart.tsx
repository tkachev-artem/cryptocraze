import type React from 'react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createChart, CandlestickSeries, BarSeries, LineSeries } from 'lightweight-charts';
import type { ISeriesApi, Time, IChartApi } from 'lightweight-charts';
import { useAppSelector } from '@/app/hooks';
import { getCachedCandlestickData } from '@/lib/resilientApi';
import { useTranslation } from '@/lib/i18n';
import useLivePrices, { type PriceData } from '@/hooks/useLivePrices';
// NOTE: avoid binding chart height to dynamic viewport height to prevent flicker on mobile toolbars

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
    { label: 'chart.line', value: 'line', icon: '/trade/chart-line.svg' },
    { label: 'chart.candlestick', value: 'candlestick', icon: '/trade/chart-candlestick.svg' },
    { label: 'chart.bar', value: 'bar', icon: '/trade/chart-bar.svg' },
];

type Crypto = {
    readonly label: string;
    readonly value: string;
    readonly coingeckoId: string;
    readonly name: string;
}

type ChartProps = {
    readonly onProModeClick: () => void;
    readonly onCryptoChange?: (crypto: Crypto) => void;
    readonly forcedCryptoValue?: string;
    readonly isDealOpenOverride?: boolean;
}

type Candle = {
    readonly time: Time;
    readonly open: number;
    readonly high: number;
    readonly low: number;
    readonly close: number;
}

type ChartType = 'candlestick' | 'bar' | 'line';

type SeriesType = ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'> | ISeriesApi<'Line'>;

// Функции для сохранения настроек графика
const CHART_SETTINGS_KEY = 'cryptocraze_chart_settings';

const saveChartSettings = (timeframe: string, crypto: string, chartType: string) => {
    try {
        const settings = { timeframe, crypto, chartType };
        localStorage.setItem(CHART_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.warn('Failed to save chart settings:', error);
    }
};

const loadChartSettings = () => {
    try {
        const saved = localStorage.getItem(CHART_SETTINGS_KEY);
        if (saved) {
            return JSON.parse(saved) as { timeframe: string; crypto: string; chartType?: string };
        }
    } catch (error) {
        console.warn('Failed to load chart settings:', error);
    }
    return null;
};

const Chart: React.FC<ChartProps> = ({ onProModeClick, onCryptoChange, forcedCryptoValue, isDealOpenOverride }) => {
    // Загружаем сохраненные настройки
    const savedSettings = loadChartSettings();
    
    const [selectedTimeframe, setSelectedTimeframe] = useState(() => {
        if (savedSettings?.timeframe) {
            const found = TIMEFRAMES.find(tf => tf.value === savedSettings.timeframe);
            return found ?? TIMEFRAMES[0];
        }
        return TIMEFRAMES[0];
    });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [selectedCrypto, setSelectedCrypto] = useState<Crypto>(() => {
        if (savedSettings?.crypto) {
            const found = CRYPTOCURRENCY.find(crypto => crypto.value === savedSettings.crypto);
            return found ?? CRYPTOCURRENCY[0];
        }
        return CRYPTOCURRENCY[0];
    });
    const [cryptoDropdownOpen, setCryptoDropdownOpen] = useState(false);
    const cryptoDropdownRef = useRef<HTMLDivElement>(null);

    const [selectedChartType, setSelectedChartType] = useState(() => {
        if (savedSettings?.chartType) {
            const found = CHART_TYPE.find(type => type.value === savedSettings.chartType);
            return found ?? CHART_TYPE[1];
        }
        return CHART_TYPE[1]; // candlestick по умолчанию
    });
    const [chartTypeDropdownOpen, setChartTypeDropdownOpen] = useState(false);
    const chartTypeDropdownRef = useRef<HTMLDivElement>(null);

    const candlesRef = useRef<Candle[]>([]);
    const [barsCount, setBarsCount] = useState<number>(0);
    const [historyVersion, setHistoryVersion] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<SeriesType | null>(null);
    const userAdjustedRef = useRef<boolean>(false);
    const programmaticSetRef = useRef<boolean>(false);
    // стандартные подписи времени lightweight-charts; кастомный оверлей больше не используем
    // (ранее использовались axisLabels)
    // realtime via socket
    const { prices } = useLivePrices([selectedCrypto.value]);

    const isDealModalOpen = useAppSelector((state) => state.dealModal.isDealModalOpen) || Boolean(isDealOpenOverride);
    const isEditDealOpen = useAppSelector((state) => state.dealModal.isEditDealOpen);
    const { t }: { t: (key: string, params?: Record<string, string | number>) => string } = useTranslation();
    // Stable base height computed from window.innerHeight to avoid frequent resizes on mobile

    // Адаптивная высота графика: 40% от высоты экрана, но не меньше 220px и не больше 600px
    const [chartHeight, setChartHeight] = useState<number>(220);
    const chartHeightRef = useRef<number>(220);
    const baseHeightRef = useRef<number>(220);
    useEffect(() => {
        const clamp = (h: number) => Math.max(220, Math.min(600, Math.floor(h)));
        const computeBase = () => clamp((window.innerHeight || 0) * 0.4);
        // initial compute
        baseHeightRef.current = computeBase();
        const next = isDealModalOpen ? 220 : (isEditDealOpen ? 320 : baseHeightRef.current);
        chartHeightRef.current = next;
        setChartHeight(next);

        const onOrientation = () => {
            baseHeightRef.current = computeBase();
            if (!isDealModalOpen && !isEditDealOpen) {
                const n = baseHeightRef.current;
                if (Math.abs(n - chartHeightRef.current) >= 24) {
                    chartHeightRef.current = n;
                    setChartHeight(n);
                }
            }
        };
        window.addEventListener('orientationchange', onOrientation);
        return () => { window.removeEventListener('orientationchange', onOrientation); };
    }, [isDealModalOpen, isEditDealOpen]);

    const currentTimeframeRef = useRef<string>(selectedTimeframe.value);
    useEffect(() => { currentTimeframeRef.current = selectedTimeframe.value; }, [selectedTimeframe.value]);
    // const containerHeightClass = isDealModalOpen ? 'h-40' : 'h-92';

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

    // Загрузка исторических свечей с улучшенной обработкой ошибок
    useEffect(() => {
        const loadCandleData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const data = await getCachedCandlestickData(
                    selectedCrypto.value,
                    selectedTimeframe.value,
                    100
                );
                
                const raw: Candle[] = data.map((candle) => ({
                    time: Math.floor(Number(candle.openTime) / 1000) as Time,
                    open: Number(candle.open),
                    high: Number(candle.high),
                    low: Number(candle.low),
                    close: Number(candle.close),
                }));
                
                const tfSec = timeframeToSeconds(selectedTimeframe.value);
                const normalized = normalizeHistory(raw, tfSec);
                candlesRef.current = normalized;
                setBarsCount(normalized.length);
                setHistoryVersion(v => v + 1);
                setLoading(false);
            } catch (e: unknown) {
                console.error('Ошибка загрузки данных графика:', e);
                setError(e instanceof Error ? e.message : 'Ошибка');
                setLoading(false);
            }
        };

        void loadCandleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCrypto.value, selectedTimeframe.value]);

    // Принудительная смена выбранной валюты снаружи (например, из модалки)
    useEffect(() => {
        if (!forcedCryptoValue) return;
        if (selectedCrypto.value === forcedCryptoValue) return;
        const found = CRYPTOCURRENCY.find(c => c.value === forcedCryptoValue);
        if (found) {
            setSelectedCrypto(found);
            if (onCryptoChange) onCryptoChange(found);
        }
    }, [forcedCryptoValue, onCryptoChange, selectedCrypto.value]);

    // Сохранение настроек графика в localStorage
    useEffect(() => {
        // Не сохраняем если криптовалюта была принудительно установлена извне
        if (!forcedCryptoValue) {
            saveChartSettings(selectedTimeframe.value, selectedCrypto.value, selectedChartType.value);
        }
    }, [selectedTimeframe.value, selectedCrypto.value, selectedChartType.value, forcedCryptoValue]);

    // Удалено: вспомогательные функции для фильтрации меток больше не используются

    // Прежний фильтр не нужен: плотность меток выбирается самим lightweight-charts

    // Упрощенное форматирование времени по примеру Binance
    const formatTick = useCallback((time: Time): string => {
        try {
            if (typeof time === 'object' && 'year' in time) {
                // Обработка BusinessDay для дневных таймфреймов
                const t = time as { year: number; month: number; day: number };
                const d = new Date(t.year, t.month - 1, t.day);
                return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
            }
            
            const ts = typeof time === 'string' ? parseInt(time, 10) : (time as number);
            if (!Number.isFinite(ts)) return '';
            
            const d = new Date(ts * 1000);
            
            switch (selectedTimeframe.value) {
                case '1m':
                case '5m':
                case '15m':
                    // Показываем время в формате HH:MM
                    return d.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    });
                case '1h': {
                    // Показываем дату и время для 1h
                    const hours = d.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    });
                    const date = d.toLocaleDateString('ru-RU', { 
                        day: '2-digit', 
                        month: '2-digit' 
                    });
                    return `${hours}\n${date}`;
                }
                case '4h':
                case '1d':
                    // Показываем только дату для больших интервалов
                    return d.toLocaleDateString('ru-RU', { 
                        day: '2-digit', 
                        month: 'short' 
                    });
                default:
                    return d.toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        hour12: false 
                    });
            }
        } catch {
            return '';
        }
    }, [selectedTimeframe.value]);

    // Унифицированный пересчёт оверлей-меток (1m, каждые 15 минут), с учётом будущего тайм-слота
    // overlay recompute removed

    // Округление к бакету по UTC (как на Binance): кратно интервалу в секундах от эпохи
    const roundToUTCBucket = useCallback((utcSec: number, tfSec: number): number => {
        return Math.floor(utcSec / tfSec) * tfSec;
    }, []);

    // helpers — timeToSeconds больше не используется (нативные подписи)

    // duplicate removed

    // Chart создаётся один раз
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartHeightRef.current,
            layout: { background: { color: '#F9FAFB' }, textColor: '#222' },
            grid: { vertLines: { color: '#eee' }, horzLines: { color: '#eee' } },
            timeScale: {
                timeVisible: true,
                secondsVisible: false, // Отключаем секунды для всех таймфреймов
                tickMarkFormatter: (t: unknown) => formatTick(t as Time),
                borderVisible: false,
                rightOffset: 12, // Достаточно места для будущих временных меток
                rightBarStaysOnScroll: true, // Последний бар остается видимым при прокрутке
            },
            localization: {
                locale: 'ru-RU',
                timeFormatter: (t: unknown) => formatTick(t as Time),
                priceFormatter: (price: number) => {
                    // Форматируем цену в crosshair с правильным количеством знаков
                    if (price >= 1000) {
                        return price.toFixed(2);
                    } else if (price >= 1) {
                        return price.toFixed(4);
                    } else {
                        return price.toFixed(6);
                    }
                },
            },
            rightPriceScale: { borderColor: '#eee' },
            crosshair: {
                mode: 0, // Полностью отключен
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: false,
            },
            kineticScroll: {
                touch: true,
                mouse: false,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
                axisPressedMouseMove: true,
                axisDoubleClickReset: false,
            },
        });
        // нативные подписи используют tickMarkFormatter — ничего не пересчитываем
        // barSpacing уже установлен в начальной конфигурации timeScale
        chartRef.current = chart;
        try {
            chartContainerRef.current.style.touchAction = 'pan-y';
        } catch {
            // Ignore errors when setting touch action
        }

        // Crosshair отключен

        // Отслеживаем пользовательский зум/скролл
        // react on pan/zoom
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            if (programmaticSetRef.current) {
                programmaticSetRef.current = false;
                return;
            }
            userAdjustedRef.current = true;
            // нативные подписи обновляются сами
        });
        
        const handleResize = () => {
            if (chartContainerRef.current) {
                const widthNow = chartContainerRef.current.clientWidth;
                chart.resize(widthNow, chartHeightRef.current);
                const spacingNow = computeBarSpacing(widthNow, currentTimeframeRef.current);
                chart.timeScale().applyOptions({ barSpacing: spacingNow });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Функция для применения видимого диапазона к последним барам
    const applyVisibleRangeToLastBars = useCallback((): void => {
        if (!chartRef.current) return;
        const total = barsCount;
        if (total < 2) return;
        try {
            programmaticSetRef.current = true;
            const tf = selectedTimeframe.value;
            const bars = getDefaultVisibleBars(tf);
            const tfSec = timeframeToSeconds(tf);
            const nowSec = Math.floor(Date.now() / 1000);

            // Получаем следующую ключевую временную метку + буфер для показа будущих меток
            const nextKeyTime = getNextKeyTimeStep(nowSec, tf);
            const buffer = rightBufferByTF[tf] ?? 60;
            const toSec = nextKeyTime + buffer;
            
            // Рассчитываем начальное время для показа нужного количества баров
            const fromSec = toSec - bars * tfSec;
            
            chartRef.current.timeScale().setVisibleRange({ 
                from: fromSec as unknown as Time, 
                to: toSec as unknown as Time 
            });
        } catch {
            // ignore
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [barsCount, selectedTimeframe.value]);

    // Обновляем отображение секунд и формат времени при смене таймфрейма
    useEffect(() => {
        if (!chartRef.current) return;
        // При смене TF сбрасываем флаг пользовательского масштаба
        userAdjustedRef.current = false;
        chartRef.current.applyOptions({
            timeScale: {
                timeVisible: true,
                secondsVisible: selectedTimeframe.value === '1m',
                tickMarkFormatter: (t: unknown) => formatTick(t as Time),
            },
            localization: {
                locale: 'ru-RU',
                timeFormatter: (t: unknown) => formatTick(t as Time),
            },
        });
        if (chartContainerRef.current) {
            const width = chartContainerRef.current.clientWidth;
            chartRef.current.timeScale().applyOptions({ barSpacing: computeBarSpacing(width, selectedTimeframe.value) });
        }
        // Применяем желаемый масштаб для выбранного TF
        applyVisibleRangeToLastBars();
    }, [selectedTimeframe.value, formatTick, applyVisibleRangeToLastBars]);

    // При изменении высоты/состояния модалки — безопасный resize, если chart ещё не dispose
    useEffect(() => {
        const chart = chartRef.current
        if (!chart) return
        const container = chartContainerRef.current
        if (!container) return
        try {
            chart.resize(container.clientWidth, chartHeightRef.current)
        } catch {
            // chart мог быть уже удалён
        }
    }, [isDealModalOpen, chartHeight]);

    // Серия пересоздаётся только при смене типа/таймфрейма
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
        } else if (type === 'bar') {
            series = chartRef.current.addSeries(BarSeries, {});
        } else {
            series = chartRef.current.addSeries(LineSeries, { color: '#0C54EA', lineWidth: 2 });
        }
        seriesRef.current = series;
        // Применяем дефолтный диапазон только при смене TF
        // Устанавливаем исторические данные, если уже загружены
        const current = candlesRef.current;
        if (current.length > 0) {
            if (type === 'line') {
                (series as ISeriesApi<'Line'>).setData(current.map(c => ({ time: c.time, value: c.close })));
            } else {
                (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).setData(current);
            }
        }
        applyVisibleRangeToLastBars();
    }, [selectedChartType, selectedTimeframe, applyVisibleRangeToLastBars]);

    // Устанавливаем исторические данные в серию после загрузки истории
    useEffect(() => {
        if (!seriesRef.current) return;
        const current = candlesRef.current;
        const type: ChartType = selectedChartType.value as ChartType;
        if (current.length === 0) return;
        if (type === 'line') {
            (seriesRef.current as ISeriesApi<'Line'>).setData(current.map(c => ({ time: c.time, value: c.close })));
        } else {
            (seriesRef.current as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).setData(current);
        }
    }, [historyVersion, selectedChartType]);

    // Обновляем видимый диапазон при смене TF, если пользователь не трогал масштаб
    useEffect(() => {
        if (!userAdjustedRef.current) applyVisibleRangeToLastBars();
    }, [selectedTimeframe.value, barsCount, applyVisibleRangeToLastBars]);

    // Когда меняется число баров, если пользователь не менял масштаб — удерживаем правый буфер
    useEffect(() => {
        if (!chartRef.current) return;
        if (barsCount === 0) return;
        if (!userAdjustedRef.current) applyVisibleRangeToLastBars();
    }, [barsCount, applyVisibleRangeToLastBars]);

    // Реальное обновление последней свечи по сокету
    const livePrice: number | undefined = useMemo(() => {
        const sym = selectedCrypto.value.toUpperCase();
        const data: PriceData | undefined = prices[sym];
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return data ? data.price : undefined;
    }, [prices, selectedCrypto.value]);

    // Уже подключены к live ценам выше — повторный вызов не требуется

    useEffect(() => {
        if (!Number.isFinite(livePrice)) return;
        const series = seriesRef.current;
        if (!series) return;
        const price = Number(livePrice);
        const tfSec = timeframeToSeconds(selectedTimeframe.value);
        const nowSec = Math.floor(Date.now() / 1000);
        const bucket = roundToUTCBucket(nowSec, tfSec);
        const list = candlesRef.current;
        if (list.length === 0) return;
        const last = list[list.length - 1];
        const lastTime = typeof last.time === 'number' ? last.time : (last.time as unknown as number);
        if (typeof lastTime !== 'number') return;

        if (bucket <= lastTime) {
            const updated = { ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price) };
            list[list.length - 1] = updated;
            const type: ChartType = selectedChartType.value as ChartType;
            if (type === 'line') {
                (series as ISeriesApi<'Line'>).update({ time: updated.time, value: updated.close });
            } else {
                (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).update(updated);
            }
            return;
        }

        // backfill missing buckets, then append current bucket
        let nextTime = lastTime + tfSec;
        while (nextTime < bucket) {
            const prevClose = (candlesRef.current[candlesRef.current.length - 1]?.close ?? last.close);
            const filler = { time: nextTime as Time, open: prevClose, high: prevClose, low: prevClose, close: prevClose } as Candle;
            candlesRef.current.push(filler);
            const type: ChartType = selectedChartType.value as ChartType;
            if (type === 'line') {
                (series as ISeriesApi<'Line'>).update({ time: filler.time, value: filler.close });
            } else {
                (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).update(filler);
            }
            nextTime += tfSec;
        }

        const newBar = { time: bucket as Time, open: candlesRef.current[candlesRef.current.length - 1].close, high: price, low: price, close: price } as Candle;
        candlesRef.current.push(newBar);
        const type: ChartType = selectedChartType.value as ChartType;
        if (type === 'line') {
            (series as ISeriesApi<'Line'>).update({ time: newBar.time, value: newBar.close });
        } else {
            (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).update(newBar);
        }
        setBarsCount(candlesRef.current.length);
        if (!userAdjustedRef.current) applyVisibleRangeToLastBars();
    }, [livePrice, selectedTimeframe.value, selectedChartType.value, applyVisibleRangeToLastBars, roundToUTCBucket]);

    // Вспомогательная функция для перевода таймфрейма в секунды
    const timeframeToSeconds = (tf: string) => {
        if (tf.endsWith('m')) return parseInt(tf) * 60;
        if (tf.endsWith('h')) return parseInt(tf) * 60 * 60;
        if (tf.endsWith('d')) return parseInt(tf) * 60 * 60 * 24;
        return 60;
    };

    // Упрощенный расчет расстояния между барами по примеру Binance
    const computeBarSpacing = (containerWidth: number, tf: string): number => {
        // Базовые значения расстояния для разных таймфреймов
        const baseSpacing: Record<string, number> = {
            '1m': 8,   // Компактное отображение для коротких интервалов
            '5m': 10,  
            '15m': 12,
            '1h': 14,  
            '4h': 16,  
            '1d': 18   // Более широкое расстояние для дневных баров
        };
        
        const base = baseSpacing[tf] || 12;
        
        // Адаптируем к ширине контейнера
        const scaleFactor = Math.max(0.8, Math.min(1.5, containerWidth / 400));
        
        return Math.round(base * scaleFactor);
    };

    // Оптимальное количество видимых баров по умолчанию (по примеру Binance)
    const getDefaultVisibleBars = (tf: string): number => {
        switch (tf) {
            case '1m': return 60;    // 1 час данных
            case '5m': return 72;    // 6 часов данных  
            case '15m': return 96;   // 24 часа данных
            case '1h': return 168;   // 7 дней данных
            case '4h': return 126;   // 21 день данных
            case '1d': return 90;    // 3 месяца данных
            default: return 100;
        }
    };

    // Буферы для показа будущих временных меток
    const rightBufferByTF: Record<string, number> = {
        '1m': 5 * 60,     // 5 минут буфер
        '5m': 15 * 60,    // 15 минут буфер  
        '15m': 30 * 60,   // 30 минут буфер
        '1h': 2 * 60 * 60,     // 2 часа буфер
        '4h': 8 * 60 * 60,     // 8 часов буфер
        '1d': 2 * 24 * 60 * 60,  // 2 дня буфер
    };

    // Упрощенная логика для показа будущих временных меток
    const getNextKeyTimeStep = (nowSec: number, tf: string): number => {
        const tfSeconds = timeframeToSeconds(tf);
        
        // Просто добавляем несколько интервалов таймфрейма вперед
        const intervalsAhead = {
            '1m': 5,   // 5 минут вперед
            '5m': 6,   // 30 минут вперед (6 * 5m)
            '15m': 4,  // 1 час вперед (4 * 15m)  
            '1h': 2,   // 2 часа вперед
            '4h': 6,   // 24 часа вперед (6 * 4h)
            '1d': 3    // 3 дня вперед
        }[tf] ?? 2;
        
        // Округляем текущее время к ближайшему интервалу и добавляем интервалы вперед
        const roundedNow = Math.floor(nowSec / tfSeconds) * tfSeconds;
        return roundedNow + (intervalsAhead * tfSeconds);
    };



    // computeRightEmptyBars1m removed (правый край задаём абсолютным временем)

    // Нормализация истории к ровной сетке tf, с заполнением пропусков плоскими свечами
    const normalizeHistory = useCallback((arr: Candle[], tfSec: number): Candle[] => {
        if (!Array.isArray(arr) || arr.length === 0) return [];
        // 1) нормализуем время к бакету и убираем дубликаты, сортировка по возрастанию
        const byTime = new Map<number | string, Candle>();
        for (const c of arr) {
            const tRound = roundToUTCBucket((c.time as number), tfSec);
            if (tfSec === 86400) {
                const d = new Date(tRound * 1000);
                const bd = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() } as unknown as Time;
                byTime.set(String(tRound), { ...c, time: bd });
            } else {
                byTime.set(tRound, { ...c, time: tRound as Time });
            }
        }
        const times = Array.from(byTime.keys()).map(k => Number(k)).sort((a, b) => a - b);
        if (times.length === 0) return [];
        const out: Candle[] = [];
        let prev: Candle | null = null;
        for (let t = times[0]; t <= times[times.length - 1]; t += tfSec) {
            const hit = byTime.get(String(t)) ?? byTime.get(t);
            if (hit) {
                out.push(hit);
                prev = hit;
            } else if (prev) {
                const timeVal: Time = tfSec === 86400
                    ? ({ year: new Date(t * 1000).getUTCFullYear(), month: new Date(t * 1000).getUTCMonth() + 1, day: new Date(t * 1000).getUTCDate() } as unknown as Time)
                    : (t as Time);
                out.push({ time: timeVal, open: prev.close, high: prev.close, low: prev.close, close: prev.close });
            }
        }
        return out;
    }, [roundToUTCBucket]);

    const containerMinHeightClass = isDealModalOpen ? 'min-h-[240px]' : 'min-h-[300px]';

    return (
        <div className={`relative border border-gray-200 ${containerMinHeightClass}`}>
            {/* Контролы графика */}
            <div className="flex w-full items-center justify-between p-2">
                <div className="flex w-full items-center gap-2">
                    {/* Криптовалюта (dropdown) */}
                    <div className="relative" ref={cryptoDropdownRef}>
                        <button
                            type="button"
                            className="flex items-center gap-3 h-[28px] justify-between px-2 py-1 border border-gray-200 rounded bg-white focus:outline-none min-w-[90px]"
                            data-tutorial-target="pair-selector"
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
                            data-tutorial-target="timeframe-selector"
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
                            className="flex items-center h-[28px] justify-center w-[28px] border border-gray-200 rounded-[4px] bg-white focus:outline-none"
                            data-tutorial-target="chart-type-selector"
                            aria-haspopup="listbox"
                            aria-expanded={chartTypeDropdownOpen}
                            tabIndex={0}
                            onClick={() => { setChartTypeDropdownOpen((v) => !v); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') setChartTypeDropdownOpen((v) => !v);
                                if (e.key === 'Escape') setChartTypeDropdownOpen(false);
                            }}
                        >
                            <img src={selectedChartType.icon} alt={t(selectedChartType.label)} className="w-5 h-5" />
                        </button>
                        {chartTypeDropdownOpen && (
                            <ul
                                className="absolute z-10 mt-1 w-[28px] bg-white border border-gray-200 rounded-[4px] shadow-lg animate-fade-in flex flex-col items-center"
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
                                        <img src={type.icon} alt={t(type.label)} className="w-5 h-5" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center ml-auto">
                        {/* Pro Mode */}
                        <button
                            type="button"
                            className="flex items-center h-[28px] px-4 rounded-[4px] bg-[#F5A600] text-black font-bold text-[12px] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C54EA]/50"
                            aria-label={t('chart.proMode')}
                            tabIndex={0}
                            onClick={() => { onProModeClick(); }}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onProModeClick(); }}
                        >
                            {t('chart.proMode')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="bg-gray-50 relative" style={{ touchAction: 'pan-y' }}>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/70">
                        <div className="w-10 h-10 rounded-full border-2 border-gray-300 border-t-[#0C54EA] animate-spin" aria-label="loading" />
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/70">
                        <span className="text-red-500 text-lg">{error}</span>
                    </div>
                )}
                <div
                    className={`bg-gray-50 relative ${isDealModalOpen ? 'px-2' : ''}`}
                >
                    <div
                        ref={chartContainerRef}
                        className="w-full touch-pan-y select-none"
                        data-tutorial-target="chart-area"
                        style={{ height: chartHeight }}
                        aria-label={t('chart.live')}
                        tabIndex={0}
                    />
                </div>
                {/* overlay for axis labels removed – using native tick labels */}
            </div>
        </div>
    );
};

export default Chart; 