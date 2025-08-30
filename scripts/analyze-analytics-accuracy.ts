#!/usr/bin/env npx tsx

import { db } from '../server/db.js';
import { 
  users, 
  deals, 
  analytics,
  userDailyStats,
  engagementMetrics,
  revenueMetrics,
  userAcquisitionMetrics,
  premiumSubscriptions
} from '../shared/schema.js';
import { eq, sql, count, sum, avg, desc, and, gte, lte } from 'drizzle-orm';

interface AnalyticsIssue {
  type: 'data_inconsistency' | 'calculation_error' | 'missing_data' | 'performance_issue';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendations: string[];
  affected_endpoints?: string[];
}

class AnalyticsAudit {
  private issues: AnalyticsIssue[] = [];

  async auditRatingSystem(): Promise<void> {
    console.log('\n🔍 Auditing Rating System...');
    
    // Check if all users are included in rating
    const totalUsers = await db.select({ count: count() }).from(users);
    const totalUsersCount = totalUsers[0]?.count || 0;
    
    // Test rating endpoint data
    const ratingData = await this.getRatingData();
    
    // Issue 1: All users have 0 trades and PnL
    const usersWithoutTrades = ratingData.filter(user => user.trades === 0);
    if (usersWithoutTrades.length === ratingData.length) {
      this.addIssue({
        type: 'data_inconsistency',
        severity: 'high',
        description: 'Rating system shows all users with 0 trades and 0 P&L, indicating no trade data is being aggregated',
        recommendations: [
          'Verify deals table has closed deals with profit data',
          'Check if userId field types match between users and deals tables',
          'Ensure profit calculations are correctly cast to numeric type',
          'Add logging to rating endpoint to debug aggregation query'
        ],
        affected_endpoints: ['/api/rating']
      });
    }

    // Issue 2: User position not being returned correctly
    const testUserId = ratingData[0]?.userId;
    if (testUserId) {
      const userPosition = ratingData.findIndex(user => user.userId === testUserId) + 1;
      if (userPosition !== ratingData[0].rank) {
        this.addIssue({
          type: 'calculation_error',
          severity: 'medium', 
          description: 'User rank calculation may be inconsistent with actual position in leaderboard',
          recommendations: [
            'Verify rank assignment logic in rating endpoint',
            'Add endpoint to get specific user position in rating',
            'Consider caching user positions for performance'
          ],
          affected_endpoints: ['/api/rating']
        });
      }
    }

    console.log(`   Found ${usersWithoutTrades.length}/${totalUsersCount} users with no trade data`);
  }

