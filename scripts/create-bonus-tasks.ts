import { TaskTemplateService } from '../server/services/taskTemplateService';
import { TaskService } from '../server/services/taskService';

const createBonusTasks = async () => {
  console.log('🎁 Создание бонусных заданий...\n');
  
  const userId = '111907067370663926621';
  
  try {
    // Создаем дополнительные шаблоны
    const bonusTemplates = [
      {
        templateId: 'first_win_task',
        taskType: 'first_win',
        title: 'Первая победа',
        description: 'Выиграйте свою первую сделку',
        rewardType: 'money' as const,
        rewardAmount: '3K',
        progressTotal: 1,
        icon: '/trials/win.svg',
        category: 'trade' as const,
        rarity: 'epic' as const,
        expiresInHours: 96,
        isActive: true,
        createdBy: '116069980752518862717'
      },
      {
        templateId: 'profile_complete_task',
        taskType: 'profile_complete',
        title: 'Заполните профиль',
        description: 'Заполните все поля в своем профиле',
        rewardType: 'coins' as const,
        rewardAmount: '75',
        progressTotal: 1,
        icon: '/trials/profile.svg',
        category: 'social' as const,
        rarity: 'common' as const,
        expiresInHours: 120,
        isActive: true,
        createdBy: '116069980752518862717'
      },
      {
        templateId: 'referral_task',
        taskType: 'referral',
        title: 'Пригласите друга',
        description: 'Пригласите друга по реферальной ссылке',
        rewardType: 'money' as const,
        rewardAmount: '10K',
        progressTotal: 1,
        icon: '/trials/referral.svg',
        category: 'social' as const,
        rarity: 'legendary' as const,
        expiresInHours: 720, // 30 дней
        isActive: true,
        createdBy: '116069980752518862717'
      }
    ];
    
    console.log('📝 Создаю бонусные шаблоны...');
    
    for (const template of bonusTemplates) {
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
    
    console.log('\n🎮 Создаю бонусные задания...');
    
    // Создаем задания (но не все, чтобы не превысить лимит)
    const bonusTaskTemplates = ['first_win_task', 'profile_complete_task'];
    
    for (const templateId of bonusTaskTemplates) {
      try {
        const task = await TaskService.createTaskByTemplateId(userId, templateId);
        if (task) {
          console.log(`✅ Создано бонусное задание: ${task.title} (ID: ${task.id})`);
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
    console.log('\n📋 Итоговый список всех активных заданий:');
    const finalTasks = await TaskService.getUserTasks(userId);
    console.log(`Всего активных заданий: ${finalTasks.length}/3 (максимум)`);
    
    finalTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
      console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
      console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
      console.log(`      Статус: ${task.status}`);
    });
    
    console.log('\n🎉 Бонусные задания созданы!');
    console.log('📊 Статистика:');
    console.log(`   - Всего шаблонов: ${bonusTemplates.length + 4} (включая предыдущие)`);
    console.log(`   - Активных заданий: ${finalTasks.length}`);
    console.log(`   - Лимит заданий: 3`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
  
  process.exit(0);
};

createBonusTasks(); 