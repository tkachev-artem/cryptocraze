import type { FC } from 'react';
import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';
import { preloadCriticalImages, preloadSecondaryImages } from '../utils/preloadImages';

type GlobalLoadingProps = {
  children: React.ReactNode;
  initialLoadingTime?: number;
}

const GlobalLoading: FC<GlobalLoadingProps> = ({ 
  children, 
  initialLoadingTime = 2000 
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Сразу запускаем предзагрузку критичных изображений
    preloadCriticalImages();
    preloadSecondaryImages();
    
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, initialLoadingTime);

    return () => { clearTimeout(timer); };
  }, [initialLoadingTime]);

  return (
    <>
      <LoadingScreen isLoading={isInitialLoading} />
      {!isInitialLoading && children}
    </>
  );
};

export default GlobalLoading; 