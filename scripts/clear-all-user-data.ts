#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { 
  users, 
  deals, 
  userTasks, 
  userNotifications,
  rewardClaims,
  userDailyStats,
  premiumSubscriptions
} from '../shared/schema.js';
import { getClickHouseClient, closeClickHouseConnection } from '../server/services/clickhouseClient.js';

console.log('🧹 Starting complete user data cleanup...');

async function clearPostgreSQLData() {
  console.log('📊 Clearing PostgreSQL data...');
  
  // Clear all user-related data in proper order (respecting foreign keys)
  
  console.log('  🗑️  Clearing user notifications...');
  await db.delete(userNotifications);
  
  console.log('  🗑️  Clearing user tasks...');
  await db.delete(userTasks);
  
  console.log('  🗑️  Clearing deals...');
  await db.delete(deals);
  
  console.log('  🗑️  Clearing reward claims...');
  await db.delete(rewardClaims);
  
  console.log('  🗑️  Clearing user daily stats...');
  await db.delete(userDailyStats);
  
  console.log('  🗑️  Clearing premium subscriptions...');
  await db.delete(premiumSubscriptions);
  
  console.log('  🗑️  Clearing users...');
  await db.delete(users);
  
  console.log('✅ PostgreSQL data cleared');
}

async function clearClickHouseData() {
  console.log('📊 Clearing ClickHouse data...');
  
  try {
    const client = getClickHouseClient();
    
    console.log('  🗑️  Clearing user_events...');
    await client.exec({ query: 'TRUNCATE TABLE cryptocraze_analytics.user_events' });
    
    console.log('  🗑️  Clearing deals_analytics...');
    await client.exec({ query: 'TRUNCATE TABLE cryptocraze_analytics.deals_analytics' });
    
    console.log('  🗑️  Clearing revenue_events...');
    await client.exec({ query: 'TRUNCATE TABLE cryptocraze_analytics.revenue_events' });
    
    console.log('  🗑️  Clearing daily_metrics...');
    await client.exec({ query: 'TRUNCATE TABLE cryptocraze_analytics.daily_metrics' });
    
    console.log('  🗑️  Clearing ad_events...');
    await client.exec({ query: 'TRUNCATE TABLE cryptocraze_analytics.ad_events' });
    
    console.log('✅ ClickHouse data cleared');
    
  } catch (error) {
    console.error('❌ Error clearing ClickHouse data:', error);
    if ((error as Error).message.includes('DISABLE_CLICKHOUSE')) {
      console.log('ℹ️  ClickHouse is disabled, skipping cleanup');
    } else {
      throw error;
    }
  } finally {
    await closeClickHouseConnection();
  }
}

async function main() {
  try {
    // Clear PostgreSQL data first
    await clearPostgreSQLData();
    
    // Clear ClickHouse data
    await clearClickHouseData();
    
    console.log('🎉 All user data cleared successfully!');
    
    // Show final counts
    console.log('\n📊 Final verification:');
    
    const userCount = await db.select().from(users);
    console.log(`  👥 Users: ${userCount.length}`);
    
    const dealCount = await db.select().from(deals);
    console.log(`  💼 Deals: ${dealCount.length}`);
    
    const taskCount = await db.select().from(userTasks);
    console.log(`  📋 Tasks: ${taskCount.length}`);
    
    console.log('\n✅ Ready for fresh testing!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();