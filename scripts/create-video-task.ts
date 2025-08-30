import { TaskService } from '../server/services/taskService';

const createVideoTask = async () => {
  console.log('🎬 Создание видео-задания для пользователя...\n');
  
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // Проверяем текущие активные задания
    const currentTasks = await TaskService.getUserTasks(userId);
    console.log(`📋 Текущих активных заданий: ${currentTasks.length}`);
    
    if (currentTasks.length >= 3) {
      console.log('⚠️  Достигнут лимит активных заданий (3)');
      return;
    }
    
    // Создаем видео-задание
    console.log('📝 Создаю видео-задание...');
    const task = await TaskService.createTaskByTemplateId(userId, 'video_bonus_task');
    
    if (task) {
      console.log('✅ Видео-задание создано!');
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
        console.log(`      Награда: ${t.reward.amount} ${t.reward.type}`);
      });
      
    } else {
      console.log('❌ Не удалось создать видео-задание');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
};

createVideoTask(); 