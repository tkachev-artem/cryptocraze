import { useEffect, useMemo, useState, useRef } from 'react';
import { lazy, Suspense } from 'react';
const ProChart = lazy(() => import('@/components/ProChart'));
import type { ProChartHandle } from '@/components/ProChart';
import ProBottomMenu from '@/components/ui/ProBottomMenu';
import ProChartModal from '@/components/ProChartModal';
import ProShareModal from '@/components/ProShareModal';
import UniversalTutorial from '@/components/UniversalTutorial';
import ProExitModal from '@/components/ProExitModal';
import Deal from '@/components/Deal';
import { EditDealModal } from '@/components/EditDealModal';
import TextMarkerModal from '@/components/TextMarkerModal';
import { analyticsService } from '@/services/analyticsService';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchBinanceStats, selectBinanceStats } from '@/app/binanceSlice';
import { fetchUser } from '@/app/userSlice';

import useLivePrices from '@/hooks/useLivePrices';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DrawingTool, DrawingMode, DrawingObject, TextObject } from '@/types/drawing';
import { useCoinGeckoIcon } from '@/hooks/useCoinGeckoIcon';
import { symbolToCoinId } from '@/hooks/symbolToCoinId';

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_TF = '1m';

const LABELS: Record<string, string> = {
  BTCUSDT: 'BTC/USDT',
  ETHUSDT: 'ETH/USDT',
  SOLUSDT: 'SOL/USDT',
  XRPUSDT: 'XRP/USDT',
  DOGEUSDT: 'DOGE/USDT',
};

// Функции для сохранения настроек Pro режима
const PRO_SETTINGS_KEY = 'cryptocraze_pro_settings';

type ProSettings = {
  symbol: string;
  timeframe: string;
  chartType: 'line' | 'candlestick' | 'bar';
  indicators: { ema: boolean; rsi: boolean; sma: boolean };
};

const saveProSettings = (settings: ProSettings) => {
  try {
    localStorage.setItem(PRO_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save pro settings:', error);
  }
};

const loadProSettings = (): ProSettings | null => {
  try {
    const saved = localStorage.getItem(PRO_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved) as ProSettings;
    }
  } catch (error) {
    console.warn('Failed to load pro settings:', error);
  }
  return null;
};

