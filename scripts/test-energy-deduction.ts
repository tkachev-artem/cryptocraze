#!/usr/bin/env tsx

import { db } from '../server/db';
import { users, boxTypes } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { PrizeService } from '../server/services/prizeService';

async function testEnergyDeduction() {
  try {
    console.log('🔋 Тестирование вычитания энергии при открытии коробок...\n');

    // Получаем первого пользователя для тестирования
    const testUser = await db
      .select({
        id: users.id,
        email: users.email,
        energyTasksBonus: users.energyTasksBonus,
        balance: users.balance,
      })
      .from(users)
      .limit(1);

    if (!testUser.length) {
      console.error('❌ Пользователи не найдены');
      return;
    }

    const user = testUser[0];
    console.log(`👤 Тестовый пользователь: ${user.email}`);
    console.log(`💰 Баланс: $${user.balance}`);
    console.log(`🔋 Энергия: ${user.energyTasksBonus}/100\n`);

    // Получаем требования по энергии для каждой коробки
    const boxTypesData = await db.select().from(boxTypes);
    console.log('📦 Требования по энергии:');
    boxTypesData.forEach(box => {
      console.log(`  ${box.name}: ${box.requiredEnergy} энергии`);
    });
    console.log('');

    // Тестируем открытие каждой коробки
    for (const boxType of ['red', 'green', 'x'] as const) {
      console.log(`🎁 Тестирование ${boxType} коробки...`);
      
      try {
        // Получаем текущую энергию пользователя
        const currentUser = await db
          .select({ energyTasksBonus: users.energyTasksBonus })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        const currentEnergy = currentUser[0]?.energyTasksBonus ?? 0;
        const requiredEnergy = boxTypesData.find(bt => bt.type === boxType)?.requiredEnergy ?? 0;

        console.log(`  🔋 Текущая энергия: ${currentEnergy}`);
        console.log(`  📋 Требуется энергии: ${requiredEnergy}`);

        if (currentEnergy < requiredEnergy) {
          console.log(`  ❌ Недостаточно энергии (нужно ${requiredEnergy}, есть ${currentEnergy})`);
          
          // Добавляем энергию для тестирования
          await db.update(users)
            .set({ energyTasksBonus: requiredEnergy })
            .where(eq(users.id, user.id));
          
          console.log(`  ✅ Добавлена энергия до ${requiredEnergy}`);
        }

        // Открываем коробку
        const result = await PrizeService.openBox(user.id, boxType);
        
        console.log(`  🎉 Коробка открыта!`);
        console.log(`  🎁 Приз: ${result.prize.prizeType === 'pro' ? `PRO ${result.prize.proDays} дней` : `$${result.prize.amount}`}`);
        console.log(`  🔋 Потрачено энергии: ${result.energySpent}`);
        
        if (result.balanceUpdate) {
          console.log(`  💰 Получено денег: $${result.balanceUpdate}`);
        }
        
        if (result.proDays) {
          console.log(`  👑 Получено PRO дней: ${result.proDays}`);
        }

        // Проверяем, что энергия вычтена
        const updatedUser = await db
          .select({ energyTasksBonus: users.energyTasksBonus })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        const newEnergy = updatedUser[0]?.energyTasksBonus ?? 0;
        console.log(`  🔋 Новая энергия: ${newEnergy}`);
        
        const expectedEnergy = Math.max(0, currentEnergy - requiredEnergy);
        if (newEnergy === expectedEnergy) {
          console.log(`  ✅ Энергия корректно вычтена!`);
        } else {
          console.log(`  ❌ Ошибка вычитания энергии! Ожидалось: ${expectedEnergy}, получено: ${newEnergy}`);
        }

      } catch (error) {
        console.log(`  ❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
      
      console.log('');
    }

    // Финальная статистика
    const finalUser = await db
      .select({
        energyTasksBonus: users.energyTasksBonus,
        balance: users.balance,
        isPremium: users.isPremium,
        premiumExpiresAt: users.premiumExpiresAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    console.log('📊 Финальная статистика:');
    console.log(`  🔋 Энергия: ${finalUser[0]?.energyTasksBonus ?? 0}/100`);
    console.log(`  💰 Баланс: $${finalUser[0]?.balance ?? 0}`);
    console.log(`  👑 PRO статус: ${finalUser[0]?.isPremium ? 'Активен' : 'Неактивен'}`);
    if (finalUser[0]?.premiumExpiresAt) {
      console.log(`  📅 PRO истекает: ${finalUser[0].premiumExpiresAt.toLocaleString()}`);
    }

    // Получаем историю открытий
    const openings = await PrizeService.getUserOpenings(user.id, 10);
    console.log(`\n📜 История открытий (последние ${openings.length}):`);
    openings.forEach((opening, index) => {
      const prizeText = opening.prizeType === 'pro' 
        ? `PRO ${opening.proDays} дней`
        : `$${opening.amount?.toLocaleString()}`;
      
      console.log(`  ${index + 1}. ${opening.boxName}: ${prizeText} (энергия: ${opening.energySpent})`);
    });

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testEnergyDeduction(); 