import { TaskService } from '../server/services/taskService';
import { TaskTemplateService } from '../server/services/taskTemplates';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = 'test-user-new-system';

async function createTestUser() {
  try {
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    if (existingUser.length === 0) {
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: 'test-new-system@example.com',
        firstName: 'Test',
        lastName: 'NewSystem',
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

async function testNewTaskSystem() {
  console.log('🎮 Тестирование новой системы заданий...\n');

  try {
    // Создаем тестового пользователя
    await createTestUser();

    // Шаг 1: Проверяем новые шаблоны
    console.log('📋 Шаг 1: Проверка новых шаблонов...');
    const templates = TaskTemplateService.getTemplatesByCategory('daily').concat(
      TaskTemplateService.getTemplatesByCategory('video'),
      TaskTemplateService.getTemplatesByCategory('trade')
    );
    console.log(`✅ Найдено шаблонов: ${templates.length}`);
    templates.forEach(template => {
      console.log(`   - ${template.title}: ${template.rewardAmount} ${template.rewardType}`);
      console.log(`     Cooldown: ${template.cooldownMinutes} мин, MaxPerDay: ${template.maxPerDay}`);
    });

    // Шаг 2: Проверяем доступные задания
    console.log('\n📋 Шаг 2: Проверка доступных заданий...');
    const availableTasks = await TaskService.getAvailableTasks(TEST_USER_ID);
    console.log(`✅ Доступных заданий: ${availableTasks.length}`);
    availableTasks.forEach(task => {
      console.log(`   - ${task.title}: ${task.reward.amount} ${task.reward.type}`);
    });

    // Шаг 3: Получаем задания пользователя
    console.log('\n📋 Шаг 3: Получение заданий пользователя...');
    const userTasks = await TaskService.getUserTasks(TEST_USER_ID);
    console.log(`✅ Активных заданий: ${userTasks.length}`);
    userTasks.forEach(task => {
      console.log(`   - ${task.title}: ${task.reward.amount} ${task.reward.type}`);
    });

    // Шаг 4: Тестируем ограничения времени
    console.log('\n📋 Шаг 4: Тестирование ограничений времени...');
    for (const template of templates) {
      const canCreate = await TaskService.canCreateTask(TEST_USER_ID, template.id);
      console.log(`   ${template.title}: ${canCreate ? '✅ Доступно' : '❌ Недоступно'}`);
    }

    // Шаг 5: Тестируем выполнение задания
    if (userTasks.length > 0) {
      console.log('\n📋 Шаг 5: Тестирование выполнения задания...');
      const taskToComplete = userTasks[0];
      const taskId = parseInt(taskToComplete.id);
      
      const result = await TaskService.updateTaskProgress(taskId, TEST_USER_ID, taskToComplete.progress.total);
      
      if (result) {
        console.log(`✅ Задание выполнено: ${result.task.title}`);
        console.log(`   Статус: ${result.task.status}`);
        if (result.newTask) {
          console.log(`   Новое задание: ${result.newTask.title}`);
        }
      } else {
        console.log('❌ Не удалось выполнить задание');
      }
    }

    console.log('\n🎉 Тестирование завершено успешно!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

// Запускаем тест
testNewTaskSystem().catch(console.error); 