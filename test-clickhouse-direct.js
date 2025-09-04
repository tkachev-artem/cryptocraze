// Прямой тест ClickHouse вставки событий
import { createClient } from '@clickhouse/client';

const client = createClient({
  host: 'http://localhost:8123',
});

async function testDirectInsert() {
  console.log('🔧 Тестируем прямую вставку в ClickHouse...');
  
  try {
    // Проверяем подключение
    console.log('1️⃣ Проверяем подключение...');
    const pingResult = await client.ping();
    console.log('✅ Подключение успешно:', pingResult.success);
    
    // Создаем базу если нужно
    console.log('2️⃣ Создаем базу данных...');
    await client.exec({
      query: 'CREATE DATABASE IF NOT EXISTS cryptocraze_analytics'
    });
    
    // Переключаемся на базу
    await client.exec({
      query: 'USE cryptocraze_analytics'
    });
    
    // Создаем таблицу если нужно
    console.log('3️⃣ Создаем таблицу user_events...');
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS user_events (
          event_id String,
          user_id UInt64,
          event_type LowCardinality(String),
          event_data String,
          session_id String,
          timestamp DateTime64(3),
          created_at DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (user_id, event_type, timestamp)
        PRIMARY KEY (user_id, event_type, timestamp)
        TTL created_at + INTERVAL 30 DAY DELETE
      `
    });
    
    // Вставляем тестовое событие
    console.log('4️⃣ Вставляем тестовое событие...');
    const testEvent = {
      event_id: `test-${Date.now()}`,
      user_id: 123456789,
      event_type: 'test_direct_insert',
      event_data: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      session_id: `test-session-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };
    
    console.log('📋 Данные для вставки:', JSON.stringify(testEvent, null, 2));
    
    await client.insert({
      table: 'cryptocraze_analytics.user_events',
      values: [testEvent],
      format: 'JSONEachRow'
    });
    
    console.log('✅ Событие вставлено успешно!');
    
    // Проверяем что событие записалось
    console.log('5️⃣ Проверяем что событие записалось...');
    const result = await client.query({
      query: `
        SELECT * FROM cryptocraze_analytics.user_events 
        WHERE event_type = 'test_direct_insert' 
        ORDER BY timestamp DESC 
        LIMIT 1
      `,
      format: 'JSONEachRow'
    });
    
    const rows = await result.json();
    console.log('📊 Найденные события:', rows);
    
    if (rows.length > 0) {
      console.log('✅ Тест успешно завершен! ClickHouse работает корректно.');
    } else {
      console.log('❌ Событие не найдено в ClickHouse');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
    console.error('❌ Детали ошибки:', error?.message);
    console.error('❌ Стек ошибки:', error?.stack);
  } finally {
    await client.close();
  }
}

testDirectInsert();