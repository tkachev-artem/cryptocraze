import { Request, Response } from 'express';
import { db } from './db.js';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Призы в рулетке с их весами (вероятностями)
interface WheelPrize {
  value: number;
  label: string;
  weight: number; // Вес для определения вероятности
}

const WHEEL_PRIZES: WheelPrize[] = [
  { value: 100, label: '100$', weight: 25 },      // 25% шанс
  { value: 150, label: '150$', weight: 20 },      // 20% шанс  
  { value: 200, label: '200$', weight: 15 },      // 15% шанс
  { value: 500, label: '500$', weight: 12 },      // 12% шанс
  { value: 700, label: '700$', weight: 10 },      // 10% шанс
  { value: 1000, label: '1000$', weight: 8 },     // 8% шанс
  { value: 1500, label: '1500$', weight: 5 },     // 5% шанс
  { value: 2000, label: '2000$', weight: 3 },     // 3% шанс
  { value: 10000, label: '10000$', weight: 2 },   // 2% шанс
];

/**
 * Выбирает случайный приз на основе весов
 */
function selectRandomPrize(): { prize: WheelPrize; index: number } {
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
export async function spinWheel(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
      return;
    }

    console.log(`🎰 [WheelAPI] Запрос на вращение рулетки от пользователя: ${userId}`);

    // Получаем пользователя
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
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

    await db
      .update(users)
      .set({
        balance: newBalance.toFixed(2), // Обычная точность для реального баланса
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log(`🎰 [WheelAPI] Начислено $${prize.value}. Новый баланс: $${newBalance.toFixed(2)}`);

    // Возвращаем результат
    res.json({
      success: true,
      prize: prize.value,
      index: index,
      label: prize.label,
      newBalance: newBalance.toFixed(2)
    });

  } catch (error) {
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
export async function getWheelPrizes(req: Request, res: Response): Promise<void> {
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

  } catch (error) {
    console.error('🎰 [WheelAPI] Ошибка при получении призов:', error);
    
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
}