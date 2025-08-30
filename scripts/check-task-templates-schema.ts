import { db } from '../server/db';
import { taskTemplates, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkTaskTemplatesSchema() {
  console.log('🔍 Проверка структуры таблицы task_templates...\n');

  try {
    // Проверим существование пользователя 'system'
    console.log('📋 Проверка существования пользователя "system"...');
    const systemUser = await db.select()
      .from(users)
      .where(eq(users.id, 'system'))
      .limit(1);
    
    if (systemUser.length === 0) {
      console.log('❌ Пользователь "system" не существует');
      console.log('📋 Создаем пользователя "system"...');
      
      try {
        await db.insert(users).values({
          id: 'system',
          email: 'system@example.com',
          firstName: 'System',
          lastName: 'User',
          balance: '0.00',
          coins: 0,
          freeBalance: '0',
          ratingScore: 0,
          tradesCount: 0,
          totalTradesVolume: '0.00',
          successfulTradesPercentage: '0.00',
          maxProfit: '0.00',
          maxLoss: '0.00',
          averageTradeAmount: '0.00',
          rewardsCount: 0,
          energyTasksBonus: 0,
          isPremium: false
        });
        console.log('✅ Пользователь "system" создан');
      } catch (error: any) {
        console.log('❌ Ошибка создания пользователя "system":');
        console.log(`   ${error.message}`);
      }
    } else {
      console.log('✅ Пользователь "system" существует');
    }

    // Попробуем вставить тестовую запись с существующими категориями
    console.log('\n📋 Тестирование вставки с существующими категориями...');
    try {
      const [newTemplate] = await db.insert(taskTemplates).values({
        templateId: 'test_daily_template',
        taskType: 'test_daily',
        title: 'Тестовое ежедневное задание',
        description: 'Тестовое описание',
        rewardType: 'money',
        rewardAmount: '100',
        progressTotal: 1,
        icon: '/trials/daily.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 24,
        createdBy: 'system'
      }).returning();
      
      console.log('✅ Успешно создан тестовый шаблон с категорией "daily"');
      console.log(`   ID: ${newTemplate.id}`);
      console.log(`   Category: ${newTemplate.category}`);
      console.log(`   RewardType: ${newTemplate.rewardType}`);
      
      // Удаляем тестовую запись
      await db.delete(taskTemplates).where(eq(taskTemplates.id, newTemplate.id));
      console.log('🗑️  Тестовая запись удалена');
      
    } catch (error: any) {
      console.log('❌ Ошибка при создании тестового шаблона с категорией "daily":');
      console.log(`   ${error.message}`);
    }

    // Попробуем вставить тестовую запись с rewardType 'energy'
    console.log('\n📋 Тестирование вставки с rewardType "energy"...');
    try {
      const [newTemplate] = await db.insert(taskTemplates).values({
        templateId: 'test_energy_reward_template',
        taskType: 'test_energy_reward',
        title: 'Тестовое задание с энергетической наградой',
        description: 'Тестовое описание',
        rewardType: 'energy',
        rewardAmount: '50',
        progressTotal: 5,
        icon: '/trials/energy.svg',
        category: 'daily',
        rarity: 'common',
        expiresInHours: 24,
        createdBy: 'system'
      }).returning();
      
      console.log('✅ Успешно создан тестовый шаблон с rewardType "energy"');
      console.log(`   ID: ${newTemplate.id}`);
      console.log(`   Category: ${newTemplate.category}`);
      console.log(`   RewardType: ${newTemplate.rewardType}`);
      
      // Удаляем тестовую запись
      await db.delete(taskTemplates).where(eq(taskTemplates.id, newTemplate.id));
      console.log('🗑️  Тестовая запись удалена');
      
    } catch (error: any) {
      console.log('❌ Ошибка при создании тестового шаблона с rewardType "energy":');
      console.log(`   ${error.message}`);
    }

    // Проверим существующие rewardType
    console.log('\n📋 Проверка существующих rewardType...');
    const existingRewardTypes = await db.select({ rewardType: taskTemplates.rewardType })
      .from(taskTemplates)
      .groupBy(taskTemplates.rewardType);
    
    console.log('Существующие rewardType:');
    existingRewardTypes.forEach(template => {
      console.log(`   - ${template.rewardType}`);
    });

    // Проверим существующие категории
    console.log('\n📋 Проверка существующих категорий...');
    const existingTemplates = await db.select({ category: taskTemplates.category })
      .from(taskTemplates)
      .groupBy(taskTemplates.category);
    
    console.log('Существующие категории:');
    existingTemplates.forEach(template => {
      console.log(`   - ${template.category}`);
    });

  } catch (error) {
    console.error('❌ Ошибка при проверке схемы:', error);
  }
}

// Запускаем проверку
checkTaskTemplatesSchema().catch(console.error); 