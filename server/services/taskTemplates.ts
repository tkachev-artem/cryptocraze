import { CreateTaskOptions } from './taskService.js';

export interface TaskTemplate {
  id: string;
  taskType: string;
  title: string;
  description: string;
  rewardType: 'money' | 'coins' | 'energy' | 'mixed' | 'wheel';
  rewardAmount: string;
  progressTotal: number;
  icon: string;
  category: 'daily' | 'video' | 'trade' | 'social' | 'premium' | 'crypto' | 'energy';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  expiresInHours: number;
  cooldownMinutes: number; // Время ожидания между заданиями этого типа
  maxPerDay: number | null; // Максимум раз в день (null = без ограничений)
  weight: number; // Вес для случайного выбора (чем больше, тем чаще)
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  // === ЛЕГКИЕ ЗАДАНИЯ (частые, короткие кулдауны) ===
  
  // 1. Ежедневный бонус
  {
    id: 'daily_bonus',
    taskType: 'daily_bonus',
    title: 'Ежедневный бонус',
    description: 'Получите ежедневный бонус за вход в приложение',
    rewardType: 'money',
    rewardAmount: '500',
    progressTotal: 1,
    icon: '/trials/energy.svg',
    category: 'daily',
    rarity: 'common',
    expiresInHours: 6,
    cooldownMinutes: 30, // 30 минут
    maxPerDay: 3,
    weight: 30
  },

  // 2. Просмотр рекламы
  {
    id: 'watch_ad',
    taskType: 'watch_ad',
    title: 'Просмотр рекламы',
    description: 'Просмотрите рекламное видео для получения награды',
    rewardType: 'mixed',
    rewardAmount: '10_energy_800_money',
    progressTotal: 1,
    icon: '/trials/video.svg',
    category: 'video',
    rarity: 'common',
    expiresInHours: 12,
    cooldownMinutes: 20, // 20 минут
    maxPerDay: 10,
    weight: 25
  },

  // 3. Получить энергию
  {
    id: 'collect_energy',
    taskType: 'collect_energy',
    title: 'Пополнить энергию',
    description: 'Получите бесплатную энергию для торговли',
    rewardType: 'energy',
    rewardAmount: '20',
    progressTotal: 1,
    icon: '/trials/energy.svg',
    category: 'energy',
    rarity: 'common',
    expiresInHours: 8,
    cooldownMinutes: 45, // 45 минут
    maxPerDay: 5,
    weight: 25
  },

  // === СРЕДНИЕ ЗАДАНИЯ (умеренные кулдауны) ===

  // 4. Совершить сделки
  {
    id: 'complete_trades',
    taskType: 'complete_trades',
    title: 'Активный трейдер',
    description: 'Совершите 3 торговые сделки',
    rewardType: 'mixed',
    rewardAmount: '15_energy_1200_money',
    progressTotal: 3,
    icon: '/trials/trade.svg',
    category: 'trade',
    rarity: 'rare',
    expiresInHours: 12,
    cooldownMinutes: 60, // 1 час
    maxPerDay: 2,
    weight: 15
  },

  // 5. Проверить профиль
  {
    id: 'check_profile',
    taskType: 'check_profile',
    title: 'Обновить профиль',
    description: 'Посетите свой профиль и проверьте статистику',
    rewardType: 'coins',
    rewardAmount: '75',
    progressTotal: 1,
    icon: '/trials/social.svg',
    category: 'social',
    rarity: 'rare',
    expiresInHours: 18,
    cooldownMinutes: 90, // 1.5 часа
    maxPerDay: 3,
    weight: 12
  },

  // 6. Испытать удачу
  {
    id: 'lucky_spin',
    taskType: 'lucky_spin',
    title: 'Испытать удачу',
    description: 'Крутите рулетку фортуны для получения случайного приза',
    rewardType: 'wheel',
    rewardAmount: 'random',
    progressTotal: 1,
    icon: '/wheel/coins.svg',
    category: 'daily',
    rarity: 'rare',
    expiresInHours: 8,
    cooldownMinutes: 45, // 45 минут
    maxPerDay: 3,
    weight: 18
  },