  async auditUserStatistics(): Promise<void> {
    console.log('\n📊 Auditing User Statistics...');

    // Check consistency between user table stats and actual deal calculations
    const usersWithStats = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        tradesCount: users.tradesCount,
        totalTradesVolume: users.totalTradesVolume,
        successfulTradesPercentage: users.successfulTradesPercentage,
        maxProfit: users.maxProfit,
        maxLoss: users.maxLoss,
        averageTradeAmount: users.averageTradeAmount,
        ratingScore: users.ratingScore,
        ratingRank30Days: users.ratingRank30Days
      })
      .from(users)
      .limit(5);

    for (const user of usersWithStats) {
      // Calculate actual stats from deals
      const actualStats = await this.calculateActualUserStats(user.id);
      
      // Compare stored vs calculated stats
      const storedTrades = Number(user.tradesCount || 0);
      const calculatedTrades = actualStats.totalTrades;
      
      if (Math.abs(storedTrades - calculatedTrades) > 0) {
        this.addIssue({
          type: 'data_inconsistency',
          severity: 'high',
          description: `User ${user.id} has inconsistent trade count: stored=${storedTrades}, calculated=${calculatedTrades}`,
          recommendations: [
            'Run data synchronization to update user statistics',
            'Add triggers or hooks to update user stats when deals are closed',
            'Implement periodic sync job to fix inconsistencies'
          ],
          affected_endpoints: ['/api/user/stats', '/api/dashboard/stats']
        });
      }

      // Check rating score and rank
      if (!user.ratingScore || user.ratingScore === 0) {
        this.addIssue({
          type: 'missing_data',
          severity: 'medium',
          description: `User ${user.id} missing rating score despite having trade activity`,
          recommendations: [
            'Implement rating score calculation based on recent performance',
            'Add periodic job to update all user rating scores',
            'Consider implementing real-time rating updates'
          ],
          affected_endpoints: ['/api/user/stats', '/api/rating']
        });
      }

      if (!user.ratingRank30Days) {
        this.addIssue({
          type: 'missing_data',
          severity: 'medium',
          description: `User ${user.id} missing 30-day rating rank`,
          recommendations: [
            'Implement 30-day rolling rating system',
            'Add background job to calculate and update user rankings',
            'Consider using Redis for fast ranking lookups'
          ],
          affected_endpoints: ['/api/user/stats', '/api/rating']
        });
      }
    }

    console.log(`   Audited ${usersWithStats.length} users for statistics consistency`);
  }

  async auditTradingCalculations(): Promise<void> {
    console.log('\n💰 Auditing Trading Calculations...');

    // Check profit calculations accuracy
    const dealsWithProfit = await db
      .select({
        id: deals.id,
        userId: deals.userId,
        amount: deals.amount,
        profit: deals.profit,
        openPrice: deals.openPrice,
        closePrice: deals.closePrice,
        direction: deals.direction,
        multiplier: deals.multiplier,
        status: deals.status
      })
      .from(deals)
      .where(eq(deals.status, 'closed'))
      .limit(10);

    let profitCalculationErrors = 0;

    for (const deal of dealsWithProfit) {
      if (!deal.profit || !deal.openPrice || !deal.closePrice) {
        this.addIssue({
          type: 'missing_data',
          severity: 'high',
          description: `Deal ${deal.id} missing profit, openPrice, or closePrice data`,
          recommendations: [
            'Ensure all closed deals have complete price and profit data',
            'Add validation before closing deals',
            'Implement data cleanup for incomplete deals'
          ],
          affected_endpoints: ['/api/trading/stats', '/api/dashboard/stats', '/api/rating']
        });
        continue;
      }

      // Verify profit calculation
      const openPrice = Number(deal.openPrice);
      const closePrice = Number(deal.closePrice);
      const amount = Number(deal.amount);
      const multiplier = Number(deal.multiplier);
      const storedProfit = Number(deal.profit);

      let expectedProfit = 0;
      if (deal.direction === 'up') {
        expectedProfit = ((closePrice - openPrice) / openPrice) * amount * multiplier;
      } else {
        expectedProfit = ((openPrice - closePrice) / openPrice) * amount * multiplier;
      }

      const profitDifference = Math.abs(storedProfit - expectedProfit);
      if (profitDifference > 0.01) { // Allow small floating point differences
        profitCalculationErrors++;
      }
    }

    if (profitCalculationErrors > 0) {
      this.addIssue({
        type: 'calculation_error',
        severity: 'high',
        description: `Found ${profitCalculationErrors} deals with incorrect profit calculations`,
        recommendations: [
          'Review and fix profit calculation logic in trading engine',
          'Add unit tests for profit calculation functions',
          'Implement profit recalculation for existing deals',
          'Add validation to ensure profit calculations are accurate'
        ],
        affected_endpoints: ['/api/trading/stats', '/api/dashboard/stats', '/api/rating']
      });
    }

    console.log(`   Found ${profitCalculationErrors} potential profit calculation errors out of ${dealsWithProfit.length} deals`);
  }

  async auditAnalyticsEndpoints(): Promise<void> {
    console.log('\n🎯 Auditing Analytics Endpoints...');

    // Test response times and data completeness
    const endpoints = [
      '/api/dashboard/stats',
      '/api/user/stats',
      '/api/rating',
      '/api/analytics/user/dashboard',
      '/api/analytics/bi/overview'
    ];

    // Check if analytics tables have recent data
    const recentAnalytics = await db
      .select({ count: count() })
      .from(analytics)
      .where(gte(analytics.timestamp, sql`NOW() - INTERVAL '24 hours'`));

    const recentCount = recentAnalytics[0]?.count || 0;
    if (recentCount === 0) {
      this.addIssue({
        type: 'missing_data',
        severity: 'medium',
        description: 'No recent analytics events recorded in last 24 hours',
        recommendations: [
          'Verify analytics event recording is working',
          'Check if frontend is sending analytics events',
          'Ensure analytics service is processing events correctly'
        ],
        affected_endpoints: ['/api/analytics/bi/overview', '/api/analytics/bi/engagement']
      });
    }

    // Check if BI metrics tables are populated
    const latestEngagement = await db
      .select({ count: count() })
      .from(engagementMetrics);
    
    if ((latestEngagement[0]?.count || 0) === 0) {
      this.addIssue({
        type: 'missing_data',
        severity: 'high',
        description: 'BI engagement metrics table is empty - scheduled jobs may not be running',
        recommendations: [
          'Set up scheduled jobs to populate BI metrics tables',
          'Run initial metrics calculation for historical data',
          'Implement real-time metrics updates where appropriate'
        ],
        affected_endpoints: ['/api/analytics/bi/engagement', '/api/analytics/bi/overview']
      });
    }

    console.log(`   Analytics events in last 24h: ${recentCount}`);
  }

  private async getRatingData() {
    const response = await fetch('http://localhost:3001/api/rating?period=all&limit=50');
    return await response.json();
  }

  private async calculateActualUserStats(userId: string) {
    const closedDeals = await db
      .select({
        profit: deals.profit,
        amount: deals.amount
      })
      .from(deals)
      .where(and(eq(deals.userId, userId), eq(deals.status, 'closed')));

    const totalTrades = closedDeals.length;
    let totalProfit = 0;
    let totalVolume = 0;
    let successfulTrades = 0;

    for (const deal of closedDeals) {
      const profit = Number(deal.profit || 0);
      const amount = Number(deal.amount || 0);
      
      totalProfit += profit;
      totalVolume += amount;
      
      if (profit > 0) {
        successfulTrades++;
      }
    }

    const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    const avgTradeAmount = totalTrades > 0 ? totalVolume / totalTrades : 0;

    return {
      totalTrades,
      totalProfit,
      totalVolume,
      successRate,
      avgTradeAmount
    };
  }

  private addIssue(issue: AnalyticsIssue): void {
    this.issues.push(issue);
  }

  async generateReport(): Promise<void> {
    console.log('\n📋 ANALYTICS AUDIT REPORT');
    console.log('=' .repeat(50));

    const highSeverity = this.issues.filter(i => i.severity === 'high');
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium');
    const lowSeverity = this.issues.filter(i => i.severity === 'low');

    console.log(`\n🚨 HIGH SEVERITY ISSUES: ${highSeverity.length}`);
    highSeverity.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.description}`);
      console.log(`   Type: ${issue.type}`);
      if (issue.affected_endpoints) {
        console.log(`   Affected Endpoints: ${issue.affected_endpoints.join(', ')}`);
      }
      console.log(`   Recommendations:`);
      issue.recommendations.forEach(rec => console.log(`     • ${rec}`));
    });

    console.log(`\n⚠️  MEDIUM SEVERITY ISSUES: ${mediumSeverity.length}`);
    mediumSeverity.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.description}`);
      console.log(`   Type: ${issue.type}`);
      if (issue.affected_endpoints) {
        console.log(`   Affected Endpoints: ${issue.affected_endpoints.join(', ')}`);
      }
      console.log(`   Recommendations:`);
      issue.recommendations.forEach(rec => console.log(`     • ${rec}`));
    });

    if (lowSeverity.length > 0) {
      console.log(`\n💡 LOW SEVERITY ISSUES: ${lowSeverity.length}`);
      lowSeverity.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.description}`);
        console.log(`   Recommendations:`);
        issue.recommendations.forEach(rec => console.log(`     • ${rec}`));
      });
    }

    console.log('\n🎯 SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total Issues Found: ${this.issues.length}`);
    console.log(`High Severity: ${highSeverity.length}`);
    console.log(`Medium Severity: ${mediumSeverity.length}`);
    console.log(`Low Severity: ${lowSeverity.length}`);

    // Performance recommendations
    console.log('\n🚀 PERFORMANCE RECOMMENDATIONS');
    console.log('-'.repeat(35));
    console.log('• Add database indexes on frequently queried columns');
    console.log('• Implement Redis caching for rating and user statistics');
    console.log('• Use database views for complex analytics queries');
    console.log('• Add pagination to all analytics endpoints');
    console.log('• Implement background jobs for heavy calculations');

    console.log('\n✅ IMMEDIATE ACTIONS REQUIRED');
    console.log('-'.repeat(35));
    console.log('1. Fix rating system data aggregation');
    console.log('2. Synchronize user statistics with actual deal data');
    console.log('3. Implement missing rating calculation logic');
    console.log('4. Add proper error handling and logging');
    console.log('5. Set up BI metrics calculation jobs');
  }
}

async function main() {
  console.log('🔍 Starting CryptoCraze Analytics Accuracy Audit...');
  
  const audit = new AnalyticsAudit();
  
  try {
    await audit.auditRatingSystem();
    await audit.auditUserStatistics(); 
    await audit.auditTradingCalculations();
    await audit.auditAnalyticsEndpoints();
    await audit.generateReport();
    
    console.log('\n✅ Audit completed successfully!');
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

// Run the audit
main().then(() => process.exit(0));