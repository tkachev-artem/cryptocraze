import { TaskTemplateService } from '../server/services/taskTemplateService';

const createVideoTaskTemplate = async () => {
  console.log('🎬 Создание шаблона видео-задания...\n');
  
  try {
    const taskData = {
      templateId: 'video_bonus_task',
      taskType: 'video_bonus',
      title: 'Смотрите видео',
      description: 'Посмотрите короткое видео и получите награду!',
      rewardType: 'money' as const,
      rewardAmount: '1K',
      progressTotal: 1,
      icon: '/trials/video.svg',
      category: 'video' as const,
      rarity: 'common' as const,
      expiresInHours: 12,
      isActive: true,
      createdBy: '116069980752518862717' // Admin Platform ID
    };
    
    console.log('📝 Создаю шаблон:', taskData.title);
    
    const result = await TaskTemplateService.createTemplate(taskData);
    
    if (result) {
      console.log('✅ Шаблон видео-задания создан!');
      console.log('📋 ID:', result.id);
      console.log('🎯 Template ID:', result.templateId);
      console.log('📝 Название:', result.title);
      console.log('💰 Награда:', result.rewardAmount, result.rewardType);
      console.log('');
      
      console.log('🎮 Теперь можно создать задание для пользователя:');
      console.log('   POST /api/tasks/create/template/video_bonus_task');
      
    } else {
      console.log('⚠️  Шаблон уже существует или произошла ошибка');
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания шаблона:', error);
  }
  
  process.exit(0);
};

createVideoTaskTemplate(); 