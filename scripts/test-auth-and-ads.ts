#!/usr/bin/env tsx

// This tests if the issue is authentication or the actual ads endpoint logic
import express from 'express';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function testAdsLogic() {
  console.log('🧪 Testing the ads endpoint logic directly...');
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log('[DEBUG] Date range:', startDate, 'to', endDate);
    
    // Use raw SQL to bypass Drizzle schema issues
    console.log('[DEBUG] Executing SQL query...');
    const adDataResult = await db.execute(sql`
      SELECT * FROM ad_performance_metrics 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date DESC
    `);

    console.log('[DEBUG] Query result type:', typeof adDataResult);
    console.log('[DEBUG] Query result has rows:', 'rows' in adDataResult);

    // Extract rows from the result object
    const adData = adDataResult.rows || [];
    console.log('[DEBUG] Extracted rows count:', adData.length);

    if (adData.length === 0) {
      console.log('[DEBUG] No data found, returning empty result');
      return { data: [], summary: null };
    }

    // Calculate totals and averages
    console.log('[DEBUG] Starting reduce operation...');
    console.log('[DEBUG] Sample row structure:', adData[0]);
    
    const totals = adData.reduce((acc: any, day: any) => {
      console.log('[DEBUG] Processing row:', {
        total_ad_spend: day.total_ad_spend,
        total_installs: day.total_installs,
        ad_impressions: day.ad_impressions,
        ad_clicks: day.ad_clicks
      });
      
      return {
        totalAdSpend: acc.totalAdSpend + Number(day.total_ad_spend || 0),
        totalInstalls: acc.totalInstalls + Number(day.total_installs || 0),
        totalConversions: acc.totalConversions + Number(day.total_conversions || 0),
        totalRevenue: acc.totalRevenue + Number(day.total_revenue || 0),
        totalImpressions: acc.totalImpressions + Number(day.ad_impressions || 0),
        totalClicks: acc.totalClicks + Number(day.ad_clicks || 0),
      };
    }, {
      totalAdSpend: 0,
      totalInstalls: 0,
      totalConversions: 0,
      totalRevenue: 0,
      totalImpressions: 0,
      totalClicks: 0,
    });

    console.log('[DEBUG] Totals calculated:', totals);

    const avgCPI = totals.totalInstalls > 0 ? totals.totalAdSpend / totals.totalInstalls : 0;
    const avgCPA = totals.totalConversions > 0 ? totals.totalAdSpend / totals.totalConversions : 0;
    const avgROAS = totals.totalAdSpend > 0 ? totals.totalRevenue / totals.totalAdSpend : 0;
    const avgCTR = totals.totalImpressions > 0 ? totals.totalClicks / totals.totalImpressions : 0;
    const avgConversionRate = totals.totalClicks > 0 ? totals.totalConversions / totals.totalClicks : 0;

    const responseData = {
      data: adData,
      summary: {
        totalAdSpend: totals.totalAdSpend.toFixed(2),
        totalInstalls: totals.totalInstalls,
        totalConversions: totals.totalConversions,
        totalRevenue: totals.totalRevenue.toFixed(2),
        avgCPI: avgCPI.toFixed(2),
        avgCPA: avgCPA.toFixed(2),
        avgROAS: avgROAS.toFixed(4),
        avgCTR: (avgCTR * 100).toFixed(4),
        avgConversionRate: (avgConversionRate * 100).toFixed(4),
        totalImpressions: totals.totalImpressions,
        totalClicks: totals.totalClicks,
      }
    };

    console.log('✅ Ads logic working perfectly!');
    console.log('📊 Summary:', responseData.summary);
    
    return responseData;
    
  } catch (error) {
    console.error('❌ Error in ads logic:', error);
    console.error('❌ Error stack:', (error as Error).stack);
    throw error;
  }
}

// Run the test
testAdsLogic()
  .then(result => {
    console.log('🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });