import { TaskTemplateService as DatabaseTaskTemplateService } from '../server/services/taskTemplateService';
import { TaskTemplateService } from '../server/services/taskTemplates';

async function initEnergyCoinTemplates() {
  console.log('🎮 Инициализация шаблонов заданий с энергией и монетами...\n');

  try {
    // Получаем все новые шаблоны
    const energyTemplates = TaskTemplateService.getEnergyTemplates();
    const cryptoTemplates = TaskTemplateService.getCryptoTemplates();
    const energyRewardTemplates = TaskTemplateService.getEnergyRewardTemplates();
    const coinRewardTemplates = TaskTemplateService.getCoinRewardTemplates();

    console.log(`📊 Статистика шаблонов:`);
    console.log(`   - Энергетические: ${energyTemplates.length}`);
    console.log(`   - Криптовалютные: ${cryptoTemplates.length}`);
    console.log(`   - С энергетическими наградами: ${energyRewardTemplates.length}`);
    console.log(`   - С наградами в монетах: ${coinRewardTemplates.length}`);

    // Инициализируем энергетические шаблоны
    console.log('\n📋 Инициализация энергетических шаблонов...');
    for (const template of energyTemplates) {
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
          category: 'daily', // Временно используем 'daily' вместо 'energy'
          rarity: template.rarity,
          expiresInHours: template.expiresInHours
        }, 'system');
        console.log(`   ✅ ${template.title}`);
      } catch (error: any) {
        if (error.message.includes('duplicate key')) {
          console.log(`   ⚠️  ${template.title} (уже существует)`);
        } else {
          console.log(`   ❌ ${template.title}: ${error.message}`);
        }
      }
    }

    // Инициализируем криптовалютные шаблоны
    console.log('\n📋 Инициализация криптовалютных шаблонов...');
    for (const template of cryptoTemplates) {
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
          category: 'trade', // Временно используем 'trade' вместо 'crypto'
          rarity: template.rarity,
          expiresInHours: template.expiresInHours
        }, 'system');
        console.log(`   ✅ ${template.title}`);
      } catch (error: any) {
        if (error.message.includes('duplicate key')) {
          console.log(`   ⚠️  ${template.title} (уже существует)`);
        } else {
          console.log(`   ❌ ${template.title}: ${error.message}`);
        }
      }
    }

    // Проверяем результат
    console.log('\n📋 Проверка результата...');
    const dbEnergyTemplates = await DatabaseTaskTemplateService.getTemplatesByCategory('energy');
    const dbCryptoTemplates = await DatabaseTaskTemplateService.getTemplatesByCategory('crypto');
    
    console.log(`   - Энергетических в БД: ${dbEnergyTemplates.length}`);
    console.log(`   - Криптовалютных в БД: ${dbCryptoTemplates.length}`);

    console.log('\n🎉 Инициализация завершена успешно!');

  } catch (error) {
    console.error('❌ Ошибка при инициализации:', error);
  }
}

// Запускаем инициализацию
initEnergyCoinTemplates().catch(console.error); 