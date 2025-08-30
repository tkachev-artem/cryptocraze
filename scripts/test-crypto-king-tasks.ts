import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { dealsService } from '../server/services/dealsService';
import { unifiedPriceService } from '../server/services/unifiedPriceService';

const userId = '111907067370663926621';

async function testCryptoKingTasks() {
  console.log('🔍 Проверяем задания "Крипто король" для пользователя:', userId);
  
  try {
    // Получаем все активные задания "Крипто король"
    const cryptoKingTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.taskType, 'crypto_king'),
          eq(userTasks.status, 'active')
        )
      );

    console.log(`\n📊 Найдено активных заданий "Крипто король": ${cryptoKingTasks.length}`);
    
    if (cryptoKingTasks.length === 0) {
      console.log('❌ Нет активных заданий "Крипто король"');
      return;
    }

    // Показываем детали каждого задания
    for (const task of cryptoKingTasks) {
      console.log(`\n🎯 Задание ID: ${task.id}`);
      console.log(`   - Заголовок: ${task.title}`);
      console.log(`   - Прогресс: ${task.progressCurrent}/${task.progressTotal}`);
      console.log(`   - Статус: ${task.status}`);
      console.log(`   - Создано: ${task.createdAt}`);
      
      // 1) Прямая симуляция прибыли задания (юнит-тест прогресса без зависимости от рынка)
      console.log('   - Симулируем начисление прибыли в задание: +150, затем +900');
      await dealsService.updateCryptoKingTasks(userId, 150);
      await dealsService.updateCryptoKingTasks(userId, 900); // суммарно 1050, должно капнуться в 1000
      console.log('   - Симуляция начисления прогресса выполнена');

      // 2) Также откроем и закроем реальную сделку (может быть отрицательной), просто как интеграционный прогон
      console.log('   - Дополнительно открываем и закрываем реальную сделку для интеграционного лога...');
      const symbol = 'BTCUSDT';
      await unifiedPriceService.addPair(symbol);
      const open = await dealsService.openDeal({
        userId,
        symbol,
        direction: 'up',
        amount: 50,
        multiplier: 5
      });
      await new Promise(r => setTimeout(r, 1000));
      const res = await dealsService.closeDeal({ userId, dealId: open.id });
      console.log(`   - Реальная сделка закрыта, прибыль: ${res.profit}`);
    }

    // Получаем все задания пользователя для сравнения
    const allTasks = await db.select()
      .from(userTasks)
      .where(eq(userTasks.userId, userId));

    console.log(`\n📋 Всего заданий у пользователя: ${allTasks.length}`);
    
    const activeTasks = allTasks.filter(task => task.status === 'active');
    console.log(`📋 Активных заданий: ${activeTasks.length}`);
    
    activeTasks.forEach(task => {
      console.log(`   - ${task.title}: ${task.progressCurrent}/${task.progressTotal} (${task.taskType})`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке заданий:', error);
  }
}

// Запускаем тест
testCryptoKingTasks()
  .then(() => {
    console.log('\n✅ Тест завершен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка в тесте:', error);
    process.exit(1);
  }); 