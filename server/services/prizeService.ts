import { db } from '../db.js';
import { prizes, boxTypes, boxOpenings, users } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { applyAutoRewards } from './autoRewards.js';

export interface PrizeResult {
  id: number;
  prizeType: 'money' | 'pro';
  amount?: number;
  proDays?: number;
  chance: number;
}

export interface BoxOpeningResult {
  success: boolean;
  prize: PrizeResult;
  balanceUpdate?: number;
  proDays?: number;
  energySpent: number;
  message: string;
}

export class PrizeService {
  /**
   * Получить все активные призы для определенного типа коробки
   */
  static async getPrizesForBox(boxType: 'red' | 'green' | 'x'): Promise<PrizeResult[]> {
    try {
      const boxTypeRecord = await db
        .select()
        .from(boxTypes)
        .where(eq(boxTypes.type, boxType))
        .limit(1);

      if (!boxTypeRecord.length) {
        throw new Error(`Тип коробки ${boxType} не найден`);
      }

      const boxPrizes = await db
        .select({
          id: prizes.id,
          prizeType: prizes.prizeType,
          amount: prizes.amount,
          proDays: prizes.proDays,
          chance: prizes.chance,
        })
        .from(prizes)
        .where(
          and(
            eq(prizes.boxTypeId, boxTypeRecord[0].id),
            eq(prizes.isActive, true)
          )
        );

      return boxPrizes.map(prize => ({
        id: prize.id,
        prizeType: prize.prizeType,
        amount: prize.amount ? Number(prize.amount) : undefined,
        proDays: prize.proDays || undefined,
        chance: Number(prize.chance),
      }));
    } catch (error) {
      console.error('Error getting prizes for box:', error);
      throw error;
    }
  }

  /**
   * Получить требования по энергии для открытия коробки
   */
  static async getRequiredEnergy(boxType: 'red' | 'green' | 'x'): Promise<number> {
    try {
      const boxTypeRecord = await db
        .select({ requiredEnergy: boxTypes.requiredEnergy })
        .from(boxTypes)
        .where(eq(boxTypes.type, boxType))
        .limit(1);

      if (!boxTypeRecord.length) {
        throw new Error(`Тип коробки ${boxType} не найден`);
      }

      return boxTypeRecord[0].requiredEnergy;
    } catch (error) {
      console.error('Error getting required energy:', error);
      throw error;
    }
  }

  /**
   * Выбрать случайный приз на основе шансов
   */
  static async selectRandomPrize(boxType: 'red' | 'green' | 'x'): Promise<PrizeResult> {
    try {
      const prizes = await this.getPrizesForBox(boxType);
      
      if (!prizes.length) {
        throw new Error(`Нет активных призов для коробки ${boxType}`);
      }

      // Вычисляем случайное число
      const random = Math.random() * 100;
      let cumulativeChance = 0;
      let selectedPrize: PrizeResult | null = null;

      for (const prize of prizes) {
        cumulativeChance += prize.chance;
        if (random <= cumulativeChance) {
          selectedPrize = prize;
          break;
        }
      }

      // Если ничего не выбрано, даем первый приз
      if (!selectedPrize) {
        selectedPrize = prizes[0];
      }

      return selectedPrize;
    } catch (error) {
      console.error('Error selecting random prize:', error);
      throw error;
    }
  }

