import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { DrawingTool, DrawingMode, DrawingObject } from '@/types/drawing';

type ProChartModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: 'chart' | 'fx' | 'marker' | 'share' | 'switch' | null;
  onSelectChartType?: (type: 'line' | 'candlestick' | 'bar') => void;
  onSelectTimeframe?: (tf: '1m' | '5m' | '15m' | '1h' | '4h' | '1d') => void;
  currentChartType?: 'line' | 'candlestick' | 'bar';
  currentTimeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  offsetBottomPx?: number; // to avoid overlapping ProBottomMenu
  onToggleIndicators?: (next: { ema: boolean; rsi: boolean; sma: boolean }) => void;
  indicators?: { ema: boolean; rsi: boolean; sma: boolean };
  onOpenPairList?: () => void; // open /trade/list for pair selection
  // Drawing props
  drawingMode?: DrawingMode;
  activeTool?: DrawingTool;
  onSelectDrawingTool?: (tool: DrawingTool) => void;
  onDrawingModeChange?: (mode: DrawingMode) => void;
  // onClearAllDrawings?: () => void; // removed per requirement
  // remove mode integration
  drawings?: DrawingObject[];
  selectedDrawingId?: string | null;
  onRemoveById?: (id: string) => void;
  // Text marker props removed - now handled in parent component
};

const titlesKey: Record<NonNullable<ProChartModalProps['type']>, string> = {
  chart: 'proModal.titles.chart',
  fx: 'proModal.titles.fx',
  marker: 'proModal.titles.marker',
  share: 'proModal.titles.share',
  switch: 'proModal.titles.switch',
};