  // === РЕДКИЕ ЗАДАНИЯ (долгие кулдауны, большие награды) ===

  // 7. Прибыльный день
  {
    id: 'profitable_day',
    taskType: 'profitable_day',
    title: 'Прибыльный день',
    description: 'Заработайте $1000 прибыли за день',
    rewardType: 'mixed',
    rewardAmount: '25_energy_2500_money',
    progressTotal: 1000,
    icon: '/trials/crypto.svg',
    category: 'trade',
    rarity: 'epic',
    expiresInHours: 24,
    cooldownMinutes: 240, // 4 часа
    maxPerDay: 1,
    weight: 8
  },

  // 8. Мастер торговли
  {
    id: 'trading_master',
    taskType: 'trading_master',
    title: 'Мастер торговли',
    description: 'Совершите 10 сделок подряд',
    rewardType: 'mixed',
    rewardAmount: '30_energy_3000_money',
    progressTotal: 10,
    icon: '/trials/crypto.svg',
    category: 'trade',
    rarity: 'epic',
    expiresInHours: 24,
    cooldownMinutes: 180, // 3 часа
    maxPerDay: 1,
    weight: 6
  },

  // 9. Большая удача (премиум рулетка)
  {
    id: 'big_luck',
    taskType: 'big_luck',
    title: 'Большая удача',
    description: 'Просмотрите 5 видео для шанса на большой выигрыш',
    rewardType: 'wheel',
    rewardAmount: 'premium_random',
    progressTotal: 5,
    icon: '/wheel/coins.svg',
    category: 'premium',
    rarity: 'legendary',
    expiresInHours: 12,
    cooldownMinutes: 300, // 5 часов
    maxPerDay: 1,
    weight: 3
  },

  // === ДОПОЛНИТЕЛЬНЫЕ ЛЕГКИЕ ЗАДАНИЯ ===

  // 10. Получить бонус монеты
  {
    id: 'bonus_coins',
    taskType: 'bonus_coins',
    title: 'Бонус монеты',
    description: 'Получите бонусные монеты за активность',
    rewardType: 'coins',
    rewardAmount: '35',
    progressTotal: 1,
    icon: '/money.svg',
    category: 'daily',
    rarity: 'common',
    expiresInHours: 4,
    cooldownMinutes: 25, // 25 минут
    maxPerDay: 5,
    weight: 28
  },

  // 11. Малая энергия
  {
    id: 'small_energy',
    taskType: 'small_energy',
    title: 'Малый заряд энергии',
    description: 'Восстановите немного энергии для торговли',
    rewardType: 'energy',
    rewardAmount: '12',
    progressTotal: 1,
    icon: '/trials/energy.svg',
    category: 'energy',
    rarity: 'common',
    expiresInHours: 6,
    cooldownMinutes: 30, // 30 минут
    maxPerDay: 8,
    weight: 26
  },

  // 12. Стартовый капитал
  {
    id: 'starter_cash',
    taskType: 'starter_cash',
    title: 'Стартовый капитал',
    description: 'Получите стартовые средства для торговли',
    rewardType: 'money',
    rewardAmount: '750',
    progressTotal: 1,
    icon: '/trials/dollars.svg',
    category: 'daily',
    rarity: 'common',
    expiresInHours: 5,
    cooldownMinutes: 40, // 40 минут
    maxPerDay: 4,
    weight: 24
  },

  // === ДОПОЛНИТЕЛЬНЫЕ ЗАДАНИЯ С РУЛЕТКОЙ ===

  // 13. Колесо удачи
  {
    id: 'luck_wheel',
    taskType: 'luck_wheel',
    title: 'Колесо удачи',
    description: 'Крутите колесо для получения случайного приза',
    rewardType: 'wheel',
    rewardAmount: 'random',
    progressTotal: 1,
    icon: '/wheel/coins.svg',
    category: 'daily',
    rarity: 'common',
    expiresInHours: 8,
    cooldownMinutes: 30,
    maxPerDay: 5,
    weight: 20
  },

