// Прямой тест AnalyticsLogger
import AnalyticsLogger from './server/middleware/analyticsLogger.ts';

async function testAnalyticsLoggerDirect() {
  console.log('🔧 Тестируем AnalyticsLogger напрямую...');
  
  try {
    console.log('1️⃣ Вызываем AnalyticsLogger.logUserEvent...');
    
    await AnalyticsLogger.logUserEvent(
      999999999, // test user ID
      'test_direct_logger',
      {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'direct_test'
      },
      `direct-test-session-${Date.now()}`
    );
    
    console.log('✅ AnalyticsLogger.logUserEvent выполнен без ошибок');
    
    // Проверяем что событие записалось
    console.log('2️⃣ Проверяем что событие записалось в ClickHouse...');
    
    // Ждем немного для async insert
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch('http://localhost:8123/?query=SELECT%20*%20FROM%20cryptocraze_analytics.user_events%20WHERE%20event_type%20=%20%27test_direct_logger%27%20ORDER%20BY%20timestamp%20DESC%20LIMIT%201');
    const text = await response.text();
    
    console.log('📊 Результат запроса:', text);
    
    if (text.trim() && !text.includes('Code:')) {
      console.log('✅ Событие найдено в ClickHouse!');
    } else {
      console.log('❌ Событие не найдено в ClickHouse');
    }
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
    console.error('❌ Детали ошибки:', error?.message);
    console.error('❌ Стек ошибки:', error?.stack);
  }
}

testAnalyticsLoggerDirect();