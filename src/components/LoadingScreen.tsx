import type { FC } from 'react';
import { useTranslation } from '../lib/i18n';

type LoadingScreenProps = {
  isLoading?: boolean;
}

const LoadingScreen: FC<LoadingScreenProps> = ({ isLoading = true }) => {
  const { t } = useTranslation();
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-[#0C54EA] flex flex-col items-center justify-center z-50">
      {/* Логотип по центру */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-24 h-24 flex items-center justify-center -translate-x-2">
          <img 
            src="/logo/logo.svg" 
            alt="CryptoCraze Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-white text-3xl font-bold tracking-wide font-['Nunito']">
          {t('app.name')}
        </h1>
      </div>
      
      {/* Анимация загрузки внизу экрана */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default LoadingScreen; 