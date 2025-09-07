// Автоматически конвертируем PNG в WebP для быстрой загрузки
export const getOptimizedImageSrc = (imagePath: string): string => {
  // Если это PNG - заменяем на WebP
  if (imagePath.endsWith('.png')) {
    return imagePath.replace('.png', '.webp');
  }
  
  return imagePath;
};

// Список критичных изображений для предзагрузки
export const CRITICAL_IMAGES = [
  '/avatar.webp',
  '/crown.webp',
  '/logo/logo.svg',
  '/menu/active/home.svg',
  '/menu/active/trading.svg',
  '/menu/active/profile.svg',
  '/trade/bitcoin.svg',
  '/deal/up.svg',
  '/deal/down.svg'
];

// Список изображений для ленивой предзагрузки после основного контента  
export const LAZY_PRELOAD_IMAGES = [
  '/panda.webp',
  '/rating/rating-bg.webp', 
  '/accept.webp',
  '/vault.webp',
  '/rating/top-bg.webp'
];