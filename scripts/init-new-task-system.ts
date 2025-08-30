import { TaskTemplateService as DatabaseTaskTemplateService } from '../server/services/taskTemplateService';
import { TaskTemplateService } from '../server/services/taskTemplates';
import { db } from '../server/db';
import { taskTemplates, userTasks } from '../shared/schema';

async function initNewTaskSystem() {
  console.log('🎮 Инициализация новой системы заданий...\n');

  try {
    // Шаг 1: Очищаем старые шаблоны
    console.log('📋 Шаг 1: Очистка старых шаблонов...');
    const deleteResult = await db.delete(taskTemplates);
    console.log(`✅ Удалено старых шаблонов: ${deleteResult.rowCount}`);

    // Шаг 2: Очищаем старые задания пользователей
    console.log('\n📋 Шаг 2: Очистка старых заданий пользователей...');
    const deleteTasksResult = await db.delete(userTasks);
    console.log(`✅ Удалено старых заданий: ${deleteTasksResult.rowCount}`);

    // Шаг 3: Создаем новые шаблоны
    console.log('\n📋 Шаг 3: Создание новых шаблонов...');
    const newTemplates = TaskTemplateService.getTemplatesByCategory('daily').concat(
      TaskTemplateService.getTemplatesByCategory('video'),
      TaskTemplateService.getTemplatesByCategory('trade')
    );
    
    for (const template of newTemplates) {
      try {
        await DatabaseTaskTemplateService.createTemplate({
          templateId: template.id,
          taskType: template.taskType,
          title: template.title,
          description: template.description || '',
          rewardType: template.rewardType,
          rewardAmount: template.rewardAmount,
          progressTotal: template.progressTotal,
          icon: template.icon,
          category: template.category,
          rarity: template.rarity,
          expiresInHours: template.expiresInHours
        }, 'system');
        console.log(`   ✅ ${template.title}`);
      } catch (error: any) {
        console.log(`   ❌ ${template.title}: ${error.message}`);
      }
    }

    // Шаг 4: Проверяем результат
    console.log('\n📋 Шаг 4: Проверка результата...');
    const allTemplates = await DatabaseTaskTemplateService.getAllTemplates();
    console.log(`✅ Создано шаблонов: ${allTemplates.length}`);
    
    allTemplates.forEach(template => {
      console.log(`   - ${template.title} (${template.category}): ${template.rewardAmount} ${template.rewardType}`);
    });

    console.log('\n🎉 Новая система заданий инициализирована успешно!');

  } catch (error) {
    console.error('❌ Ошибка при инициализации:', error);
  }
}

// Запускаем инициализацию
initNewTaskSystem().catch(console.error); 