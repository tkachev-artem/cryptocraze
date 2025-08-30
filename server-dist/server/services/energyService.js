"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnergyService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
class EnergyService {
    /**
     * Добавляет энергию к прогрессу пользователя
     * @param userId - ID пользователя
     * @param energyAmount - количество энергии для добавления
     * @returns результат операции с новым прогрессом и статусом выполнения
     */
    static async addEnergy(userId, energyAmount) {
        // Получаем текущий прогресс пользователя
        const user = await db_js_1.db.select({ energyTasksBonus: schema_1.users.energyTasksBonus })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user.length) {
            throw new Error('Пользователь не найден');
        }
        const currentProgress = user[0].energyTasksBonus || 0;
        const newProgress = currentProgress + energyAmount;
        let finalProgress;
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
        }
        else {
            finalProgress = newProgress;
        }
        // Обновляем прогресс в базе данных
        await db_js_1.db.update(schema_1.users)
            .set({ energyTasksBonus: finalProgress })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
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
    static async getProgress(userId) {
        const user = await db_js_1.db.select({ energyTasksBonus: schema_1.users.energyTasksBonus })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
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
    static async resetProgress(userId) {
        await db_js_1.db.update(schema_1.users)
            .set({ energyTasksBonus: 0 })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    }
    /**
     * Устанавливает конкретное значение прогресса
     * @param userId - ID пользователя
     * @param progress - значение прогресса (0-100)
     */
    static async setProgress(userId, progress) {
        // Ограничиваем прогресс от 0 до 100
        const clampedProgress = Math.max(0, Math.min(100, progress));
        await db_js_1.db.update(schema_1.users)
            .set({ energyTasksBonus: clampedProgress })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
    }
    /**
     * Списывает энергию у пользователя (безопасно, с защитой от двойного списания)
     * Если передан expectedBefore и текущее значение уже меньше либо равно expectedBefore - amount,
     * считаем, что списание уже применено и повторно не списываем.
     */
    static async spendEnergy(userId, amount, expectedBefore) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Некорректное количество энергии для списания');
        }
        const row = await db_js_1.db
            .select({ energyTasksBonus: schema_1.users.energyTasksBonus })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (row.length === 0)
            throw new Error('Пользователь не найден');
        const current = row[0].energyTasksBonus || 0;
        const targetIfApplied = Math.max(0, current - amount);
        // Защита от двойного списания (опциональная): если ожидали current=expectedBefore, а сейчас уже <= expectedBefore-amount
        if (typeof expectedBefore === 'number') {
            const alreadyAppliedThreshold = Math.max(0, expectedBefore - amount);
            if (current <= alreadyAppliedThreshold) {
                return { previous: current, next: current, spentApplied: false };
            }
        }
        await db_js_1.db.update(schema_1.users)
            .set({ energyTasksBonus: targetIfApplied })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        return { previous: current, next: targetIfApplied, spentApplied: current !== targetIfApplied };
    }
}
exports.EnergyService = EnergyService;
