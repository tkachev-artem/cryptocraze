import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function testApiUserEndpoint() {
  console.log('🧪 Тестирование API /auth/user...\n');

  // Найдем первого пользователя
  const testUser = await db.select().from(users).limit(1);
  if (!testUser.length) {
    console.log('❌ Нет пользователей');
    return;
  }

  const userId = testUser[0].id;
  console.log(`👤 Пользователь: ${userId}`);

  // Проверим данные в БД до выполнения задания
  const userBefore = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log('💰 Баланс в БД до:', userBefore[0].balance);
  console.log('🪙 Монеты в БД до:', userBefore[0].coins);
  console.log('⚡ Энергия в БД до:', userBefore[0].energyTasksBonus);

  // Найдем активное смешанное задание
  const mixedTask = await db.select()
    .from(userTasks)
    .where(
      and(
        eq(userTasks.userId, userId),
        eq(userTasks.status, 'active'),
        eq(userTasks.rewardType, 'mixed')
      )
    )
    .limit(1);

  if (!mixedTask.length) {
    console.log('❌ Нет активных смешанных заданий');
    return;
  }

  const task = mixedTask[0];
  console.log(`\n📝 Найдено смешанное задание: ${task.title}`);
  console.log(`🎁 Награда: ${task.rewardAmount} ${task.rewardType}`);

  // Выполним задание
  console.log('\n🏃 Выполняем задание...');
  
  const result = await TaskService.updateTaskProgress(task.id, userId, task.progressTotal);
  
  if (!result) {
    console.log('❌ Не удалось выполнить задание');
    return;
  }

  console.log('✅ Задание выполнено!');

  // Проверим данные в БД после выполнения задания
  const userAfter = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log('\n📊 Данные в БД после выполнения:');
  console.log('💰 Баланс в БД после:', userAfter[0].balance);
  console.log('🪙 Монеты в БД после:', userAfter[0].coins);
  console.log('⚡ Энергия в БД после:', userAfter[0].energyTasksBonus);

  // Проверим изменения в БД
  const balanceChange = parseFloat(userAfter[0].balance || '0') - parseFloat(userBefore[0].balance || '0');
  const coinsChange = (userAfter[0].coins || 0) - (userBefore[0].coins || 0);
  const energyChange = (userAfter[0].energyTasksBonus || 0) - (userBefore[0].energyTasksBonus || 0);

  console.log('\n📈 Изменения в БД:');
  console.log('💰 Изменение баланса:', balanceChange);
  console.log('🪙 Изменение монет:', coinsChange);
  console.log('⚡ Изменение энергии:', energyChange);

  // Теперь проверим, что возвращает API /auth/user
  console.log('\n🌐 Проверяем API /auth/user...');
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/user', {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=s%3A111907067370663926621.abc123' // Пример cookie
      }
    });

    if (response.ok) {
      const apiUser = await response.json();
      console.log('✅ API /auth/user ответил успешно');
      console.log('💰 Баланс из API:', apiUser.balance);
      console.log('🪙 Монеты из API:', apiUser.coins);
      console.log('⚡ Энергия из API:', apiUser.energyTasksBonus);

      // Сравним с данными в БД
      const apiBalanceMatch = apiUser.balance === userAfter[0].balance;
      const apiCoinsMatch = apiUser.coins === userAfter[0].coins;
      const apiEnergyMatch = apiUser.energyTasksBonus === userAfter[0].energyTasksBonus;

      console.log('\n🔍 Сравнение API с БД:');
      console.log('💰 Баланс совпадает:', apiBalanceMatch);
      console.log('🪙 Монеты совпадают:', apiCoinsMatch);
      console.log('⚡ Энергия совпадает:', apiEnergyMatch);

      if (apiBalanceMatch && apiCoinsMatch && apiEnergyMatch) {
        console.log('\n✅ API /auth/user возвращает актуальные данные!');
      } else {
        console.log('\n❌ API /auth/user возвращает устаревшие данные!');
      }
    } else {
      console.log('❌ API /auth/user вернул ошибку:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Ошибка при запросе к API /auth/user:', error);
  }
}

testApiUserEndpoint().catch(console.error); 