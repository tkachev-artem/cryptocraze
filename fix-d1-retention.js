// Исправление D1 retention данных для пользователя
const userId = '104134105374483317232';

async function fixD1RetentionData() {
  console.log(`🔧 Исправление D1 retention для пользователя: ${userId}\n`);
  
  // Сначала удалим существующие тестовые события
  console.log('🗑️ Удаление старых тестовых событий...');
  await deleteOldEvents();
  
  // Создадим события регистрации на вчера
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  
  console.log(`📅 Создание событий регистрации на: ${yesterday.toLocaleString()}`);
  await insertDirectAnalytics('user_register', yesterday, 'RU');
  await insertDirectAnalytics('first_open', new Date(yesterday.getTime() + 5000), 'RU');
  await insertDirectAnalytics('login', new Date(yesterday.getTime() + 10000), 'RU');
  await insertDirectAnalytics('tutorial_start', new Date(yesterday.getTime() + 30000), 'RU');
  
  // Создадим события возврата на сегодня
  const today = new Date();
  today.setHours(15, 30, 0, 0);
  
  console.log(`📅 Создание событий возврата на: ${today.toLocaleString()}`);
  await insertDirectAnalytics('login', today, 'RU');
  await insertDirectAnalytics('page_view', new Date(today.getTime() + 10000), 'RU');
  await insertDirectAnalytics('screen_view', new Date(today.getTime() + 20000), 'RU');
  
  console.log('\n✅ D1 retention данные исправлены!');
}

async function deleteOldEvents() {
  try {
    const response = await fetch('http://localhost:1111/api/test/delete-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    if (response.ok) {
      console.log('✅ Старые события удалены');
    } else {
      console.log('⚠️ Не удалось удалить через API, продолжаем...');
    }
  } catch (error) {
    console.log('⚠️ API недоступен, продолжаем...');
  }
}

async function insertDirectAnalytics(eventType, timestamp, country) {
  const russianIP = '77.88.8.8';
  
  try {
    const response = await fetch('http://localhost:1111/api/analytics/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': russianIP,
        'X-Real-IP': russianIP,
        'User-Agent': 'D1RetentionFix/1.0'
      },
      body: JSON.stringify({
        events: [{
          eventType: eventType,
          eventData: {
            userId: userId,
            country: country,
            d1_retention_test: true
          },
          sessionId: `d1-fix-${userId}-${timestamp.getTime()}`,
          timestamp: timestamp.toISOString()
        }]
      })
    });

    if (response.ok) {
      console.log(`   ✅ ${eventType} (${timestamp.toLocaleString()})`);
    } else {
      console.log(`   ❌ ${eventType}: ${response.status}`);
    }
  } catch (error) {
    console.log(`   💥 ${eventType}: ${error.message}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Также попробуем прямую вставку в БД через Docker
async function insertDirectToDB() {
  console.log('\n🔧 Прямая вставка в БД через Docker...');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(10, 0, 0, 0);
  
  const today = new Date();
  today.setHours(15, 30, 0, 0);
  
  const events = [
    { type: 'user_register', time: yesterday },
    { type: 'login', time: new Date(yesterday.getTime() + 10000) },
    { type: 'login', time: today },
    { type: 'page_view', time: new Date(today.getTime() + 10000) }
  ];
  
  for (const event of events) {
    console.log(`   📝 ${event.type} (${event.time.toLocaleString()})`);
  }
  
  console.log('\n💡 Выполните вручную в терминале:');
  console.log('docker exec cryptocraze-postgres-1 psql -U postgres -d crypto_analyzer -c "');
  events.forEach(event => {
    console.log(`INSERT INTO analytics (user_id, event_type, timestamp, country, session_id, event_data) VALUES ('${userId}', '${event.type}', '${event.time.toISOString()}', 'RU', 'manual-${event.time.getTime()}', '{}');`);
  });
  console.log('"');
}

async function runFix() {
  console.log('🚀 Исправление D1 Retention данных\n');
  console.log('=' .repeat(50));
  
  await fixD1RetentionData();
  await insertDirectToDB();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎉 Исправление завершено!');
  console.log('\n🔍 Проверьте результат в Admin -> User Analytics -> D1 Retention');
}

runFix().catch(console.error);
