import { TaskService } from '../server/services/taskService';
import { TaskTemplateService } from '../server/services/taskTemplates';
import { db } from '../server/db';
import { userTasks } from '../shared/schema';
import { eq, and, count } from 'drizzle-orm';

const debugTaskCreation = async () => {
  console.log('🔍 Диагностика проблемы создания заданий...\n');
  
  // Используем ID пользователя из логов
  const userId = '111907067370663926621';
  
  try {
    console.log('👤 Пользователь:', userId);
    
    // 1. Проверяем количество активных заданий
    console.log('\n📊 Шаг 1: Проверка активных заданий...');
    const activeTasksCount = await TaskService.getActiveTasksCount(userId);
    console.log(`✅ Активных заданий: ${activeTasksCount}`);
    
    if (activeTasksCount >= 3) {
      console.log('❌ Достигнут лимит активных заданий (3)');
      return;
    }
    
    // 2. Получаем все активные задания
    console.log('\n📋 Шаг 2: Список активных заданий...');
    const userTasks = await TaskService.getUserTasks(userId);
    console.log(`✅ Всего заданий: ${userTasks.length}`);
    
    userTasks.forEach(task => {
      console.log(`   • ${task.title} (${task.taskType}) - ${task.status}`);
    });
    
    // 3. Проверяем доступность каждого шаблона
    console.log('\n🎯 Шаг 3: Проверка доступности шаблонов...');
    const templates = TaskTemplateService.getTemplatesByCategory('daily').concat(
      TaskTemplateService.getTemplatesByCategory('video'),
      TaskTemplateService.getTemplatesByCategory('trade')
    );
    
    let availableTemplates = 0;
    for (const template of templates) {
      const canCreate = await TaskService.canCreateTask(userId, template.id);
      const status = canCreate ? '✅ Доступно' : '❌ Недоступно';
      console.log(`   ${status} ${template.title} (${template.id})`);
      
      if (canCreate) {
        availableTemplates++;
      }
    }
    
    console.log(`\n📈 Доступных шаблонов: ${availableTemplates} из ${templates.length}`);
    
    if (availableTemplates === 0) {
      console.log('\n❌ Нет доступных шаблонов для создания заданий!');
      console.log('   Возможные причины:');
      console.log('   - Все задания в cooldown');
      console.log('   - Достигнут лимит заданий на день');
      console.log('   - Уже есть активные задания этих типов');
      return;
    }
    
    // 4. Пытаемся создать задание
    console.log('\n🎮 Шаг 4: Попытка создания задания...');
    const newTask = await TaskService.createRandomTask(userId);
    
    if (newTask) {
      console.log('✅ Задание успешно создано!');
      console.log(`📝 ID: ${newTask.id}`);
      console.log(`📝 Название: ${newTask.title}`);
      console.log(`📝 Тип: ${newTask.taskType}`);
      console.log(`💰 Награда: ${newTask.reward.amount} ${newTask.reward.type}`);
    } else {
      console.log('❌ Не удалось создать задание');
      console.log('   Возможные причины:');
      console.log('   - Нет доступных шаблонов');
      console.log('   - Ошибка в логике создания');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при диагностике:', error);
  }
};

// Запускаем диагностику
debugTaskCreation().catch(console.error); 