#!/usr/bin/env tsx

import { db } from '../server/db.js';
import { deals } from '../shared/schema.js';
import { clickhouseAnalyticsService } from '../server/services/clickhouseAnalyticsService.js';

console.log('🔄 Starting migration of existing deals to ClickHouse...');

async function migrateExistingDeals() {
  try {
    // Get all deals from PostgreSQL
    const allDeals = await db.select().from(deals);
    console.log(`Found ${allDeals.length} deals to migrate`);

    let migrated = 0;
    let failed = 0;

    for (const deal of allDeals) {
      try {
        await clickhouseAnalyticsService.syncDeal({
          id: parseInt(deal.id),
          userId: deal.userId,
          symbol: deal.symbol,
          direction: deal.direction,
          amount: parseFloat(deal.amount),
          multiplier: deal.multiplier || 1,
          openPrice: parseFloat(deal.openPrice || '0'),
          takeProfit: deal.takeProfit ? parseFloat(deal.takeProfit) : null,
          stopLoss: deal.stopLoss ? parseFloat(deal.stopLoss) : null,
          openedAt: deal.openedAt || new Date(),
          closedAt: deal.closedAt,
          closePrice: deal.closePrice ? parseFloat(deal.closePrice) : null,
          profit: deal.profit ? parseFloat(deal.profit) : 0,
          status: deal.status,
          commission: 0
        });
        migrated++;
        console.log(`✅ Migrated deal ${deal.id}`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to migrate deal ${deal.id}:`, error.message);
      }
    }

    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${migrated} deals`);
    console.log(`❌ Failed: ${failed} deals`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateExistingDeals().then(() => {
  console.log('Migration finished');
  process.exit(0);
});