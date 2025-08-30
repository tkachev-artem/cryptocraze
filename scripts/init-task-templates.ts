import { DatabaseTaskTemplateService } from '../server/services/taskTemplateService';

const baseTemplates = [
  // Ежедневные задания
  {
    templateId: 'daily_login',
    taskType: 'daily_login',
    title: 'Ежедневный вход',
    description: 'Заходите каждый день и получайте награду',
    rewardType: 'money' as const,
    rewardAmount: '500',
    progressTotal: 1,
    icon: '/trials/daily.svg',
    category: 'daily' as const,
    rarity: 'common' as const,
    expiresInHours: 24
  },
  {
    templateId: 'daily_trade',
    taskType: 'daily_trade',
    title: 'Ежедневная сделка',
    description: 'Совершите хотя бы одну сделку сегодня',
    rewardType: 'coins' as const,
    rewardAmount: '25',
    progressTotal: 1,
    icon: '/trials/trade.svg',
    category: 'daily' as const,
    rarity: 'common' as const,
    expiresInHours: 24
  },

  // Видео задания
  {
    templateId: 'video_bonus_small',
    taskType: 'video_bonus_small',
    title: 'Короткое видео',
    description: 'Просмотрите короткое видео и получите награду',
    rewardType: 'money' as const,
    rewardAmount: '1K',
    progressTotal: 3,
    icon: '/trials/video.svg',
    category: 'video' as const,
    rarity: 'common' as const,
    expiresInHours: 24
  },
  {
    templateId: 'video_bonus_medium',
    taskType: 'video_bonus_medium',
    title: 'Среднее видео',
    description: 'Просмотрите среднее видео и получите награду',
    rewardType: 'money' as const,
    rewardAmount: '2K',
    progressTotal: 5,
    icon: '/trials/video.svg',
    category: 'video' as const,
    rarity: 'rare' as const,
    expiresInHours: 24
  },
  {
    templateId: 'video_bonus_large',
    taskType: 'video_bonus_large',
    title: 'Длинное видео',
    description: 'Просмотрите длинное видео и получите награду',
    rewardType: 'money' as const,
    rewardAmount: '5K',
    progressTotal: 10,
    icon: '/trials/video.svg',
    category: 'video' as const,
    rarity: 'epic' as const,
    expiresInHours: 24
  },

  // Торговые задания
  {
    templateId: 'trade_bonus_small',
    taskType: 'trade_bonus_small',
    title: 'Первая сделка',
    description: 'Совершите свою первую сделку',
    rewardType: 'coins' as const,
    rewardAmount: '50',
    progressTotal: 1,
    icon: '/trials/trade.svg',
    category: 'trade' as const,
    rarity: 'common' as const,
    expiresInHours: 24
  },
  {
    templateId: 'trade_bonus_medium',
    taskType: 'trade_bonus_medium',
    title: 'Активный трейдер',
    description: 'Совершите 5 сделок за день',
    rewardType: 'coins' as const,
    rewardAmount: '100',
    progressTotal: 5,
    icon: '/trials/trade.svg',
    category: 'trade' as const,
    rarity: 'rare' as const,
    expiresInHours: 24
  },
  {
    templateId: 'trade_bonus_large',
    taskType: 'trade_bonus_large',
    title: 'Профессиональный трейдер',
    description: 'Совершите 10 сделок за день',
    rewardType: 'coins' as const,
    rewardAmount: '250',
    progressTotal: 10,
    icon: '/trials/trade.svg',
    category: 'trade' as const,
    rarity: 'epic' as const,
    expiresInHours: 24
  },

  // Энергетические задания
  {
    templateId: 'energy_bonus_small',
    taskType: 'energy_bonus_small',
    title: 'Энергетический заряд',
    description: 'Выполните задание и получите энергию',
    rewardType: 'energy' as const,
    rewardAmount: '25',
    progressTotal: 5,
    icon: '/trials/energy.svg',
    category: 'daily' as const,
    rarity: 'common' as const,
    expiresInHours: 24
  },
  {
    templateId: 'energy_bonus_medium',
    taskType: 'energy_bonus_medium',
    title: 'Энергетический буст',
    description: 'Выполните сложное задание и получите много энергии',
    rewardType: 'energy' as const,
    rewardAmount: '50',
    progressTotal: 10,
    icon: '/trials/energy.svg',
    category: 'daily' as const,
    rarity: 'rare' as const,
    expiresInHours: 24
  },
  {
    templateId: 'energy_bonus_large',
    taskType: 'energy_bonus_large',
    title: 'Энергетический взрыв',
    description: 'Выполните очень сложное задание и получите максимум энергии',
    rewardType: 'energy' as const,
    rewardAmount: '100',
    progressTotal: 20,
    icon: '/trials/energy.svg',
    category: 'daily' as const,
    rarity: 'epic' as const,
    expiresInHours: 24
  },

  // Социальные задания
  {
    templateId: 'social_share',
    taskType: 'social_share',
    title: 'Поделитесь с друзьями',
    description: 'Поделитесь ссылкой на платформу в социальных сетях',
    rewardType: 'money' as const,
    rewardAmount: '2K',
    progressTotal: 1,
    icon: '/trials/social.svg',
    category: 'social' as const,
    rarity: 'rare' as const,
    expiresInHours: 24
  },
  {
    templateId: 'social_invite',
    taskType: 'social_invite',
    title: 'Пригласите друга',
    description: 'Пригласите друга на платформу',
    rewardType: 'coins' as const,
    rewardAmount: '100',
    progressTotal: 1,
    icon: '/trials/social.svg',
    category: 'social' as const,
    rarity: 'epic' as const,
    expiresInHours: 24
  },

  // Premium задания
  {
    templateId: 'premium_bonus',
    taskType: 'premium_bonus',
    title: 'Premium бонус',
    description: 'Эксклюзивное задание для Premium пользователей',
    rewardType: 'money' as const,
    rewardAmount: '10K',
    progressTotal: 1,
    icon: '/trials/premium.svg',
    category: 'premium' as const,
    rarity: 'legendary' as const,
    expiresInHours: 24
  },
  {
    templateId: 'premium_energy',
    taskType: 'premium_energy',
    title: 'Premium энергия',
    description: 'Эксклюзивная энергия для Premium пользователей',
    rewardType: 'energy' as const,
    rewardAmount: '200',
    progressTotal: 1,
    icon: '/trials/premium.svg',
    category: 'premium' as const,
    rarity: 'legendary' as const,
    expiresInHours: 24
  }
];

