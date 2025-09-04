import { useTranslation } from './i18n';

/**
 * Утилита для перевода уведомлений из базы данных
 */
export const useNotificationTranslation = () => {
  const { t } = useTranslation();

  const translateNotification = (notification: {
    type: string;
    title: string;
    message?: string;
  }) => {
    // Пытаемся найти перевод для типа уведомления
    const translatedTitle = t(`notifications.types.${notification.type}`) || notification.title;
    
    // Пытаемся найти перевод для сообщения
    const translatedMessage = notification.message 
      ? (t(`notifications.messages.${notification.type}`) || notification.message)
      : undefined;

    return {
      ...notification,
      title: translatedTitle,
      message: translatedMessage,
    };
  };

  return { translateNotification };
};

/**
 * Утилита для перевода заданий из базы данных
 */
export const useTaskTranslation = () => {
  const { t } = useTranslation();

  const translateTask = (task: {
    id: string;
    title: string;
    description: string;
    reward: unknown;
    progress: { current: number; total: number };
    status: string;
    icon: string;
  }) => {
    // Используем taskType напрямую из API или fallback из title
    const taskType = (task as any).taskType || getTaskTypeFromTitle(task.title);
    
    // Пытаемся найти перевод для типа задания
    const translatedTitle = t(`task.types.${taskType}`) || task.title;
    
    // Пытаемся найти перевод для описания
    const translatedDescription = t(`task.descriptions.${taskType}`) || task.description;

    return {
      ...task,
      title: translatedTitle,
      description: translatedDescription,
    };
  };

  return { translateTask };
};

/**
 * Извлекает тип задания из заголовка
 */
const getTaskTypeFromTitle = (title: string): string => {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('ежедневный бонус') || titleLower.includes('daily bonus')) return 'daily_bonus';
  if (titleLower.includes('видео бонус 2') || titleLower.includes('video bonus 2')) return 'video_bonus_2';
  if (titleLower.includes('видео бонус') || titleLower.includes('video bonus')) return 'video_bonus';
  if (titleLower.includes('сделка дня') || titleLower.includes('deal of the day')) return 'deal_of_day';
  if (titleLower.includes('энергетический заряд') || titleLower.includes('energy charge')) return 'energy_bonus_small';
  if (titleLower.includes('энергетический буст') || titleLower.includes('energy boost')) return 'energy_bonus_medium';
  if (titleLower.includes('энергетический взрыв') || titleLower.includes('energy explosion')) return 'energy_bonus_large';
  if (titleLower.includes('поделитесь с друзьями') || titleLower.includes('share with friends')) return 'social_share';
  if (titleLower.includes('пригласите друга') || titleLower.includes('invite a friend')) return 'social_invite';
  if (titleLower.includes('торговый бонус') || titleLower.includes('trading bonus')) return 'trade_bonus';
  if (titleLower.includes('криптотрейдинг') || titleLower.includes('crypto trading')) return 'crypto_trade';
  if (titleLower.includes('энергетическая медитация') || titleLower.includes('energy meditation')) return 'energy_meditation';
  if (titleLower.includes('энергетическая тренировка') || titleLower.includes('energy training')) return 'energy_training';
  if (titleLower.includes('энергетическое чтение') || titleLower.includes('energy reading')) return 'energy_reading';
  if (titleLower.includes('энергетический анализ') || titleLower.includes('energy analysis')) return 'energy_analysis';
  if (titleLower.includes('энергетическое сообщество') || titleLower.includes('energy community')) return 'energy_community';
  if (titleLower.includes('торговля bitcoin') || titleLower.includes('bitcoin trading')) return 'bitcoin_trade';
  if (titleLower.includes('торговля ethereum') || titleLower.includes('ethereum trading')) return 'ethereum_trade';
  if (titleLower.includes('торговля альткоинами') || titleLower.includes('altcoin trading')) return 'altcoin_trade';
  if (titleLower.includes('прибыльная сделка') || titleLower.includes('profitable trade')) return 'profitable_trade';
  if (titleLower.includes('объемная торговля') || titleLower.includes('volume trading')) return 'volume_trade';
  
  return 'daily_bonus'; // fallback
};

/**
 * Утилита для перевода массива уведомлений
 */
export const translateNotifications = (
  notifications: {
    type: string;
    title: string;
    message?: string;
  }[],
  t: (key: string) => string
) => {
  return notifications.map(notification => {
    const translatedTitle = t(`notifications.types.${notification.type}`) || notification.title;
    const translatedMessage = notification.message 
      ? (t(`notifications.messages.${notification.type}`) || notification.message)
      : undefined;

    return {
      ...notification,
      title: translatedTitle,
      message: translatedMessage,
    };
  });
};

/**
 * Утилита для перевода массива заданий
 */
export const translateTasks = (
  tasks: {
    taskType: string;
    title: string;
    description?: string;
  }[],
  t: (key: string) => string
) => {
  return tasks.map(task => {
    const translatedTitle = t(`task.types.${task.taskType}`) || task.title;
    const translatedDescription = task.description 
      ? (t(`task.descriptions.${task.taskType}`) || task.description)
      : undefined;

    return {
      ...task,
      title: translatedTitle,
      description: translatedDescription,
    };
  });
}; 