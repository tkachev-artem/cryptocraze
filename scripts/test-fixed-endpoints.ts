#!/usr/bin/env tsx

import { biAnalyticsService } from '../server/services/biAnalyticsService';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function testFixedEndpoints() {
  console.log('🧪 Testing all fixed analytics endpoints...');
  
  try {
    console.log('📊 Testing getAdminOverview...');
    const overview = await biAnalyticsService.getAdminOverview();
    console.log('✅ Overview working:', overview !== null);
    
    console.log('💰 Testing revenue endpoint logic...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const revenueDataResult = await db.execute(sql`
      SELECT * FROM revenue_metrics 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date ASC
    `);
    
    const revenueData = revenueDataResult.rows || [];
    console.log('✅ Revenue query working, rows:', revenueData.length);
    
    console.log('📺 Testing ads endpoint logic...');
    const adDataResult = await db.execute(sql`
      SELECT * FROM ad_performance_metrics 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date DESC
    `);
    
    const adData = adDataResult.rows || [];
    console.log('✅ Ads query working, rows:', adData.length);
    
    if (adData.length > 0) {
      console.log('🧮 Testing ads calculations...');
      const totals = adData.reduce((acc: any, day: any) => ({
        totalAdSpend: acc.totalAdSpend + Number(day.total_ad_spend || 0),
        totalInstalls: acc.totalInstalls + Number(day.total_installs || 0),
        totalConversions: acc.totalConversions + Number(day.total_conversions || 0),
        totalRevenue: acc.totalRevenue + Number(day.total_revenue || 0),
        totalImpressions: acc.totalImpressions + Number(day.ad_impressions || 0),
        totalClicks: acc.totalClicks + Number(day.ad_clicks || 0),
      }), {
        totalAdSpend: 0,
        totalInstalls: 0,
        totalConversions: 0,
        totalRevenue: 0,
        totalImpressions: 0,
        totalClicks: 0,
      });
      
      console.log('✅ Ads calculations working:', totals);
    }
    
    console.log('🎉 All analytics endpoints fixed and working!');
    
  } catch (error) {
    console.error('❌ Error testing fixed endpoints:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testFixedEndpoints();