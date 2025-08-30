import { db } from '../db';
import { users, rewardTiers } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { notificationService } from './notifications';

export const applyAutoRewards = async (userId: string): Promise<void> => {
  // Загружаем актуальные данные пользователя
  const [user] = await db
    .select({
      id: users.id,
      balance: users.balance,
      freeBalance: users.freeBalance,
      rewardsCount: users.rewardsCount,
      isPremium: users.isPremium,
      premiumExpiresAt: users.premiumExpiresAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  let currentLevel = Number(user.rewardsCount || 0);
  let currentBalance = Number(user.balance || 0);
  const currentFree = Number(user.freeBalance || 0);
  let total = currentBalance + currentFree;
  let isPremium = Boolean(user.isPremium);
  let premiumExpiresAt: Date | null = user.premiumExpiresAt ? new Date(user.premiumExpiresAt as unknown as string) : null;

  // Пытаемся поднять уровни последовательно, пока хватает суммы на счёте
  // Деньги-награды начисляем ТОЛЬКО в balance (не в freeBalance)
  // Нарастаем total за счёт начисленных наград
  while (true) {
    const nextLevel = currentLevel + 1;
    const [tier] = await db
      .select()
      .from(rewardTiers)
      .where(and(eq(rewardTiers.level, nextLevel), eq(rewardTiers.isActive, true)))
      .limit(1);

    if (!tier) break;
    const threshold = Number(tier.accountMoney || 0);
    if (total < threshold) break;

    // Рассчитываем новые значения
    const moneyReward = Number(tier.reward || 0);
    currentBalance = Number((currentBalance + moneyReward).toFixed(2));
    total += moneyReward;

    // Обновляем премиум при необходимости
    let newPremiumExpiresAt: Date | null = premiumExpiresAt;
    let newIsPremium = isPremium;
    if (tier.proDays && Number(tier.proDays) > 0) {
      const now = new Date();
      const base = newPremiumExpiresAt && newPremiumExpiresAt > now ? newPremiumExpiresAt : now;
      newPremiumExpiresAt = new Date(base.getTime() + Number(tier.proDays) * 24 * 60 * 60 * 1000);
      newIsPremium = true;
    }

    // Применяем обновление пользователя
    await db
      .update(users)
      .set({
        balance: currentBalance.toString(),
        rewardsCount: sql`${users.rewardsCount} + 1`,
        ...(tier.proDays && Number(tier.proDays) > 0
          ? { isPremium: newIsPremium, premiumExpiresAt: newPremiumExpiresAt as any }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    currentLevel += 1;
    isPremium = newIsPremium;
    premiumExpiresAt = newPremiumExpiresAt;

    // Отправляем уведомление о повышении уровня
    const parts: string[] = [
      `Порог $${threshold.toLocaleString()} достигнут. Начислено $${moneyReward.toLocaleString()}`,
    ];
    if (tier.proDays && Number(tier.proDays) > 0) {
      parts.push(`+ PRO режим на ${Number(tier.proDays)} дней`);
    }
    await notificationService.createSystemNotification(
      userId,
      `Новый уровень ${currentLevel}!`,
      parts.join(' '),
    );
  }
};

