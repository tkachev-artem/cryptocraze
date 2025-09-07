import React, { useState, useEffect } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
  skeleton?: boolean;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNmMGYwZjAiLz4KPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTggMEM2LjcgMCA1IDEgNSAyVjE0QzUgMTUgNi43IDE2IDggMTZTMTEgMTUgMTEgMTRWMkMxMSAxIDkuMyAwIDggMFoiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cjwvc3ZnPgo=',
  skeleton = true,
  className = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    
    // Предзагрузка изображения
    const img = new Image();
    const timeout = setTimeout(() => {
      setHasError(true);
      setIsLoaded(true);
    }, 3000);

    img.onload = () => {
      clearTimeout(timeout);
      setIsLoaded(true);
      setHasError(false);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      setHasError(true);
      setIsLoaded(true);
    };

    img.src = src;

    return () => {
      clearTimeout(timeout);
    };
  }, [src]);

  if (!isLoaded && skeleton) {
    return <div className={`bg-gray-200 animate-pulse ${className}`} />;
  }

  return (
    <img
      src={hasError ? fallback : src}
      className={className}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
};