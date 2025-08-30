import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function createTestMixedTask() {
  console.log('🧪 Создание тестового смешанного задания...\n');

  // Найдем первого пользователя
  const testUser = await db.select().from(users).limit(1);
  if (!testUser.length) {
    console.log('❌ Нет пользователей');
    return;
  }

  const userId = testUser[0].id;
  console.log(`👤 Пользователь: ${userId}`);

  // Удалим одно из завершенных смешанных заданий, чтобы освободить место
  const completedMixedTask = await db.select()
    .from(userTasks)
    .where(
      and(
        eq(userTasks.userId, userId),
        eq(userTasks.status, 'completed'),
        eq(userTasks.rewardType, 'mixed')
      )
    )
    .limit(1);

  if (completedMixedTask.length > 0) {
    await db.delete(userTasks).where(eq(userTasks.id, completedMixedTask[0].id));
    console.log(`🗑️ Удалено завершенное задание: ${completedMixedTask[0].title}`);
  }

  // Проверим количество активных заданий
  const activeTasks = await db.select()
    .from(userTasks)
    .where(
      and(
        eq(userTasks.userId, userId),
        eq(userTasks.status, 'active')
      )
    );

  console.log(`📊 Активных заданий: ${activeTasks.length}`);

  if (activeTasks.length >= 3) {
    console.log('❌ Достигнут лимит активных заданий (3)');
    console.log('Удалите одно из активных заданий вручную');
    return;
  }

  // Создадим тестовое смешанное задание
  console.log('\n📝 Создаем тестовое смешанное задание...');
  
  const testTask = await TaskService.createTask(userId, {
    taskType: 'test_mixed_coins',
    title: 'Тест смешанной награды (монеты)',
    description: 'Тестовое задание для проверки смешанных наград с монетами',
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

  console.log('✅ Тестовое задание создано!');
  console.log(`📝 ID: ${testTask.id}`);
  console.log(`🎁 Тип награды: ${testTask.reward.type}`);
  console.log(`🎁 Сумма награды: ${testTask.reward.amount}`);
  console.log(`📊 Прогресс: ${testTask.progress.current}/${testTask.progress.total}`);

  // Проверим, что задание сохранилось в БД
  const savedTask = await db.select()
    .from(userTasks)
    .where(eq(userTasks.id, parseInt(testTask.id)))
    .limit(1);

  if (savedTask.length > 0) {
    console.log('\n✅ Задание сохранено в БД:');
    console.log(`   Тип: ${savedTask[0].rewardType}`);
    console.log(`   Награда: ${savedTask[0].rewardAmount}`);
    console.log(`   Статус: ${savedTask[0].status}`);
  } else {
    console.log('\n❌ Задание не найдено в БД');
  }
}

createTestMixedTask().catch(console.error); 