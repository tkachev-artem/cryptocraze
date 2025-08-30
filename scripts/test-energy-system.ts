import { EnergyService } from '../server/services/energyService';

async function testEnergySystem() {
  console.log('🧪 Тестирование энергетической системы...\n');

  // Тестовый пользователь ID
  const testUserId = 'test-user-123';

  try {
    // Тест 1: Получение начального прогресса
    console.log('1️⃣ Получение начального прогресса...');
    const initialProgress = await EnergyService.getProgress(testUserId);
    console.log(`   Начальный прогресс: ${initialProgress}/100\n`);

    // Тест 2: Добавление 30 энергии
    console.log('2️⃣ Добавление 30 энергии...');
    const result1 = await EnergyService.addEnergy(testUserId, 30);
    console.log(`   Новый прогресс: ${result1.newProgress}/100`);
    console.log(`   Задание выполнено: ${result1.isCompleted ? 'Да' : 'Нет'}`);
    console.log(`   Выполнено заданий: ${result1.completedTasks}\n`);

    // Тест 3: Добавление еще 50 энергии (должно достичь 80)
    console.log('3️⃣ Добавление 50 энергии...');
    const result2 = await EnergyService.addEnergy(testUserId, 50);
    console.log(`   Новый прогресс: ${result2.newProgress}/100`);
    console.log(`   Задание выполнено: ${result2.isCompleted ? 'Да' : 'Нет'}`);
    console.log(`   Выполнено заданий: ${result2.completedTasks}\n`);

    // Тест 4: Добавление 30 энергии (должно достичь 110, задание выполнено)
    console.log('4️⃣ Добавление 30 энергии (должно выполнить задание)...');
    const result3 = await EnergyService.addEnergy(testUserId, 30);
    console.log(`   Новый прогресс: ${result3.newProgress}/100`);
    console.log(`   Задание выполнено: ${result3.isCompleted ? 'Да' : 'Нет'}`);
    console.log(`   Выполнено заданий: ${result3.completedTasks}\n`);

    // Тест 5: Добавление 150 энергии (должно выполнить 2 задания)
    console.log('5️⃣ Добавление 150 энергии (должно выполнить 2 задания)...');
    const result4 = await EnergyService.addEnergy(testUserId, 150);
    console.log(`   Новый прогресс: ${result4.newProgress}/100`);
    console.log(`   Задание выполнено: ${result4.isCompleted ? 'Да' : 'Нет'}`);
    console.log(`   Выполнено заданий: ${result4.completedTasks}\n`);

    // Тест 6: Сброс прогресса
    console.log('6️⃣ Сброс прогресса...');
    await EnergyService.resetProgress(testUserId);
    const finalProgress = await EnergyService.getProgress(testUserId);
    console.log(`   Финальный прогресс после сброса: ${finalProgress}/100\n`);

    console.log('✅ Все тесты завершены успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запуск тестов
testEnergySystem().catch(console.error); 