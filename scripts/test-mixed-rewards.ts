import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function testMixedRewards() {
  console.log('🧪 Тестирование смешанных наград...\n');

  // Найдем первого пользователя для тестирования
  const testUser = await db.select().from(users).limit(1);
  if (!testUser.length) {
    console.log('❌ Нет пользователей для тестирования');
    return;
  }

  const userId = testUser[0].id;
  console.log(`👤 Тестируем с пользователем: ${userId}`);

  // Проверим текущие данные пользователя
  const userBefore = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log('💰 Баланс до:', userBefore[0].balance);
  console.log('🪙 Монеты до:', userBefore[0].coins);
  console.log('⚡ Энергия до:', userBefore[0].energyTasksBonus);

  // Создадим тестовое задание с смешанной наградой
  console.log('\n📝 Создаем тестовое задание с наградой 15 энергии + 1K монет...');
  
  const testTask = await TaskService.createTask(userId, {
    taskType: 'test_mixed',
    title: 'Тест смешанной награды',
    description: 'Тестовое задание для проверки смешанных наград',
    rewardType: 'mixed',
    rewardAmount: '15_energy_1K_coins',
    progressTotal: 1,
    icon: '/trials/test.svg',
    expiresInHours: 1
  });

  if (!testTask) {
    console.log('❌ Не удалось создать тестовое задание');
    return;
  }

  console.log('✅ Тестовое задание создано:', testTask.id);
  console.log('🎁 Тип награды:', testTask.reward.type);
  console.log('🎁 Сумма награды:', testTask.reward.amount);

  // Выполним задание
  console.log('\n🏃 Выполняем задание...');
  
  const result = await TaskService.updateTaskProgress(parseInt(testTask.id), userId, 1);
  
  if (!result) {
    console.log('❌ Не удалось выполнить задание');
    return;
  }

  console.log('✅ Задание выполнено!');
  console.log('🎁 Награда выдана:', result.task.reward.type, result.task.reward.amount);

  // Проверим обновленные данные пользователя
  const userAfter = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log('\n📊 Результаты:');
  console.log('💰 Баланс после:', userAfter[0].balance);
  console.log('🪙 Монеты после:', userAfter[0].coins);
  console.log('⚡ Энергия после:', userAfter[0].energyTasksBonus);

  // Проверим изменения
  const balanceChange = parseFloat(userAfter[0].balance || '0') - parseFloat(userBefore[0].balance || '0');
  const coinsChange = (userAfter[0].coins || 0) - (userBefore[0].coins || 0);
  const energyChange = (userAfter[0].energyTasksBonus || 0) - (userBefore[0].energyTasksBonus || 0);

  console.log('\n📈 Изменения:');
  console.log('💰 Изменение баланса:', balanceChange);
  console.log('🪙 Изменение монет:', coinsChange);
  console.log('⚡ Изменение энергии:', energyChange);

  if (coinsChange === 1000 && energyChange === 15) {
    console.log('\n✅ Смешанные награды работают правильно!');
  } else {
    console.log('\n❌ Смешанные награды работают неправильно!');
    console.log('Ожидалось: +1000 монет, +15 энергии');
    console.log('Получено:', `+${coinsChange} монет, +${energyChange} энергии`);
  }

  // Удалим тестовое задание
  await db.delete(userTasks).where(eq(userTasks.id, parseInt(testTask.id)));
  console.log('\n🧹 Тестовое задание удалено');
}

// Запускаем тест
testMixedRewards().catch(console.error); 