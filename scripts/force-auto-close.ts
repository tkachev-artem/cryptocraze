import { db } from '../server/db';
import { deals } from '../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { dealsService } from '../server/services/dealsService';

async function forceAutoClose() {
  console.log('🔧 Принудительное автозакрытие сделок старше 48 часов...\n');
  
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    console.log(`Текущее время: ${now.toISOString()}`);
    console.log(`Отсечка (48 часов назад): ${cutoff.toISOString()}`);
    console.log('');
    
    // Получаем сделки старше 48 часов
    const expiredDeals = await db.select().from(deals)
      .where(and(eq(deals.status, 'open'), lt(deals.openedAt, cutoff)));
    
    console.log(`Найдено сделок старше 48 часов: ${expiredDeals.length}`);
    
    if (expiredDeals.length === 0) {
      console.log('✅ Нет сделок для автозакрытия');
      return;
    }
    
    // Закрываем каждую сделку
    for (const deal of expiredDeals) {
      try {
        console.log(`\n🔄 Закрываем сделку #${deal.id}...`);
        const result = await dealsService.closeDeal({ 
          userId: deal.userId, 
          dealId: deal.id 
        });
        
        console.log(`✅ Сделка #${deal.id} закрыта успешно:`);
        console.log(`   Цена закрытия: ${result.closePrice}`);
        console.log(`   Прибыль: ${result.profit}`);
        console.log(`   Время закрытия: ${result.closedAt}`);
        
      } catch (error) {
        console.error(`❌ Ошибка при закрытии сделки #${deal.id}:`, error);
      }
    }
    
    console.log('\n✅ Автозакрытие завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка при автозакрытии:', error);
  }
}

async function main() {
  await forceAutoClose();
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
}); 