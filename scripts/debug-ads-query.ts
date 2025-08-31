#!/usr/bin/env tsx

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function debugAdsQuery() {
  console.log('🧪 Debugging ads query return structure...');
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const adData = await db.execute(sql`
      SELECT * FROM ad_performance_metrics 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date DESC
    `);
    
    console.log('📊 Raw query result type:', typeof adData);
    console.log('📊 Is array?', Array.isArray(adData));
    console.log('📊 Raw query result:', adData);
    
    if (adData && typeof adData === 'object') {
      console.log('🔍 Properties:', Object.keys(adData));
      
      // Check if it has rows property (common in raw SQL results)
      if ('rows' in adData) {
        console.log('📋 Has rows property, length:', (adData as any).rows?.length);
        console.log('📋 First row sample:', (adData as any).rows?.[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in debug query:', error);
  } finally {
    process.exit(0);
  }
}

// Run the debug
debugAdsQuery();