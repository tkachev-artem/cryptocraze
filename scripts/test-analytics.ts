#!/usr/bin/env tsx

import { biAnalyticsService } from '../server/services/biAnalyticsService';

async function testAnalytics() {
  console.log('🧪 Testing analytics service...');
  
  try {
    console.log('📊 Testing getAdminOverview...');
    const overview = await biAnalyticsService.getAdminOverview();
    console.log('✅ Overview data:', JSON.stringify(overview, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing analytics:', error);
    console.error('Stack trace:', (error as Error).stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testAnalytics();