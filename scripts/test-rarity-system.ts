import { TaskTemplateService } from '../server/services/taskTemplates';

async function testRaritySystem() {
  console.log('🎲 Тестирование системы редкости заданий');
  
  // Тестируем getRandomTemplateByRarity() 100 раз
  const results: Record<string, number> = {};
  const rarityStats: Record<string, number> = {};
  
  console.log('\n📊 Запуск 100 итераций getRandomTemplateByRarity():');
  
  for (let i = 0; i < 100; i++) {
    const template = TaskTemplateService.getRandomTemplateByRarity();
    
    // Считаем по ID шаблона
    if (!results[template.id]) {
      results[template.id] = 0;
    }
    results[template.id]++;
    
    // Считаем по редкости
    if (!rarityStats[template.rarity]) {
      rarityStats[template.rarity] = 0;
    }
    rarityStats[template.rarity]++;
  }
  
  console.log('\n🏆 Результаты по ID заданий:');
  Object.entries(results)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, count]) => {
      const template = TaskTemplateService.getTemplateById(id);
      console.log(`  ${id}: ${count} раз (${template?.rarity || 'unknown'})`);
    });
  
  console.log('\n📈 Статистика по редкости:');
  Object.entries(rarityStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([rarity, count]) => {
      const percentage = (count / 100 * 100).toFixed(1);
      console.log(`  ${rarity}: ${count} раз (${percentage}%)`);
    });
  
  // Проверяем конкретно video_bonus_2
  const videoBonus2Count = results['video_bonus_2'] || 0;
  console.log(`\n🎰 Задание 'video_bonus_2' выпало: ${videoBonus2Count} раз из 100`);
  
  if (videoBonus2Count > 0) {
    console.log('✅ Задание с рулеткой корректно участвует в системе редкости!');
  } else {
    console.log('⚠️  Задание с рулеткой не выпало ни разу - возможна проблема в системе редкости');
  }
  
  // Проверяем все шаблоны
  console.log('\n📋 Все доступные шаблоны:');
  const allTemplates = TaskTemplateService.getRandomTemplate(); // Для получения списка
  console.log('  Всего шаблонов в системе:');
  
  ['common', 'rare', 'epic', 'legendary'].forEach(rarity => {
    const templates = TaskTemplateService.getTemplatesByRarity(rarity as any);
    console.log(`    ${rarity}: ${templates.length} шаблонов`);
    templates.forEach(t => {
      console.log(`      - ${t.id}: ${t.title}`);
    });
  });
  
  // Проверяем веса редкости
  console.log('\n⚖️  Ожидаемые веса редкости:');
  console.log('  common: 60% (должно быть ~60 из 100)');
  console.log('  rare: 25% (должно быть ~25 из 100)');
  console.log('  epic: 12% (должно быть ~12 из 100)');
  console.log('  legendary: 3% (должно быть ~3 из 100)');
}

testRaritySystem().then(() => {
  console.log('\n🏁 Тест системы редкости завершен');
  process.exit(0);
}).catch(error => {
  console.error('💥 Ошибка теста:', error);
  process.exit(1);
});