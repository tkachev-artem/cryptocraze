/**
 * Автотесты для Admin Dashboard
 * Проверяет все метрики и их правильность
 */

const API_BASE = 'http://localhost:3001';

// Утилита для HTTP запросов
async function makeRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Утилита для создания тестового события
async function createTestEvent(userId, eventType, eventData = {}) {
  return makeRequest('/api/test/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, eventType, eventData })
  });
}

// Тест 1: Проверка доступности эндпоинта
async function testDashboardEndpoint() {
  console.log('🔍 Test 1: Dashboard endpoint accessibility');
  
  try {
    const data = await makeRequest('/api/admin/analytics/overview-v2');
    console.log('✅ Dashboard endpoint is accessible');
    console.log(`📊 Data source: ${data.dataSource}`);
    console.log(`🕒 Last updated: ${data.lastUpdated}`);
    return data;
  } catch (error) {
    console.log('❌ Dashboard endpoint failed:', error.message);
    throw error;
  }
}

// Тест 2: Проверка структуры данных
async function testDataStructure(dashboardData) {
  console.log('\n🔍 Test 2: Data structure validation');
  
  const expectedSections = ['users', 'trading', 'revenue', 'engagement', 'adMetrics'];
  const missingSections = expectedSections.filter(section => !dashboardData[section]);
  
  if (missingSections.length > 0) {
    console.log(`❌ Missing sections: ${missingSections.join(', ')}`);
    return false;
  }
  
  console.log('✅ All required data sections present');
  
  // Проверка пользовательских метрик
  const userMetrics = ['total_users', 'daily_active_users', 'retention_d1', 'retention_d7'];
  const missingUserMetrics = userMetrics.filter(metric => dashboardData.users[metric] === undefined);
  
  if (missingUserMetrics.length > 0) {
    console.log(`❌ Missing user metrics: ${missingUserMetrics.join(', ')}`);
    return false;
  }
  
  console.log('✅ All user metrics present');
  return true;
}

// Тест 3: Проверка tutorial метрик
async function testTutorialMetrics() {
  console.log('\n🔍 Test 3: Tutorial metrics functionality');
  
  // Создаем тестовые события туториала
  console.log('📝 Creating tutorial events...');
  await createTestEvent('test_tutorial_1', 'tutorial_progress', { action: 'start', step: 'main_tutorial' });
  await createTestEvent('test_tutorial_1', 'tutorial_progress', { action: 'skip', step: 'main_tutorial' });
  await createTestEvent('test_tutorial_2', 'tutorial_progress', { action: 'start', step: 'main_tutorial' });
  await createTestEvent('test_tutorial_2', 'tutorial_progress', { action: 'complete', step: 'main_tutorial' });
  
  // Ждем немного для обработки
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const data = await makeRequest('/api/admin/analytics/overview-v2');
  const { tutorialCompletionRate, tutorialSkipRate } = data.engagement;
  
  console.log(`📊 Tutorial Completion Rate: ${(tutorialCompletionRate * 100).toFixed(1)}%`);
  console.log(`📊 Tutorial Skip Rate: ${(tutorialSkipRate * 100).toFixed(1)}%`);
  
  if (tutorialCompletionRate > 0 && tutorialSkipRate > 0) {
    console.log('✅ Tutorial metrics working correctly');
    return true;
  } else {
    console.log('❌ Tutorial metrics not updating');
    return false;
  }
}

// Тест 4: Проверка retention метрик
async function testRetentionMetrics() {
  console.log('\n🔍 Test 4: Retention metrics functionality');
  
  // Создаем события регистрации и активности
  console.log('📝 Creating retention events...');
  await createTestEvent('test_retention_1', 'user_register', { registrationMethod: 'test' });
  await createTestEvent('test_retention_1', 'login', { timestamp: new Date().toISOString() });
  await createTestEvent('test_retention_2', 'user_register', { registrationMethod: 'test' });
  await createTestEvent('test_retention_2', 'screen_view', { screen: '/dashboard' });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const data = await makeRequest('/api/admin/analytics/overview-v2');
  const { retention_d1, retention_d7, retention_d30 } = data.users;
  
  console.log(`📊 Day 1 Retention: ${(retention_d1 * 100).toFixed(1)}%`);
  console.log(`📊 Day 7 Retention: ${(retention_d7 * 100).toFixed(1)}%`);
  console.log(`📊 Day 30 Retention: ${(retention_d30 * 100).toFixed(1)}%`);
  
  if (retention_d1 !== null && retention_d1 >= 0) {
    console.log('✅ Retention metrics working correctly');
    return true;
  } else {
    console.log('❌ Retention metrics not updating');
    return false;
  }
}

// Тест 5: Проверка ad метрик
async function testAdMetrics() {
  console.log('\n🔍 Test 5: Ad metrics functionality');
  
  console.log('📝 Creating ad events...');
  await createTestEvent('test_ad_1', 'ad_impression', { adType: 'banner' });
  await createTestEvent('test_ad_1', 'ad_click', { adType: 'banner' });
  await createTestEvent('test_ad_1', 'app_install', { platform: 'web' });
  await createTestEvent('test_ad_2', 'ad_impression', { adType: 'video' });
  await createTestEvent('test_ad_2', 'ad_engagement', { action: 'watch_complete' });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const data = await makeRequest('/api/admin/analytics/overview-v2');
  const { totalImpressions, totalClicks, totalInstalls, avgCTR } = data.adMetrics;
  
  console.log(`📊 Total Impressions: ${totalImpressions}`);
  console.log(`📊 Total Clicks: ${totalClicks}`);
  console.log(`📊 Total Installs: ${totalInstalls}`);
  console.log(`📊 Average CTR: ${(avgCTR * 100).toFixed(2)}%`);
  
  if (totalImpressions > 0 && totalClicks > 0) {
    console.log('✅ Ad metrics working correctly');
    return true;
  } else {
    console.log('❌ Ad metrics not updating');
    return false;
  }
}

