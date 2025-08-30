import { TaskTemplateService } from '../server/services/taskTemplateService';
import { TaskService } from '../server/services/taskService';

const createMultipleTasks = async () => {
  console.log('🎯 Создание нескольких новых заданий...\n');
  
  const userId = '111907067370663926621';
  
  try {
    // Создаем новые шаблоны заданий
    const templates = [
      {
        templateId: 'trade_bonus_task',
        taskType: 'trade_bonus',
        title: 'Сделайте сделку',
        description: 'Откройте любую сделку и получите бонус!',
        rewardType: 'money' as const,
        rewardAmount: '2K',
        progressTotal: 1,
        icon: '/trials/trade.svg',
        category: 'trade' as const,
        rarity: 'rare' as const,
        expiresInHours: 48,
        isActive: true,
        createdBy: '116069980752518862717'
      },
      {
        templateId: 'social_share_task',
        taskType: 'social_share',
        title: 'Поделитесь с друзьями',
        description: 'Поделитесь ссылкой на платформу в социальных сетях',
        rewardType: 'coins' as const,
        rewardAmount: '100',
        progressTotal: 1,
        icon: '/trials/social.svg',
        category: 'social' as const,
        rarity: 'epic' as const,
        expiresInHours: 72,
        isActive: true,
        createdBy: '116069980752518862717'
      },
      {
        templateId: 'daily_streak_task',
        taskType: 'daily_streak',
        title: 'Ежедневная серия',
        description: 'Заходите в приложение 3 дня подряд',
        rewardType: 'energy' as const,
        rewardAmount: '25',
        progressTotal: 3,
        icon: '/trials/streak.svg',
        category: 'daily' as const,
        rarity: 'legendary' as const,
        expiresInHours: 168, // 7 дней
        isActive: true,
        createdBy: '116069980752518862717'
      },
      {
        templateId: 'premium_trial_task',
        taskType: 'premium_trial',
        title: 'Попробуйте Premium',
        description: 'Активируйте пробный период Premium',
        rewardType: 'money' as const,
        rewardAmount: '5K',
        progressTotal: 1,
        icon: '/trials/premium.svg',
        category: 'premium' as const,
        rarity: 'legendary' as const,
        expiresInHours: 24,
        isActive: true,
        createdBy: '116069980752518862717'
      }
    ];
    
    console.log('📝 Создаю шаблоны заданий...');
    
    for (const template of templates) {
      try {
        const result = await TaskTemplateService.createTemplate(template);
        if (result) {
          console.log(`✅ Создан шаблон: ${result.title} (${result.rewardAmount} ${result.rewardType})`);
        } else {
          console.log(`⚠️  Шаблон уже существует: ${template.title}`);
        }
      } catch (error) {
        console.log(`❌ Ошибка создания шаблона ${template.title}:`, error);
      }
    }
    
    console.log('\n🎮 Создаю задания для пользователя...');
    
    // Создаем задания для пользователя
    const taskTemplates = ['trade_bonus_task', 'social_share_task', 'daily_streak_task'];
    
    for (const templateId of taskTemplates) {
      try {
        const task = await TaskService.createTaskByTemplateId(userId, templateId);
        if (task) {
          console.log(`✅ Создано задание: ${task.title} (ID: ${task.id})`);
          console.log(`   Прогресс: ${task.progress.current}/${task.progress.total}`);
          console.log(`   Награда: ${task.reward.amount} ${task.reward.type}`);
        } else {
          console.log(`⚠️  Не удалось создать задание из шаблона: ${templateId}`);
        }
      } catch (error) {
        console.log(`❌ Ошибка создания задания ${templateId}:`, error);
      }
    }
    
    // Проверяем итоговый список
    console.log('\n📋 Итоговый список активных заданий:');
    const finalTasks = await TaskService.getUserTasks(userId);
    console.log(`Всего активных заданий: ${finalTasks.length}`);
    
    finalTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
      console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
      console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
      console.log(`      Статус: ${task.status}`);
    });
    
    console.log('\n🎉 Задания успешно созданы!');
    console.log('📱 Теперь обновите фронтенд для просмотра новых заданий');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
};

createMultipleTasks(); 