const ProChartModal: React.FC<ProChartModalProps> = ({ 
  isOpen, 
  onClose, 
  type, 
  onSelectChartType, 
  onSelectTimeframe, 
  currentChartType = 'line', 
  currentTimeframe = '1m', 
  offsetBottomPx = 0, 
  onToggleIndicators, 
  indicators = { ema: false, rsi: false, sma: false }, 
  onOpenPairList,
  drawingMode = 'add',
  activeTool = 'none',
  onSelectDrawingTool,
  onDrawingModeChange,
  // onClearAllDrawings,
  drawings = [],
  selectedDrawingId = null,
  onRemoveById,
  
}) => {
  const { t } = useTranslation();
  // Text marker modal removed - now handled in Pro.tsx
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [isOpen, onClose]);

  if (!isOpen || !type) return null;

  return (
    <>
    <div className="absolute inset-0 z-[60] flex items-end justify-center pointer-events-none">
      {/* Backdrop that dims everything EXCEPT the area reserved above bottom controls */}
      <div
        className="absolute left-0 right-0 top-0 bg-black/40 pointer-events-auto"
        style={{ bottom: `calc(${String(offsetBottomPx)}px + env(safe-area-inset-bottom))` }}
        onClick={onClose}
      />
      {/* Divider line above ProBottomMenu */}
      <div
        className="absolute left-0 right-0 h-px bg-gray-200 pointer-events-none"
        style={{ bottom: `calc(${String(offsetBottomPx)}px + env(safe-area-inset-bottom))` }}
      />
      <div
        className={`relative w-full max-w-md mx-auto bg-white rounded-t-2xl p-4 border border-gray-200 shadow-none ${type === 'share' ? 'overflow-y-auto overscroll-contain' : ''}`}
        style={{ 
          marginBottom: `calc(${String(offsetBottomPx)}px + env(safe-area-inset-bottom))`,
          ...(type === 'share' ? { maxHeight: `calc(100vh - ${String(offsetBottomPx)}px - env(safe-area-inset-bottom))` } : {})
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t(titlesKey[type])}
      >
        <div className="flex items-center justify-between mb-2 pointer-events-auto">
          <h2 className="text-lg font-bold text-black">{t(titlesKey[type])}</h2>
          {(type === 'fx' || type === 'marker') && (
            <button
              onClick={onOpenPairList}
              className="w-8 h-8 flex items-center justify-center"
              aria-label={t('trading.selectPair')}
            >
              <img src="/top-menu/list.svg" alt="pairs" className="w-5 h-5" />
            </button>
          )}
        </div>

        {type === 'chart' ? (
          <div className="flex flex-col gap-4 pointer-events-auto">
            <div className="flex flex-row gap-3">
              {([
                { id: 'line', src: '/prochart/line.svg', label: t('chart.line') },
                { id: 'candlestick', src: '/prochart/candles.svg', label: t('chart.candlestick') },
                { id: 'bar', src: '/prochart/bar.svg', label: t('chart.bar') },
              ] as { id: 'line' | 'candlestick' | 'bar'; src: string; label: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { onSelectChartType?.(opt.id); }}
                  className={`w-[48px] h-[40px] flex items-center justify-center rounded-[4px] border shadow-sm ${currentChartType === opt.id ? 'bg-[#F1F7FF] border-transparent' : 'bg-white border-gray-200'}`}
                  aria-label={opt.label}
                  aria-pressed={currentChartType === opt.id}
                >
                  <span
                    className="w-6 h-6 block"
                    style={{
                      backgroundColor: currentChartType === opt.id ? '#0C46BE' : '#000000',
                      WebkitMaskImage: `url(${opt.src})`,
                      maskImage: `url(${opt.src})`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                    }}
                    aria-hidden
                  />
                </button>
              ))}
            </div>

            <div className="my-2 h-px bg-gray-200" />

            <div className="grid grid-cols-6 gap-3">
              {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => { onSelectTimeframe?.(tf); }}
                  className={`w-[48px] h-[40px] rounded-[4px] border shadow-sm text-sm font-semibold ${currentTimeframe === tf ? 'bg-[#F1F7FF] text-[#0C46BE] border-transparent' : 'bg-white text-black border-gray-200'}`}
                  aria-label={tf}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        ) : type === 'fx' ? (
          <div className="flex flex-col gap-3 pointer-events-auto" data-tutorial-target="fx-element">
            {([
              { id: 'ema', label: t('indicators.ema') },
              { id: 'rsi', label: t('indicators.rsi') },
              { id: 'sma', label: t('indicators.sma') },
            ] as const).map((opt) => {
              const isOn = (opt.id === 'ema' && indicators.ema) || (opt.id === 'rsi' && indicators.rsi) || (opt.id === 'sma' && indicators.sma);
              return (
                <div 
                  key={opt.id} 
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                  data-tutorial-target={`${opt.id}-indicator`}
                >
                  <span className="text-sm font-semibold text-black">{opt.label}</span>
                  <button
                    onClick={() => {
                      onToggleIndicators?.({
                        ema: opt.id === 'ema' ? !indicators.ema : indicators.ema,
                        rsi: opt.id === 'rsi' ? !indicators.rsi : indicators.rsi,
                        sma: opt.id === 'sma' ? !indicators.sma : indicators.sma,
                      });
                      
                      // Отправляем событие для обучения, если это EMA, RSI или SMA
                      window.dispatchEvent(new Event(`pro:tutorial:${opt.id}Toggled`));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${isOn ? 'bg-[#0C46BE]' : 'bg-[#F1F7FF]'}`}
                    aria-pressed={isOn}
                    aria-label={`${opt.label} toggle`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${isOn ? 'right-0.5 bg-white' : 'left-0.5 bg-[#0C46BE]'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : type === 'marker' ? (
          <div className="flex flex-col gap-4 pointer-events-auto">
            {/* Buttons: Add/Remove */}
            <div className="flex gap-1 bg-[#F5F5F5] rounded-[40px] p-1">
              <button 
                onClick={() => onDrawingModeChange?.('add')}
                className={`flex-1 h-10 text-sm font-bold rounded-[20px] flex items-center justify-center gap-2 ${
                  drawingMode === 'add' 
                    ? 'bg-[#0C54EA] text-white' 
                    : 'bg-transparent text-black'
                }`}
              >
                {t('markers.actions.add')}
              </button>
              <button 
                onClick={() => onDrawingModeChange?.('remove')}
                className={`flex-1 h-10 text-sm font-bold rounded-[20px] flex items-center justify-center ${
                  drawingMode === 'remove' 
                    ? 'bg-[#0C54EA] text-white' 
                    : 'bg-transparent text-black opacity-30'
                }`}
              >
                {t('markers.actions.remove')}
              </button>
            </div>

            {/* Header actions в режиме удаления — убраны по требованию */}

            {/* Список объектов для удаления */}
            {drawingMode === 'remove' && (
              <div className="max-h-72 overflow-auto flex flex-col gap-2 py-1">
                {drawings.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">{t('drawing.noObjects')}</div>
                )}
                {drawings.map((d: DrawingObject) => {
                  const type = d.type;
                  const iconMap: Record<DrawingObject['type'], string> = {
                    horizontalLine: '/pro-menu/horizontal-line.svg',
                    verticalLine: '/pro-menu/vertical-line.svg',
                    line: '/pro-menu/diagonal-line.svg',
                    text: '/pro-menu/text-tool.svg',
                    area: '/pro-menu/area-tool.svg',
                    arrow: '/pro-menu/arrow-tool.svg',
                  };
                  const labelMap: Record<DrawingObject['type'], string> = {
                    horizontalLine: t('markers.tools.horizontalLine'),
                    verticalLine: t('markers.tools.verticalLine'),
                    line: t('markers.tools.line'),
                    text: t('markers.tools.text'),
                    area: t('markers.tools.area'),
                    arrow: t('markers.tools.arrow'),
                  };
                  const sub = (() => {
                    switch (d.type) {
                      default:
                        return '';
                    }
                  })();
                  return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between bg-white border rounded-lg px-3 py-2 shadow-sm max-h-[40px] ${selectedDrawingId === d.id ? 'border-[#0C54EA] bg-[#F1F7FF]' : 'border-[#E0E0E0]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4" style={{ WebkitMaskImage: `url(${iconMap[type]})`, maskImage: `url(${iconMap[type]})`, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center', WebkitMaskSize: 'contain', maskSize: 'contain', backgroundColor: selectedDrawingId === d.id ? '#0C54EA' : '#111' }} />
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${selectedDrawingId === d.id ? 'text-[#0C54EA]' : 'text-black opacity-50'}`}>{labelMap[type]}</span>
                        {sub && <span className="text-xs text-gray-500">{sub}</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveById?.(d.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100"
                      aria-label={t('markers.actions.remove')}
                    >
                      <img src="/pro-menu/delete.svg" alt="delete" className="w-5 h-5" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}

            {/* Marker Tools - показываем только в режиме добавления */}
            {drawingMode === 'add' && (
              <div className="max-h-72 overflow-auto flex flex-col gap-2 py-1">
                {([
                  { id: 'horizontalLine', icon: '/pro-menu/horizontal-line.svg', label: t('markers.tools.horizontalLine') },
                  { id: 'verticalLine', icon: '/pro-menu/vertical-line.svg', label: t('markers.tools.verticalLine') },
                  { id: 'line', icon: '/pro-menu/diagonal-line.svg', label: t('markers.tools.line') },
                  { id: 'text', icon: '/pro-menu/text-tool.svg', label: t('markers.tools.text') },
                  { id: 'area', icon: '/pro-menu/area-tool.svg', label: t('markers.tools.area') },
                  { id: 'arrow', icon: '/pro-menu/arrow-tool.svg', label: t('markers.tools.arrow') },
                ] as const).map((tool) => (
                  <div 
                    key={tool.id} 
                    className={`flex items-center justify-between bg-white border rounded-lg px-3 py-2 shadow-sm max-h-[40px] ${
                      activeTool === tool.id 
                        ? 'border-[#0C54EA] bg-[#F1F7FF]' 
                        : 'border-[#E0E0E0]'
                    }`}
                    data-tutorial-target={
                      tool.id === 'line' ? 'line-element' : 
                      tool.id === 'area' ? 'areas-element' : 
                      tool.id === 'arrow' ? 'arrow-element' : 
                      undefined
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <img src={tool.icon} alt="" className="w-4 h-4" style={{ filter: 'none' }} />
                      </div>
                      <span className={`text-sm font-medium ${
                        activeTool === tool.id 
                          ? 'text-[#0C54EA]' 
                          : 'text-black opacity-50'
                      }`}>
                        {tool.label}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        
                        // Special handling for text tool - just activate the tool
                        if (tool.id === 'text') {
                          onSelectDrawingTool?.(tool.id as DrawingTool);
                          onClose(); // Close modal so user can click on chart
                          return;
                        }
                        
                        onSelectDrawingTool?.(tool.id as DrawingTool);
                        
                        // Отправляем событие для обучения, если это Area Selection
                        if (tool.id === 'area') {
                          window.dispatchEvent(new Event('pro:tutorial:areasClicked'));
                        }
                        // Отправляем событие для обучения, если это Arrow
                        if (tool.id === 'arrow') {
                          window.dispatchEvent(new Event('pro:tutorial:arrowClicked'));
                        }
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100"
                      aria-label={`${t('markers.actions.add')} ${tool.label}`}
                    >
                      <img src="/pro-menu/plus-icon.svg" alt="+" className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            {t('proModal.stub', { title: t(titlesKey[type]) })}
          </div>
        )}
      </div>
    </div>
  </>
  );
};

export default ProChartModal;

