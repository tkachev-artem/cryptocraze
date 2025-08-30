import { db } from '../server/db';
import { userTasks, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { TaskService } from '../server/services/taskService';

async function testMoneyMixedReward() {
  console.log('🧪 Тестирование смешанной награды с деньгами...\n');

  // Найдем пользователя с ID из логов
  const userId = '111907067370663926621';
  console.log(`👤 Пользователь: ${userId}`);

  // Проверим данные в БД до выполнения задания
  const userBefore = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userBefore.length) {
    console.log('❌ Пользователь не найден');
    return;
  }

  console.log('💰 Баланс в БД до:', userBefore[0].balance);
  console.log('🪙 Монеты в БД до:', userBefore[0].coins);
  console.log('⚡ Энергия в БД до:', userBefore[0].energyTasksBonus);

  // Найдем активное смешанное задание с деньгами
  const mixedTask = await db.select()
    .from(userTasks)
    .where(
      and(
        eq(userTasks.userId, userId),
        eq(userTasks.status, 'active'),
        eq(userTasks.rewardType, 'mixed'),
        eq(userTasks.rewardAmount, '15_energy_1K_money')
      )
    )
    .limit(1);

  if (!mixedTask.length) {
    console.log('❌ Нет активных смешанных заданий с деньгами');
    
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

  // Протестируем парсинг награды
  console.log('\n🔍 Тестируем парсинг награды...');
  const rewardAmount = task.rewardAmount;
  
  if (rewardAmount.includes('_energy_')) {
    const parts = rewardAmount.split('_');
    console.log('📊 Части награды:', parts);
    
    const energyAmount = parseInt(parts[0]);
    console.log('⚡ Энергия:', energyAmount);
    
    const afterEnergy = parts.slice(2).join('_');
    console.log('📊 После энергии:', afterEnergy);
    
    if (afterEnergy.includes('_money')) {
      console.log('💰 Тип: деньги');
      const moneyAmount = afterEnergy.split('_')[0];
      console.log('💰 Сумма денег:', moneyAmount);
    } else if (afterEnergy.includes('_coins')) {
      console.log('🪙 Тип: монеты');
      const coinAmount = afterEnergy.split('_')[0];
      console.log('🪙 Сумма монет:', coinAmount);
    } else {
      console.log('❌ Неизвестный тип:', afterEnergy);
    }
  }

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
  const expectedMoney = 1000;
  const expectedEnergy = 15;
  const expectedCoins = 0;

  console.log('\n🎯 Ожидаемые изменения:');
  console.log('💰 Ожидаемое изменение баланса:', expectedMoney);
  console.log('🪙 Ожидаемое изменение монет:', expectedCoins);
  console.log('⚡ Ожидаемое изменение энергии:', expectedEnergy);

  // Проверим результат
  const isCorrect = Math.abs(balanceChange - expectedMoney) < 0.01 &&
                   coinsChange === expectedCoins &&
                   energyChange === expectedEnergy;

  if (isCorrect) {
    console.log('\n✅ Смешанные награды с деньгами работают правильно!');
  } else {
    console.log('\n❌ Смешанные награды с деньгами работают неправильно!');
    
    if (Math.abs(balanceChange - expectedMoney) >= 0.01) {
      console.log(`❌ Баланс: ожидалось ${expectedMoney}, получено ${balanceChange}`);
    }
    if (coinsChange !== expectedCoins) {
      console.log(`❌ Монеты: ожидалось ${expectedCoins}, получено ${coinsChange}`);
    }
    if (energyChange !== expectedEnergy) {
      console.log(`❌ Энергия: ожидалось ${expectedEnergy}, получено ${energyChange}`);
    }
  }
}

testMoneyMixedReward().catch(console.error); 