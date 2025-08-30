import { TaskTemplateService, TASK_TEMPLATES } from '../server/services/taskTemplates';

async function debugTemplates() {
  console.log('🔍 Отладка шаблонов заданий');
  
  console.log(`\n📊 Всего шаблонов в массиве: ${TASK_TEMPLATES.length}`);
  
  // Выводим все шаблоны
  console.log('\n📋 Все шаблоны:');
  TASK_TEMPLATES.forEach((template, index) => {
    console.log(`  ${index + 1}. ID: ${template.id}`);
    console.log(`     Title: ${template.title}`);
    console.log(`     Rarity: ${template.rarity}`);
    console.log(`     Category: ${template.category}`);
    console.log('');
  });
  
  // Проверяем по редкости
  console.log('🏆 Шаблоны по редкости:');
  ['common', 'rare', 'epic', 'legendary'].forEach(rarity => {
    const templates = TaskTemplateService.getTemplatesByRarity(rarity as any);
    console.log(`\n  ${rarity.toUpperCase()}: ${templates.length} шаблонов`);
    templates.forEach(t => {
      console.log(`    - ${t.id}: ${t.title}`);
    });
  });
  
  // Проверяем video_bonus_2
  console.log('\n🎰 Проверка video_bonus_2:');
  const videoBonusTemplate = TaskTemplateService.getTemplateById('video_bonus_2');
  if (videoBonusTemplate) {
    console.log('✅ Шаблон найден:');
    console.log(`   ID: ${videoBonusTemplate.id}`);
    console.log(`   Title: ${videoBonusTemplate.title}`);
    console.log(`   Rarity: ${videoBonusTemplate.rarity}`);
    console.log(`   Category: ${videoBonusTemplate.category}`);
  } else {
    console.log('❌ Шаблон video_bonus_2 НЕ найден!');
  }
  
  // Тестируем getRandomTemplate
  console.log('\n🎲 Тестируем getRandomTemplate():');
  try {
    const randomTemplate = TaskTemplateService.getRandomTemplate();
    console.log(`Результат: ${randomTemplate?.id || 'undefined'}`);
  } catch (error) {
    console.log(`Ошибка: ${error}`);
  }
  
  // Тестируем getTemplatesByRarity для 'rare'
  console.log('\n🎯 Тестируем getTemplatesByRarity("rare"):');
  const rareTemplates = TaskTemplateService.getTemplatesByRarity('rare');
  console.log(`Найдено rare шаблонов: ${rareTemplates.length}`);
  rareTemplates.forEach(t => {
    console.log(`  - ${t.id}: ${t.title}`);
  });
  
  // Пробуем 10 раз getRandomTemplateByRarity
  console.log('\n🎰 10 попыток getRandomTemplateByRarity():');
  for (let i = 0; i < 10; i++) {
    try {
      const template = TaskTemplateService.getRandomTemplateByRarity();
      console.log(`  ${i + 1}. ${template?.id || 'undefined'} (${template?.rarity || 'unknown'})`);
    } catch (error) {
      console.log(`  ${i + 1}. Ошибка: ${error}`);
    }
  }
}

debugTemplates().then(() => {
  console.log('\n🏁 Отладка завершена');
  process.exit(0);
}).catch(error => {
  console.error('💥 Ошибка отладки:', error);
  process.exit(1);
});