  // 14. Большое колесо
  {
    id: 'big_wheel',
    taskType: 'big_wheel',
    title: 'Большое колесо',
    description: 'Крутите премиум рулетку с увеличенными призами',
    rewardType: 'wheel',
    rewardAmount: 'premium_random',
    progressTotal: 1,
    icon: '/wheel/coins.svg',
    category: 'premium',
    rarity: 'rare',
    expiresInHours: 6,
    cooldownMinutes: 60,
    maxPerDay: 3,
    weight: 15
  },

  // 15. Быстрое колесо
  {
    id: 'quick_wheel',
    taskType: 'quick_wheel',
    title: 'Быстрое колесо',
    description: 'Получите быстрый приз от рулетки',
    rewardType: 'wheel',
    rewardAmount: 'random',
    progressTotal: 1,
    icon: '/wheel/coins.svg',
    category: 'daily',
    rarity: 'common',
    expiresInHours: 4,
    cooldownMinutes: 20,
    maxPerDay: 6,
    weight: 22
  },

  // 16. Джекпот рулетка
  {
    id: 'jackpot_spin',
    taskType: 'jackpot_spin',
    title: 'Джекпот рулетка',
    description: 'Шанс выиграть крупный приз в премиум рулетке',
    rewardType: 'wheel',
    rewardAmount: 'premium_random',
    progressTotal: 1,
    icon: '/wheel/coins.svg',
    category: 'premium',
    rarity: 'epic',
    expiresInHours: 12,
    cooldownMinutes: 120, // 2 часа
    maxPerDay: 2,
    weight: 8
  }
];

export class TaskTemplateService {
  /**
   * Получить случайный шаблон задания на основе весов
   */
  static getRandomTemplate(): TaskTemplate {
    const totalWeight = TASK_TEMPLATES.reduce((sum, template) => sum + template.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const template of TASK_TEMPLATES) {
      randomWeight -= template.weight;
      if (randomWeight <= 0) {
        return template;
      }
    }
    
    // Fallback
    return TASK_TEMPLATES[0];
  }

  /**
   * Получить шаблон по ID
   */
  static getTemplateById(id: string): TaskTemplate | undefined {
    return TASK_TEMPLATES.find(template => template.id === id);
  }

  /**
   * Получить шаблоны по категории
   */
  static getTemplatesByCategory(category: TaskTemplate['category']): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.category === category);
  }

  /**
   * Получить шаблоны по редкости
   */
  static getTemplatesByRarity(rarity: TaskTemplate['rarity']): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.rarity === rarity);
  }

  /**
   * Получить шаблоны для Premium пользователей
   */
  static getPremiumTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.category === 'premium');
  }

  /**
   * Получить обычные шаблоны (не Premium)
   */
  static getRegularTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.category !== 'premium');
  }

  /**
   * Получить шаблоны криптовалютных заданий
   */
  static getCryptoTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.category === 'crypto');
  }

  /**
   * Получить шаблоны энергетических заданий
   */
  static getEnergyTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.category === 'energy');
  }

  /**
   * Получить шаблоны заданий с наградой в виде энергии
   */
  static getEnergyRewardTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.rewardType === 'energy');
  }

  /**
   * Получить шаблоны заданий с наградой в виде монет
   */
  static getCoinRewardTemplates(): TaskTemplate[] {
    return TASK_TEMPLATES.filter(template => template.rewardType === 'coins');
  }

  /**
   * Конвертировать шаблон в опции для создания задания
   */
  static templateToCreateOptions(template: TaskTemplate): CreateTaskOptions {
    return {
      taskType: template.taskType,
      title: template.title,
      description: template.description,
      rewardType: template.rewardType,
      rewardAmount: template.rewardAmount,
      progressTotal: template.progressTotal,
      icon: template.icon,
      expiresInHours: template.expiresInHours,
      cooldownMinutes: template.cooldownMinutes,
      maxPerDay: template.maxPerDay
    };
  }

  /**
   * Получить случайный шаблон с учетом редкости
   */
  static getRandomTemplateByRarity(): TaskTemplate {
    // Используем новую взвешенную систему вместо редкости
    return this.getRandomTemplate();
  }
} 