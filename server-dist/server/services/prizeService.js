"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrizeService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const autoRewards_js_1 = require("./autoRewards.js");
class PrizeService {
    /**
     * Получить все активные призы для определенного типа коробки
     */
    static async getPrizesForBox(boxType) {
        try {
            const boxTypeRecord = await db_js_1.db
                .select()
                .from(schema_1.boxTypes)
                .where((0, drizzle_orm_1.eq)(schema_1.boxTypes.type, boxType))
                .limit(1);
            if (!boxTypeRecord.length) {
                throw new Error(`Тип коробки ${boxType} не найден`);
            }
            const boxPrizes = await db_js_1.db
                .select({
                id: schema_1.prizes.id,
                prizeType: schema_1.prizes.prizeType,
                amount: schema_1.prizes.amount,
                proDays: schema_1.prizes.proDays,
                chance: schema_1.prizes.chance,
            })
                .from(schema_1.prizes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prizes.boxTypeId, boxTypeRecord[0].id), (0, drizzle_orm_1.eq)(schema_1.prizes.isActive, true)));
            return boxPrizes.map(prize => ({
                id: prize.id,
                prizeType: prize.prizeType,
                amount: prize.amount ? Number(prize.amount) : undefined,
                proDays: prize.proDays || undefined,
                chance: Number(prize.chance),
            }));
        }
        catch (error) {
            console.error('Error getting prizes for box:', error);
            throw error;
        }
    }
    /**
     * Получить требования по энергии для открытия коробки
     */
    static async getRequiredEnergy(boxType) {
        try {
            const boxTypeRecord = await db_js_1.db
                .select({ requiredEnergy: schema_1.boxTypes.requiredEnergy })
                .from(schema_1.boxTypes)
                .where((0, drizzle_orm_1.eq)(schema_1.boxTypes.type, boxType))
                .limit(1);
            if (!boxTypeRecord.length) {
                throw new Error(`Тип коробки ${boxType} не найден`);
            }
            return boxTypeRecord[0].requiredEnergy;
        }
        catch (error) {
            console.error('Error getting required energy:', error);
            throw error;
        }
    }
    /**
     * Выбрать случайный приз на основе шансов
     */
    static async selectRandomPrize(boxType) {
        try {
            const prizes = await this.getPrizesForBox(boxType);
            if (!prizes.length) {
                throw new Error(`Нет активных призов для коробки ${boxType}`);
            }
            // Вычисляем случайное число
            const random = Math.random() * 100;
            let cumulativeChance = 0;
            let selectedPrize = null;
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
        }
        catch (error) {
            console.error('Error selecting random prize:', error);
            throw error;
        }
    }
    /**
     * Открыть коробку и получить приз
     */
    static async openBox(userId, boxType) {
        try {
            console.log(`🎁 Начинаем открытие коробки ${boxType} для пользователя ${userId}`);
            // Шаг 1: Получаем требования по энергии и данные пользователя
            const requiredEnergy = await this.getRequiredEnergy(boxType);
            console.log(`🔋 Требуется энергии для ${boxType} коробки: ${requiredEnergy}`);
            const user = await db_js_1.db
                .select({
                id: schema_1.users.id,
                energyTasksBonus: schema_1.users.energyTasksBonus,
                balance: schema_1.users.balance,
                freeBalance: schema_1.users.freeBalance,
                isPremium: schema_1.users.isPremium,
                premiumExpiresAt: schema_1.users.premiumExpiresAt
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
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
            const boxTypeRecord = await db_js_1.db
                .select({ id: schema_1.boxTypes.id })
                .from(schema_1.boxTypes)
                .where((0, drizzle_orm_1.eq)(schema_1.boxTypes.type, boxType))
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
                const proExpiresAt = new Date(currentDate.getTime() + (selectedPrize.proDays * 24 * 60 * 60 * 1000));
                newIsPremium = true;
                newPremiumExpiresAt = proExpiresAt;
                proDays = selectedPrize.proDays;
                console.log(`👑 Активируем PRO режим на ${proDays} дней`);
            }
            else {
                // Начисляем деньги
                balanceUpdate = selectedPrize.amount;
                newBalance += balanceUpdate;
                newFreeBalance += balanceUpdate;
                console.log(`💰 Начисляем $${balanceUpdate}`);
            }
            // Вычитаем энергию
            console.log(`🔋 Вычитаем ${requiredEnergy} энергии: ${currentEnergy} → ${newEnergy}`);
            // Выполняем обновление пользователя
            const updateResult = await db_js_1.db.update(schema_1.users)
                .set({
                energyTasksBonus: newEnergy,
                balance: newBalance.toString(),
                freeBalance: newFreeBalance.toString(),
                isPremium: newIsPremium,
                premiumExpiresAt: newPremiumExpiresAt
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            console.log(`✅ Обновление пользователя выполнено:`, updateResult);
            // Шаг 5: Записываем в историю открытий
            const openingRecord = await db_js_1.db.insert(schema_1.boxOpenings).values({
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
            const finalUser = await db_js_1.db
                .select({ energyTasksBonus: schema_1.users.energyTasksBonus })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                .limit(1);
            console.log(`🔋 Финальная энергия: ${finalUser[0]?.energyTasksBonus}`);
            console.log(`✅ Коробка ${boxType} успешно открыта!`);
            // Проверяем автоуровни после изменения средств/премиума
            await (0, autoRewards_js_1.applyAutoRewards)(userId);
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
        }
        catch (error) {
            console.error('❌ Ошибка при открытии коробки:', error);
            throw error;
        }
    }
    /**
     * Получить историю открытий пользователя
     */
    static async getUserOpenings(userId, limit = 10) {
        try {
            const openings = await db_js_1.db
                .select({
                id: schema_1.boxOpenings.id,
                boxType: schema_1.boxTypes.type,
                boxName: schema_1.boxTypes.name,
                prizeType: schema_1.boxOpenings.prizeType,
                amount: schema_1.boxOpenings.amount,
                proDays: schema_1.boxOpenings.proDays,
                energySpent: schema_1.boxOpenings.energySpent,
                openedAt: schema_1.boxOpenings.openedAt,
            })
                .from(schema_1.boxOpenings)
                .innerJoin(schema_1.boxTypes, (0, drizzle_orm_1.eq)(schema_1.boxOpenings.boxTypeId, schema_1.boxTypes.id))
                .where((0, drizzle_orm_1.eq)(schema_1.boxOpenings.userId, userId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.boxOpenings.openedAt))
                .limit(limit);
            return openings.map(opening => ({
                ...opening,
                amount: opening.amount ? Number(opening.amount) : undefined,
                energySpent: Number(opening.energySpent),
            }));
        }
        catch (error) {
            console.error('Error getting user openings:', error);
            throw error;
        }
    }
    /**
     * Получить статистику призов для админа
     */
    static async getPrizeStats() {
        try {
            const stats = await db_js_1.db
                .select({
                boxType: schema_1.boxTypes.type,
                boxName: schema_1.boxTypes.name,
                totalOpenings: (0, drizzle_orm_2.sql) `count(${schema_1.boxOpenings.id})`,
                totalMoney: (0, drizzle_orm_2.sql) `coalesce(sum(${schema_1.boxOpenings.amount}), 0)`,
                totalProDays: (0, drizzle_orm_2.sql) `coalesce(sum(${schema_1.boxOpenings.proDays}), 0)`,
                totalEnergySpent: (0, drizzle_orm_2.sql) `coalesce(sum(${schema_1.boxOpenings.energySpent}), 0)`,
            })
                .from(schema_1.boxOpenings)
                .innerJoin(schema_1.boxTypes, (0, drizzle_orm_1.eq)(schema_1.boxOpenings.boxTypeId, schema_1.boxTypes.id))
                .groupBy(schema_1.boxTypes.id, schema_1.boxTypes.type, schema_1.boxTypes.name);
            return stats.map(stat => ({
                ...stat,
                totalMoney: Number(stat.totalMoney),
                totalProDays: Number(stat.totalProDays),
                totalEnergySpent: Number(stat.totalEnergySpent),
            }));
        }
        catch (error) {
            console.error('Error getting prize stats:', error);
            throw error;
        }
    }
}
exports.PrizeService = PrizeService;
