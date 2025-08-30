/**
 * Устанавливает обработчики, которые сбрасывают зум (масштаб = 1)
 * после закрытия клавиатуры и/или потери фокуса инпутом.
 * Работает в Safari iOS и Android через visualViewport.
 */
export const installKeyboardZoomFix = (): void => {
  if (typeof document === 'undefined') return;

  const existingMeta = document.querySelector('meta[name="viewport"]');
  const meta: HTMLMetaElement = existingMeta ? existingMeta as HTMLMetaElement : createViewportMeta();

  const baseContent = meta.getAttribute('content') ?? 'width=device-width, initial-scale=1.0';

  const lockZoomContent = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';

  const temporarilyResetZoom = () => {
    try {
      // Сначала жестко фиксируем масштаб на 1
      meta.setAttribute('content', lockZoomContent);
      // Затем быстро возвращаем исходное содержимое, чтобы не блокировать pinch-zoom навсегда
      window.setTimeout(() => {
        meta.setAttribute('content', baseContent);
      }, 250);
    } catch {
      // ignore
    }
  };

  const handleFocusOut = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    // Реагируем только если уход фокуса был с полей ввода
    if (!target) return;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || target.getAttribute('contenteditable') === 'true') {
      temporarilyResetZoom();
    }
  };

  const handleVisualViewportResize = () => {
    const vv = window.visualViewport;
    if (!vv) return;
    // Если клавиатура скрылась (высота почти равна окну) и есть зум — сбросим
    const heightRatio = vv.height / window.innerHeight;
    const isKeyboardProbablyHidden = heightRatio > 0.9; // эвристика
    const isZoomed = (vv.scale || 1) > 1.02;
    if (isKeyboardProbablyHidden && isZoomed) {
      temporarilyResetZoom();
    }
  };

  document.addEventListener('focusout', handleFocusOut, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewportResize);
  }
};

/**
 * Устанавливает глобальные гварды для жестов, чтобы приложение вело себя как нативное:
 * - Блокирует pinch-zoom (iOS gesture* + многокасание)
 * - Блокирует double-tap zoom
 * - Предотвращает перетаскивание/drag по умолчанию
 */
export const installNativeLikeGestureGuards = (): void => {
  if (typeof window === 'undefined') return;

  // Блок pinch-zoom в iOS (gesture* события существуют только в Safari)
  const preventDefault = (e: Event) => {
    try { e.preventDefault(); } catch { /* ignore */ }
  };

  window.addEventListener('gesturestart', preventDefault as EventListener, { passive: false });
  window.addEventListener('gesturechange', preventDefault as EventListener, { passive: false });
  window.addEventListener('gestureend', preventDefault as EventListener, { passive: false });

  // Многокасание может вызывать зум в некоторых браузерах
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };
  document.addEventListener('touchstart', handleTouchStart, { passive: false });

  // Double-tap zoom (iOS Safari)
  let lastTouchEnd = 0;
  const handleTouchEnd = (e: TouchEvent) => {
    const target = e.target as HTMLElement | null;
    // В инпутах и редактируемых элементах не блокируем дабл-тап
    if (target?.closest('input, textarea, [contenteditable="true"]')) {
      lastTouchEnd = Date.now();
      return;
    }
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };
  document.addEventListener('touchend', handleTouchEnd, { passive: false });

  // Предотвращаем dragstart по умолчанию (перетаскивание изображений/ссылок)
  const handleDragStart = (e: DragEvent) => {
    e.preventDefault();
  };
  document.addEventListener('dragstart', handleDragStart);

  // Блокируем edge-swipe назад от левого края и pull-to-refresh вне основного контейнера
  let touchStartX: number | null = null;
  let touchStartY: number | null = null;

  const appScrollContainer = (): HTMLElement | null => {
    const element = document.querySelector('[data-app-scroll="true"]');
    return element as HTMLElement | null;
  }

  const handleGuardTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleGuardTouchMove = (e: TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    const fromLeftEdge = touchStartX <= 18; // зона жеста назад в iOS
    if (fromLeftEdge && deltaX > 10) {
      e.preventDefault();
      return;
    }

    const scrollable = appScrollContainer();
    if (scrollable) {
      const atTop = scrollable.scrollTop <= 0;
      if (atTop && deltaY > 10) {
        // pull-to-refresh
        e.preventDefault();
        return;
      }
    } else {
      // если контейнер не найден — перестрахуемся
      if (deltaY > 10) e.preventDefault();
    }
  };

  const handleGuardTouchEnd = () => {
    touchStartX = null;
    touchStartY = null;
  };

  document.addEventListener('touchstart', handleGuardTouchStart, { passive: true });
  document.addEventListener('touchmove', handleGuardTouchMove, { passive: false });
  document.addEventListener('touchend', handleGuardTouchEnd, { passive: true });
};

const createViewportMeta = (): HTMLMetaElement => {
  const m = document.createElement('meta');
  m.name = 'viewport';
  m.content = 'width=device-width, initial-scale=1.0';
  document.head.appendChild(m);
  return m;
};

/**
 * Определяет, является ли устройство телефоном (не планшет и не десктоп).
 * Использует userAgentData, userAgent и небольшие эвристики по viewport.
 */
export const isPhoneDevice = (): boolean => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;

  // Define extended navigator interface for userAgentData
  type NavigatorWithUserAgentData = {
    userAgentData?: {
      mobile?: boolean;
    };
    vendor?: string;
    maxTouchPoints?: number;
  } & Navigator
  
  const extendedNavigator = navigator as NavigatorWithUserAgentData;
  const uaDataMobile: boolean | undefined = extendedNavigator.userAgentData?.mobile;
  const ua: string = navigator.userAgent || '';

  // iPadOS 13+ маскируется под Mac, но имеет тач  
  const isIpadOs13Plus = (extendedNavigator.maxTouchPoints || 0) > 1;
  const isIpad = ua.includes('iPad') || isIpadOs13Plus;

  const isIphone = /iPhone|iPod/.test(ua);
  const isAndroid = ua.includes('Android');
  const isAndroidPhone = isAndroid && ua.includes('Mobile');
  const isWindowsPhone = ua.includes('Windows Phone');
  const isTabletKeyword = ua.includes('Tablet') || /SM-T|Lenovo Tab|Nexus 7|Nexus 9|Kindle Fire|KF[A-Z]/.test(ua);

  const looksLikePhoneByUA = (
    isIphone || isAndroidPhone || isWindowsPhone || ua.includes('Mobi')
  ) && !isIpad && !isTabletKeyword;

  if (uaDataMobile === true) {
    return !isIpad && !isTabletKeyword;
  }

  if (uaDataMobile === false) {
    return looksLikePhoneByUA;
  }

  return looksLikePhoneByUA;
};

