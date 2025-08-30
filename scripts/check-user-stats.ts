import { storage } from '../server/storage';

const userId = '111907067370663926621';

async function checkUserStats() {
  console.log('📊 Проверка статистики пользователя...\n');
  
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }

    console.log('👤 Данные пользователя:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Баланс: ${user.balance}`);
    console.log(`   Свободный баланс: ${user.freeBalance}`);
    
    console.log('\n📈 Статистика торговли:');
    console.log(`   Количество сделок: ${user.tradesCount || 0}`);
    console.log(`   Общий объем торгов: ${user.totalTradesVolume || 0}`);
    console.log(`   Процент успешных: ${user.successfulTradesPercentage || 0}%`);
    console.log(`   Максимальный профит: ${user.maxProfit || 0}`);
    console.log(`   Максимальный убыток: ${user.maxLoss || 0}`);
    console.log(`   Средняя сумма сделки: ${user.averageTradeAmount || 0}`);
    
    // Проверяем количество сделок в таблице deals
    const deals = await storage.getUserDeals(userId);
    console.log(`\n🔍 Проверка сделок в таблице deals:`);
    console.log(`   Всего сделок в deals: ${deals.length}`);
    console.log(`   Открытых: ${deals.filter(d => d.status === 'open').length}`);
    console.log(`   Закрытых: ${deals.filter(d => d.status === 'closed').length}`);
    
    if (deals.length !== (user.tradesCount || 0)) {
      console.log(`\n⚠️  ВНИМАНИЕ: Несоответствие!`);
      console.log(`   tradesCount в users: ${user.tradesCount || 0}`);
      console.log(`   Фактическое количество сделок: ${deals.length}`);
    } else {
      console.log(`\n✅ Счетчик сделок корректен!`);
    }

  } catch (error) {
    console.error('❌ Ошибка при получении статистики:', error);
  }
}

async function main() {
  await checkUserStats();
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
}); 