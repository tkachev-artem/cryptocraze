import { TaskService } from '../server/services/taskService';
import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const testReplaceTask = async () => {
  console.log('🔄 Тестирование замены заданий...\n');
  
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // Получаем активные задания
    const activeTasks = await db.select()
      .from(userTasks)
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.status, 'active')
        )
      );
    
    console.log(`📊 Активных заданий: ${activeTasks.length}`);
    
    if (activeTasks.length === 0) {
      console.log('❌ Нет активных заданий для замены');
      return;
    }
    
    // Берем первое задание для замены
    const taskToReplace = activeTasks[0];
    console.log(`\n🎯 Тестируем замену задания: ${taskToReplace.title} (ID: ${taskToReplace.id})`);
    
    // Тестируем замену
    console.log('\n📋 Шаг 1: Пытаемся заменить задание...');
    
    // Сначала получаем текущее задание
    const currentTask = await TaskService.getTaskById(taskToReplace.id, userId);
    if (!currentTask) {
      console.log('❌ Задание не найдено');
      return;
    }
    
    console.log(`✅ Текущее задание: ${currentTask.title}`);
    
    // Пытаемся создать новое задание
    const newTask = await TaskService.createRandomTask(userId);
    
    if (newTask) {
      console.log(`✅ Новое задание создано: ${newTask.title}`);
      
      // Удаляем старое задание
      const deleted = await TaskService.deleteTask(taskToReplace.id, userId);
      console.log(`🗑️  Старое задание удалено: ${deleted ? 'Да' : 'Нет'}`);
      
      console.log('\n🎉 Замена выполнена успешно!');
      console.log(`   Старое: ${currentTask.title} (ID: ${currentTask.id})`);
      console.log(`   Новое: ${newTask.title} (ID: ${newTask.id})`);
    } else {
      console.log('❌ Не удалось создать новое задание (лимиты/cooldown)');
      console.log('✅ Возвращаем то же задание');
      console.log(`   Задание: ${currentTask.title} (ID: ${currentTask.id})`);
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
      console.log(`   • ${task.title} (ID: ${task.id})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании замены:', error);
  }
};

// Запускаем тест
testReplaceTask().catch(console.error); 