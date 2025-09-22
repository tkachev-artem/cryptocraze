// Скрипт для создания тестовых данных retention через API
async function createTestRetentionDataViaAPI() {
  try {
    const testUserId = '116069980752518862717';
    const baseUrl = 'http://localhost:1111/api';
    
    console.log('🔧 Creating test retention data via API...');
    console.log(`👤 Test user ID: ${testUserId}`);
    
    // Событие установки - 19.09.2025 (вчера)
    const installEvents = [
      {
        eventType: 'first_open',
        timestamp: '2025-09-19T10:00:00.000Z',
        data: { source: 'test', version: '1.0.0' }
      },
      {
        eventType: 'login',
        timestamp: '2025-09-19T10:01:00.000Z',
        data: { method: 'test' }
      }
    ];
    
    // Событие возврата D1 - 20.09.2025 (сегодня)
    const returnEvents = [
      {
        eventType: 'login',
        timestamp: '2025-09-20T14:30:00.000Z',
        data: { method: 'test', return_visit: true }
      },
      {
        eventType: 'page_view',
        timestamp: '2025-09-20T14:31:00.000Z',
        data: { page: 'dashboard' }
      }
    ];
    
    const allEvents = [...installEvents, ...returnEvents];
    
    console.log(`📊 Sending ${allEvents.length} events...`);
    
    // Отправляем события через API analytics/event
    for (const event of allEvents) {
      const response = await fetch(`${baseUrl}/analytics/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestScript/1.0'
        },
        body: JSON.stringify({
          userId: testUserId,
          eventType: event.eventType,
          eventData: event.data,
          timestamp: event.timestamp
        })
      });
      
      if (response.ok) {
        const result = await response.text();
        console.log(`✅ Event ${event.eventType} sent:`, result);
      } else {
        console.error(`❌ Failed to send ${event.eventType}:`, response.status, response.statusText);
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Events sent successfully:', result);
    } else {
      console.error('❌ Failed to send events:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
    
    // Подождем немного для обработки
    console.log('⏳ Waiting for data processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Проверим данные через dashboard API
    console.log('🔍 Checking D1 retention trend...');
    const trendResponse = await fetch(`${baseUrl}/admin/dashboard/metric/D1/trend?days=7`, {
      headers: {
        'Cookie': 'test-admin=true' // Для обхода авторизации в тестах
      }
    });
    
    if (trendResponse.ok) {
      const trendData = await trendResponse.json();
      console.log('📈 D1 Retention trend data:', JSON.stringify(trendData, null, 2));
    } else {
      console.log('⚠️ Could not fetch trend data (auth required)');
    }
    
    console.log('🎉 Test data creation completed!');
    console.log('📋 Summary:');
    console.log(`   - User: ${testUserId}`);
    console.log(`   - Install: 19.09.2025 10:00`);
    console.log(`   - Return: 20.09.2025 14:30`);
    console.log(`   - Expected D1 retention: User should appear in today's data`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Запускаем скрипт
createTestRetentionDataViaAPI();
