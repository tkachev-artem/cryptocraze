"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinWheel = spinWheel;
exports.getWheelPrizes = getWheelPrizes;
const db_js_1 = require("./db.js");
const schema_1 = require("../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const WHEEL_PRIZES = [
    { value: 100, label: '100$', weight: 25 }, // 25% шанс
    { value: 150, label: '150$', weight: 20 }, // 20% шанс  
    { value: 200, label: '200$', weight: 15 }, // 15% шанс
    { value: 500, label: '500$', weight: 12 }, // 12% шанс
    { value: 700, label: '700$', weight: 10 }, // 10% шанс
    { value: 1000, label: '1000$', weight: 8 }, // 8% шанс
    { value: 1500, label: '1500$', weight: 5 }, // 5% шанс
    { value: 2000, label: '2000$', weight: 3 }, // 3% шанс
    { value: 10000, label: '10000$', weight: 2 }, // 2% шанс
];
/**
 * Выбирает случайный приз на основе весов
 */
function selectRandomPrize() {
    const totalWeight = WHEEL_PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (let i = 0; i < WHEEL_PRIZES.length; i++) {
        currentWeight += WHEEL_PRIZES[i].weight;
        if (random <= currentWeight) {
            return { prize: WHEEL_PRIZES[i], index: i };
        }
    }
    // Fallback (не должно произойти)
    return { prize: WHEEL_PRIZES[0], index: 0 };
}
/**
 * API endpoint для вращения рулетки
 * POST /api/wheel/spin
 */
async function spinWheel(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Пользователь не авторизован'
            });
            return;
        }
        console.log(`🎰 [WheelAPI] Запрос на вращение рулетки от пользователя: ${userId}`);
        // Получаем пользователя
        const [user] = await db_js_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
            return;
        }
        // Выбираем случайный приз
        const { prize, index } = selectRandomPrize();
        console.log(`🎰 [WheelAPI] Выбран приз: ${prize.label} (индекс: ${index})`);
        // Начисляем приз пользователю на реальный баланс (как задания)
        const currentBalance = parseFloat(user.balance || '0');
        const newBalance = currentBalance + prize.value;
        await db_js_1.db
            .update(schema_1.users)
            .set({
            balance: newBalance.toFixed(2), // Обычная точность для реального баланса
            updatedAt: new Date()
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        console.log(`🎰 [WheelAPI] Начислено $${prize.value}. Новый баланс: $${newBalance.toFixed(2)}`);
        // Возвращаем результат
        res.json({
            success: true,
            prize: prize.value,
            index: index,
            label: prize.label,
            newBalance: newBalance.toFixed(2)
        });
    }
    catch (error) {
        console.error('🎰 [WheelAPI] Ошибка при вращении рулетки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
}
/**
 * API endpoint для получения информации о призах рулетки
 * GET /api/wheel/prizes
 */
async function getWheelPrizes(req, res) {
    try {
        const prizes = WHEEL_PRIZES.map((prize, index) => ({
            value: prize.value,
            label: prize.label,
            index: index
        }));
        res.json({
            success: true,
            prizes: prizes
        });
    }
    catch (error) {
        console.error('🎰 [WheelAPI] Ошибка при получении призов:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
}