  /**
   * Открыть коробку и получить приз
   */
  static async openBox(userId: string, boxType: 'red' | 'green' | 'x'): Promise<BoxOpeningResult> {
    try {
      console.log(`🎁 Начинаем открытие коробки ${boxType} для пользователя ${userId}`);
      
      // Шаг 1: Получаем требования по энергии и данные пользователя
      const requiredEnergy = await this.getRequiredEnergy(boxType);
      console.log(`🔋 Требуется энергии для ${boxType} коробки: ${requiredEnergy}`);
      
      const user = await db
        .select({ 
          id: users.id,
          energyTasksBonus: users.energyTasksBonus,
          balance: users.balance,
          freeBalance: users.freeBalance,
          isPremium: users.isPremium,
          premiumExpiresAt: users.premiumExpiresAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length) {
        throw new Error('Пользователь не найден');
      }

      const currentEnergy = user[0].energyTasksBonus || 0;
      console.log(`🔋 Текущая энергия пользователя: ${currentEnergy}`);

      if (currentEnergy < requiredEnergy) {
        throw new Error(`Недостаточно энергии для открытия ${boxType} коробки. Нужно: ${requiredEnergy}, есть: ${currentEnergy}`);
      }

      // Шаг 2: Выбираем случайный приз
      const selectedPrize = await this.selectRandomPrize(boxType);
      console.log(`🎁 Выбран приз: ${selectedPrize.prizeType} - ${selectedPrize.amount || selectedPrize.proDays}`);
      
      // Шаг 3: Получаем ID типа коробки
      const boxTypeRecord = await db
        .select({ id: boxTypes.id })
        .from(boxTypes)
        .where(eq(boxTypes.type, boxType))
        .limit(1);

      if (!boxTypeRecord.length) {
        throw new Error(`Тип коробки ${boxType} не найден`);
      }

      // Шаг 4: Выполняем все обновления в одной транзакции
      console.log(`💰 Начинаем обновление данных пользователя`);
      
      let balanceUpdate = 0;
      let proDays = 0;
      let newEnergy = currentEnergy - requiredEnergy;
      let newBalance = parseFloat(user[0].balance || '0');
      let newFreeBalance = parseFloat(user[0].freeBalance || '0');
      let newIsPremium = user[0].isPremium || false;
      let newPremiumExpiresAt = user[0].premiumExpiresAt;

      // Обрабатываем приз
      if (selectedPrize.prizeType === 'pro') {
        // Активируем PRO режим
        const currentDate = new Date();
        const proExpiresAt = new Date(currentDate.getTime() + (selectedPrize.proDays! * 24 * 60 * 60 * 1000));
        newIsPremium = true;
        newPremiumExpiresAt = proExpiresAt;
        proDays = selectedPrize.proDays!;
        console.log(`👑 Активируем PRO режим на ${proDays} дней`);
      } else {
        // Начисляем деньги
        balanceUpdate = selectedPrize.amount!;
        newBalance += balanceUpdate;
        newFreeBalance += balanceUpdate;
        console.log(`💰 Начисляем $${balanceUpdate}`);
      }

      // Вычитаем энергию
      console.log(`🔋 Вычитаем ${requiredEnergy} энергии: ${currentEnergy} → ${newEnergy}`);

      // Выполняем обновление пользователя
      const updateResult = await db.update(users)
        .set({ 
          energyTasksBonus: newEnergy,
          balance: newBalance.toString(),
          freeBalance: newFreeBalance.toString(),
          isPremium: newIsPremium,
          premiumExpiresAt: newPremiumExpiresAt
        })
        .where(eq(users.id, userId));

      console.log(`✅ Обновление пользователя выполнено:`, updateResult);

      // Шаг 5: Записываем в историю открытий
      const openingRecord = await db.insert(boxOpenings).values({
        userId,
        boxTypeId: boxTypeRecord[0].id,
        prizeId: selectedPrize.id,
        prizeType: selectedPrize.prizeType,
        amount: selectedPrize.amount != null ? selectedPrize.amount.toString() : null,
        proDays: selectedPrize.proDays ?? null,
        energySpent: requiredEnergy, // Записываем требуемую энергию
      }).returning();

      console.log(`📝 Записано в историю открытий:`, openingRecord[0]);

      // Шаг 6: Проверяем результат
      const finalUser = await db
        .select({ energyTasksBonus: users.energyTasksBonus })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      console.log(`🔋 Финальная энергия: ${finalUser[0]?.energyTasksBonus}`);
      console.log(`✅ Коробка ${boxType} успешно открыта!`);

      // Проверяем автоуровни после изменения средств/премиума
      await applyAutoRewards(userId);

      return {
        success: true,
        prize: selectedPrize,
        balanceUpdate,
        proDays,
        energySpent: requiredEnergy,
        message: selectedPrize.prizeType === 'pro' 
          ? `Поздравляем! Вы получили PRO режим на ${selectedPrize.proDays} дней!`
          : `Поздравляем! Вы выиграли $${selectedPrize.amount}!`
      };

    } catch (error) {
      console.error('❌ Ошибка при открытии коробки:', error);
      throw error;
    }
  }

  /**
   * Получить историю открытий пользователя
   */
  static async getUserOpenings(userId: string, limit = 10): Promise<any[]> {
    try {
      const openings = await db
        .select({
          id: boxOpenings.id,
          boxType: boxTypes.type,
          boxName: boxTypes.name,
          prizeType: boxOpenings.prizeType,
          amount: boxOpenings.amount,
          proDays: boxOpenings.proDays,
          energySpent: boxOpenings.energySpent,
          openedAt: boxOpenings.openedAt,
        })
        .from(boxOpenings)
        .innerJoin(boxTypes, eq(boxOpenings.boxTypeId, boxTypes.id))
        .where(eq(boxOpenings.userId, userId))
        .orderBy(desc(boxOpenings.openedAt))
        .limit(limit);

      return openings.map(opening => ({
        ...opening,
        amount: opening.amount ? Number(opening.amount) : undefined,
        energySpent: Number(opening.energySpent),
      }));
    } catch (error) {
      console.error('Error getting user openings:', error);
      throw error;
    }
  }

  /**
   * Получить статистику призов для админа
   */
  static async getPrizeStats(): Promise<any> {
    try {
      const stats = await db
        .select({
          boxType: boxTypes.type,
          boxName: boxTypes.name,
          totalOpenings: sql<number>`count(${boxOpenings.id})`,
          totalMoney: sql<number>`coalesce(sum(${boxOpenings.amount}), 0)`,
          totalProDays: sql<number>`coalesce(sum(${boxOpenings.proDays}), 0)`,
          totalEnergySpent: sql<number>`coalesce(sum(${boxOpenings.energySpent}), 0)`,
        })
        .from(boxOpenings)
        .innerJoin(boxTypes, eq(boxOpenings.boxTypeId, boxTypes.id))
        .groupBy(boxTypes.id, boxTypes.type, boxTypes.name);

      return stats.map(stat => ({
        ...stat,
        totalMoney: Number(stat.totalMoney),
        totalProDays: Number(stat.totalProDays),
        totalEnergySpent: Number(stat.totalEnergySpent),
      }));
    } catch (error) {
      console.error('Error getting prize stats:', error);
      throw error;
    }
  }
} 