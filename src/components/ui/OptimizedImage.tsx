import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  eager?: boolean; // Для критичных изображений на /home
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  eager = false, 
  className = '',
  ...props 
}) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      {...props}
    />
  );
};

export default OptimizedImage;