import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const cleanupDuplicateTasks = async () => {
  console.log('🧹 Очистка дублирующих заданий...\n');
  
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // Получаем все активные задания
    const activeTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active')
        )
      )
      .orderBy(desc(userTasks.createdAt));
    
    console.log(`📊 Активных заданий: ${activeTasks.length}`);
    
    // Группируем по типу задания
    const taskGroups = new Map<string, typeof activeTasks>();
    
    for (const task of activeTasks) {
      if (!taskGroups.has(task.taskType)) {
        taskGroups.set(task.taskType, []);
      }
      taskGroups.get(task.taskType)!.push(task);
    }
    
    // Находим дублирующие задания
    const duplicatesToRemove: typeof activeTasks = [];
    
    for (const [taskType, tasks] of taskGroups) {
      if (tasks.length > 1) {
        console.log(`⚠️  Найдено ${tasks.length} заданий типа "${taskType}":`);
        
        // Оставляем самое новое задание, остальные удаляем
        const sortedTasks = tasks.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        for (let i = 1; i < sortedTasks.length; i++) {
          duplicatesToRemove.push(sortedTasks[i]);
          console.log(`   🗑️  Удаляем: ${sortedTasks[i].title} (ID: ${sortedTasks[i].id})`);
        }
      }
    }
    
    if (duplicatesToRemove.length === 0) {
      console.log('✅ Дублирующих заданий не найдено');
      return;
    }
    
    // Удаляем дублирующие задания
    console.log(`\n🗑️  Удаляем ${duplicatesToRemove.length} дублирующих заданий...`);
    
    for (const task of duplicatesToRemove) {
      await db.delete(userTasks)
        .where(eq(userTasks.id, task.id));
      console.log(`   ✅ Удалено: ${task.title} (ID: ${task.id})`);
    }
    
    // Проверяем результат
    const remainingTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active')
        )
      );
    
    console.log(`\n📊 Осталось активных заданий: ${remainingTasks.length}`);
    remainingTasks.forEach(task => {
      console.log(`   • ${task.title} (${task.taskType})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при очистке заданий:', error);
  }
};

// Запускаем очистку
cleanupDuplicateTasks().catch(console.error); 