// Тест реальной авторизации через Google OAuth
console.log('🔐 Тест логирования авторизации через Google OAuth...\n');

async function waitForLogin() {
  console.log('1️⃣ Ожидаем событие логина...');
  
  let loginEventFound = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!loginEventFound && attempts < maxAttempts) {
    try {
      // Проверяем событие логина в ClickHouse
      const response = await fetch('http://localhost:8123/?query=SELECT%20*%20FROM%20cryptocraze_analytics.user_events%20WHERE%20event_type%20=%20%27login%27%20ORDER%20BY%20timestamp%20DESC%20LIMIT%201');
      const text = await response.text();
      
      if (text.trim() && !text.includes('Code:')) {
        console.log('✅ Найдено событие логина:');
        console.log('   📝 Данные:', text);
        loginEventFound = true;
      } else {
        attempts++;
        console.log(`   ⏳ Попытка ${attempts}/${maxAttempts} - событие логина не найдено`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`   ❌ Ошибка проверки: ${error.message}`);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!loginEventFound) {
    console.log('❌ События логина не обнаружено за отведенное время');
  }
  
  // Проверим общее количество событий
  try {
    const totalResponse = await fetch('http://localhost:8123/?query=SELECT%20count()%20as%20total,%20event_type%20FROM%20cryptocraze_analytics.user_events%20GROUP%20BY%20event_type');
    const totalText = await totalResponse.text();
    console.log('\n📊 Общая статистика событий:');
    console.log('   ', totalText);
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error.message);
  }
}

// Инструкции для пользователя
console.log('📋 Инструкции:');
console.log('1. Открой http://localhost:5173 в браузере');
console.log('2. Выполни авторизацию через Google');
console.log('3. Скрипт автоматически обнаружит событие логина\n');

waitForLogin();