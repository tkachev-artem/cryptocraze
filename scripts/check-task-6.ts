import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { eq } from 'drizzle-orm';

const checkTask6 = async () => {
  console.log('🔍 Проверка задания с ID 6...\n');
  
  try {
    // Проверяем задание с ID 6
    const task = await db.select().from(userTasks).where(eq(userTasks.id, 6));
    
    if (task.length > 0) {
      const t = task[0];
      console.log('✅ Задание найдено:');
      console.log('📋 ID:', t.id);
      console.log('👤 Пользователь:', t.userId);
      console.log('📝 Название:', t.title);
      console.log('📊 Прогресс:', t.progressCurrent, '/', t.progressTotal);
      console.log('📈 Статус:', t.status);
      console.log('💰 Награда:', t.rewardAmount, t.rewardType);
      console.log('📅 Создано:', t.createdAt);
      console.log('⏰ Истекает:', t.expiresAt);
    } else {
      console.log('❌ Задание с ID 6 не найдено');
    }
    
    // Показываем все активные задания
    const activeTasks = await db.select().from(userTasks).where(eq(userTasks.status, 'active'));
    console.log('\n📋 Все активные задания:');
    activeTasks.forEach((t, index) => {
      console.log(`   ${index + 1}. ID: ${t.id} - ${t.title} (${t.status})`);
      console.log(`      Пользователь: ${t.userId}`);
      console.log(`      Прогресс: ${t.progressCurrent}/${t.progressTotal}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
};

checkTask6(); 