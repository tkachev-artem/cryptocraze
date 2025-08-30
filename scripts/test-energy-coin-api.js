const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8000';

async function testEnergyCoinAPI() {
  console.log('🎮 Тестирование API эндпоинтов для заданий с энергией и монетами...\n');

  try {
    // Тест 1: Получение энергетических шаблонов
    console.log('📋 Тест 1: Получение энергетических шаблонов...');
    try {
      const response = await fetch(`${BASE_URL}/api/tasks/templates/energy`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Энергетические шаблоны получены');
        console.log(`   Количество: ${data.templates.length}`);
        data.templates.forEach(template => {
          console.log(`   - ${template.title}: ${template.rewardAmount} ${template.rewardType}`);
        });
      } else {
        console.log('❌ Ошибка получения энергетических шаблонов:', data.error);
      }
    } catch (error) {
      console.log('❌ Ошибка запроса:', error.message);
    }

    // Тест 2: Получение криптовалютных шаблонов
    console.log('\n📋 Тест 2: Получение криптовалютных шаблонов...');
    try {
      const response = await fetch(`${BASE_URL}/api/tasks/templates/crypto`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Криптовалютные шаблоны получены');
        console.log(`   Количество: ${data.templates.length}`);
        data.templates.forEach(template => {
          console.log(`   - ${template.title}: ${template.rewardAmount} ${template.rewardType}`);
        });
      } else {
        console.log('❌ Ошибка получения криптовалютных шаблонов:', data.error);
      }
    } catch (error) {
      console.log('❌ Ошибка запроса:', error.message);
    }

    // Тест 3: Получение шаблонов с энергетическими наградами
    console.log('\n📋 Тест 3: Получение шаблонов с энергетическими наградами...');
    try {
      const response = await fetch(`${BASE_URL}/api/tasks/templates/energy-rewards`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Шаблоны с энергетическими наградами получены');
        console.log(`   Количество: ${data.templates.length}`);
        data.templates.slice(0, 5).forEach(template => {
          console.log(`   - ${template.title} (${template.category}): ${template.rewardAmount} энергии`);
        });
        if (data.templates.length > 5) {
          console.log(`   ... и еще ${data.templates.length - 5} шаблонов`);
        }
      } else {
        console.log('❌ Ошибка получения шаблонов с энергетическими наградами:', data.error);
      }
    } catch (error) {
      console.log('❌ Ошибка запроса:', error.message);
    }

    // Тест 4: Получение шаблонов с наградами в монетах
    console.log('\n📋 Тест 4: Получение шаблонов с наградами в монетах...');
    try {
      const response = await fetch(`${BASE_URL}/api/tasks/templates/coin-rewards`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Шаблоны с наградами в монетах получены');
        console.log(`   Количество: ${data.templates.length}`);
        data.templates.slice(0, 5).forEach(template => {
          console.log(`   - ${template.title} (${template.category}): ${template.rewardAmount} монет`);
        });
        if (data.templates.length > 5) {
          console.log(`   ... и еще ${data.templates.length - 5} шаблонов`);
        }
      } else {
        console.log('❌ Ошибка получения шаблонов с наградами в монетах:', data.error);
      }
    } catch (error) {
      console.log('❌ Ошибка запроса:', error.message);
    }

    console.log('\n🎉 Тестирование API завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', error);
  }
}

// Запускаем тест
testEnergyCoinAPI().catch(console.error); 