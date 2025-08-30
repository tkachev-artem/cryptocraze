import { db } from '../server/db';
import { deals } from '../shared/schema';
import { eq, and, lt } from 'drizzle-orm';

async function checkExpiredDeals() {
  console.log('🔍 Проверка сделок старше 48 часов...\n');
  
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    console.log(`Текущее время: ${now.toISOString()}`);
    console.log(`Отсечка (48 часов назад): ${cutoff.toISOString()}`);
    console.log('');
    
    // Получаем все открытые сделки
    const allOpenDeals = await db.select().from(deals)
      .where(eq(deals.status, 'open'));
    
    console.log(`Всего открытых сделок: ${allOpenDeals.length}`);
    
    if (allOpenDeals.length > 0) {
      console.log('\n📋 Открытые сделки:');
      allOpenDeals.forEach((deal, index) => {
        const openedAt = new Date(deal.openedAt);
        const hoursOld = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
        
        console.log(`${index + 1}. ID: ${deal.id}`);
        console.log(`   Символ: ${deal.symbol}`);
        console.log(`   Открыта: ${openedAt.toISOString()}`);
        console.log(`   Возраст: ${hoursOld.toFixed(2)} часов`);
        console.log(`   Старше 48ч: ${hoursOld > 48 ? 'ДА' : 'НЕТ'}`);
        console.log('');
      });
    }
    
    // Получаем сделки старше 48 часов
    const expiredDeals = await db.select().from(deals)
      .where(and(eq(deals.status, 'open'), lt(deals.openedAt, cutoff)));
    
    console.log(`\n⏰ Сделок старше 48 часов: ${expiredDeals.length}`);
    
    if (expiredDeals.length > 0) {
      console.log('\n🚨 Сделки, которые должны быть закрыты:');
      expiredDeals.forEach((deal, index) => {
        const openedAt = new Date(deal.openedAt);
        const hoursOld = (now.getTime() - openedAt.getTime()) / (1000 * 60 * 60);
        
        console.log(`${index + 1}. ID: ${deal.id}`);
        console.log(`   Пользователь: ${deal.userId}`);
        console.log(`   Символ: ${deal.symbol}`);
        console.log(`   Открыта: ${openedAt.toISOString()}`);
        console.log(`   Возраст: ${hoursOld.toFixed(2)} часов`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке сделок:', error);
  }
}

async function main() {
  await checkExpiredDeals();
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
}); 