import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function createMoneyTask() {
  console.log('🧪 Создание задания с деньгами...\n');

  // Найдем пользователя с ID из логов
  const userId = '111907067370663926621';
  console.log(`👤 Пользователь: ${userId}`);

  // Проверим количество активных заданий
  const activeTasks = await db.select()
    .from(userTasks)
    .where(
      eq(userTasks.userId, userId)
    );

  console.log(`📊 Всего заданий у пользователя: ${activeTasks.length}`);

  // Создадим тестовое смешанное задание с деньгами
  console.log('\n📝 Создаем тестовое смешанное задание с деньгами...');
  
  const testTask = await TaskService.createTask(userId, {
    taskType: 'test_mixed_money',
    title: 'Тест смешанной награды (деньги)',
    description: 'Тестовое задание для проверки смешанных наград с деньгами',
    rewardType: 'mixed',
    rewardAmount: '15_energy_1K_money',
    progressTotal: 1,
    icon: '/trials/test.svg',
    expiresInHours: 1
  });

  if (!testTask) {
    console.log('❌ Не удалось создать тестовое задание');
    return;
  }

  console.log('✅ Тестовое смешанное задание с деньгами создано!');
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

createMoneyTask().catch(console.error); 