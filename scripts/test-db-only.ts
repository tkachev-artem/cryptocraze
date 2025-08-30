import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function testDbOnly() {
  console.log('🧪 Тестирование только БД...\n');

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
    console.log('\n✅ Смешанные награды работают правильно в БД!');
  } else {
    console.log('\n❌ Смешанные награды работают неправильно в БД!');
  }

  // Проверим, что данные действительно сохранились в БД
  console.log('\n🔍 Проверяем сохранение в БД...');
  
  // Подождем немного и проверим еще раз
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const userFinal = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  console.log('💰 Финальный баланс в БД:', userFinal[0].balance);
  console.log('🪙 Финальные монеты в БД:', userFinal[0].coins);
  console.log('⚡ Финальная энергия в БД:', userFinal[0].energyTasksBonus);

  const finalBalanceMatch = userFinal[0].balance === userAfter[0].balance;
  const finalCoinsMatch = userFinal[0].coins === userAfter[0].coins;
  const finalEnergyMatch = userFinal[0].energyTasksBonus === userAfter[0].energyTasksBonus;

  console.log('\n🔍 Проверка сохранения:');
  console.log('💰 Баланс сохранился:', finalBalanceMatch);
  console.log('🪙 Монеты сохранились:', finalCoinsMatch);
  console.log('⚡ Энергия сохранилась:', finalEnergyMatch);

  if (finalBalanceMatch && finalCoinsMatch && finalEnergyMatch) {
    console.log('\n✅ Данные стабильно сохранились в БД!');
  } else {
    console.log('\n❌ Данные не сохранились стабильно в БД!');
  }
}

testDbOnly().catch(console.error); 