import { TaskService } from '../server/services/taskService';
import { TaskTemplateService } from '../server/services/taskTemplates';

async function testWheelTask() {
  console.log('🎰 Тестирование задания с рулеткой "Видео бонус 2"');
  
  const userId = 'test-user-123';
  
  // 1. Проверяем, есть ли шаблон в списке
  console.log('\n📋 Проверяем шаблон video_bonus_2:');
  const template = TaskTemplateService.getTemplateById('video_bonus_2');
  if (template) {
    console.log('✅ Шаблон найден:', {
      id: template.id,
      title: template.title,
      rewardType: template.rewardType,
      category: template.category,
      cooldownMinutes: template.cooldownMinutes
    });
  } else {
    console.log('❌ Шаблон НЕ найден!');
    return;
  }
  
  // 2. Проверяем, включается ли в категорию video
  console.log('\n📂 Проверяем категорию video:');
  const videoTemplates = TaskTemplateService.getTemplatesByCategory('video');
  console.log('Шаблоны категории video:');
  videoTemplates.forEach(t => {
    console.log(`  - ${t.id}: ${t.title}`);
  });
  
  const hasVideoBonus2 = videoTemplates.some(t => t.id === 'video_bonus_2');
  if (hasVideoBonus2) {
    console.log('✅ Шаблон video_bonus_2 найден в категории video');
  } else {
    console.log('❌ Шаблон video_bonus_2 НЕ найден в категории video');
  }
  
  // 3. Проверяем, можно ли создать задание
  console.log('\n🔒 Проверяем canCreateTask:');
  try {
    const canCreate = await TaskService.canCreateTask(userId, 'video_bonus_2');
    console.log(`canCreateTask результат: ${canCreate}`);
    
    if (canCreate) {
      console.log('✅ Задание можно создать');
      
      // 4. Пробуем создать задание напрямую
      console.log('\n🏗️ Создаем задание напрямую:');
      const options = TaskTemplateService.templateToCreateOptions(template);
      console.log('Опции для создания:', options);
      
      const createdTask = await TaskService.createTask(userId, options);
      if (createdTask) {
        console.log('✅ Задание создано успешно:', {
          id: createdTask.id,
          title: createdTask.title,
          rewardType: createdTask.reward.type,
          progress: createdTask.progress
        });
      } else {
        console.log('❌ Не удалось создать задание');
      }
      
    } else {
      console.log('❌ Задание нельзя создать (возможные причины: cooldown, лимиты, активное задание)');
      
      // Проверяем активные задания
      const activeTasks = await TaskService.getUserTasks(userId);
      console.log(`Активных заданий у пользователя: ${activeTasks.length}`);
      activeTasks.forEach(task => {
        console.log(`  - ${task.title} (${task.status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке canCreateTask:', error);
  }
  
  // 5. Тестируем createRandomTask
  console.log('\n🎲 Тестируем createRandomTask (10 попыток):');
  for (let i = 0; i < 10; i++) {
    try {
      const randomTask = await TaskService.createRandomTask(`${userId}-${i}`);
      if (randomTask) {
        console.log(`  Попытка ${i + 1}: ${randomTask.title} (${randomTask.reward.type})`);
        if (randomTask.title === 'Видео бонус 2') {
          console.log('  🎰 Найдено задание с рулеткой!');
        }
      } else {
        console.log(`  Попытка ${i + 1}: задание не создано`);
      }
    } catch (error) {
      console.log(`  Попытка ${i + 1}: ошибка - ${error}`);
    }
  }
}

// Запускаем тест
testWheelTask().then(() => {
  console.log('\n🏁 Тест завершен');
  process.exit(0);
}).catch(error => {
  console.error('💥 Ошибка теста:', error);
  process.exit(1);
});