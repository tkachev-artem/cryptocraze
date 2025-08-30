import { db } from '../server/db';
import { deals, users } from '../shared/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

async function debugDailyPnLEndpoint() {
  console.log('🔍 Debugging Daily P/L Endpoint');
  
  try {
    // First, let's find a real user with deals
    console.log('\n1. Looking for users with deals...');
    const usersWithDeals = await db
      .select({
        userId: deals.userId,
        dealCount: sql<number>`count(*)::int`,
        totalProfit: sql<string>`sum(${deals.profit})`,
        avgProfit: sql<string>`avg(${deals.profit})`,
        minProfit: sql<string>`min(${deals.profit})`,
        maxProfit: sql<string>`max(${deals.profit})`
      })
      .from(deals)
      .where(eq(deals.status, 'closed'))
      .groupBy(deals.userId)
      .orderBy(sql`count(*) DESC`)
      .limit(5);

    console.log('Users with most closed deals:', usersWithDeals);

    if (usersWithDeals.length === 0) {
      console.log('❌ No users with closed deals found');
      return;
    }

    const testUserId = usersWithDeals[0].userId;
    console.log(`\n2. Testing with user ID: ${testUserId}`);

    // Get user details
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    console.log('User info:', user[0] ? {
      id: user[0].id,
      email: user[0].email,
      balance: user[0].balance,
      tradesCount: user[0].tradesCount
    } : 'User not found');

    // Analyze deals for this user
    console.log('\n3. Analyzing deals for this user...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dealsData = await db
      .select({
        id: deals.id,
        symbol: deals.symbol,
        direction: deals.direction,
        amount: deals.amount,
        profit: deals.profit,
        openedAt: deals.openedAt,
        closedAt: deals.closedAt,
        openPrice: deals.openPrice,
        closePrice: deals.closePrice
      })
      .from(deals)
      .where(and(
        eq(deals.userId, testUserId),
        eq(deals.status, 'closed'),
        sql`${deals.closedAt} >= ${thirtyDaysAgo.toISOString()}`
      ))
      .orderBy(asc(deals.closedAt));

    console.log(`Found ${dealsData.length} closed deals in last 30 days`);

    if (dealsData.length === 0) {
      console.log('❌ No closed deals in last 30 days for this user');
      return;
    }

    // Show sample deals
    console.log('\n4. Sample deals:');
    dealsData.slice(0, 5).forEach(deal => {
      console.log({
        id: deal.id,
        symbol: deal.symbol,
        direction: deal.direction,
        amount: deal.amount,
        profit: deal.profit,
        profitType: typeof deal.profit,
        profitNumber: Number(deal.profit),
        closedAt: deal.closedAt
      });
    });

    // Debug profit values
    console.log('\n5. Profit analysis:');
    let totalProfit = 0;
    let profitDeals = 0;
    let lossDeals = 0;
    let zeroProfitDeals = 0;
    let nullProfitDeals = 0;

    dealsData.forEach(deal => {
      if (deal.profit === null || deal.profit === undefined) {
        nullProfitDeals++;
      } else {
        const profitNum = Number(deal.profit);
        if (isNaN(profitNum)) {
          console.log(`Invalid profit value: ${deal.profit} (deal ${deal.id})`);
        } else {
          totalProfit += profitNum;
          if (profitNum > 0) profitDeals++;
          else if (profitNum < 0) lossDeals++;
          else zeroProfitDeals++;
        }
      }
    });

    console.log('Profit statistics:', {
      totalProfit,
      profitDeals,
      lossDeals,
      zeroProfitDeals,
      nullProfitDeals,
      avgProfit: totalProfit / dealsData.length
    });

    // Test the grouping logic
    console.log('\n6. Testing daily grouping logic:');
    const dailyPnL = new Map<string, number>();
    
    dealsData.forEach(deal => {
      if (deal.profit && deal.closedAt) {
        const dealDate = new Date(deal.closedAt).toDateString();
        const currentPnL = dailyPnL.get(dealDate) || 0;
        const profitAmount = Number(deal.profit);
        dailyPnL.set(dealDate, currentPnL + profitAmount);
        console.log(`Deal ${deal.id}: ${dealDate} -> +${profitAmount} = ${currentPnL + profitAmount}`);
      }
    });

    console.log('\n7. Daily P/L results:');
    const sortedDays = Array.from(dailyPnL.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 7)
      .reverse();

    sortedDays.forEach(([date, pnl]) => {
      console.log({
        date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
        dateString: date,
        pnl: Number(pnl.toFixed(2)),
        isProfit: pnl >= 0
      });
    });

    // Test the actual endpoint response format
    console.log('\n8. Endpoint response format:');
    const result = sortedDays.map(([date, pnl]) => ({
      date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      pnl: Number(pnl.toFixed(2)),
      isProfit: pnl >= 0
    }));

    console.log('Final response data:', result);

    // Check if all values are zero
    const allZero = result.every(day => day.pnl === 0);
    console.log(`\n❌ Issue identified: All P/L values are zero: ${allZero}`);

    if (allZero) {
      console.log('\n🔍 Investigating why profits are zero...');
      
      // Check raw profit values from database
      const profitValues = dealsData.map(d => ({
        id: d.id,
        profit: d.profit,
        profitString: String(d.profit),
        profitNumber: Number(d.profit),
        profitIsNaN: isNaN(Number(d.profit))
      }));
      
      console.log('Raw profit values:', profitValues.slice(0, 5));
    }

  } catch (error) {
    console.error('❌ Error debugging Daily P/L endpoint:', error);
  }
}

// Run the debug function
debugDailyPnLEndpoint().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});