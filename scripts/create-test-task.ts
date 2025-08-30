import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { TaskService } from '../server/services/taskService';

const createTestTask = async () => {
  console.log('🎮 Создание тестового задания для пользователя...\n');
  
  // Используем ID Артёма Ткачёва как тестового пользователя
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    console.log('📝 Создаю задание из шаблона...');
    
    // Создаем задание из шаблона
    const task = await TaskService.createTaskByTemplateId(userId, 'simple_daily_task');
    
    if (task) {
      console.log('✅ Задание успешно создано!');
      console.log('📋 ID:', task.id);
      console.log('📝 Название:', task.title);
      console.log('📄 Описание:', task.description);
      console.log('💰 Награда:', task.reward.amount, task.reward.type);
      console.log('📊 Прогресс:', task.progress.current, '/', task.progress.total);
      console.log('📈 Статус:', task.status);
      console.log('🎨 Иконка:', task.icon);
      console.log('');
      
      console.log('🎯 Теперь можно протестировать:');
      console.log('   GET /api/tasks - получить задания пользователя');
      console.log('   POST /api/tasks/{taskId}/progress - обновить прогресс');
      console.log('   DELETE /api/tasks/{taskId} - удалить задание');
      console.log('');
      
      console.log('📊 Для просмотра всех заданий пользователя:');
      console.log('   GET /api/tasks');
      
    } else {
      console.log('⚠️  Не удалось создать задание');
      console.log('   Возможные причины:');
      console.log('   - Достигнут лимит активных заданий (3)');
      console.log('   - Шаблон не найден');
      console.log('   - Ошибка в данных');
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания задания:', error);
  }
  
  process.exit(0);
};

createTestTask(); 