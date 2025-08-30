import { TaskService } from '../server/services/taskService';
import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const checkUserTasks = async () => {
  console.log('🔍 Проверка заданий пользователя...\n');
  
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // Получаем все задания пользователя
    const allTasks = await db.select()
      .from(userTasks)
      .where(eq(userTasks.userId, userId))
      .orderBy(desc(userTasks.createdAt));
    
    console.log(`📊 Всего заданий: ${allTasks.length}`);
    
    // Группируем по статусу
    const activeTasks = allTasks.filter(t => t.status === 'active');
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const expiredTasks = allTasks.filter(t => t.status === 'expired');
    
    console.log(`\n📋 Активных заданий: ${activeTasks.length}`);
    activeTasks.forEach(task => {
      console.log(`   • ${task.title} (${task.taskType})`);
      console.log(`     Прогресс: ${task.progressCurrent || 0}/${task.progressTotal}`);
      console.log(`     Награда: ${task.rewardAmount} ${task.rewardType}`);
      console.log(`     Создано: ${task.createdAt.toISOString()}`);
      console.log('');
    });
    
    console.log(`📋 Завершенных заданий: ${completedTasks.length}`);
    if (completedTasks.length > 0) {
      completedTasks.slice(0, 5).forEach(task => {
        console.log(`   • ${task.title} (${task.taskType})`);
        console.log(`     Завершено: ${task.completedAt?.toISOString()}`);
        console.log('');
      });
    }
    
    console.log(`📋 Истекших заданий: ${expiredTasks.length}`);
    
    // Проверяем возможность создания новых заданий
    console.log('\n🎯 Проверка возможности создания заданий...');
    const canCreateMore = activeTasks.length < 3;
    console.log(`✅ Можно создать еще заданий: ${canCreateMore ? 'Да' : 'Нет'}`);
    
    if (!canCreateMore) {
      console.log('❌ Достигнут лимит активных заданий (3)');
      console.log('   Для создания нового задания нужно:');
      console.log('   - Завершить одно из активных заданий');
      console.log('   - Удалить одно из активных заданий');
      console.log('   - Дождаться истечения одного из заданий');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке заданий:', error);
  }
};

// Запускаем проверку
checkUserTasks().catch(console.error); 