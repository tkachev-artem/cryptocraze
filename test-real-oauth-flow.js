// Тест реального OAuth flow с мониторингом ClickHouse
import { createClient } from '@clickhouse/client';

const client = createClient({
  host: 'http://localhost:8123',
  database: 'cryptocraze_analytics',
  username: 'default',
  password: ''
});

let isMonitoring = true;

async function monitorLoginEvents() {
  console.log('🔍 Мониторинг login событий в ClickHouse...');
  console.log('📱 Откройте браузер и авторизуйтесь через Google: http://localhost:3001');
  console.log('⏰ Ожидание новых событий...\n');
  
  const startTime = Math.floor(Date.now() / 1000) - 60; // Начинаем с минуты назад
  let lastTimestamp = startTime;
  
  while (isMonitoring) {
    try {
      // Проверяем новые login события
      const query = `
        SELECT 
          event_id,
          user_id,
          event_type,
          event_data,
          timestamp,
          session_id,
          formatDateTime(toDateTime(timestamp), '%Y-%m-%d %H:%M:%S') as formatted_time
        FROM cryptocraze_analytics.user_events 
        WHERE event_type = 'login' 
        AND timestamp > ${lastTimestamp}
        ORDER BY timestamp DESC
        LIMIT 5
      `;
      
      const result = await client.query({
        query: query,
        format: 'JSONEachRow'
      });
      
      const rows = await result.json();
      
      if (rows.length > 0) {
        console.log(`🎉 Найдено ${rows.length} новых login событий:`);
        
        for (const row of rows) {
          console.log(`\n📋 Login событие:`);
          console.log(`   🆔 User ID: ${row.user_id}`);
          console.log(`   ⏰ Время: ${row.formatted_time}`);
          console.log(`   🔑 Session ID: ${row.session_id}`);
          console.log(`   📊 Данные: ${row.event_data}`);
          
          lastTimestamp = Math.max(lastTimestamp, row.timestamp);
        }
        
        console.log('\n✅ Login события успешно записываются в ClickHouse!');
        console.log('🔄 Продолжаем мониторинг...\n');
      }
      
      // Проверяем каждые 3 секунды
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.error('❌ Ошибка мониторинга:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function stopMonitoring() {
  console.log('\n🛑 Останавливаем мониторинг...');
  isMonitoring = false;
  process.exit(0);
}

// Обработчик выхода
process.on('SIGINT', stopMonitoring);
process.on('SIGTERM', stopMonitoring);

// Запускаем мониторинг
monitorLoginEvents().catch(console.error);