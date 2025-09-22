// Создание тестовых аналитических данных с разными IP адресами для демонстрации геолокации

const testData = [
  { ip: '8.8.8.8', country: 'US', events: ['login', 'trade_open', 'screen_view'] },
  { ip: '77.88.8.8', country: 'RU', events: ['login', 'tutorial_start', 'ad_watch'] },
  { ip: '94.142.241.111', country: 'DE', events: ['login', 'price_stream_start', 'order_open'] },
  { ip: '46.36.218.186', country: 'GB', events: ['login', 'daily_reward_claimed', 'screen_view'] },
  { ip: '185.60.216.35', country: 'FR', events: ['login', 'trade_open', 'tutorial_complete'] },
  { ip: '203.0.113.1', country: 'AU', events: ['login', 'ad_watch', 'order_close_manual'] },
  { ip: '198.51.100.1', country: 'CA', events: ['login', 'premium_purchase', 'screen_view'] },
  { ip: '192.0.2.1', country: 'JP', events: ['login', 'trade_open', 'ads_consent'] }
];

async function createTestAnalytics() {
  console.log('🚀 Создание тестовых аналитических данных с геолокацией...\n');

  for (let i = 0; i < testData.length; i++) {
    const { ip, country, events } = testData[i];
    
    console.log(`📍 Создаем данные для ${country} (IP: ${ip})`);
    
    for (const eventType of events) {
      try {
        const response = await fetch('http://localhost:1111/api/analytics/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip,
            'X-Real-IP': ip,
            'User-Agent': `TestBot-${country}/1.0`
          },
          body: JSON.stringify({
            events: [{
              eventType: eventType,
              eventData: { 
                testData: true,
                country: country,
                sourceIP: ip,
                timestamp: new Date().toISOString()
              },
              sessionId: `test-session-${country}-${Date.now()}`,
              timestamp: new Date().toISOString()
            }]
          })
        });

        if (response.ok) {
          console.log(`   ✅ ${eventType}`);
        } else {
          const error = await response.text();
          console.log(`   ❌ ${eventType}: ${response.status} - ${error}`);
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   💥 ${eventType}: ${error.message}`);
      }
    }
    
    console.log(''); // Пустая строка для разделения
  }
}

async function createTestUsers() {
  console.log('👥 Создание тестовых пользователей...\n');
  
  const testUsers = [
    { country: 'US', email: 'user.usa@test.com', name: 'John Smith' },
    { country: 'RU', email: 'user.russia@test.com', name: 'Иван Петров' },
    { country: 'DE', email: 'user.germany@test.com', name: 'Hans Mueller' },
    { country: 'GB', email: 'user.uk@test.com', name: 'James Wilson' },
    { country: 'FR', email: 'user.france@test.com', name: 'Pierre Dubois' }
  ];

  for (const user of testUsers) {
    const testIP = testData.find(d => d.country === user.country)?.ip || '127.0.0.1';
    
    try {
      const response = await fetch('http://localhost:1111/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': testIP,
          'X-Real-IP': testIP,
          'User-Agent': `TestUser-${user.country}/1.0`
        },
        body: JSON.stringify({
          events: [{
            eventType: 'user_register',
            eventData: { 
              email: user.email,
              name: user.name,
              country: user.country,
              testUser: true
            },
            sessionId: `registration-${user.country}-${Date.now()}`,
            timestamp: new Date().toISOString()
          }]
        })
      });

      if (response.ok) {
        console.log(`✅ Пользователь ${user.name} (${user.country})`);
      } else {
        console.log(`❌ Ошибка создания ${user.name}: ${response.status}`);
      }
    } catch (error) {
      console.log(`💥 Ошибка ${user.name}: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function runTestDataCreation() {
  console.log('🌍 Создание тестовых данных для демонстрации геолокации\n');
  console.log('=' .repeat(60));
  
  await createTestAnalytics();
  
  console.log('=' .repeat(60));
  await createTestUsers();
  
  console.log('=' .repeat(60));
  console.log('✅ Создание тестовых данных завершено!\n');
  console.log('🔍 Теперь можно проверить результаты:');
  console.log('   1. Откройте http://localhost:1111');
  console.log('   2. Войдите как админ (exsiseprogram@gmail.com)');
  console.log('   3. Перейдите в Admin -> User Analytics');
  console.log('   4. Выберите любую метрику (например, Sessions)');
  console.log('   5. В таблице увидите колонку "Region" с разными странами:');
  console.log('      • US (United States)');
  console.log('      • RU (Russia)');  
  console.log('      • DE (Germany)');
  console.log('      • GB (United Kingdom)');
  console.log('      • FR (France)');
  console.log('      • AU (Australia)');
  console.log('      • CA (Canada)');
  console.log('      • JP (Japan)\n');
}

runTestDataCreation().catch(console.error);
