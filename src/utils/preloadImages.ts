// Агрессивная предзагрузка всех критичных изображений
export const preloadCriticalImages = () => {
  const criticalImages = [
    // Основные изображения
    '/panda.webp',
    '/avatar.webp',
    '/crown.webp',
    '/logo/logo.svg',
    
    // Навигация
    '/menu/active/home.svg',
    '/menu/active/trading.svg', 
    '/menu/active/profile.svg',
    '/menu/active/rating.svg',
    '/menu/active/best.svg',
    '/menu/no-active/home.svg',
    '/menu/no-active/trading.svg',
    '/menu/no-active/profile.svg',
    '/menu/no-active/rating.svg',
    '/menu/no-active/best.svg',
    
    // Dashboard иконки
    '/dashboard/energy.svg',
    '/dashboard/diamond.svg', 
    '/dashboard/up.svg',
    '/dashboard/down.svg',
    
    // Торговые иконки
    '/trade/bitcoin.svg',
    '/trade/chart.svg',
    '/trade/wallet.svg',
    '/trade/money.svg',
    '/deal/up.svg',
    '/deal/down.svg',
    
    // Статистика
    '/statistics/coin.svg',
    '/statistics/money.svg',
    '/statistics/reward.svg'
  ];

  // Предзагружаем изображения в фоне
  criticalImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};

// Вторая волна - менее критичные изображения
export const preloadSecondaryImages = () => {
  const secondaryImages = [
    '/accept.webp',
    '/vault.webp',
    '/rating/rating-bg.webp',
    '/rating/top-bg.webp',
    '/settings/crown.svg',
    '/settings/language.svg',
    '/settings/notifications.svg',
    '/settings/share.svg',
    '/premium/logo.svg',
    '/premium/check.svg'
  ];

  // Задержка перед второй волной
  setTimeout(() => {
    secondaryImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, 1000);
};