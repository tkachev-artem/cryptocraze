import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function createMixedTaskForUser() {
  console.log('🧪 Создание смешанного задания для пользователя...\n');

  // Найдем первого пользователя
  const testUser = await db.select().from(users).limit(1);
  if (!testUser.length) {
    console.log('❌ Нет пользователей');
    return;
  }

  const userId = testUser[0].id;
  console.log(`👤 Пользователь: ${userId}`);

  // Проверим количество активных заданий
  const activeTasks = await db.select()
    .from(userTasks)
    .where(
      eq(userTasks.userId, userId)
    );

  console.log(`📊 Всего заданий у пользователя: ${activeTasks.length}`);

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

  console.log('✅ Тестовое смешанное задание создано!');
  console.log(`📝 ID: ${testTask.id}`);
  console.log(`🎁 Тип награды: ${testTask.reward.type}`);
  console.log(`🎁 Сумма награды: ${testTask.reward.amount}`);

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

  return testTask;
}

createMixedTaskForUser().catch(console.error); 