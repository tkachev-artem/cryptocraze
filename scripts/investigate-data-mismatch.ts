#!/usr/bin/env npx tsx

import { db } from '../server/db.js';
import { 
  users, 
  deals
} from '../shared/schema.js';
import { eq, sql, count, sum, desc, and, isNotNull } from 'drizzle-orm';

async function investigateDataMismatch() {
  console.log('🔍 Investigating Data Mismatch Issues...\n');

  // Check database structure and data types
  console.log('1. Checking database structure...');
  
  // Check users table structure
  console.log('\n📊 Users Table Info:');
  const sampleUsers = await db
    .select({
      id: users.id,
      idType: sql<string>`pg_typeof(${users.id})`,
      firstName: users.firstName,
      tradesCount: users.tradesCount
    })
    .from(users)
    .limit(3);
  
  console.log('Sample users:', sampleUsers);

  // Check deals table structure  
  console.log('\n📊 Deals Table Info:');
  const sampleDeals = await db
    .select({
      id: deals.id,
      userId: deals.userId,
      userIdType: sql<string>`pg_typeof(${deals.userId})`,
      status: deals.status,
      profit: deals.profit,
      profitType: sql<string>`pg_typeof(${deals.profit})`
    })
    .from(deals)
    .limit(3);
  
  console.log('Sample deals:', sampleDeals);

  // Check if there are any deals at all
  const totalDeals = await db.select({ count: count() }).from(deals);
  console.log(`\nTotal deals in database: ${totalDeals[0]?.count || 0}`);

  const closedDeals = await db
    .select({ count: count() })
    .from(deals)
    .where(eq(deals.status, 'closed'));
  console.log(`Closed deals: ${closedDeals[0]?.count || 0}`);

  // Check specific user data
  const testUserId = 'test_user_25';
  console.log(`\n🔍 Investigating user: ${testUserId}`);
  
  const userInfo = await db
    .select()
    .from(users)
    .where(eq(users.id, testUserId))
    .limit(1);
  
  if (userInfo.length > 0) {
    console.log('User info:', userInfo[0]);
  } else {
    console.log('User not found!');
  }

  // Check deals for this user - try different approaches
  console.log('\nChecking deals for user (exact match):');
  const userDeals1 = await db
    .select({ count: count() })
    .from(deals)
    .where(eq(deals.userId, testUserId));
  console.log(`Deals count (exact): ${userDeals1[0]?.count || 0}`);

  console.log('\nChecking deals for user (cast comparison):');
  const userDeals2 = await db
    .select({ count: count() })
    .from(deals)
    .where(sql`CAST(${deals.userId} AS TEXT) = CAST(${testUserId} AS TEXT)`);
  console.log(`Deals count (cast): ${userDeals2[0]?.count || 0}`);

  // Check if there are any deals with this user pattern
  console.log('\nChecking deals with similar user IDs:');
  const similarDeals = await db
    .select({ 
      userId: deals.userId,
      count: count()
    })
    .from(deals)
    .where(sql`${deals.userId} LIKE '%test_user_%'`)
    .groupBy(deals.userId)
    .limit(10);
  
  console.log('Similar user IDs in deals:', similarDeals);

  // Check the rating calculation logic directly
  console.log('\n🎯 Testing Rating Calculation Logic:');
  
  const whereCond = eq(deals.status, 'closed');
  const aggregates = await db
    .select({
      userId: deals.userId,
      userIdRaw: sql<string>`${deals.userId}`,
      pnlUsd: sql<number>`COALESCE(SUM((${deals.profit})::numeric), 0)`,
      trades: sql<number>`COUNT(*)`,
      wins: sql<number>`SUM(CASE WHEN ((${deals.profit})::numeric) > 0 THEN 1 ELSE 0 END)`
    })
    .from(deals)
    .where(whereCond)
    .groupBy(deals.userId)
    .limit(10);

  console.log('Rating aggregation results:', aggregates);

  // Check for data type mismatches
  console.log('\n🔧 Checking for data type issues:');
  
  const userIdCheck = await db
    .select({
      fromUsers: sql<string[]>`array_agg(DISTINCT ${users.id})`,
      fromDeals: sql<string[]>`array_agg(DISTINCT ${deals.userId})`
    })
    .from(users)
    .fullJoin(deals, eq(users.id, deals.userId))
    .limit(1);

  console.log('User ID comparison:', userIdCheck[0]);

  // Check for deals with profit data
  console.log('\n💰 Checking profit data:');
  const profitDeals = await db
    .select({
      count: count(),
      avgProfit: sql<number>`AVG((${deals.profit})::numeric)`,
      maxProfit: sql<number>`MAX((${deals.profit})::numeric)`,
      minProfit: sql<number>`MIN((${deals.profit})::numeric)`
    })
    .from(deals)
    .where(and(
      eq(deals.status, 'closed'),
      isNotNull(deals.profit)
    ));

  console.log('Profit data summary:', profitDeals[0]);

  // Direct SQL query to check what's happening
  console.log('\n🔍 Raw SQL investigation:');
  try {
    const rawResult = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.first_name,
        u.trades_count as stored_trades,
        COUNT(d.id) as actual_deals,
        COUNT(CASE WHEN d.status = 'closed' THEN 1 END) as closed_deals,
        COALESCE(SUM(CASE WHEN d.status = 'closed' THEN (d.profit)::numeric END), 0) as total_profit
      FROM users u
      LEFT JOIN deals d ON u.id = d.user_id
      WHERE u.id LIKE 'test_user_%'
      GROUP BY u.id, u.first_name, u.trades_count
      LIMIT 5
    `);
    
    console.log('Raw query results:', rawResult.rows);
  } catch (error) {
    console.error('Raw query failed:', error);
  }
}

// Run the investigation
investigateDataMismatch().then(() => {
  console.log('\n✅ Investigation completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Investigation failed:', error);
  process.exit(1);
});