// Простой тест для проверки системы аналитики
console.log('🧪 Тестируем аналитическую систему ClickHouse...\n');

async function testAnalytics() {
  const baseUrl = 'http://localhost:3000';

  try {
    // 1. Проверим статус ClickHouse
    console.log('1️⃣ Проверяем ClickHouse...');
    const clickhouseStatus = await fetch('http://localhost:8123/ping');
    console.log('   ✅ ClickHouse:', await clickhouseStatus.text());

    // 2. Проверим количество таблиц
    console.log('\n2️⃣ Проверяем таблицы...');
    const tablesResponse = await fetch('http://localhost:8123/?query=SHOW%20TABLES%20FROM%20cryptocraze_analytics');
    const tables = await tablesResponse.text();
    console.log('   📊 Таблицы:', tables.split('\n').filter(t => t).join(', '));

    // 3. Проверим данные
    console.log('\n3️⃣ Проверяем данные...');
    
    const userEventsCount = await fetch('http://localhost:8123/?query=SELECT%20count()%20FROM%20cryptocraze_analytics.user_events');
    console.log('   👥 События пользователей:', await userEventsCount.text());
    
    const dealsCount = await fetch('http://localhost:8123/?query=SELECT%20count()%20FROM%20cryptocraze_analytics.deals_analytics');  
    console.log('   📈 Сделки:', await dealsCount.text());

    // 4. Проверим admin API
    console.log('\n4️⃣ Проверяем Admin API...');
    try {
      const adminResponse = await fetch(`${baseUrl}/api/admin/analytics/overview-v2`);
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log('   ✅ Admin API работает! Данные:', JSON.stringify(adminData, null, 2));
      } else {
        console.log('   ❌ Admin API недоступен:', adminResponse.status);
      }
    } catch (e) {
      console.log('   ❌ Ошибка Admin API:', e.message);
    }

    // 5. Проверим авторизацию  
    console.log('\n5️⃣ Тестируем авторизацию...');
    try {
      const loginResponse = await fetch(`${baseUrl}/api/login`);
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('   ✅ Логин работает:', loginData.success ? 'Успешно' : 'Ошибка');
        
        // Подождем немного для записи в ClickHouse
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Проверим, добавилось ли событие
        const newUserEventsCount = await fetch('http://localhost:8123/?query=SELECT%20count()%20FROM%20cryptocraze_analytics.user_events');
        const newCount = await newUserEventsCount.text();
        console.log('   📊 События после логина:', newCount);
      } else {
        console.log('   ❌ Логин не работает:', loginResponse.status);
      }
    } catch (e) {
      console.log('   ❌ Ошибка логина:', e.message);
    }

    console.log('\n✨ Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testAnalytics();