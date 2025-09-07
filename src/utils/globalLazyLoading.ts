// Глобальная настройка lazy loading для всех изображений
export const setupGlobalLazyLoading = () => {
  console.log('🔧 Настраиваем глобальный lazy loading для изображений');

  // Критичные пути, для которых images должны быть eager
  const eagerPaths = ['/home', '/'];
  
  // Критичные селекторы для eager loading
  const eagerSelectors = [
    '[data-critical]',
    '.critical-image',
    // Навигация
    'nav img',
    '[role="navigation"] img',
    // Топ меню 
    '.top-menu img',
    // Аватары пользователей
    'img[alt*="avatar"]',
    'img[src*="avatar"]',
    // Логотипы
    'img[alt*="logo"]',
    'img[src*="logo"]'
  ];

  // Функция для обновления загрузки изображений
  const updateImageLoading = () => {
    const currentPath = window.location.pathname;
    const isEagerPath = eagerPaths.some(path => currentPath.startsWith(path));
    
    // Находим все изображения без атрибута loading
    const images = document.querySelectorAll('img:not([loading])') as NodeListOf<HTMLImageElement>;
    
    images.forEach(img => {
      // Проверяем, является ли изображение критичным
      const isEagerImage = eagerSelectors.some(selector => img.matches(selector));
      const shouldBeEager = isEagerPath || isEagerImage;
      
      // Устанавливаем соответствующий атрибут loading
      img.loading = shouldBeEager ? 'eager' : 'lazy';
      
      console.log(`🔧 Set ${img.src} loading=${img.loading} (path: ${currentPath}, eager: ${shouldBeEager})`);
    });
  };

  // Обновляем существующие изображения
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateImageLoading);
  } else {
    updateImageLoading();
  }

  // Наблюдаем за новыми изображениями
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Проверяем добавленный элемент
            if (element.tagName === 'IMG' && !element.hasAttribute('loading')) {
              const img = element as HTMLImageElement;
              const currentPath = window.location.pathname;
              const isEagerPath = eagerPaths.some(path => currentPath.startsWith(path));
              const isEagerImage = eagerSelectors.some(selector => img.matches(selector));
              const shouldBeEager = isEagerPath || isEagerImage;
              
              img.loading = shouldBeEager ? 'eager' : 'lazy';
              console.log(`🔧 New image ${img.src} loading=${img.loading}`);
            }
            
            // Проверяем дочерние изображения
            const childImages = element.querySelectorAll('img:not([loading])') as NodeListOf<HTMLImageElement>;
            childImages.forEach(img => {
              const currentPath = window.location.pathname;
              const isEagerPath = eagerPaths.some(path => currentPath.startsWith(path));
              const isEagerImage = eagerSelectors.some(selector => img.matches(selector));
              const shouldBeEager = isEagerPath || isEagerImage;
              
              img.loading = shouldBeEager ? 'eager' : 'lazy';
              console.log(`🔧 Child image ${img.src} loading=${img.loading}`);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('🔧 MutationObserver активен для автоматического lazy loading');
  }

  // Обновляем при навигации (для SPA)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(updateImageLoading, 100); // Небольшая задержка для рендера
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(updateImageLoading, 100);
  };

  window.addEventListener('popstate', () => {
    setTimeout(updateImageLoading, 100);
  });

  console.log('✅ Глобальный lazy loading настроен');
};