import type { FC } from 'react';
import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

type GlobalLoadingProps = {
  children: React.ReactNode;
  minimumLoadingTime?: number;
}

// ВСЕ изображения проекта для предзагрузки - 134 файла
const CRITICAL_IMAGES = [
  '/about/about.svg',
  '/about/icon.svg',
  '/about/loss.svg',
  '/about/profit.svg',
  '/about/transferfee.svg',
  '/accept-optimized.webp',
  '/accept.webp',
  '/alert.svg',
  '/apple.svg',
  '/avatar-big.svg',
  '/avatar.webp',
  '/awards-arm.svg',
  '/awards.svg',
  '/boxes/green-box/close/box.svg',
  '/boxes/green-box/open/open-box.svg',
  '/boxes/red-box/close/box.svg',
  '/boxes/red-box/open/open-box.svg',
  '/boxes/x-box/close/box.svg',
  '/boxes/x-box/open/open-box.svg',
  '/close.svg',
  '/crown.webp',
  '/dashboard/diamond.svg',
  '/dashboard/down.svg',
  '/dashboard/energy.svg',
  '/dashboard/up.svg',
  '/deal/alert.svg',
  '/deal/deal-bear.svg',
  '/deal/down.svg',
  '/deal/edit-deal.svg',
  '/deal/edit.svg',
  '/deal/sleep-bear.svg',
  '/deal/up.svg',
  '/dollar.svg',
  '/ellipse.svg',
  '/email.svg',
  '/facebook.svg',
  '/favicon.svg',
  '/github.svg',
  '/logo/logo.svg',
  '/menu/active/best.svg',
  '/menu/active/home.svg',
  '/menu/active/profile.svg',
  '/menu/active/rating.svg',
  '/menu/active/trading.svg',
  '/menu/no-active/best.svg',
  '/menu/no-active/home.svg',
  '/menu/no-active/profile.svg',
  '/menu/no-active/rating.svg',
  '/menu/no-active/trading.svg',
  '/money.svg',
  '/more-money.svg',
  '/panda-optimized.webp',
  '/panda.webp',
  '/phone-small.svg',
  '/phone.svg',
  '/pickaxe.svg',
  '/premium-lock.svg',
  '/premium/check.svg',
  '/premium/logo.svg',
  '/premium/radio-bg.svg',
  '/premium/radio.svg',
  '/pro-menu/area-tool.svg',
  '/pro-menu/arrow-tool.svg',
  '/pro-menu/chart.svg',
  '/pro-menu/delete.svg',
  '/pro-menu/diagonal-line.svg',
  '/pro-menu/exit.svg',
  '/pro-menu/fx.svg',
  '/pro-menu/horizontal-line.svg',
  '/pro-menu/left-arrow.svg',
  '/pro-menu/marker.svg',
  '/pro-menu/plus-icon.svg',
  '/pro-menu/pro-bear.svg',
  '/pro-menu/right-arrow.svg',
  '/pro-menu/share.svg',
  '/pro-menu/text-tool.svg',
  '/pro-menu/vertical-line.svg',
  '/prochart/bar.svg',
  '/prochart/candles.svg',
  '/prochart/fullstop.svg',
  '/prochart/line.svg',
  '/protraining/bear.svg',
  '/protraining/training.svg',
  '/rating/arrow-down.svg',
  '/rating/arrow-up.svg',
  '/rating/rating-bg-optimized.webp',
  '/rating/rating-bg.webp',
  '/rating/top-bg.webp',
  '/settings.svg',
  '/settings/crown.svg',
  '/settings/delete.svg',
  '/settings/language-panda.svg',
  '/settings/language.svg',
  '/settings/modal-image.svg',
  '/settings/notifications.svg',
  '/settings/share.svg',
  '/share/arrow.svg',
  '/share/email.svg',
  '/share/link.svg',
  '/share/more.svg',
  '/share/sms.svg',
  '/share/telegram.svg',
  '/share/whatsapp.svg',
  '/statistics/coin.svg',
  '/statistics/money.svg',
  '/statistics/reward.svg',
  '/top-menu/back.svg',
  '/top-menu/edit-light.svg',
  '/top-menu/edit.svg',
  '/top-menu/ellipse.svg',
  '/top-menu/exit.svg',
  '/top-menu/list.svg',
  '/trade.svg',
  '/trade/bitcoin.svg',
  '/trade/chart-bar.svg',
  '/trade/chart-candlestick.svg',
  '/trade/chart-line.svg',
  '/trade/chart.svg',
  '/trade/down-arrow.svg',
  '/trade/money.svg',
  '/trade/trades.svg',
  '/trade/wallet.svg',
  '/transactions.svg',
  '/trials/arrow.svg',
  '/trials/circle.svg',
  '/trials/dollars.svg',
  '/trials/energy-white.svg',
  '/trials/energy.svg',
  '/trials/green-box.svg',
  '/trials/red-box.svg',
  '/trials/reload.svg',
  '/trials/wheel.svg',
  '/trials/x-box.svg',
  '/tutorial/bear-1.svg',
  '/vault-optimized.webp',
  '/vault.webp',
  '/w-cup.svg',
  '/wheel/arrow.svg',
  '/wheel/background.svg',
  '/wheel/bear.svg',
  '/wheel/circle.svg',
  '/wheel/coins.svg'
];

// Принудительная предзагрузка с Promise
const forcePreloadImages = (): Promise<void> => {
  return new Promise((resolve) => {
    let loadedCount = 0;
    const totalImages = CRITICAL_IMAGES.length;
    
    if (totalImages === 0) {
      resolve();
      return;
    }
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        console.log(`✅ Все ${totalImages} изображений загружены в кэш`);
        resolve();
      }
    };
    
    CRITICAL_IMAGES.forEach((src) => {
      const img = new Image();
      
      img.onload = checkComplete;
      img.onerror = () => {
        console.warn(`❌ Не удалось загрузить: ${src}`);
        checkComplete(); // Продолжаем даже при ошибке
      };
      
      img.src = src;
    });
  });
};

const GlobalLoading: FC<GlobalLoadingProps> = ({ 
  children, 
  minimumLoadingTime = 1500 
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      console.log('🚀 Начинаем предзагрузку изображений...');
      
      // Запускаем предзагрузку изображений и минимальное время параллельно
      const [, ] = await Promise.all([
        forcePreloadImages(),
        new Promise(resolve => setTimeout(resolve, minimumLoadingTime))
      ]);
      
      console.log('✅ Предзагрузка завершена, показываем приложение');
      setIsInitialLoading(false);
    };

    loadImages();
  }, [minimumLoadingTime]);

  return (
    <>
      <LoadingScreen isLoading={isInitialLoading} />
      {!isInitialLoading && children}
    </>
  );
};

export default GlobalLoading; 