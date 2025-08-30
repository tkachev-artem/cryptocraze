import { db } from '../server/db';
import { deals, users } from '../shared/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

async function simulateDailyPnLRequest() {
  console.log('🎯 Simulating Daily P/L API Request');
  
  try {
    // Get a real user with deals (we know user '111907067370663926621' has 64 deals)
    const testUserId = '111907067370663926621';
    console.log(`\n📋 Simulating request for user: ${testUserId}`);
    
    // This mimics exactly what the endpoint does
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.log(`📅 Looking for deals closed after: ${thirtyDaysAgo.toISOString()}`);
    
    const dealsData = await db
      .select()
      .from(deals)
      .where(and(
        eq(deals.userId, testUserId),
        eq(deals.status, 'closed'),
        sql`${deals.closedAt} >= ${thirtyDaysAgo.toISOString()}`
      ))
      .orderBy(asc(deals.closedAt));
    
    console.log(`📊 Found ${dealsData.length} deals in last 30 days`);
    
    if (dealsData.length === 0) {
      console.log('❌ No deals found - this would return empty data');
      return;
    }
    
    // Группируем все сделки по дням (exact copy from endpoint)
    const allDailyPnL = new Map<string, number>();
    
    dealsData.forEach(deal => {
      if (deal.profit && deal.closedAt) {
        const dealDate = new Date(deal.closedAt).toDateString();
        const currentPnL = allDailyPnL.get(dealDate) || 0;
        allDailyPnL.set(dealDate, currentPnL + Number(deal.profit));
      }
    });
    
    // Берем последние 7 дней с активностью (exact copy from endpoint)
    const sortedDays = Array.from(allDailyPnL.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 7)
      .reverse(); // Показываем в хронологическом порядке
    
    console.log(`📈 Active trading days: ${sortedDays.length}`);
    if (sortedDays.length > 0) {
      console.log(`📋 Sample days:`, sortedDays.slice(0, 3).map(([date, pnl]) => ({
        date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
        pnl: Number(pnl.toFixed(2))
      })));
    }
    
    // Конвертируем в массив (exact copy from endpoint)
    const result = sortedDays.map(([date, pnl]) => ({
      date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      pnl: Number(pnl.toFixed(2)),
      isProfit: pnl >= 0
    }));
    
    console.log(`\n📤 Final API Response:`);
    console.log(JSON.stringify({
      success: true,
      data: result
    }, null, 2));
    
    // Analysis of the result
    console.log(`\n🔍 Analysis:`);
    console.log(`- Number of days: ${result.length}`);
    console.log(`- Profitable days: ${result.filter(d => d.isProfit).length}`);
    console.log(`- Loss days: ${result.filter(d => !d.isProfit).length}`);
    console.log(`- All zeros: ${result.every(d => d.pnl === 0)}`);
    
    const totalPnL = result.reduce((sum, day) => sum + day.pnl, 0);
    console.log(`- Total P/L across all days: ${totalPnL.toFixed(2)}`);
    
    if (result.every(d => d.pnl === 0)) {
      console.log('\n❌ CONFIRMED: All P/L values are zero!');
      console.log('🔍 This suggests the issue is in the endpoint logic, not the frontend');
    } else {
      console.log('\n✅ P/L calculation is working correctly!');
      console.log('💡 The issue might be with user authentication or different users');
    }
    
  } catch (error) {
    console.error('❌ Error simulating Daily P/L request:', error);
  }
}

// Run the simulation
simulateDailyPnLRequest().then(() => {
  console.log('\n✅ Simulation completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});