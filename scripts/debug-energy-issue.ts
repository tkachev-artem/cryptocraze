#!/usr/bin/env tsx

import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { PrizeService } from '../server/services/prizeService';

async function debugEnergyIssue() {
  try {
    console.log('�� Отладка проблемы с вычитанием энергии...\n');

    // Получаем пользователя для тестирования
    const user = await db
      .select({ 
        id: users.id,
        email: users.email,
        energyTasksBonus: users.energyTasksBonus,
        balance: users.balance
      })
      .from(users)
      .where(eq(users.email, 'exsiseprogram@gmail.com'))
      .limit(1);

    if (!user.length) {
      console.log('❌ Пользователь не найден');
      return;
    }

    const testUser = user[0];
    console.log('👤 Тестовый пользователь:');
    console.log('  ID:', testUser.id);
    console.log('  Email:', testUser.email);
    console.log('  Энергия до теста:', testUser.energyTasksBonus);
    console.log('  Баланс до теста:', testUser.balance);
    console.log('');

    // Проверяем требования по энергии для каждой коробки
    const boxTypes = ['red', 'green', 'x'] as const;
    
    for (const boxType of boxTypes) {
      console.log(`📦 Проверка ${boxType} коробки:`);
      
      try {
        const requiredEnergy = await PrizeService.getRequiredEnergy(boxType);
        console.log(`  Требуется энергии: ${requiredEnergy}`);
        
        if ((testUser.energyTasksBonus || 0) < requiredEnergy) {
          console.log(`  ❌ Недостаточно энергии (нужно ${requiredEnergy}, есть ${testUser.energyTasksBonus})`);
          
          // Добавляем энергию для тестирования
          await db.update(users)
            .set({ energyTasksBonus: requiredEnergy })
            .where(eq(users.id, testUser.id));
          
          console.log(`  ✅ Добавлена энергия до ${requiredEnergy}`);
          
          // Обновляем данные пользователя
          const updatedUser = await db
            .select({ energyTasksBonus: users.energyTasksBonus })
            .from(users)
            .where(eq(users.id, testUser.id))
            .limit(1);
          
          console.log(`  🔋 Энергия после добавления: ${updatedUser[0]?.energyTasksBonus}`);
        } else {
          console.log(`  ✅ Достаточно энергии`);
        }
        
        // Тестируем открытие коробки
        console.log(`  🎁 Открываем ${boxType} коробку...`);
        
        const result = await PrizeService.openBox(testUser.id, boxType);
        
        console.log(`  ✅ Коробка открыта успешно!`);
        console.log(`  🎁 Приз: ${result.prize.prizeType === 'pro' ? `PRO ${result.prize.proDays} дней` : `$${result.prize.amount}`}`);
        console.log(`  🔋 Потрачено энергии: ${result.energySpent}`);
        console.log(`  💰 Получено денег: ${result.balanceUpdate || 0}`);
        console.log(`  📝 Сообщение: ${result.message}`);
        
        // Проверяем обновленные данные пользователя
        const finalUser = await db
          .select({ 
            energyTasksBonus: users.energyTasksBonus,
            balance: users.balance,
            isPremium: users.isPremium
          })
          .from(users)
          .where(eq(users.id, testUser.id))
          .limit(1);
        
        console.log(`  🔋 Энергия после открытия: ${finalUser[0]?.energyTasksBonus}`);
        console.log(`  💰 Баланс после открытия: ${finalUser[0]?.balance}`);
        console.log(`  👑 PRO статус: ${finalUser[0]?.isPremium ? 'Активен' : 'Неактивен'}`);
        
        // Обновляем данные для следующего теста
        testUser.energyTasksBonus = finalUser[0]?.energyTasksBonus || 0;
        testUser.balance = finalUser[0]?.balance || '0';
        
      } catch (error) {
        console.log(`  ❌ Ошибка при открытии ${boxType} коробки:`, error);
      }
      
      console.log('');
    }

    console.log('✅ Отладка завершена!');

  } catch (error) {
    console.error('❌ Ошибка при отладке:', error);
  } finally {
    await db.disconnect();
  }
}

debugEnergyIssue(); 