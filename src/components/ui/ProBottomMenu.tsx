import { useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n';

type ButtonId = 'switch' | 'chart' | 'fx' | 'marker' | 'share' | 'exit';

type ButtonItem = {
  id: ButtonId;
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
};

type ProBottomMenuProps = {
  onExit: () => void;
  onOpenModal: (type: 'chart' | 'fx' | 'marker' | 'share' | 'switch') => void;
  offsetBottomPx?: number; // to sit above default BottomNavigation when both shown
  onHeightChange?: (heightPx: number) => void;
  activeId?: Exclude<ButtonId, 'exit'> | null;
};

const ProBottomMenu: React.FC<ProBottomMenuProps> = ({ onExit, onOpenModal, offsetBottomPx = 0, onHeightChange, activeId = null }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !onHeightChange) return;
    const el = containerRef.current;
    const notify = () => { onHeightChange(el.getBoundingClientRect().height); };
    notify();
    const ro = new ResizeObserver(() => { notify(); });
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, [onHeightChange]);

  const items: ButtonItem[] = [
    { id: 'switch', icon: '', label: t('proMenu.switch'), onClick: () => { onOpenModal('switch'); } },
    { id: 'chart', icon: '/pro-menu/chart.svg', label: t('proMenu.chart'), onClick: () => { onOpenModal('chart'); } },
    { id: 'fx', icon: '/pro-menu/fx.svg', label: t('proMenu.fx'), onClick: () => { 
      onOpenModal('fx'); 
      // Отправляем событие для обучения
      window.dispatchEvent(new Event('pro:tutorial:fxClicked'));
    } },
    { id: 'marker', icon: '/pro-menu/marker.svg', label: t('proMenu.marker'), onClick: () => { 
      onOpenModal('marker'); 
      // Отправляем событие для обучения
      window.dispatchEvent(new Event('pro:tutorial:markerClicked'));
    } },
    { id: 'share', icon: '/pro-menu/share.svg', label: t('proMenu.share'), onClick: () => { onOpenModal('share'); } },
    { id: 'exit', icon: '/pro-menu/exit.svg', label: t('proMenu.exit'), onClick: () => { onExit(); } },
  ];

  return (
    <div
      ref={containerRef}
      role="navigation"
      aria-label={t('proMenu.aria')}
      className="absolute left-0 right-0 z-[70] bg-white border-t border-gray-200 flex justify-between items-center gap-3 px-4 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]"
      style={{ bottom: offsetBottomPx }}
      onTouchMove={(e) => { e.preventDefault(); }}
    >
      <div className="flex items-center justify-between w-full gap-2">
        {items.map((b) => {
          const isActive = b.id !== 'exit' && activeId === b.id;
          return b.id === 'switch' ? (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              className={`group w-[48px] h-[40px] rounded-[4px] border flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C46BE]/40 transition-colors ${isActive ? 'bg-[#F1F7FF] border-transparent' : 'bg-gray-50 border-gray-200 active:bg-[#F1F7FF] active:border-transparent'}`}
              aria-label={t('proMenu.switch')}
              aria-pressed={isActive}
            >
              <div className="flex flex-col items-center gap-0">
                <span
                  className="w-[18px] h-[8px] block bg-black group-active:bg-[#0C46BE]"
                  style={{
                    WebkitMaskImage: 'url(/pro-menu/right-arrow.svg)',
                    maskImage: 'url(/pro-menu/right-arrow.svg)',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    backgroundColor: isActive ? '#0C46BE' : undefined,
                  }}
                  aria-hidden
                />
                <span
                  className="w-[18px] h-[8px] block bg-black group-active:bg-[#0C46BE]"
                  style={{
                    WebkitMaskImage: 'url(/pro-menu/left-arrow.svg)',
                    maskImage: 'url(/pro-menu/left-arrow.svg)',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    backgroundColor: isActive ? '#0C46BE' : undefined,
                  }}
                  aria-hidden
                />
              </div>
            </button>
          ) : (
            <button
              key={b.id}
              type="button"
              onClick={b.onClick}
              className={`group w-[48px] h-[40px] rounded-[4px] border flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C46BE]/40 transition-colors ${isActive ? 'bg-[#F1F7FF] border-transparent' : 'bg-gray-50 border-gray-200 hover:bg-[#F1F7FF] active:bg-[#F1F7FF] active:border-transparent'}`}
              aria-label={b.label}
              aria-pressed={isActive}
              data-tutorial-target={b.id === 'fx' ? 'fx-element' : b.id === 'marker' ? 'marker-element' : undefined}
            >
              <span
                className={`w-6 h-6 block bg-black group-hover:bg-[#0C46BE] group-active:bg-[#0C46BE]`}
                style={{
                  WebkitMaskImage: `url(${b.icon})`,
                  maskImage: `url(${b.icon})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                  backgroundColor: isActive ? '#0C46BE' : undefined,
                }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProBottomMenu;

