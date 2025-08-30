import { db } from '../db.js';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface EnergyTaskResult {
  newProgress: number;
  isCompleted: boolean;
  completedTasks: number;
}

export class EnergyService {
  /**
   * Добавляет энергию к прогрессу пользователя
   * @param userId - ID пользователя
   * @param energyAmount - количество энергии для добавления
   * @returns результат операции с новым прогрессом и статусом выполнения
   */
  static async addEnergy(userId: string, energyAmount: number): Promise<EnergyTaskResult> {
    // Получаем текущий прогресс пользователя
    const user = await db.select({ energyTasksBonus: users.energyTasksBonus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw new Error('Пользователь не найден');
    }

    const currentProgress = user[0].energyTasksBonus || 0;
    const newProgress = currentProgress + energyAmount;
    
    let finalProgress: number;
    let isCompleted = false;
    let completedTasks = 0;

    // Если прогресс достиг или превысил 100, обрабатываем переполнение
    if (newProgress >= 100) {
      isCompleted = true;
      completedTasks = Math.floor(newProgress / 100); // Сколько полных циклов выполнено
      
      // Остаток от деления на 100 (например, 105 % 100 = 5)
      finalProgress = newProgress % 100;
      
      console.log(`[EnergyService] Энергия переполнена: ${currentProgress} + ${energyAmount} = ${newProgress}`);
      console.log(`[EnergyService] Выполнено циклов: ${completedTasks}, остаток: ${finalProgress}`);
    } else {
      finalProgress = newProgress;
    }

    // Обновляем прогресс в базе данных
    await db.update(users)
      .set({ energyTasksBonus: finalProgress })
      .where(eq(users.id, userId));

    return {
      newProgress: finalProgress,
      isCompleted,
      completedTasks
    };
  }

  /**
   * Получает текущий прогресс пользователя
   * @param userId - ID пользователя
   * @returns текущий прогресс (0-100)
   */
  static async getProgress(userId: string): Promise<number> {
    const user = await db.select({ energyTasksBonus: users.energyTasksBonus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw new Error('Пользователь не найден');
    }

    return user[0].energyTasksBonus || 0;
  }

  /**
   * Сбрасывает прогресс пользователя в 0
   * @param userId - ID пользователя
   */
  static async resetProgress(userId: string): Promise<void> {
    await db.update(users)
      .set({ energyTasksBonus: 0 })
      .where(eq(users.id, userId));
  }

  /**
   * Устанавливает конкретное значение прогресса
   * @param userId - ID пользователя
   * @param progress - значение прогресса (0-100)
   */
  static async setProgress(userId: string, progress: number): Promise<void> {
    // Ограничиваем прогресс от 0 до 100
    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    await db.update(users)
      .set({ energyTasksBonus: clampedProgress })
      .where(eq(users.id, userId));
  }

  /**
   * Списывает энергию у пользователя (безопасно, с защитой от двойного списания)
   * Если передан expectedBefore и текущее значение уже меньше либо равно expectedBefore - amount,
   * считаем, что списание уже применено и повторно не списываем.
   */
  static async spendEnergy(userId: string, amount: number, expectedBefore?: number): Promise<{ previous: number; next: number; spentApplied: boolean }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Некорректное количество энергии для списания');
    }
    const row = await db
      .select({ energyTasksBonus: users.energyTasksBonus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (row.length === 0) throw new Error('Пользователь не найден');
    const current = row[0].energyTasksBonus || 0;
    const targetIfApplied = Math.max(0, current - amount);

    // Защита от двойного списания (опциональная): если ожидали current=expectedBefore, а сейчас уже <= expectedBefore-amount
    if (typeof expectedBefore === 'number') {
      const alreadyAppliedThreshold = Math.max(0, expectedBefore - amount);
      if (current <= alreadyAppliedThreshold) {
        return { previous: current, next: current, spentApplied: false };
      }
    }

    await db.update(users)
      .set({ energyTasksBonus: targetIfApplied })
      .where(eq(users.id, userId));

    return { previous: current, next: targetIfApplied, spentApplied: current !== targetIfApplied };
  }
} 