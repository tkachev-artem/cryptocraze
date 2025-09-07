import React from 'react';
import { getOptimizedImageSrc } from '@/utils/imageOptimizer';

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  fallbackSrc,
  onError,
  ...props 
}) => {
  const optimizedSrc = getOptimizedImageSrc(src);
  
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    
    // Если это уже fallback, не делаем ничего
    if (img.src.includes('optimized') && fallbackSrc) {
      img.src = fallbackSrc;
    } else if (img.src.includes('optimized')) {
      // Откатываемся к оригинальному изображению
      img.src = src;
    }
    
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      src={optimizedSrc}
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};