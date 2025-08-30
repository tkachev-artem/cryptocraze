import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyAdPerformanceMigration() {
  console.log('📊 Применение миграции ad_performance_metrics...');
  
  try {
    const migrationPath = path.join(process.cwd(), 'drizzle', '0011_add_ad_performance_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Ad Performance миграция применена успешно!');
    console.log('📊 Таблица ad_performance_metrics создана с тестовыми данными');
    
    // Проверим созданные данные
    const result = await db.execute(sql.raw(`
      SELECT date, total_ad_spend, cpi, cpa, roas, total_installs, total_conversions
      FROM ad_performance_metrics 
      ORDER BY date DESC LIMIT 3;
    `));
    
    console.log('\n📈 Примеры данных:');
    result.rows.forEach((row: any) => {
      console.log(`   ${row.date.toDateString()}: CPI=$${row.cpi}, CPA=$${row.cpa}, ROAS=${row.roas}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
  }
}

applyAdPerformanceMigration();