// Тест 6: Проверка screen view метрик
async function testScreenViewMetrics() {
  console.log('\n🔍 Test 6: Screen view metrics functionality');
  
  console.log('📝 Creating screen view events...');
  await createTestEvent('test_screen_1', 'screen_view', { screen: '/dashboard' });
  await createTestEvent('test_screen_1', 'screen_view', { screen: '/trade' });
  await createTestEvent('test_screen_1', 'screen_view', { screen: '/admin' });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const data = await makeRequest('/api/admin/analytics/overview-v2');
  const { screensOpened } = data.engagement;
  
  console.log(`📊 Screens Opened: ${screensOpened}`);
  
  if (screensOpened > 0) {
    console.log('✅ Screen view metrics working correctly');
    return true;
  } else {
    console.log('❌ Screen view metrics not updating');
    return false;
  }
}

// Тест 7: Проверка торговых метрик
async function testTradingMetrics() {
  console.log('\n🔍 Test 7: Trading metrics functionality');
  
  console.log('📝 Creating trading events...');
  await createTestEvent('test_trader_1', 'trade_open', { 
    symbol: 'BTCUSDT', 
    amount: 100, 
    direction: 'up',
    leverage: 10 
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const data = await makeRequest('/api/admin/analytics/overview-v2');
  const { totalTrades, activeDeals, tradingUsers, successRate } = data.trading;
  
  console.log(`📊 Total Trades: ${totalTrades}`);
  console.log(`📊 Active Deals: ${activeDeals}`);
  console.log(`📊 Trading Users: ${tradingUsers}`);
  console.log(`📊 Success Rate: ${successRate}%`);
  
  if (totalTrades > 0) {
    console.log('✅ Trading metrics working correctly');
    return true;
  } else {
    console.log('❌ Trading metrics not updating');
    return false;
  }
}

// Тест 8: Проверка производительности
async function testPerformance() {
  console.log('\n🔍 Test 8: Dashboard performance test');
  
  const startTime = Date.now();
  await makeRequest('/api/admin/analytics/overview-v2');
  const endTime = Date.now();
  
  const responseTime = endTime - startTime;
  console.log(`⚡ Response time: ${responseTime}ms`);
  
  if (responseTime < 5000) {
    console.log('✅ Dashboard performance is acceptable');
    return true;
  } else {
    console.log('❌ Dashboard response too slow');
    return false;
  }
}

// Основная функция тестирования
async function runAllTests() {
  console.log('🚀 Starting Admin Dashboard Automated Tests\n');
  
  const testResults = [];
  
  try {
    // Тест 1: Доступность эндпоинта
    const dashboardData = await testDashboardEndpoint();
    testResults.push({ name: 'Endpoint Access', passed: true });
    
    // Тест 2: Структура данных
    const structureValid = await testDataStructure(dashboardData);
    testResults.push({ name: 'Data Structure', passed: structureValid });
    
    // Тест 3: Tutorial метрики
    const tutorialWorking = await testTutorialMetrics();
    testResults.push({ name: 'Tutorial Metrics', passed: tutorialWorking });
    
    // Тест 4: Retention метрики
    const retentionWorking = await testRetentionMetrics();
    testResults.push({ name: 'Retention Metrics', passed: retentionWorking });
    
    // Тест 5: Ad метрики
    const adWorking = await testAdMetrics();
    testResults.push({ name: 'Ad Metrics', passed: adWorking });
    
    // Тест 6: Screen view метрики
    const screenWorking = await testScreenViewMetrics();
    testResults.push({ name: 'Screen View Metrics', passed: screenWorking });
    
    // Тест 7: Trading метрики
    const tradingWorking = await testTradingMetrics();
    testResults.push({ name: 'Trading Metrics', passed: tradingWorking });
    
    // Тест 8: Производительность
    const performanceOk = await testPerformance();
    testResults.push({ name: 'Performance', passed: performanceOk });
    
  } catch (error) {
    console.log(`❌ Critical error during testing: ${error.message}`);
    testResults.push({ name: 'Critical Error', passed: false, error: error.message });
  }
  
  // Сводка результатов
  console.log('\n📋 Test Results Summary:');
  console.log('═'.repeat(50));
  
  let passedTests = 0;
  testResults.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${result.name.padEnd(20)} | ${status}`);
    if (result.passed) passedTests++;
  });
  
  console.log('═'.repeat(50));
  console.log(`Total: ${passedTests}/${testResults.length} tests passed`);
  
  if (passedTests === testResults.length) {
    console.log('🎉 All tests passed! Admin Dashboard is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }
  
  return testResults;
}

// Экспорт для использования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests };
} else {
  // Запуск при прямом выполнении
  runAllTests().catch(console.error);
}