import { EnergyService } from '../server/services/energyService';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = 'test-user-energy';

async function createTestUser() {
  try {
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: 'test-energy@example.com',
        firstName: 'Test',
        lastName: 'Energy',
        balance: '10000.00',
        coins: 100,
        freeBalance: '0',
        ratingScore: 0,
        tradesCount: 0,
        totalTradesVolume: '0.00',
        successfulTradesPercentage: '0.00',
        maxProfit: '0.00',
        maxLoss: '0.00',
        averageTradeAmount: '0.00',
        rewardsCount: 0,
        energyTasksBonus: 0,
        isPremium: false
      });
      console.log('✅ Тестовый пользователь создан');
    } else {
      console.log('✅ Тестовый пользователь уже существует');
    }
  } catch (error) {
    console.error('❌ Ошибка создания тестового пользователя:', error);
  }
}

async function testEnergyOverflow() {
  console.log('⚡ Тестирование переполнения энергии...\n');

  try {
    await createTestUser();

    // Тест 1: Обычное добавление энергии
    console.log('📋 Тест 1: Обычное добавление энергии');
    await EnergyService.resetProgress(TEST_USER_ID);
    let result = await EnergyService.addEnergy(TEST_USER_ID, 30);
    console.log(`   Добавлено 30 энергии: прогресс = ${result.newProgress}, выполнено = ${result.completedTasks}`);

    // Тест 2: Добавление до 100%
    console.log('\n📋 Тест 2: Добавление до 100%');
    result = await EnergyService.addEnergy(TEST_USER_ID, 70);
    console.log(`   Добавлено 70 энергии: прогресс = ${result.newProgress}, выполнено = ${result.completedTasks}`);

    // Тест 3: Переполнение (90 + 15 = 105, должно остаться 5)
    console.log('\n📋 Тест 3: Переполнение (90 + 15 = 105)');
    await EnergyService.setProgress(TEST_USER_ID, 90);
    result = await EnergyService.addEnergy(TEST_USER_ID, 15);
    console.log(`   Добавлено 15 энергии: прогресс = ${result.newProgress}, выполнено = ${result.completedTasks}`);

    // Тест 4: Большое переполнение (5 + 200 = 205, должно остаться 5)
    console.log('\n📋 Тест 4: Большое переполнение (5 + 200 = 205)');
    result = await EnergyService.addEnergy(TEST_USER_ID, 200);
    console.log(`   Добавлено 200 энергии: прогресс = ${result.newProgress}, выполнено = ${result.completedTasks}`);

    // Тест 5: Точное достижение 100%
    console.log('\n📋 Тест 5: Точное достижение 100%');
    await EnergyService.setProgress(TEST_USER_ID, 95);
    result = await EnergyService.addEnergy(TEST_USER_ID, 5);
    console.log(`   Добавлено 5 энергии: прогресс = ${result.newProgress}, выполнено = ${result.completedTasks}`);

    // Тест 6: Небольшое переполнение (0 + 25 = 25)
    console.log('\n📋 Тест 6: Небольшое переполнение (0 + 25 = 25)');
    await EnergyService.resetProgress(TEST_USER_ID);
    result = await EnergyService.addEnergy(TEST_USER_ID, 25);
    console.log(`   Добавлено 25 энергии: прогресс = ${result.newProgress}, выполнено = ${result.completedTasks}`);

    // Финальная проверка
    console.log('\n📋 Финальная проверка');
    const finalProgress = await EnergyService.getProgress(TEST_USER_ID);
    console.log(`   Финальный прогресс энергии: ${finalProgress}%`);

    console.log('\n🎉 Тестирование переполнения энергии завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testEnergyOverflow().catch(console.error); 