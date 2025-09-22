// Создание D1 retention данных для пользователя
const userId = '104134105374483317232';

async function createD1RetentionData() {
  console.log(`🎯 Создание D1 retention данных для пользователя: ${userId}\n`);
  
  // Вчерашняя дата (день регистрации)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0); // 10:00 утра вчера
  
  // Сегодняшняя дата (день возврата - D1)
  const today = new Date();
  today.setHours(15, 30, 0, 0); // 15:30 сегодня
  
  console.log(`📅 День регистрации: ${yesterday.toLocaleString()}`);
  console.log(`📅 День возврата (D1): ${today.toLocaleString()}\n`);
  
  // События регистрации (вчера)
  const registrationEvents = [
    { type: 'user_register', time: yesterday, data: { method: 'google_oauth' } },
    { type: 'first_open', time: new Date(yesterday.getTime() + 5000), data: { source: 'direct' } },
    { type: 'tutorial_start', time: new Date(yesterday.getTime() + 30000), data: { step: 1 } },
    { type: 'tutorial_complete', time: new Date(yesterday.getTime() + 300000), data: { completed: true } },
    { type: 'trade_open', time: new Date(yesterday.getTime() + 600000), data: { symbol: 'BTCUSDT', amount: 100 } }
  ];
  
  // События возврата (сегодня - D1)
  const returnEvents = [
    { type: 'login', time: today, data: { session_start: true } },
    { type: 'screen_view', time: new Date(today.getTime() + 10000), data: { screen: 'dashboard' } },
    { type: 'price_stream_start', time: new Date(today.getTime() + 20000), data: { symbols: ['BTCUSDT', 'ETHUSDT'] } },
    { type: 'trade_open', time: new Date(today.getTime() + 120000), data: { symbol: 'ETHUSDT', amount: 200 } },
    { type: 'daily_reward_claimed', time: new Date(today.getTime() + 300000), data: { reward: 50 } }
  ];
  
  console.log('📝 Создание событий регистрации (вчера)...');
  for (const event of registrationEvents) {
    await createAnalyticsEvent(event.type, event.data, event.time, 'RU'); // Россия
  }
  
  console.log('\n📝 Создание событий возврата (сегодня - D1)...');
  for (const event of returnEvents) {
    await createAnalyticsEvent(event.type, event.data, event.time, 'RU'); // Россия
  }
  
  console.log('\n✅ Все события созданы успешно!');
  console.log('\n🔍 Проверьте результат:');
  console.log('   1. Перейдите в Admin -> User Analytics');
  console.log('   2. Выберите метрику "D1 Retention"');
  console.log('   3. Пользователь 104134105374483317232 должен появиться в таблице');
  console.log('   4. В колонке "Region" будет "RU (Russia)"');
}

async function createAnalyticsEvent(eventType, eventData, timestamp, country) {
  const russianIP = '77.88.8.8'; // Yandex DNS (Россия)
  
  try {
    const response = await fetch('http://localhost:1111/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': russianIP,
        'X-Real-IP': russianIP,
        'User-Agent': 'RetentionTest/1.0'
      },
      body: JSON.stringify({
        events: [{
          eventType: eventType,
          eventData: {
            ...eventData,
            userId: userId,
            testData: true,
            country: country
          },
          sessionId: `retention-test-${userId}-${timestamp.getTime()}`,
          timestamp: timestamp.toISOString()
        }]
      })
    });

    if (response.ok) {
      console.log(`   ✅ ${eventType} (${timestamp.toLocaleTimeString()})`);
    } else {
      const error = await response.text();
      console.log(`   ❌ ${eventType}: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`   💥 ${eventType}: ${error.message}`);
  }
  
  // Небольшая задержка между запросами
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Также создадим запись пользователя в БД
async function createUserRecord() {
  console.log('👤 Создание записи пользователя в БД...\n');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  
  try {
    // Попробуем создать пользователя через analytics события
    await createAnalyticsEvent('user_register', {
      email: 'test.retention@example.com',
      firstName: 'Test User D1',
      method: 'test_data'
    }, yesterday, 'RU');
    
    console.log('✅ Запись пользователя создана');
  } catch (error) {
    console.log(`❌ Ошибка создания пользователя: ${error.message}`);
  }
}

async function runRetentionSetup() {
  console.log('🚀 Настройка D1 Retention для пользователя\n');
  console.log('=' .repeat(50));
  
  await createUserRecord();
  await createD1RetentionData();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 Настройка завершена!');
}

runRetentionSetup().catch(console.error);
