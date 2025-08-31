#!/usr/bin/env tsx

import { db } from '../server/db';
import { 
  engagementMetrics,
  revenueMetrics, 
  userAcquisitionMetrics,
  adPerformanceMetrics 
} from '../shared/schema';
import { count, eq, gte } from 'drizzle-orm';

/**
 * Initialize analytics tables with basic data to prevent 500 errors
 * This creates dummy/empty records so the admin dashboard doesn't crash
 */
async function initAnalytics() {
  console.log('🔧 Initializing analytics data...');
  
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  try {
    // Check if we already have data
    const existingEngagement = await db.select({ count: count() }).from(engagementMetrics);
    const existingRevenue = await db.select({ count: count() }).from(revenueMetrics);
    const existingAcquisition = await db.select({ count: count() }).from(userAcquisitionMetrics);
    const existingAds = await db.select({ count: count() }).from(adPerformanceMetrics);

    console.log('📊 Current data counts:');
    console.log(`- Engagement metrics: ${existingEngagement[0]?.count || 0}`);
    console.log(`- Revenue metrics: ${existingRevenue[0]?.count || 0}`);
    console.log(`- Acquisition metrics: ${existingAcquisition[0]?.count || 0}`);
    console.log(`- Ad performance metrics: ${existingAds[0]?.count || 0}`);

    // Initialize engagement metrics if empty
    if (!existingEngagement[0]?.count) {
      console.log('📈 Creating initial engagement metrics...');
      await db.insert(engagementMetrics).values({
        date: yesterday,
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        avgSessionDuration: 0,
        totalTrades: 0,
        totalVolume: '0'
      });
    }

    // Initialize revenue metrics if empty  
    if (!existingRevenue[0]?.count) {
      console.log('💰 Creating initial revenue metrics...');
      await db.insert(revenueMetrics).values({
        date: yesterday,
        totalRevenue: '0',
        premiumRevenue: '0',
        arpu: '0',
        arppu: '0',
        conversionRate: 0,
        newPayingUsers: 0
      });
    }

    // Initialize acquisition metrics if empty
    if (!existingAcquisition[0]?.count) {
      console.log('👥 Creating initial acquisition metrics...');
      await db.insert(userAcquisitionMetrics).values({
        date: yesterday,
        totalInstalls: 0,
        totalSignups: 0,
        totalFirstTrades: 0,
        totalFirstDeposits: 0,
        signupRate: 0,
        tradeOpenRate: 0,
        avgTimeToFirstTrade: 0
      });
    }

    // Initialize ad performance metrics if empty
    if (!existingAds[0]?.count) {
      console.log('📺 Creating initial ad performance metrics...');
      await db.insert(adPerformanceMetrics).values({
        date: yesterday,
        totalAdSpend: '0',
        totalInstalls: 0,
        totalConversions: 0,
        totalRevenue: '0',
        avgCPI: '0',
        avgCPA: '0',
        avgROAS: '0',
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: '0',
        avgConversionRate: '0'
      });
    }

    console.log('✅ Analytics initialization completed successfully!');
    console.log('🌐 The admin dashboard should now load without 500 errors.');
    
  } catch (error) {
    console.error('❌ Error initializing analytics:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the initialization
initAnalytics();