const Pro: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const stats = useAppSelector(selectBinanceStats);
  const user = useAppSelector((state) => state.user.user);

  // Загружаем сохраненные настройки
  const savedSettings = loadProSettings();

  const [symbol, setSymbol] = useState<string>(() => {
    // URL параметры имеют приоритет над сохраненными настройками
    const urlPair = searchParams.get('pair')?.toUpperCase();
    if (urlPair) return urlPair;
    return savedSettings?.symbol ?? DEFAULT_SYMBOL;
  });
  
  const [tf, setTf] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>(() => {
    const urlTf = searchParams.get('tf');
    if (urlTf && ['1m', '5m', '15m', '1h', '4h', '1d'].includes(urlTf)) {
      return urlTf as '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    }
    const savedTf = savedSettings?.timeframe;
    if (savedTf && ['1m', '5m', '15m', '1h', '4h', '1d'].includes(savedTf)) {
      return savedTf as '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    }
    return DEFAULT_TF;
  });
  
  const [chartType, setChartType] = useState<'line' | 'candlestick' | 'bar'>(() => {
    return savedSettings?.chartType ?? 'line';
  });
  
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [ohlc, setOhlc] = useState<{ open: number; high: number; low: number; close: number } | null>(null);
  
  const [indicators, setIndicators] = useState<{ ema: boolean; rsi: boolean; sma: boolean }>(() => {
    return savedSettings?.indicators ?? { ema: false, rsi: false, sma: false };
  });
  const [modalType, setModalType] = useState<'chart' | 'fx' | 'marker' | 'share' | 'switch' | null>(null);
  const [isExitOpen, setIsExitOpen] = useState<boolean>(false);
  const [menuHeight, setMenuHeight] = useState<number>(56);
  const [isDealOpen, setIsDealOpen] = useState<boolean>(false);
    const [dealDirection, setDealDirection] = useState<'up' | 'down'>('up');
  
  // Состояние для EditDeal
  const isEditDealOpen = useAppSelector((state) => state.dealModal.isEditDealOpen);
  
  // Состояние Deal modal из Redux для правильного определения сжатия графика
  const isDealModalOpen = useAppSelector((state) => state.dealModal.isDealModalOpen);
  
  // Состояние для инструментов рисования
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('add');
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [drawingObjects, setDrawingObjects] = useState<DrawingObject[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  // Removed pendingTextMarker - now using direct modal approach
  const [isTextMarkerModalOpen, setIsTextMarkerModalOpen] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState<{ x: number; y: number; price: number; time: number; logical?: number } | null>(null);

  // Chart capture state for sharing
  const proChartRef = useRef<ProChartHandle>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<{
    blob: Blob;
    url: string;
    file: File;
  } | null>(null);

  // Функции для работы с инструментами рисования
  const handleSelectDrawingTool = (tool: DrawingTool) => {
    setActiveTool(tool);
    setModalType(null); // Закрываем модальное окно после выбора инструмента
  };

  const handleDrawingModeChange = (mode: DrawingMode) => {
    setDrawingMode(mode);
  };

  const handleAddDrawingObject = (object: DrawingObject) => {
    setDrawingObjects(prev => [...prev, object]);
    
    // Text objects are now handled through direct modal flow
    
    // Отправляем событие для обучения, если нарисована линия
    if (object.type === 'line') {
      window.dispatchEvent(new Event('pro:tutorial:lineDrawn'));
    }
    // Отправляем событие для обучения, если нарисована область
    if (object.type === 'area') {
      window.dispatchEvent(new Event('pro:tutorial:areaDrawn'));
    }
    // Отправляем событие для обучения, если нарисована стрелка
    if (object.type === 'arrow') {
      window.dispatchEvent(new Event('pro:tutorial:arrowDrawn'));
    }
    
    // Автоматически отключаем инструмент после рисования для лучшего UX
    if (activeTool !== 'none') {
      setTimeout(() => {
        setActiveTool('none');
      }, 100);
    }
  };

  const handleRemoveDrawingObject = (id: string) => {
    setDrawingObjects(prev => prev.filter(obj => obj.id !== id));
    setSelectedDrawingId(prev => (prev === id ? null : prev));
  };

  // Handler for when user clicks on chart with text tool active
  const handleTextPlacementRequest = (position: { x: number; y: number; price: number; time: number; logical?: number }) => {
    setPendingTextPosition(position);
    setIsTextMarkerModalOpen(true);
  };

  const handleAddTextMarker = (text: string, fontSize?: number, color?: string) => {
    if (!pendingTextPosition) return;

    // Create a text marker object with the clicked position
    const textObject: TextObject = {
      id: `text-${Date.now()}-${Math.random()}`,
      type: 'text',
      createdAt: Date.now(),
      x: pendingTextPosition.time,
      y: pendingTextPosition.price,
      logical: pendingTextPosition.logical,
      pixelX: pendingTextPosition.x,
      pixelY: pendingTextPosition.y,
      text,
      fontSize: fontSize || 14,
      color: color || '#000000',
    };
    
    // Add the text object to the drawing objects
    handleAddDrawingObject(textObject);
    
    // Reset states
    setPendingTextPosition(null);
    setIsTextMarkerModalOpen(false);
    setActiveTool('none');
  };

  const handleTextMarkerClose = () => {
    setIsTextMarkerModalOpen(false);
    setPendingTextPosition(null);
    setActiveTool('none');
  };

  // Handle chart capture for sharing
  const handleCaptureChart = async () => {
    if (!proChartRef.current) return;
    
    setIsCapturing(true);
    try {
      const result = await proChartRef.current.captureImage();
      if (result) {
        setCapturedImage(result);
      }
    } catch (error) {
      console.error('Failed to capture chart:', error);
      setCapturedImage(null);
    } finally {
      setIsCapturing(false);
    }
  };

  // Clean up captured image URL when modal closes
  useEffect(() => {
    if (modalType !== 'share' && capturedImage) {
      URL.revokeObjectURL(capturedImage.url);
      setCapturedImage(null);
    }
  }, [modalType, capturedImage]);

  // Обработчик сброса инструмента рисования
  useEffect(() => {
    const handleResetTool = () => {
      setActiveTool('none');
    };
    
    window.addEventListener('resetDrawingTool', handleResetTool);
    return () => {
      window.removeEventListener('resetDrawingTool', handleResetTool);
    };
  }, []);

  // Pro tutorial is now handled by UniversalTutorial component

  // Обработчик для открытия fx модалки в обучении
  useEffect(() => {
    const handleOpenFxModal = () => {
      setModalType('fx');
    };

    const handleCloseFxModal = () => {
      setModalType(null);
    };

    const handleOpenIndicatorsModal = () => {
      setModalType('fx');
    };

    const handleCloseIndicatorsModal = () => {
      setModalType(null);
    };

    const handleCloseMarkerModal = () => {
      setModalType(null);
    };

    const handleResetIndicators = () => {
      console.log('[Pro] Resetting indicators state');
      setIndicators({ ema: false, rsi: false, sma: false });
    };

    const handleClearDrawings = () => {
      console.log('[Pro] Clearing all drawings');
      setDrawingObjects([]);
      setSelectedDrawingId(null);
    };

    window.addEventListener('pro:tutorial:openFxModal', handleOpenFxModal);
    window.addEventListener('pro:tutorial:closeFxModal', handleCloseFxModal);
    window.addEventListener('pro:tutorial:openIndicatorsModal', handleOpenIndicatorsModal);
    window.addEventListener('pro:tutorial:closeIndicatorsModal', handleCloseIndicatorsModal);
    window.addEventListener('pro:tutorial:closeMarkerModal', handleCloseMarkerModal);
    window.addEventListener('pro:tutorial:resetIndicators', handleResetIndicators);
    window.addEventListener('pro:tutorial:clearDrawings', handleClearDrawings);
    return () => {
      window.removeEventListener('pro:tutorial:openFxModal', handleOpenFxModal);
      window.removeEventListener('pro:tutorial:closeFxModal', handleCloseFxModal);
      window.removeEventListener('pro:tutorial:openIndicatorsModal', handleOpenIndicatorsModal);
      window.removeEventListener('pro:tutorial:closeIndicatorsModal', handleCloseIndicatorsModal);
      window.removeEventListener('pro:tutorial:closeMarkerModal', handleCloseMarkerModal);
      window.removeEventListener('pro:tutorial:resetIndicators', handleResetIndicators);
      window.removeEventListener('pro:tutorial:clearDrawings', handleClearDrawings);
    };
  }, []);

  // Сохранение настроек Pro режима в localStorage
  useEffect(() => {
    const settings: ProSettings = {
      symbol,
      timeframe: tf,
      chartType,
      indicators,
    };
    saveProSettings(settings);
  }, [symbol, tf, chartType, indicators]);

  // Live price via socket + REST fallback каждую секунду для Pro режима
  const { prices } = useLivePrices([symbol]);

  
  // Получаем иконку криптовалюты
  const coinId = symbolToCoinId[symbol] ?? symbol.replace('USDT', '').toLowerCase();
  const { iconUrl } = useCoinGeckoIcon(coinId);

  useEffect(() => {
    const upperSymbol = symbol.toUpperCase();
    const priceData = prices[upperSymbol];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const p = priceData?.price;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (p != null && Number.isFinite(p)) {
      setLastPrice(p);
    }
  }, [prices, symbol]);

  useEffect(() => {
    // optional: refresh stats every 5 minutes for non-realtime fields (high/low/volume)
    void dispatch(fetchBinanceStats(symbol));
    void dispatch(fetchUser({}));
    const id = setInterval(() => { void dispatch(fetchBinanceStats(symbol)); }, 300000);
    return () => {
      clearInterval(id);
    };
  }, [dispatch, symbol]);

  const pairLabel = useMemo(() => LABELS[symbol] ?? `${symbol.slice(0, -4)}/${symbol.slice(-4)}`, [symbol]);

  // react to pair change from query (coming back from list)
  useEffect(() => {
    const s = (searchParams.get('pair')?.toUpperCase() ?? symbol);
    if (s !== symbol) setSymbol(s);
  }, [searchParams, symbol]);
  void (lastPrice ?? stats?.lastPrice); // avoid unused var warning in type-check

  return (
    <div className="h-dvh w-full bg-white flex flex-col" style={{ paddingBottom: `calc(${String(menuHeight)}px + env(safe-area-inset-bottom))` }}>
      <div className="px-3 pt-3 pb-2 text-black">
                {/* Line 1: Pair • TF • O • H */}
        <div className="leading-tight">
          <span className="text-[12px] font-bold whitespace-nowrap">{pairLabel}</span>
          <img src="/prochart/fullstop.svg" alt="•" className="inline mx-1 w-[3px] h-[4px]" />
          <span className="text-[12px] font-bold whitespace-nowrap">{tf}</span>
          {ohlc && (
            <>
              <img src="/prochart/fullstop.svg" alt="•" className="inline mx-1 w-[3px] h-[4px]" />
              <span className="text-[12px] font-bold text-black whitespace-nowrap">O:{'\u00A0'}{ohlc.open.toLocaleString('ru-RU')}</span>{'\u00A0'}
              <span className="text-[12px] font-bold text-black whitespace-nowrap">H:{'\u00A0'}{ohlc.high.toLocaleString('ru-RU')}</span>
            </>
          )}
        </div>
        
        {/* Line 2: L • C • Delta */}
        {ohlc && (
          <div className="leading-tight">
            <span className="text-[12px] font-bold text-black whitespace-nowrap">L:{'\u00A0'}{ohlc.low.toLocaleString('ru-RU')}</span>{'\u00A0'}
            <span className="text-[12px] font-bold text-black whitespace-nowrap">C:{'\u00A0'}{ohlc.close.toLocaleString('ru-RU')}</span>
            {(() => {
              const open = ohlc.open;
              const close = ohlc.close;
              const delta = close - open;
              const pct = open !== 0 ? (delta / open) * 100 : 0;
              const sign = delta > 0 ? '+' : '';
              const cls = delta > 0 ? 'text-[#2EBD85]' : delta < 0 ? 'text-[#F6465D]' : 'text-gray-700';
              return (
                <span className={`text-[12px] font-bold ml-1 ${cls}`}>
                  {sign}{Math.abs(delta).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ({sign}{Math.abs(pct).toFixed(2)}%)
                </span>
              );
            })()}
          </div>
        )}
      </div>

      <div 
        className="flex-1 min-h-0"
        style={{ 
          paddingBottom: isDealOpen ? '420px' : (isEditDealOpen ? '320px' : `${String(menuHeight)}px`)
        }}
      >
        <Suspense fallback={<div className="w-full h-full"><div className="w-full h-[300px] bg-white border border-gray-200 rounded-md animate-pulse" /></div>}>
          <ProChart 
            ref={proChartRef}
            symbol={symbol} 
            timeframe={tf} 
            chartType={chartType} 
            indicators={indicators} 
            onPriceUpdate={setLastPrice} 
            onOHLCUpdate={setOhlc}
            sidePaddingPx={isDealOpen ? 8 : 0}
            isEditDealOpenOverride={isEditDealOpen}
            drawingMode={drawingMode}
            activeTool={activeTool}
            drawingObjects={drawingObjects}
            onAddDrawingObject={handleAddDrawingObject}
            onRemoveDrawingObject={handleRemoveDrawingObject}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawingObject={setSelectedDrawingId}
            onTextPlacementRequest={handleTextPlacementRequest}
          />
        </Suspense>
      </div>

      {/* Pro controls, positioned above standard bottom nav */}
      <ProBottomMenu
        onOpenModal={(type) => { 
          // Закрываем все открытые модалки перед открытием новой
          setIsDealOpen(false);
          setModalType(null);
          
          if (type === 'switch') {
            setIsDealOpen(true);
            setDealDirection('up'); // default direction
          } else if (type === 'share') {
            setModalType(type);
            // Trigger chart capture when share modal opens
            void handleCaptureChart();
          } else {
            setModalType(type);
          }
        }}
        onExit={() => { setIsExitOpen(true); }}
        offsetBottomPx={0}
        onHeightChange={(h) => { setMenuHeight(h); }}
        activeId={isDealOpen ? 'switch' : modalType}
      />

      <ProChartModal
        isOpen={modalType !== null && modalType !== 'share'}
        onClose={() => { setModalType(null); }}
        type={modalType}
        onSelectChartType={(type) => { setChartType(type); }}
        onSelectTimeframe={(newTf) => { setTf(newTf); }}
        currentChartType={chartType}
        currentTimeframe={tf}
        offsetBottomPx={menuHeight}
        indicators={indicators}
        onToggleIndicators={(next) => {
          setIndicators(next);
        }}
        onOpenPairList={() => {
          setModalType(null); 
          void navigate('/trade/list?return=pro');
        }}
        drawingMode={drawingMode}
        activeTool={activeTool}
        onSelectDrawingTool={handleSelectDrawingTool}
        onDrawingModeChange={handleDrawingModeChange}

        selectedDrawingId={selectedDrawingId}
        drawings={drawingObjects}

        onRemoveById={(id) => {
          handleRemoveDrawingObject(id);
        }}

      />

      <ProShareModal
        isOpen={modalType === 'share'}
        onClose={() => { setModalType(null); }}
        capturedImage={capturedImage}
        isCapturing={isCapturing}
        symbol={symbol}
        offsetBottomPx={menuHeight}
      />

      {/* Pro Tutorial - New System */}
      <UniversalTutorial type="pro" autoStart={true} />

      {/* Deal Modal */}
      <Deal
        isOpen={isDealOpen}
        onClose={() => { setIsDealOpen(false); }}
        cryptoData={{
          symbol: symbol,
          name: pairLabel,
          price: lastPrice ? String(lastPrice) : (stats?.lastPrice ? stats.lastPrice.toString() : '0'),
          iconUrl: iconUrl ?? undefined
        }}
        userBalance={user?.balance ? String(user.balance) : '0'}
        direction={dealDirection}
        bottomOffset={menuHeight}
      />

      {/* Edit Deal Modal */}
      <EditDealModal 
        bottomOffset={menuHeight} 
      />

      {/* Text Marker Modal */}
      <TextMarkerModal
        isOpen={isTextMarkerModalOpen}
        onClose={handleTextMarkerClose}
        onSave={handleAddTextMarker}
      />

      <ProExitModal
        isOpen={isExitOpen}
        onCancel={() => { setIsExitOpen(false); }}
        onConfirm={() => { setIsExitOpen(false); void navigate('/trade'); }}
      />



      {/* Standard bottom navigation is not shown on Pro page */}
    </div>
  );
};

export default Pro;

