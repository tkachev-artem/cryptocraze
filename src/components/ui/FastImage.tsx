import React from 'react';
import { useOptimizedImage } from '@/hooks/useOptimizedImage';

interface FastImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null;
  coinId?: string;
  fallbackClassName?: string;
}

export const FastImage: React.FC<FastImageProps> = ({ 
  src, 
  coinId, 
  className = '', 
  fallbackClassName = '',
  alt = '',
  ...props 
}) => {
  const { src: optimizedSrc, loading, error } = useOptimizedImage(src, coinId);

  if (loading) {
    return (
      <div 
        className={`animate-pulse bg-gray-200 ${fallbackClassName || className}`}
        {...props}
      />
    );
  }

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};