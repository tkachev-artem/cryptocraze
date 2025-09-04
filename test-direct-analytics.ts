// Прямой тест логирования в ClickHouse
import { clickhouseAnalyticsService } from './server/services/clickhouseAnalyticsService.js';

async function testDirectLogging() {
  console.log('🔬 Прямое тестирование ClickHouse аналитики...\n');

  try {
    // 1. Инициализация схемы
    console.log('1️⃣ Инициализация схемы...');
    await clickhouseAnalyticsService.initializeSchema();
    console.log('   ✅ Схема инициализирована');

    // 2. Тест логирования пользовательского события
    console.log('\n2️⃣ Тестируем логирование события...');
    await clickhouseAnalyticsService.logUserEvent(
      999999, // тестовый ID пользователя
      'test_login',
      {
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
        source: 'direct_test'
      },
      'test-session-123'
    );
    console.log('   ✅ Событие login добавлено');

    // 3. Тест синхронизации сделки
    console.log('\n3️⃣ Тестируем синхронизацию сделки...');
    await clickhouseAnalyticsService.syncDeal({
      id: 999999,
      userId: '999999',
      symbol: 'BTCUSDT',
      direction: 'up' as const,
      amount: 100,
      multiplier: 5,
      openPrice: 45000,
      takeProfit: 46000,
      stopLoss: 44000,
      openedAt: new Date(),
      status: 'open' as const
    });
    console.log('   ✅ Тестовая сделка синхронизирована');

    // 4. Тест revenue события
    console.log('\n4️⃣ Тестируем revenue событие...');
    await clickhouseAnalyticsService.logRevenueEvent(
      999999,
      'ad',
      0.05,
      'USD'
    );
    console.log('   ✅ Revenue событие добавлено');

    // 5. Проверяем добавленные данные
    console.log('\n5️⃣ Проверяем добавленные данные...');
    
    // Ждем немного для async insert
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const overview = await clickhouseAnalyticsService.getDashboardOverview();
    console.log('   📊 Обновленная статистика:');
    console.log('      - События пользователей:', overview.engagement.totalEvents);
    console.log('      - Торговые сделки:', overview.trading.totalTrades);
    console.log('      - Доходы:', overview.revenue.totalRevenue);
    
    console.log('\n✨ Прямое тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

testDirectLogging();