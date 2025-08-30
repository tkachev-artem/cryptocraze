import { db } from '../server/db';
import { taskTemplates } from '../shared/schema';
import { TaskTemplateService } from '../server/services/taskTemplateService';

const createSimpleTaskTemplate = async () => {
  console.log('🎯 Создание простого задания через базу данных...\n');
  
  try {
    const taskData = {
      templateId: 'simple_daily_task',
      taskType: 'daily_bonus',
      title: 'Ежедневный бонус',
      description: 'Заходите каждый день и получайте награду!',
      rewardType: 'coins' as const,
      rewardAmount: '50',
      progressTotal: 1,
      icon: '/trials/daily.svg',
      category: 'daily' as const,
      rarity: 'common' as const,
      expiresInHours: 24,
      isActive: true,
      createdBy: '116069980752518862717' // Admin Platform ID
    };
    
    console.log('📝 Создаю задание:', taskData.title);
    
    const result = await TaskTemplateService.createTemplate(taskData);
    
    if (result) {
      console.log('✅ Задание успешно создано!');
      console.log('📋 ID:', result.id);
      console.log('🎯 Template ID:', result.templateId);
      console.log('📝 Название:', result.title);
      console.log('💰 Награда:', result.rewardAmount, result.rewardType);
      console.log('');
      
      console.log('🎮 Теперь можно создать задание для пользователя:');
      console.log('   POST /api/tasks/create/template/simple_daily_task');
      console.log('');
      
      console.log('📊 Для просмотра всех шаблонов:');
      console.log('   GET /api/admin/task-templates');
      
    } else {
      console.log('⚠️  Задание уже существует или произошла ошибка');
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания задания:', error);
  }
  
  process.exit(0);
};

createSimpleTaskTemplate(); 