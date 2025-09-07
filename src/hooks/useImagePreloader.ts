import { useEffect } from 'react';

const imageCache = new Set<string>();

export const useImagePreloader = (urls: string[]) => {
  useEffect(() => {
    const preloadImages = async () => {
      const preloadPromises = urls
        .filter(url => url && !imageCache.has(url))
        .map(url => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              imageCache.add(url);
              resolve();
            };
            img.onerror = () => {
              resolve(); // Не блокируем на ошибках
            };
            img.src = url;
          });
        });

      await Promise.all(preloadPromises);
    };

    if (urls.length > 0) {
      preloadImages();
    }
  }, [urls]);
};