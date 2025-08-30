import { useEffect, useState } from 'react';

type TaskNotificationProps = {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const TaskNotification = ({ 
  message, 
  type, 
  onClose, 
  autoClose = true, 
  duration = 3000 
}: TaskNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Задержка для анимации
      }, duration);

      return () => { clearTimeout(timer); };
    }
  }, [autoClose, duration, onClose]);

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4`}>
      <div className={`rounded-xl border p-4 shadow-lg transition-all duration-300 ${getBgColor()}`}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{getIcon()}</span>
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Закрыть уведомление"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}; 