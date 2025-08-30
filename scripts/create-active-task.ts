import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { TaskService } from '../server/services/taskService';

const createActiveTask = async () => {
  console.log('🎮 Создание активного задания для пользователя...\n');
  
  // Используем ID Артёма Ткачёва
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // Проверяем текущие активные задания
    const currentTasks = await TaskService.getUserTasks(userId);
    console.log(`📋 Текущих активных заданий: ${currentTasks.length}`);
    
    if (currentTasks.length >= 3) {
      console.log('⚠️  Достигнут лимит активных заданий (3)');
      console.log('   Удалите одно из заданий или завершите его');
      return;
    }
    
    // Создаем новое задание из шаблона
    console.log('📝 Создаю новое активное задание...');
    const task = await TaskService.createTaskByTemplateId(userId, 'simple_daily_task');
    
    if (task) {
      console.log('✅ Активное задание создано!');
      console.log('📋 ID:', task.id);
      console.log('📝 Название:', task.title);
      console.log('📊 Прогресс:', task.progress.current, '/', task.progress.total);
      console.log('📈 Статус:', task.status);
      console.log('💰 Награда:', task.reward.amount, task.reward.type);
      console.log('');
      
      // Проверяем обновленный список
      const updatedTasks = await TaskService.getUserTasks(userId);
      console.log(`📋 Теперь активных заданий: ${updatedTasks.length}`);
      
      updatedTasks.forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.title} (${t.status})`);
        console.log(`      Прогресс: ${t.progress.current}/${t.progress.total}`);
      });
      
    } else {
      console.log('❌ Не удалось создать задание');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
};

createActiveTask(); 