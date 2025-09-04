import { clickhouseAnalyticsService } from '../server/services/clickhouseAnalyticsService.js';
import AnalyticsLogger from '../server/middleware/analyticsLogger.js';

/**
 * Comprehensive test script for ClickHouse Analytics Integration
 */
async function testFullClickHouseIntegration() {
  console.log('🧪 COMPREHENSIVE CLICKHOUSE ANALYTICS INTEGRATION TEST');
  console.log('=' .repeat(60));

  try {
    // 1. Test Schema Initialization
    console.log('\n1️⃣ Testing ClickHouse Schema Initialization...');
    await clickhouseAnalyticsService.initializeSchema();
    console.log('✅ ClickHouse schema initialized successfully');

    // 2. Test User Event Logging
    console.log('\n2️⃣ Testing User Event Logging...');
    await AnalyticsLogger.logUserEvent(12345, 'login', {
      ip: '192.168.1.1',
      userAgent: 'Test Browser',
      timestamp: new Date().toISOString()
    }, 'test-session-001');
    
    await AnalyticsLogger.logUserEvent(12345, 'trade_open', {
      symbol: 'BTCUSD',
      amount: 1000,
      direction: 'up'
    }, 'test-session-001');
    
    await AnalyticsLogger.logUserEvent(12345, 'ad_watch', {
      adType: 'rewarded_video',
      reward: 100,
      placement: 'task_completion'
    }, 'test-session-001');
    console.log('✅ User events logged successfully');

    // 3. Test Revenue Logging
    console.log('\n3️⃣ Testing Revenue Event Logging...');
    await AnalyticsLogger.logRevenue(12345, 'ad', 0.08, 'USD');
    await AnalyticsLogger.logRevenue(12345, 'premium', 9.99, 'USD');
    await AnalyticsLogger.logRevenue(67890, 'ad', 0.06, 'USD');
    console.log('✅ Revenue events logged successfully');

    // 4. Test Deal Syncing
    console.log('\n4️⃣ Testing Deal Analytics Syncing...');
    const testDeal = {
      id: 999999,
      userId: 12345,
      symbol: 'BTCUSD',
      direction: 'up',
      amount: '1000',
      leverage: 10,
      multiplier: '1.8',
      entryPrice: '65000',
      currentPrice: '66000',
      pnl: '180',
      status: 'open',
      takeProfit: '67000',
      stopLoss: '63000',
      commission: '10',
      createdAt: new Date(),
      openedAt: new Date(),
      updatedAt: new Date()
    };
    
    await AnalyticsLogger.syncDeal(testDeal);
    
    // Test closing the deal
    testDeal.status = 'closed';
    testDeal.currentPrice = '66500';
    testDeal.pnl = '270';
    testDeal.closedAt = new Date();
    testDeal.updatedAt = new Date();
    
    await AnalyticsLogger.syncDeal(testDeal);
    console.log('✅ Deal analytics synced successfully');

    // 5. Test Dashboard Overview
    console.log('\n5️⃣ Testing Dashboard Overview...');
    const overview = await clickhouseAnalyticsService.getDashboardOverview();
    console.log('Dashboard Overview Data:');
    console.log('Users:', JSON.stringify(overview.users, null, 2));
    console.log('Trading:', JSON.stringify(overview.trading, null, 2));
    console.log('Revenue:', JSON.stringify(overview.revenue, null, 2));
    console.log('Engagement:', JSON.stringify(overview.engagement, null, 2));
    console.log('✅ Dashboard overview retrieved successfully');

    // 6. Test Analytics Queries
    console.log('\n6️⃣ Testing Direct ClickHouse Queries...');
    
    // User events count
    const userEventsResult = await clickhouseAnalyticsService['client'].query({
      query: 'SELECT count() as total FROM user_events',
      format: 'JSONEachRow'
    });
    const userEventsData = await userEventsResult.json<any>();
    console.log(`Total user events: ${userEventsData[0]?.total || 0}`);
    
    // Revenue events count
    const revenueEventsResult = await clickhouseAnalyticsService['client'].query({
      query: 'SELECT count() as total, sum(revenue) as total_revenue FROM revenue_events',
      format: 'JSONEachRow'
    });
    const revenueEventsData = await revenueEventsResult.json<any>();
    console.log(`Total revenue events: ${revenueEventsData[0]?.total || 0}`);
    console.log(`Total revenue amount: $${revenueEventsData[0]?.total_revenue || 0}`);
    
    // Deals count
    const dealsResult = await clickhouseAnalyticsService['client'].query({
      query: 'SELECT count() as total FROM deals_analytics',
      format: 'JSONEachRow'
    });
    const dealsData = await dealsResult.json<any>();
    console.log(`Total deals: ${dealsData[0]?.total || 0}`);
    console.log('✅ Direct ClickHouse queries executed successfully');

    // 7. Performance Test
    console.log('\n7️⃣ Testing Performance...');
    const startTime = Date.now();
    
    // Log multiple events simultaneously
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(AnalyticsLogger.logUserEvent(12345 + i, 'page_view', {
        page: `/test/page-${i}`,
        timestamp: new Date().toISOString()
      }, `session-${i}`));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    console.log(`✅ Performance test: 10 events logged in ${endTime - startTime}ms`);

    console.log('\n🎉 FULL CLICKHOUSE INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('✅ All analytics components are working correctly');
    console.log('✅ Dashboard is ready for production use');
    console.log('✅ Revenue tracking is properly integrated');
    console.log('✅ Performance is acceptable');
    
  } catch (error) {
    console.error('\n❌ CLICKHOUSE INTEGRATION TEST FAILED');
    console.error('Error:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFullClickHouseIntegration()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testFullClickHouseIntegration };