import { useEffect, useState } from 'react';

type TutorialConnectionLineProps = {
  targetSelector: string;
  modalRef: React.RefObject<HTMLDivElement | null>;
  zIndex: number;
};

const TutorialConnectionLine: React.FC<TutorialConnectionLineProps> = ({ 
  targetSelector, 
  modalRef, 
  zIndex 
}) => {
  const [connectionPath, setConnectionPath] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [viewBox, setViewBox] = useState<string>('0 0 100 100');

  useEffect(() => {
    const updateConnection = () => {
      const targetElement = document.querySelector(targetSelector);
      const modalElement = modalRef.current;

      console.log('TutorialConnectionLine debug:', {
        targetSelector,
        targetElement: !!targetElement,
        modalElement: !!modalElement,
        targetRect: targetElement?.getBoundingClientRect(),
        modalRect: modalElement?.getBoundingClientRect()
      });

      if (!targetElement || !modalElement) {
        setIsVisible(false);
        return;
      }

      // Обновляем viewBox с реальными размерами viewport
      setViewBox(`0 0 ${window.innerWidth.toString()} ${window.innerHeight.toString()}`);

      const targetRect = targetElement.getBoundingClientRect();
      const modalRect = modalElement.getBoundingClientRect();

      // Вычисляем точки соединения
      const modalBottom = modalRect.bottom;
      const targetTop = targetRect.top;
      const targetCenterX = targetRect.left + targetRect.width / 2; // Центр целевого элемента

      // Создаем путь для прямой вертикальной линии
      const path = [
        `M ${targetCenterX.toString()} ${modalBottom.toString()}`, // Начальная точка (низ модалки по центру целевого элемента)
        `L ${targetCenterX.toString()} ${targetTop.toString()}`, // Прямая вертикальная линия до цели
      ].join(' ');

      console.log('TutorialConnectionLine path:', {
        modalBottom,
        targetTop,
        targetCenterX,
        path
      });

      setConnectionPath(path);
      setIsVisible(true);
    };

    // Обновляем при изменении размеров или прокрутке
    const handleResize = () => {
      updateConnection();
    };

    // Добавляем небольшую задержку для гарантии, что элементы отрендерены
    setTimeout(updateConnection, 100);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    const observer = new ResizeObserver(handleResize);
    if (modalRef.current) {
      observer.observe(modalRef.current);
    }

    // Добавляем MutationObserver для отслеживания изменений в DOM
    const mutationObserver = new MutationObserver(() => {
      setTimeout(updateConnection, 50);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [targetSelector, modalRef]);

  console.log('TutorialConnectionLine render:', { isVisible, connectionPath, zIndex });
  if (!isVisible || !connectionPath) return null;

  return (
    <svg
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex,
        pointerEvents: 'none',
      }}
      viewBox={viewBox}
      preserveAspectRatio="none"
    >
      <path
        d={connectionPath}
        stroke="#0C54EA"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Добавляем градиент для прямой линии */}
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0C54EA" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0C54EA" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path
        d={connectionPath}
        stroke="url(#connectionGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default TutorialConnectionLine; 