async function initTaskTemplates() {
  console.log('🚀 Инициализация шаблонов заданий...\n');

  const adminUserId = 'admin'; // ID администратора для создания шаблонов

  try {
    let createdCount = 0;
    let skippedCount = 0;

    for (const template of baseTemplates) {
      try {
        // Проверяем, существует ли уже шаблон с таким templateId
        const existingTemplate = await DatabaseTaskTemplateService.getTemplateByTemplateId(template.templateId);
        
        if (existingTemplate) {
          console.log(`⏭️  Шаблон "${template.title}" уже существует, пропускаем`);
          skippedCount++;
          continue;
        }

        // Создаем новый шаблон
        const newTemplate = await DatabaseTaskTemplateService.createTemplate(template, adminUserId);
        console.log(`✅ Создан шаблон: "${newTemplate.title}" (${newTemplate.rarity})`);
        createdCount++;

      } catch (error) {
        console.error(`❌ Ошибка создания шаблона "${template.title}":`, error);
      }
    }

    console.log(`\n📊 Результат инициализации:`);
    console.log(`   ✅ Создано: ${createdCount} шаблонов`);
    console.log(`   ⏭️  Пропущено: ${skippedCount} шаблонов`);
    console.log(`   📝 Всего: ${baseTemplates.length} шаблонов`);

    // Получаем статистику
    const stats = await DatabaseTaskTemplateService.getTemplateStats();
    console.log(`\n📈 Статистика шаблонов:`);
    console.log(`   📋 Всего шаблонов: ${stats.length}`);

  } catch (error) {
    console.error('❌ Ошибка инициализации шаблонов:', error);
  }
}

// Запуск инициализации
initTaskTemplates().catch(console.error); 