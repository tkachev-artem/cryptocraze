import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function testExistingMixedTask() {
  console.log('🧪 Тестирование существующего смешанного задания...\n');

  // Найдем первого пользователя
  const testUser = await db.select().from(users).limit(1);
  if (!testUser.length) {
    console.log('❌ Нет пользователей');
    return;
  }

  const userId = testUser[0].id;
  console.log(`👤 Пользователь: ${userId}`);

  // Проверим текущие данные пользователя
  const userBefore = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log('💰 Баланс до:', userBefore[0].balance);
  console.log('🪙 Монеты до:', userBefore[0].coins);
  console.log('⚡ Энергия до:', userBefore[0].energyTasksBonus);

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
    
    // Проверим все смешанные задания
    const allMixedTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.rewardType, 'mixed')
        )
      );
    
    console.log(`📊 Всего смешанных заданий: ${allMixedTasks.length}`);
    allMixedTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title} - ${task.status} - ${task.rewardAmount}`);
    });
    return;
  }

  const task = mixedTask[0];
  console.log(`\n📝 Найдено смешанное задание: ${task.title}`);
  console.log(`🎁 Награда: ${task.rewardAmount} ${task.rewardType}`);
  console.log(`📊 Прогресс: ${task.progressCurrent}/${task.progressTotal}`);

  // Выполним задание
  console.log('\n🏃 Выполняем задание...');
  
  const result = await TaskService.updateTaskProgress(task.id, userId, task.progressTotal);
  
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

  // Определим ожидаемые изменения на основе награды
  const rewardAmount = task.rewardAmount;
  let expectedCoins = 0;
  let expectedEnergy = 0;
  let expectedMoney = 0;

  if (rewardAmount.includes('_energy_')) {
    const parts = rewardAmount.split('_');
    expectedEnergy = parseInt(parts[0]);
    
    const afterEnergy = parts.slice(2).join('_');
    if (afterEnergy.includes('_coins')) {
      const coinAmount = afterEnergy.split('_')[0];
      if (coinAmount.includes('K')) {
        expectedCoins = parseInt(coinAmount.replace('K', '')) * 1000;
      } else {
        expectedCoins = parseInt(coinAmount);
      }
    } else if (afterEnergy.includes('_money')) {
      const moneyAmount = afterEnergy.split('_')[0];
      if (moneyAmount.includes('K')) {
        expectedMoney = parseInt(moneyAmount.replace('K', '')) * 1000;
      } else {
        expectedMoney = parseInt(moneyAmount);
      }
    }
  }

  console.log('\n🎯 Ожидаемые изменения:');
  console.log('💰 Ожидаемое изменение баланса:', expectedMoney);
  console.log('🪙 Ожидаемое изменение монет:', expectedCoins);
  console.log('⚡ Ожидаемое изменение энергии:', expectedEnergy);

  // Проверим результат
  const isCorrect = (expectedMoney === 0 || Math.abs(balanceChange - expectedMoney) < 0.01) &&
                   (expectedCoins === 0 || coinsChange === expectedCoins) &&
                   energyChange === expectedEnergy;

  if (isCorrect) {
    console.log('\n✅ Смешанные награды работают правильно!');
  } else {
    console.log('\n❌ Смешанные награды работают неправильно!');
  }
}

testExistingMixedTask().catch(console.error); 