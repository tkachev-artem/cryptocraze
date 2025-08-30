"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTemplateService = exports.TASK_TEMPLATES = void 0;
exports.TASK_TEMPLATES = [
    // === ЛЕГКИЕ ЗАДАНИЯ (частые, короткие кулдауны) ===
    // 1. Быстрый бонус
    {
        id: 'quick_bonus',
        taskType: 'quick_bonus',
        title: 'Быстрый бонус',
        description: 'Получите быструю награду',
        rewardType: 'money',
        rewardAmount: '500',
        progressTotal: 1,
        icon: '/trials/energy.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 6,
        cooldownMinutes: 15, // 15 минут
        maxPerDay: null,
        weight: 30
    },
    // 2. Видео бонус
    {
        id: 'video_bonus',
        taskType: 'video_bonus',
        title: 'Видео бонус',
        description: 'Просмотрите видео и получите награду',
        rewardType: 'mixed',
        rewardAmount: '10_energy_800_money',
        progressTotal: 1,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'common',
        expiresInHours: 12,
        cooldownMinutes: 20, // 20 минут
        maxPerDay: null,
        weight: 25
    },
    // 3. Энергетический заряд
    {
        id: 'energy_boost',
        taskType: 'energy_boost',
        title: 'Энергетический заряд',
        description: 'Накопите энергию для новых достижений',
        rewardType: 'energy',
        rewardAmount: '20',
        progressTotal: 1,
        icon: '/trials/energy.svg',
        category: 'energy',
        rarity: 'common',
        expiresInHours: 8,
        cooldownMinutes: 30, // 30 минут
        maxPerDay: null,
        weight: 25
    },
    // === СРЕДНИЕ ЗАДАНИЯ (умеренные кулдауны) ===
    // 4. Крипто трейдер
    {
        id: 'crypto_trader',
        taskType: 'crypto_trader',
        title: 'Крипто трейдер',
        description: 'Сделайте 3 сделки',
        rewardType: 'mixed',
        rewardAmount: '15_energy_1200_money',
        progressTotal: 3,
        icon: '/trials/trade.svg',
        category: 'trade',
        rarity: 'rare',
        expiresInHours: 12,
        cooldownMinutes: 60, // 1 час
        maxPerDay: null,
        weight: 15
    },
    // 5. Социальный бонус
    {
        id: 'social_bonus',
        taskType: 'social_bonus',
        title: 'Социальный бонус',
        description: 'Поделитесь достижением в социальных сетях',
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
    // 6. Удачливый просмотр (рулетка)
    {
        id: 'lucky_watch',
        taskType: 'lucky_watch',
        title: 'Удачливый просмотр',
        description: 'Просмотрите 2 видео и испытайте удачу в рулетке',
        rewardType: 'wheel',
        rewardAmount: 'random',
        progressTotal: 2,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'rare',
        expiresInHours: 8,
        cooldownMinutes: 45, // 45 минут
        maxPerDay: null,
        weight: 10
    },
    // === РЕДКИЕ ЗАДАНИЯ (долгие кулдауны, большие награды) ===
    // 7. Ежедневный миллионер
    {
        id: 'daily_millionaire',
        taskType: 'daily_millionaire',
        title: 'Ежедневный миллионер',
        description: 'Заработайте 5000$ за один день',
        rewardType: 'mixed',
        rewardAmount: '25_energy_2500_money',
        progressTotal: 5000,
        icon: '/trials/crypto.svg',
        category: 'trade',
        rarity: 'epic',
        expiresInHours: 24,
        cooldownMinutes: 240, // 4 часа
        maxPerDay: 2,
        weight: 8
    },
    // 8. Крипто мастер
    {
        id: 'crypto_master',
        taskType: 'crypto_master',
        title: 'Крипто мастер',
        description: 'Проведите 10 успешных сделок',
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
    // 10. Монеты за клик
    {
        id: 'click_coins',
        taskType: 'click_coins',
        title: 'Монеты за клик',
        description: 'Нажмите на кнопку и получите монеты',
        rewardType: 'coins',
        rewardAmount: '35',
        progressTotal: 1,
        icon: '/money.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 4,
        cooldownMinutes: 25, // 25 минут
        maxPerDay: null,
        weight: 28
    },
    // 11. Мини энергия
    {
        id: 'mini_energy',
        taskType: 'mini_energy',
        title: 'Мини энергия',
        description: 'Получите немного энергии',
        rewardType: 'energy',
        rewardAmount: '12',
        progressTotal: 1,
        icon: '/trials/energy.svg',
        category: 'energy',
        rarity: 'common',
        expiresInHours: 6,
        cooldownMinutes: 18, // 18 минут
        maxPerDay: null,
        weight: 26
    },
    // 12. Быстрые деньги
    {
        id: 'quick_money',
        taskType: 'quick_money',
        title: 'Быстрые деньги',
        description: 'Заработайте деньги быстро',
        rewardType: 'money',
        rewardAmount: '750',
        progressTotal: 1,
        icon: '/trials/dollars.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 5,
        cooldownMinutes: 22, // 22 минуты
        maxPerDay: null,
        weight: 24
    },
    // === ДОПОЛНИТЕЛЬНЫЕ ЗАДАНИЯ С РУЛЕТКОЙ ===
    // 13. Колесо фортуны
    {
        id: 'fortune_wheel',
        taskType: 'fortune_wheel',
        title: '🎯 Колесо фортуны',
        description: 'Испытайте удачу и выиграйте крупный приз!',
        rewardType: 'wheel',
        rewardAmount: 'random',
        progressTotal: 1,
        icon: '/wheel/coins.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 8,
        cooldownMinutes: 30,
        maxPerDay: null,
        weight: 20
    },
    // 14. Супер рулетка
    {
        id: 'super_wheel',
        taskType: 'super_wheel',
        title: '🎰 Супер рулетка',
        description: 'Выполните 3 клика для супер приза!',
        rewardType: 'wheel',
        rewardAmount: 'premium_random',
        progressTotal: 3,
        icon: '/wheel/coins.svg',
        category: 'premium',
        rarity: 'rare',
        expiresInHours: 6,
        cooldownMinutes: 45,
        maxPerDay: null,
        weight: 15
    },
    // 15. Магическое колесо
    {
        id: 'magic_wheel',
        taskType: 'magic_wheel',
        title: '✨ Магическое колесо',
        description: 'Магические силы удваивают ваш шанс!',
        rewardType: 'wheel',
        rewardAmount: 'random',
        progressTotal: 2,
        icon: '/wheel/coins.svg',
        category: 'daily',
        rarity: 'rare',
        expiresInHours: 4,
        cooldownMinutes: 20,
        maxPerDay: null,
        weight: 18
    },
    // 16. Джекпот-рулетка
    {
        id: 'jackpot_wheel',
        taskType: 'jackpot_wheel',
        title: '💎 Джекпот-рулетка',
        description: 'Шанс выиграть максимальный приз 10,000$!',
        rewardType: 'wheel',
        rewardAmount: 'premium_random',
        progressTotal: 5,
        icon: '/wheel/coins.svg',
        category: 'premium',
        rarity: 'epic',
        expiresInHours: 12,
        cooldownMinutes: 120, // 2 часа
        maxPerDay: 1,
        weight: 8
    },
    // 17. Быстрая удача
    {
        id: 'quick_luck',
        taskType: 'quick_luck',
        title: '⚡ Быстрая удача',
        description: 'Один клик - мгновенный приз!',
        rewardType: 'wheel',
        rewardAmount: 'random',
        progressTotal: 1,
        icon: '/wheel/coins.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 3,
        cooldownMinutes: 15,
        maxPerDay: null,
        weight: 22
    },
    // 18. Золотая рулетка
    {
        id: 'golden_wheel',
        taskType: 'golden_wheel',
        title: '🏆 Золотая рулетка',
        description: 'Крутите золотое колесо для больших выигрышей!',
        rewardType: 'wheel',
        rewardAmount: 'premium_random',
        progressTotal: 4,
        icon: '/wheel/coins.svg',
        category: 'premium',
        rarity: 'legendary',
        expiresInHours: 10,
        cooldownMinutes: 180, // 3 часа
        maxPerDay: 1,
        weight: 5
    }
];
class TaskTemplateService {
    /**
     * Получить случайный шаблон задания на основе весов
     */
    static getRandomTemplate() {
        const totalWeight = exports.TASK_TEMPLATES.reduce((sum, template) => sum + template.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        for (const template of exports.TASK_TEMPLATES) {
            randomWeight -= template.weight;
            if (randomWeight <= 0) {
                return template;
            }
        }
        // Fallback
        return exports.TASK_TEMPLATES[0];
    }
    /**
     * Получить шаблон по ID
     */
    static getTemplateById(id) {
        return exports.TASK_TEMPLATES.find(template => template.id === id);
    }
    /**
     * Получить шаблоны по категории
     */
    static getTemplatesByCategory(category) {
        return exports.TASK_TEMPLATES.filter(template => template.category === category);
    }
    /**
     * Получить шаблоны по редкости
     */
    static getTemplatesByRarity(rarity) {
        return exports.TASK_TEMPLATES.filter(template => template.rarity === rarity);
    }
    /**
     * Получить шаблоны для Premium пользователей
     */
    static getPremiumTemplates() {
        return exports.TASK_TEMPLATES.filter(template => template.category === 'premium');
    }
    /**
     * Получить обычные шаблоны (не Premium)
     */
    static getRegularTemplates() {
        return exports.TASK_TEMPLATES.filter(template => template.category !== 'premium');
    }
    /**
     * Получить шаблоны криптовалютных заданий
     */
    static getCryptoTemplates() {
        return exports.TASK_TEMPLATES.filter(template => template.category === 'crypto');
    }
    /**
     * Получить шаблоны энергетических заданий
     */
    static getEnergyTemplates() {
        return exports.TASK_TEMPLATES.filter(template => template.category === 'energy');
    }
    /**
     * Получить шаблоны заданий с наградой в виде энергии
     */
    static getEnergyRewardTemplates() {
        return exports.TASK_TEMPLATES.filter(template => template.rewardType === 'energy');
    }
    /**
     * Получить шаблоны заданий с наградой в виде монет
     */
    static getCoinRewardTemplates() {
        return exports.TASK_TEMPLATES.filter(template => template.rewardType === 'coins');
    }
    /**
     * Конвертировать шаблон в опции для создания задания
     */
    static templateToCreateOptions(template) {
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
    static getRandomTemplateByRarity() {
        // Используем новую взвешенную систему вместо редкости
        return this.getRandomTemplate();
    }
}
exports.TaskTemplateService = TaskTemplateService;
