"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("../db.js");
const clickhouseClient_js_1 = require("../services/clickhouseClient.js");
async function safeDelete(tableName) {
    try {
        await db_js_1.pool.query(`DELETE FROM ${tableName}`);
        console.log(`  ✅ Cleared ${tableName}`);
    }
    catch (error) {
        if (error.code === '42P01') { // Table does not exist
            console.log(`  ⚠️ Table ${tableName} does not exist - skipping`);
        }
        else {
            console.log(`  ❌ Error clearing ${tableName}:`, error.message);
        }
    }
}
async function clearPostgreSQLData() {
    console.log('🗄️ Clearing PostgreSQL database data...');
    // Clear core data tables
    console.log('🧹 Clearing core data tables...');
    await safeDelete('deals');
    await safeDelete('analytics');
    // Clear all BI analytics tables
    console.log('📈 Clearing BI analytics tables...');
    await safeDelete('user_sessions');
    await safeDelete('user_acquisition');
    await safeDelete('daily_metrics');
    await safeDelete('user_cohorts');
    await safeDelete('user_daily_stats');
    await safeDelete('cohort_analysis');
    await safeDelete('user_acquisition_metrics');
    await safeDelete('engagement_metrics');
    // Clear ad system data
    console.log('📺 Clearing ad system data...');
    await safeDelete('ad_rewards');
    await safeDelete('ad_sessions');
    await safeDelete('ad_events');
    await safeDelete('ad_performance_metrics');
    // Clear box opening history
    console.log('📦 Clearing box openings...');
    await safeDelete('box_openings');
    // Clear user tasks
    console.log('📋 Clearing user tasks...');
    await safeDelete('user_tasks');
    // Clear notifications
    console.log('🔔 Clearing notifications...');
    await safeDelete('user_notifications');
    // Reset user counters and balances
    console.log('👤 Resetting user counters...');
    await db_js_1.pool.query(`
    UPDATE users SET 
      trades_count = 0, 
      max_profit = 0, 
      max_loss = 0,
      total_trades_volume = 0,
      successful_trades_percentage = 0,
      average_trade_amount = 0,
      coins = 50000, 
      balance = 50000, 
      free_balance = 30000, 
      rewards_count = 0,
      rating_score = 0,
      rating_rank_30_days = NULL,
      energy_tasks_bonus = 0,
      is_premium = false,
      premium_expires_at = NULL
  `);
    console.log('✅ PostgreSQL data cleared successfully!');
}
async function clearClickHouseData() {
    console.log('⚡ Clearing ClickHouse analytics data...');
    try {
        // Test connection first
        const connectionTest = await (0, clickhouseClient_js_1.testClickHouseConnection)();
        if (!connectionTest.success) {
            console.log('⚠️ ClickHouse connection failed, skipping ClickHouse data clearing');
            console.log('Error:', connectionTest.error);
            return;
        }
        const client = (0, clickhouseClient_js_1.getClickHouseClient)();
        // Clear all ClickHouse analytics tables
        console.log('🔥 Clearing ClickHouse user_events...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.user_events' });
        console.log('📈 Clearing ClickHouse deals_analytics...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.deals_analytics' });
        console.log('👥 Clearing ClickHouse users_analytics...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.users_analytics' });
        console.log('📊 Clearing ClickHouse daily_user_stats...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.daily_user_stats' });
        console.log('📉 Clearing ClickHouse daily_metrics...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.daily_metrics' });
        console.log('💰 Clearing ClickHouse revenue_events...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.revenue_events' });
        console.log('📺 Clearing ClickHouse ad_events...');
        await client.command({ query: 'TRUNCATE TABLE IF EXISTS cryptocraze_analytics.ad_events' });
        console.log('✅ ClickHouse data cleared successfully!');
    }
    catch (error) {
        console.error('❌ Error clearing ClickHouse data:', error);
        console.log('⚠️ Continuing with PostgreSQL cleanup...');
    }
    finally {
        await (0, clickhouseClient_js_1.closeClickHouseConnection)();
    }
}
async function clearDashboard() {
    try {
        console.log('🚀 Starting complete dashboard data clearing...\n');
        // Clear PostgreSQL data
        await clearPostgreSQLData();
        console.log('');
        // Clear ClickHouse data
        await clearClickHouseData();
        console.log('');
        console.log('🎉 Complete dashboard clearing finished!');
        console.log('📋 Summary of cleared data:');
        console.log('  ✅ All deals and trading history');
        console.log('  ✅ All analytics events and metrics');
        console.log('  ✅ All user sessions and acquisition data');
        console.log('  ✅ All ad performance and revenue data');
        console.log('  ✅ All box openings and user tasks');
        console.log('  ✅ All notifications');
        console.log('  ✅ User counters reset to default values');
        console.log('  ✅ ClickHouse analytics tables cleared');
        console.log('');
        console.log('🔄 Users can now test the application from scratch with clean data!');
    }
    catch (error) {
        console.error('❌ Error during dashboard clearing:', error);
        process.exit(1);
    }
    finally {
        await db_js_1.pool.end();
        process.exit(0);
    }
}
clearDashboard();
