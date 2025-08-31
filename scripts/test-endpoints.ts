#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function testEndpoints() {
  console.log('🧪 Testing analytics endpoints...');
  
  try {
    console.log('📊 Testing revenue metrics query...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const revenueData = await db.execute(sql`
      SELECT * FROM revenue_metrics 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date ASC
    `);
    
    console.log('✅ Revenue query successful. Found', revenueData.length, 'records');
    
    console.log('📺 Testing ad performance metrics query...');
    const adData = await db.execute(sql`
      SELECT * FROM ad_performance_metrics 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date DESC
    `);
    
    console.log('✅ Ad metrics query successful. Found', adData.length, 'records');
    
    if (adData.length > 0) {
      console.log('📈 Sample ad data columns:', Object.keys(adData[0]));
    }
    
    console.log('✅ All endpoint queries working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testEndpoints();