import { useApiHealth } from '@/hooks/useApiHealth';
import { useTranslation } from '@/lib/i18n';

type ConnectionStatusProps = {
  className?: string;
  showDetails?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '',
  showDetails = false 
}) => {
  const { t } = useTranslation();
  const { status, isChecking, attemptReconnect, isHealthy, hasIssues } = useApiHealth();

  // Не показываем, если все в порядке и детали не нужны
  if (isHealthy && !showDetails) {
    return null;
  }

  const getStatusColor = () => {
    if (isChecking) return 'bg-yellow-500';
    if (isHealthy) return 'bg-green-500';
    if (hasIssues) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusText = () => {
    if (isChecking) return t('status.checking');
    if (isHealthy) return t('status.connected');
    return status.error ?? t('status.disconnected');
  };

  const handleReconnect = () => {
    void attemptReconnect();
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm ${className}`}>
      {/* Индикатор статуса */}
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      
      {/* Текст статуса */}
      <span className="text-sm text-gray-200 flex-1">
        {getStatusText()}
      </span>

      {/* Кнопка переподключения при проблемах */}
      {hasIssues && !isChecking && (
        <button
          onClick={handleReconnect}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          {t('status.reconnect')}
        </button>
      )}

      {/* Детали статуса */}
      {showDetails && (
        <div className="text-xs text-gray-400 ml-2">
          API: {status.apiOnline ? '✅' : '❌'} | 
          Socket: {status.socketOnline ? '✅' : '❌'}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;