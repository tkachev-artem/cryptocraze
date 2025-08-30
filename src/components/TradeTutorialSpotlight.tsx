import { useEffect, useState, useCallback } from 'react';

let pending = false;

function throttle(fn: () => void) {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    fn();
    pending = false;
  });
}

type SpotlightProps = {
  targetSelector: string; // e.g. [data-tutorial-target="balance-summary"]
  active: boolean;
  zIndex?: number;
  dimOpacity?: number; // 0..1 darkness for the dim layer
  forceDim?: boolean; // when true, draw fullscreen dim even if no targets
  paddingPx?: number; // extra padding around targets (can be negative or 0)
  shadowPx?: number; // extra blue glow thickness around outline
};

export const TradeTutorialSpotlight = ({ targetSelector, active, zIndex = 65, dimOpacity = 0.3, forceDim = false, paddingPx = 8, shadowPx = 4 }: SpotlightProps) => {
  const [rects, setRects] = useState<DOMRect[]>([]);

  const updateRects = useCallback(() => {
    const elements = document.querySelectorAll(targetSelector);
    console.log('TradeTutorialSpotlight debug:', {
      targetSelector,
      elementsFound: elements.length,
      elements: Array.from(elements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        rect: el.getBoundingClientRect()
      }))
    });
    if (!elements.length) {
      setRects([]);
      return;
    }

    const newRects: DOMRect[] = [];
    elements.forEach((el) => {
      const r = el.getBoundingClientRect();
      const padded = new DOMRect(
        r.left - paddingPx,
        r.top - paddingPx,
        r.width + paddingPx * 2,
        r.height + paddingPx * 2,
      );
      newRects.push(padded);
    });
    setRects(newRects);
  }, [targetSelector, paddingPx]);

  useEffect(() => {
    if (!active) return;
    updateRects();
    const onResize = () => {
      throttle(updateRects);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    const observer = new MutationObserver(() => {
      throttle(updateRects);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      observer.disconnect();
    };
  }, [active, targetSelector, paddingPx, updateRects]);

  if (!active) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // If no targets found
  if (!rects.length) {
    if (forceDim) {
      return (
        <div
          style={{ position: 'fixed', inset: 0, background: `rgba(0,0,0,${Math.max(0, Math.min(1, dimOpacity)).toString()})`, zIndex, pointerEvents: 'auto' }}
          aria-hidden
        />
      );
    }
    return null;
  }

  // Merge all rects into one bounding rect
  const combined = rects.reduce((acc, r) => {
    const left = Math.min(acc.left, r.left);
    const top = Math.min(acc.top, r.top);
    const right = Math.max(acc.left + acc.width, r.left + r.width);
    const bottom = Math.max(acc.top + acc.height, r.top + r.height);
    return new DOMRect(left, top, right - left, bottom - top);
  }, rects[0]);

  const pathD = [
    `M0 0 H ${vw.toString()} V ${vh.toString()} H 0 Z`,
    `M ${combined.left.toString()} ${combined.top.toString()} H ${(combined.left + combined.width).toString()} V ${(combined.top + combined.height).toString()} H ${combined.left.toString()} Z`,
  ].join(' ');

  return (
    <>
      {/* Visual dimming with a hole */}
      <svg
        style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}
        width={vw}
        height={vh}
        viewBox={`0 0 ${vw.toString()} ${vh.toString()}`}
        aria-hidden
      >
        <path d={pathD} fill={`rgba(0,0,0,${Math.max(0, Math.min(1, dimOpacity)).toString()})`} fillRule="evenodd" />
      </svg>

      {/* Transparent blockers to intercept clicks outside the spotlight */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: `${combined.top.toString()}px`, zIndex: zIndex + 1, pointerEvents: 'auto' }} />
      <div style={{ position: 'fixed', left: 0, top: `${combined.top.toString()}px`, width: `${combined.left.toString()}px`, height: `${combined.height.toString()}px`, zIndex: zIndex + 1, pointerEvents: 'auto' }} />
      <div style={{ position: 'fixed', left: `${(combined.left + combined.width).toString()}px`, top: `${combined.top.toString()}px`, width: `${(vw - (combined.left + combined.width)).toString()}px`, height: `${combined.height.toString()}px`, zIndex: zIndex + 1, pointerEvents: 'auto' }} />
      <div style={{ position: 'fixed', left: 0, top: `${(combined.top + combined.height).toString()}px`, width: '100vw', height: `${(vh - (combined.top + combined.height)).toString()}px`, zIndex: zIndex + 1, pointerEvents: 'auto' }} />

      {/* Blue outline with glow; the hole stays interactive */}
      <div
        style={{
          position: 'fixed',
          left: `${combined.left.toString()}px`,
          top: `${combined.top.toString()}px`,
          width: `${combined.width.toString()}px`,
          height: `${combined.height.toString()}px`,
          border: '2px solid #0C54EA',
          borderRadius: '12px',
          zIndex: zIndex + 2,
          pointerEvents: 'none',
          boxShadow: shadowPx > 0 ? `0 0 0 ${shadowPx.toString()}px rgba(12, 84, 234, 0.2)` : 'none',
        }}
        aria-hidden
      />
    </>
  );
};

export default TradeTutorialSpotlight;

