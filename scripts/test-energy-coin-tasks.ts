import { TaskService } from '../server/services/taskService';
import { TaskTemplateService } from '../server/services/taskTemplates';
import { EnergyService } from '../server/services/energyService';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = 'test-user-energy-coin';

async function createTestUser() {
  try {
    // Проверяем, существует ли пользователь
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    if (existingUser.length === 0) {
      // Создаем тестового пользователя
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: 'test-energy-coin@example.com',
        firstName: 'Test',
        lastName: 'EnergyCoin',
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

async function testEnergyAndCoinTasks() {
  console.log('🎮 Тестирование заданий с энергией и монетами...\n');

  try {
    // Создаем тестового пользователя
    await createTestUser();

    // Шаг 1: Проверяем энергетические шаблоны
    console.log('📋 Шаг 1: Проверяем энергетические шаблоны...');
    const energyTemplates = TaskTemplateService.getEnergyTemplates();
    console.log(`✅ Найдено энергетических шаблонов: ${energyTemplates.length}`);
    energyTemplates.forEach(template => {
      console.log(`   - ${template.title}: ${template.rewardAmount} энергии`);
    });

    // Шаг 2: Проверяем криптовалютные шаблоны
    console.log('\n📋 Шаг 2: Проверяем криптовалютные шаблоны...');
    const cryptoTemplates = TaskTemplateService.getCryptoTemplates();
    console.log(`✅ Найдено криптовалютных шаблонов: ${cryptoTemplates.length}`);
    cryptoTemplates.forEach(template => {
      console.log(`   - ${template.title}: ${template.rewardAmount} ${template.rewardType}`);
    });

    // Шаг 3: Проверяем шаблоны с энергетическими наградами
    console.log('\n📋 Шаг 3: Проверяем шаблоны с энергетическими наградами...');
    const energyRewardTemplates = TaskTemplateService.getEnergyRewardTemplates();
    console.log(`✅ Найдено шаблонов с энергетическими наградами: ${energyRewardTemplates.length}`);
    energyRewardTemplates.forEach(template => {
      console.log(`   - ${template.title} (${template.category}): ${template.rewardAmount} энергии`);
    });

    // Шаг 4: Проверяем шаблоны с наградами в монетах
    console.log('\n📋 Шаг 4: Проверяем шаблоны с наградами в монетах...');
    const coinRewardTemplates = TaskTemplateService.getCoinRewardTemplates();
    console.log(`✅ Найдено шаблонов с наградами в монетах: ${coinRewardTemplates.length}`);
    coinRewardTemplates.forEach(template => {
      console.log(`   - ${template.title} (${template.category}): ${template.rewardAmount} монет`);
    });

    // Шаг 5: Создаем энергетическое задание
    console.log('\n📋 Шаг 5: Создаем энергетическое задание...');
    const energyTask = await TaskService.createTaskByCategory(TEST_USER_ID, 'energy');
    if (energyTask) {
      console.log(`✅ Создано энергетическое задание: ${energyTask.title} (ID: ${energyTask.id})`);
      console.log(`   Награда: ${energyTask.reward.amount} ${energyTask.reward.type}`);
      console.log(`   Прогресс: ${energyTask.progress.current}/${energyTask.progress.total}`);
    } else {
      console.log('❌ Не удалось создать энергетическое задание');
    }

    // Шаг 6: Создаем криптовалютное задание
    console.log('\n📋 Шаг 6: Создаем криптовалютное задание...');
    const cryptoTask = await TaskService.createTaskByCategory(TEST_USER_ID, 'crypto');
    if (cryptoTask) {
      console.log(`✅ Создано криптовалютное задание: ${cryptoTask.title} (ID: ${cryptoTask.id})`);
      console.log(`   Награда: ${cryptoTask.reward.amount} ${cryptoTask.reward.type}`);
      console.log(`   Прогресс: ${cryptoTask.progress.current}/${cryptoTask.progress.total}`);
    } else {
      console.log('❌ Не удалось создать криптовалютное задание');
    }

    // Шаг 7: Получаем все задания пользователя
    console.log('\n📋 Шаг 7: Получаем все задания пользователя...');
    const userTasks = await TaskService.getUserTasks(TEST_USER_ID);
    console.log(`✅ Активных заданий: ${userTasks.length}`);
    userTasks.forEach(task => {
      console.log(`   - ${task.title}: ${task.reward.amount} ${task.reward.type}`);
    });

    // Шаг 8: Тестируем обновление прогресса энергетического задания
    if (energyTask) {
      console.log('\n📋 Шаг 8: Тестируем обновление прогресса энергетического задания...');
      const taskId = parseInt(energyTask.id);
      const progressResult = await TaskService.updateTaskProgress(taskId, TEST_USER_ID, energyTask.progress.total);
      
      if (progressResult) {
        console.log(`✅ Задание выполнено: ${progressResult.task.title}`);
        console.log(`   Статус: ${progressResult.task.status}`);
        if (progressResult.newTask) {
          console.log(`   Новое задание: ${progressResult.newTask.title}`);
        }
      } else {
        console.log('❌ Не удалось обновить прогресс задания');
      }
    }

    // Шаг 9: Проверяем энергетический прогресс пользователя
    console.log('\n📋 Шаг 9: Проверяем энергетический прогресс пользователя...');
    const energyProgress = await EnergyService.getProgress(TEST_USER_ID);
    console.log(`✅ Энергетический прогресс: ${energyProgress}%`);

    console.log('\n🎉 Тестирование завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testEnergyAndCoinTasks().catch(console.error); 