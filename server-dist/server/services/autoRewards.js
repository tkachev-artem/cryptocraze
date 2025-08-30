"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyAutoRewards = void 0;
const db_1 = require("../db");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const notifications_1 = require("./notifications");
const applyAutoRewards = async (userId) => {
    // Загружаем актуальные данные пользователя
    const [user] = await db_1.db
        .select({
        id: schema_1.users.id,
        balance: schema_1.users.balance,
        freeBalance: schema_1.users.freeBalance,
        rewardsCount: schema_1.users.rewardsCount,
        isPremium: schema_1.users.isPremium,
        premiumExpiresAt: schema_1.users.premiumExpiresAt,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    if (!user)
        return;
    let currentLevel = Number(user.rewardsCount || 0);
    let currentBalance = Number(user.balance || 0);
    const currentFree = Number(user.freeBalance || 0);
    let total = currentBalance + currentFree;
    let isPremium = Boolean(user.isPremium);
    let premiumExpiresAt = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
    // Пытаемся поднять уровни последовательно, пока хватает суммы на счёте
    // Деньги-награды начисляем ТОЛЬКО в balance (не в freeBalance)
    // Нарастаем total за счёт начисленных наград
    while (true) {
        const nextLevel = currentLevel + 1;
        const [tier] = await db_1.db
            .select()
            .from(schema_1.rewardTiers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.rewardTiers.level, nextLevel), (0, drizzle_orm_1.eq)(schema_1.rewardTiers.isActive, true)))
            .limit(1);
        if (!tier)
            break;
        const threshold = Number(tier.accountMoney || 0);
        if (total < threshold)
            break;
        // Рассчитываем новые значения
        const moneyReward = Number(tier.reward || 0);
        currentBalance = Number((currentBalance + moneyReward).toFixed(2));
        total += moneyReward;
        // Обновляем премиум при необходимости
        let newPremiumExpiresAt = premiumExpiresAt;
        let newIsPremium = isPremium;
        if (tier.proDays && Number(tier.proDays) > 0) {
            const now = new Date();
            const base = newPremiumExpiresAt && newPremiumExpiresAt > now ? newPremiumExpiresAt : now;
            newPremiumExpiresAt = new Date(base.getTime() + Number(tier.proDays) * 24 * 60 * 60 * 1000);
            newIsPremium = true;
        }
        // Применяем обновление пользователя
        await db_1.db
            .update(schema_1.users)
            .set({
            balance: currentBalance.toString(),
            rewardsCount: (0, drizzle_orm_1.sql) `${schema_1.users.rewardsCount} + 1`,
            ...(tier.proDays && Number(tier.proDays) > 0
                ? { isPremium: newIsPremium, premiumExpiresAt: newPremiumExpiresAt }
                : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        currentLevel += 1;
        isPremium = newIsPremium;
        premiumExpiresAt = newPremiumExpiresAt;
        // Отправляем уведомление о повышении уровня
        const parts = [
            `Порог $${threshold.toLocaleString()} достигнут. Начислено $${moneyReward.toLocaleString()}`,
        ];
        if (tier.proDays && Number(tier.proDays) > 0) {
            parts.push(`+ PRO режим на ${Number(tier.proDays)} дней`);
        }
        await notifications_1.notificationService.createSystemNotification(userId, `Новый уровень ${currentLevel}!`, parts.join(' '));
    }
};
exports.applyAutoRewards = applyAutoRewards;
