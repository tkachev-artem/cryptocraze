import { useEffect } from 'react';
import type React from 'react';

type LockAxis = 'x' | 'y' | 'both';

type ScrollLockProps = {
  enabled: boolean;
  allowScrollWithinRef?: React.RefObject<HTMLElement>;
  lockAxis?: LockAxis;
}

// Блокирует прокрутку страницы, но разрешает скролл внутри allowScrollWithinRef
export const ScrollLock: React.FC<ScrollLockProps> = ({ enabled, allowScrollWithinRef, lockAxis = 'both' }) => {
  useEffect(() => {
    if (!enabled) return;

    const html = document.documentElement;
    const body = document.body;
    const startScrollY = window.scrollY || window.pageYOffset || 0;

    // Сохраняем предыдущие inline-стили, чтобы вернуть их при размонтировании
    const prev = {
      html: {
        overscrollBehavior: html.style.overscrollBehavior,
        touchAction: html.style.touchAction,
      },
      body: {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        width: body.style.width,
        overflow: body.style.overflow,
        overscrollBehavior: body.style.overscrollBehavior,
        touchAction: body.style.touchAction,
      },
    };

    // Фиксируем страницу
    body.style.position = 'fixed';
    body.style.top = `-${startScrollY.toString()}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    // Отключаем overscroll и жесты страницы
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    const touchAction = lockAxis === 'y' ? 'pan-x' : lockAxis === 'x' ? 'pan-y' : 'none';
    html.style.touchAction = touchAction;
    body.style.touchAction = touchAction;

    const onTouchMove = (e: TouchEvent) => {
      const allowEl = allowScrollWithinRef?.current;
      if (allowEl?.contains(e.target as Node)) return;
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      const allowEl = allowScrollWithinRef?.current;
      if (allowEl?.contains(e.target as Node)) return;
      e.preventDefault();
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('wheel', onWheel);

      // Восстанавливаем стили
      html.style.overscrollBehavior = prev.html.overscrollBehavior;
      html.style.touchAction = prev.html.touchAction;
      body.style.position = prev.body.position;
      body.style.top = prev.body.top;
      body.style.left = prev.body.left;
      body.style.right = prev.body.right;
      body.style.width = prev.body.width;
      body.style.overflow = prev.body.overflow;
      body.style.overscrollBehavior = prev.body.overscrollBehavior;
      body.style.touchAction = prev.body.touchAction;

      // Возвращаем скролл
      const y = Math.abs(parseInt((prev.body.top || '').replace('px', ''), 10)) || startScrollY;
      window.scrollTo(0, y);
    };
  }, [enabled, allowScrollWithinRef, lockAxis]);

  return null;
};

export default ScrollLock;

