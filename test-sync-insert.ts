import { createClient } from '@clickhouse/client';

async function testSyncInsert() {
  console.log('🔄 Тестируем синхронную вставку в ClickHouse...\n');

  const client = createClient({
    url: 'http://localhost:8123',
    database: 'cryptocraze_analytics',
    username: 'default',
    password: '',
    clickhouse_settings: {
      // Синхронные настройки
      async_insert: 0,
      wait_for_async_insert: 0,
    }
  });

  try {
    // Тест вставки события
    console.log('1️⃣ Вставляем тестовое событие...');
    await client.insert({
      table: 'user_events',
      values: [{
        event_id: 'test-event-sync-' + Date.now(),
        user_id: 888888,
        event_type: 'test_sync_login',
        event_data: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        session_id: 'sync-test-session',
        timestamp: Math.floor(Date.now() / 1000)
      }],
      format: 'JSONEachRow'
    });
    console.log('   ✅ Событие вставлено');

    // Проверяем результат
    console.log('\n2️⃣ Проверяем вставленные данные...');
    const result = await client.query({
      query: 'SELECT count() as total FROM user_events',
      format: 'JSONEachRow'
    });
    
    const data = await result.json();
    console.log('   📊 Общее количество событий:', data[0].total);

    // Проверяем наше событие
    const ourEvent = await client.query({
      query: "SELECT * FROM user_events WHERE event_type = 'test_sync_login'",
      format: 'JSONEachRow'
    });
    
    const eventData = await ourEvent.json();
    console.log('   🎯 Найдено наших событий:', eventData.length);
    if (eventData.length > 0) {
      console.log('   📝 Данные события:', eventData[0]);
    }

    console.log('\n✨ Синхронный тест завершен!');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await client.close();
  }
}

testSyncInsert();