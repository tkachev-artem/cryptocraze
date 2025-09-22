import { clickhouseAnalyticsService } from './server/services/clickhouseAnalyticsService';

async function createTestRetentionData() {
  try {
    console.log('🔧 Initializing ClickHouse...');
    await clickhouseAnalyticsService.initializeSchema();
    
    const testUserId = '116069980752518862717';
    const sessionId = 'test-session-' + Date.now();
    
    // Создание аккаунта 19.09.2025 (вчера)
    const installDate = new Date('2025-09-19T10:00:00Z');
    console.log(`📅 Creating install event for user ${testUserId} on ${installDate.toISOString()}`);
    
    // Симулируем событие установки с правильной датой
    const client: any = (clickhouseAnalyticsService as any).getClient();
    
    // Событие установки (19.09.2025)
    const installEvent = {
      event_id: 'test-install-' + Date.now(),
      user_id: testUserId,
      event_type: 'first_open',
      event_name: 'first_open',
      event_data: JSON.stringify({ source: 'test' }),
      session_id: sessionId + '-install',
      timestamp: installDate.toISOString().slice(0, 19).replace('T', ' '),
      date: installDate.toISOString().slice(0, 10),
      properties: JSON.stringify({})
    };
    
    await client.insert({
      table: 'cryptocraze_analytics.user_events',
      values: [installEvent],
      format: 'JSONEachRow'
    });
    
    console.log('✅ Install event created');
    
    // Событие возврата D1 (20.09.2025 - сегодня)
    const returnDate = new Date('2025-09-20T14:30:00Z');
    console.log(`📅 Creating return event for user ${testUserId} on ${returnDate.toISOString()}`);
    
    const returnEvent = {
      event_id: 'test-return-' + Date.now(),
      user_id: testUserId,
      event_type: 'session_start',
      event_name: 'session_start',
      event_data: JSON.stringify({ type: 'return_visit' }),
      session_id: sessionId + '-return',
      timestamp: returnDate.toISOString().slice(0, 19).replace('T', ' '),
      date: returnDate.toISOString().slice(0, 10),
      properties: JSON.stringify({})
    };
    
    await client.insert({
      table: 'cryptocraze_analytics.user_events',
      values: [returnEvent],
      format: 'JSONEachRow'
    });
    
    console.log('✅ Return event created');
    
    // Проверяем, что данные добавились
    console.log('🔍 Checking inserted data...');
    const checkQuery = `
      SELECT 
        user_id, 
        event_type, 
        event_name,
        date, 
        timestamp
      FROM cryptocraze_analytics.user_events 
      WHERE user_id = '${testUserId}' 
      ORDER BY timestamp
    `;
    
    const response = await client.query({ query: checkQuery, format: 'JSONEachRow' });
    const rows = await response.json();
    
    console.log('📊 Inserted events:');
    rows.forEach((row: any, index: number) => {
      console.log(`  ${index + 1}. ${row.event_type} (${row.event_name}) - ${row.date} ${row.timestamp}`);
    });
    
    console.log('🎉 Test data created successfully!');
    console.log('📈 Now check D1 retention in the admin dashboard');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Запускаем скрипт
createTestRetentionData();
