import { TaskService } from '../server/services/taskService';
import { TaskTemplateService } from '../server/services/taskTemplates';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = 'test-user-limits';

async function createTestUser() {
  try {
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: 'test-limits@example.com',
        firstName: 'Test',
        lastName: 'Limits',
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

async function testTaskLimits() {
  console.log('🎮 Тестирование ограничений заданий...\n');

  try {
    await createTestUser();

    // Шаг 1: Проверяем доступные задания
    console.log('📋 Шаг 1: Проверка доступных заданий...');
    const availableTasks = await TaskService.getAvailableTasks(TEST_USER_ID);
    console.log(`✅ Доступных заданий: ${availableTasks.length}`);
    availableTasks.forEach(task => {
      console.log(`   - ${task.title} (${task.reward.type}): ${task.reward.amount}`);
    });

    // Шаг 2: Получаем активные задания
    console.log('\n📋 Шаг 2: Активные задания пользователя...');
    const userTasks = await TaskService.getUserTasks(TEST_USER_ID);
    console.log(`✅ Активных заданий: ${userTasks.length}`);
    userTasks.forEach(task => {
      console.log(`   - ${task.title} (${task.reward.type}): ${task.reward.amount}`);
    });

    // Шаг 3: Проверяем ограничения для каждого типа
    console.log('\n📋 Шаг 3: Проверка ограничений по типам...');
    const templates = TaskTemplateService.getTemplatesByCategory('daily').concat(
      TaskTemplateService.getTemplatesByCategory('video'),
      TaskTemplateService.getTemplatesByCategory('trade')
    );

    for (const template of templates) {
      const canCreate = await TaskService.canCreateTask(TEST_USER_ID, template.id);
      console.log(`   ${template.title}: ${canCreate ? '✅ Доступно' : '❌ Недоступно'}`);
    }

    // Шаг 4: Пытаемся создать еще задания
    console.log('\n📋 Шаг 4: Попытка создания дополнительных заданий...');
    const additionalTasks = await TaskService.getAvailableTasks(TEST_USER_ID);
    console.log(`✅ Дополнительных заданий создано: ${additionalTasks.length}`);

    // Шаг 5: Финальная проверка
    console.log('\n📋 Шаг 5: Финальная проверка...');
    const finalTasks = await TaskService.getUserTasks(TEST_USER_ID);
    console.log(`✅ Итого активных заданий: ${finalTasks.length}`);

    // Проверяем, что нет дубликатов
    const taskTypes = new Set();
    for (const task of finalTasks) {
      if (taskTypes.has(task.taskType)) {
        console.log(`⚠️  Обнаружен дубликат типа задания: ${task.taskType}`);
      } else {
        taskTypes.add(task.taskType);
      }
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testTaskLimits().catch(console.error); 