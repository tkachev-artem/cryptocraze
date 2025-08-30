import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function applyBiMigration() {
  try {
    console.log('🔄 Применение BI analytics миграции...');
    
    // Читаем SQL файл миграции
    const migrationPath = path.join(process.cwd(), 'drizzle', '0010_add_bi_analytics_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Выполняем SQL
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ BI analytics миграция применена успешно!');
    
    // Проверяем созданные таблицы
    const result = await db.execute(sql.raw(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND (tablename LIKE '%analytics%' OR tablename LIKE '%metrics%' OR tablename LIKE '%cohort%')
      ORDER BY tablename;
    `));
    
    console.log('\n📊 Созданные BI таблицы:');
    result.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.tablename}`);
    });
    
    console.log('\n🚀 Теперь можно создавать тестовые данные!');
    
  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error);
  }
}

applyBiMigration();