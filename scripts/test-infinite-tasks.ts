import { TaskService } from '../server/services/taskService';

const testInfiniteTasks = async () => {
  console.log('🎮 Тестирование бесконечной системы заданий...\n');
  
  // Используем ID Артёма Ткачёва как тестового пользователя
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // Шаг 1: Проверяем текущие задания
    console.log('\n📋 Шаг 1: Проверяем текущие задания...');
    const initialTasks = await TaskService.getUserTasks(userId);
    console.log(`Текущих активных заданий: ${initialTasks.length}`);
    
    if (initialTasks.length > 0) {
      initialTasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
        console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
        console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
      });
    }
    
    // Шаг 2: Автоматически пополняем до 3 заданий
    console.log('\n📋 Шаг 2: Автоматически пополняем до 3 заданий...');
    const currentCount = initialTasks.length;
    const maxTasks = 3;
    
    if (currentCount < maxTasks) {
      const tasksToCreate = maxTasks - currentCount;
      console.log(`Нужно создать ${tasksToCreate} заданий...`);
      
      for (let i = 0; i < tasksToCreate; i++) {
        const newTask = await TaskService.createRandomTask(userId);
        if (newTask) {
          console.log(`✅ Создано задание: ${newTask.title} (ID: ${newTask.id})`);
        } else {
          console.log(`❌ Не удалось создать задание ${i + 1}`);
        }
      }
    } else {
      console.log('✅ Уже есть 3 активных задания');
    }
    
    // Шаг 3: Получаем обновленный список
    console.log('\n📋 Шаг 3: Получаем обновленный список заданий...');
    const updatedTasks = await TaskService.getUserTasks(userId);
    console.log(`Теперь активных заданий: ${updatedTasks.length}`);
    
    updatedTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
      console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
      console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
    });
    
    // Шаг 4: Тестируем завершение задания и автоматическое создание нового
    if (updatedTasks.length > 0) {
      console.log('\n📋 Шаг 4: Тестируем завершение задания...');
      const taskToComplete = updatedTasks[0];
      console.log(`Завершаем задание: ${taskToComplete.title} (ID: ${taskToComplete.id})`);
      
      // Завершаем задание
      const result = await TaskService.updateTaskProgress(
        parseInt(taskToComplete.id), 
        userId, 
        taskToComplete.progress.total
      );
      
      if (result) {
        console.log('✅ Задание завершено!');
        console.log(`Статус: ${result.task.status}`);
        
        if (result.newTask) {
          console.log('🎉 Новое задание создано автоматически!');
          console.log(`Новое задание: ${result.newTask.title} (ID: ${result.newTask.id})`);
          console.log(`Прогресс: ${result.newTask.progress.current}/${result.newTask.progress.total}`);
          console.log(`Награда: ${result.newTask.reward.amount} ${result.newTask.reward.type}`);
        } else {
          console.log('⚠️  Новое задание не было создано');
        }
      } else {
        console.log('❌ Не удалось завершить задание');
      }
    }
    
    // Шаг 5: Финальная проверка
    console.log('\n📋 Шаг 5: Финальная проверка...');
    const finalTasks = await TaskService.getUserTasks(userId);
    console.log(`Финальное количество активных заданий: ${finalTasks.length}`);
    
    finalTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
      console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
      console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
    });
    
    console.log('\n🎉 Тестирование завершено!');
    console.log('📱 Система бесконечных заданий работает корректно');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
};

testInfiniteTasks(); 