"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTemplateService = exports.TASK_TEMPLATES = void 0;
exports.TASK_TEMPLATES = [
    // === РЕКЛАМНЫЕ ВИДЕО ЗАДАНИЯ (30 минут кулдаун) ===
    // 1. Видео за рулетку
    {
        id: 'video_wheel',
        taskType: 'video_wheel',
        title: 'tasks.videoWheel.title',
        description: 'tasks.videoWheel.description',
        rewardType: 'wheel',
        rewardAmount: 'random',
        progressTotal: 1,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'common',
        expiresInHours: 12,
        cooldownMinutes: 30,
        maxPerDay: null,
        weight: 35
    },
    // 2. Видео за валюту
    {
        id: 'video_money',
        taskType: 'video_money',
        title: 'tasks.videoMoney.title',
        description: 'tasks.videoMoney.description',
        rewardType: 'money',
        rewardAmount: '1000',
        progressTotal: 1,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'common',
        expiresInHours: 12,
        cooldownMinutes: 30,
        maxPerDay: null,
        weight: 35
    },
    // 3. Видео за монеты
    {
        id: 'video_coins',
        taskType: 'video_coins',
        title: 'tasks.videoCoins.title',
        description: 'tasks.videoCoins.description',
        rewardType: 'coins',
        rewardAmount: '30',
        progressTotal: 1,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'common',
        expiresInHours: 12,
        cooldownMinutes: 30,
        maxPerDay: null,
        weight: 35
    },
    // 4. Видео за энергию
    {
        id: 'video_energy',
        taskType: 'video_energy',
        title: 'tasks.videoEnergy.title',
        description: 'tasks.videoEnergy.description',
        rewardType: 'energy',
        rewardAmount: '18',
        progressTotal: 1,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'common',
        expiresInHours: 12,
        cooldownMinutes: 30,
        maxPerDay: null,
        weight: 35
    },
    // 5. Мега видео-бонус
    {
        id: 'video_mega',
        taskType: 'video_mega',
        title: 'tasks.videoMega.title',
        description: 'tasks.videoMega.description',
        rewardType: 'mixed',
        rewardAmount: '12_energy_1500_money',
        progressTotal: 1,
        icon: '/trials/video.svg',
        category: 'video',
        rarity: 'rare',
        expiresInHours: 12,
        cooldownMinutes: 30,
        maxPerDay: null,
        weight: 35
    },
    // === ЕЖЕДНЕВНЫЕ ЗАДАНИЯ (3 часа кулдаун, с уведомлениями) ===
    // 6. Ежедневный бонус
    {
        id: 'daily_bonus',
        taskType: 'daily_bonus',
        title: 'tasks.dailyBonus.title',
        description: 'tasks.dailyBonus.description',
        rewardType: 'money',
        rewardAmount: '750',
        progressTotal: 1,
        icon: '/trials/energy.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 24,
        cooldownMinutes: 180, // 3 часа
        maxPerDay: 3,
        weight: 25
    },
    // 7. Активный трейдер дня
    {
        id: 'daily_trader',
        taskType: 'daily_trader',
        title: 'tasks.dailyTrader.title',
        description: 'tasks.dailyTrader.description',
        rewardType: 'coins',
        rewardAmount: '40',
        progressTotal: 1,
        icon: '/trials/trade.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 24,
        cooldownMinutes: 180, // 3 часа
        maxPerDay: 3,
        weight: 25
    },
    // === ТОРГОВЫЕ ЗАДАНИЯ (60-90 минут кулдаун) ===
    // 8. Первая прибыль
    {
        id: 'trade_first_profit',
        taskType: 'trade_first_profit',
        title: 'tasks.tradeFirstProfit.title',
        description: 'tasks.tradeFirstProfit.description',
        rewardType: 'coins',
        rewardAmount: '25',
        progressTotal: 100, // $100 прибыли
        icon: '/trials/trade.svg',
        category: 'trade',
        rarity: 'common',
        expiresInHours: 24,
        cooldownMinutes: 60,
        maxPerDay: 2,
        weight: 25
    },
    // 9. Удачная сделка
    {
        id: 'trade_lucky',
        taskType: 'trade_lucky',
        title: 'tasks.tradeLucky.title',
        description: 'tasks.tradeLucky.description',
        rewardType: 'mixed',
        rewardAmount: '8_energy_800_money',
        progressTotal: 500, // $500 прибыли
        icon: '/trials/trade.svg',
        category: 'trade',
        rarity: 'rare',
        expiresInHours: 24,
        cooldownMinutes: 75,
        maxPerDay: 2,
        weight: 22
    },
    // 10. Закройте сделку
    {
        id: 'trade_close',
        taskType: 'trade_close',
        title: 'tasks.tradeClose.title',
        description: 'tasks.tradeClose.description',
        rewardType: 'money',
        rewardAmount: '600',
        progressTotal: 1, // Закрыть 1 сделку
        icon: '/trials/trade.svg',
        category: 'trade',
        rarity: 'common',
        expiresInHours: 24,
        cooldownMinutes: 60,
        maxPerDay: 3,
        weight: 12
    },
    // 11. Мастер прибыли
    {
        id: 'trade_master',
        taskType: 'trade_master',
        title: 'tasks.tradeMaster.title',
        description: 'tasks.tradeMaster.description',
        rewardType: 'mixed',
        rewardAmount: '15_energy_2000_money',
        progressTotal: 1000, // $1000 прибыли
        icon: '/trials/trade.svg',
        category: 'trade',
        rarity: 'epic',
        expiresInHours: 24,
        cooldownMinutes: 90,
        maxPerDay: 1,
        weight: 20
    },
    // === ПРЕМИУМ ЗАДАНИЯ (3 часа кулдаун, с уведомлениями) ===
    // 12. Premium вход
    {
        id: 'premium_login',
        taskType: 'premium_login',
        title: 'tasks.premiumLogin.title',
        description: 'tasks.premiumLogin.description',
        rewardType: 'coins',
        rewardAmount: '35',
        progressTotal: 1,
        icon: '/trials/premium.svg',
        category: 'premium',
        rarity: 'rare',
        expiresInHours: 24,
        cooldownMinutes: 180, // 3 часа
        maxPerDay: 3,
        weight: 5
    },
    // 13. VIP бонус
    {
        id: 'premium_vip',
        taskType: 'premium_vip',
        title: 'tasks.premiumVip.title',
        description: 'tasks.premiumVip.description',
        rewardType: 'mixed',
        rewardAmount: '5_energy_20_coins',
        progressTotal: 1,
        icon: '/trials/premium.svg',
        category: 'premium',
        rarity: 'rare',
        expiresInHours: 24,
        cooldownMinutes: 180, // 3 часа
        maxPerDay: 3,
        weight: 3
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
