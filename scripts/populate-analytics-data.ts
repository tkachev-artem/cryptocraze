import { db } from '../server/db.js';
import { 
  users, 
  deals, 
  userDailyStats, 
  userAcquisitionMetrics, 
  engagementMetrics, 
  revenueMetrics,
  cohortAnalysis,
  premiumSubscriptions
} from '../shared/schema.js';
import { sql } from 'drizzle-orm';

// Создание тестовых пользователей
async function createTestUsers() {
  console.log('📊 Создание тестовых пользователей...');
  
  const testUsers = [];
  for (let i = 1; i <= 50; i++) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30)); // Последние 30 дней
    
    testUsers.push({
      id: `test_user_${i}`,
      email: `user${i}@test.com`,
      firstName: `User${i}`,
      lastName: 'Test',
      balance: '10000.00',
      coins: Math.floor(Math.random() * 1000),
      tradesCount: Math.floor(Math.random() * 50),
      totalTradesVolume: (Math.random() * 100000).toFixed(2),
      successfulTradesPercentage: (Math.random() * 100).toFixed(2),
      maxProfit: (Math.random() * 5000).toFixed(2),
      maxLoss: (-Math.random() * 2000).toFixed(2),
      isPremium: Math.random() > 0.8, // 20% premium users
      role: 'user',
      createdAt,
      updatedAt: createdAt
    });
  }
  
  await db.insert(users).values(testUsers).onConflictDoNothing();
  console.log(`✅ Создано ${testUsers.length} тестовых пользователей`);
  return testUsers;
}

// Создание тестовых сделок
async function createTestDeals(testUsers: any[]) {
  console.log('💹 Создание тестовых сделок...');
  
  const testDeals = [];
  for (const user of testUsers.slice(0, 30)) { // Только для первых 30 пользователей
    const dealsCount = Math.floor(Math.random() * 20) + 1;
    
    for (let j = 0; j < dealsCount; j++) {
      const openedAt = new Date();
      openedAt.setDate(openedAt.getDate() - Math.floor(Math.random() * 30));
      
      const closedAt = new Date(openedAt);
      closedAt.setHours(closedAt.getHours() + Math.floor(Math.random() * 48) + 1);
      
      const amount = parseFloat((Math.random() * 1000 + 100).toFixed(2));
      const isProfit = Math.random() > 0.4; // 60% прибыльных сделок
      const profitPercentage = isProfit 
        ? Math.random() * 50 + 5  // 5-55% прибыль
        : -(Math.random() * 30 + 5); // 5-35% убыток
      
      const profit = amount * (profitPercentage / 100);
      
      testDeals.push({
        userId: user.id,
        symbol: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'][Math.floor(Math.random() * 4)],
        direction: Math.random() > 0.5 ? 'up' : 'down',
        amount: amount.toString(),
        leverage: Math.floor(Math.random() * 10) + 1,
        openPrice: (Math.random() * 50000 + 1000).toString(),
        closePrice: (Math.random() * 50000 + 1000).toString(),
        profit: profit.toString(),
        profitPercentage: profitPercentage.toString(),
        commission: (amount * 0.01).toString(), // 1% комиссия
        openedAt,
        closedAt,
        status: 'closed'
      });
    }
  }
  
  await db.insert(deals).values(testDeals).onConflictDoNothing();
  console.log(`✅ Создано ${testDeals.length} тестовых сделок`);
  return testDeals;
}

// Создание daily stats
async function createUserDailyStats(testUsers: any[], testDeals: any[]) {
  console.log('📈 Создание ежедневной статистики пользователей...');
  
  const dailyStats = [];
  const today = new Date();
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    
    // Для каждого пользователя создаем статистику
    for (const user of testUsers.slice(0, 30)) {
      const userDeals = testDeals.filter(deal => 
        deal.userId === user.id && 
        deal.openedAt.toDateString() === date.toDateString()
      );
      
      if (userDeals.length > 0 || Math.random() > 0.7) { // 30% дней с активностью
        const tradesCount = userDeals.length;
        const tradesVolume = userDeals.reduce((sum, deal) => sum + parseFloat(deal.amount), 0);
        const totalProfit = userDeals.reduce((sum, deal) => sum + parseFloat(deal.profit), 0);
        
        dailyStats.push({
          userId: user.id,
          date,
          tradesCount,
          tradesVolume: tradesVolume.toString(),
          totalProfit: totalProfit.toString(),
          sessionDuration: Math.floor(Math.random() * 300) + 60, // 1-5 минут
          screensViewed: Math.floor(Math.random() * 20) + 5,
          energyUsed: Math.floor(Math.random() * 50),
          coinsEarned: Math.floor(Math.random() * 100),
          premiumActive: user.isPremium
        });
      }
    }
  }
  
  await db.insert(userDailyStats).values(dailyStats).onConflictDoNothing();
  console.log(`✅ Создано ${dailyStats.length} записей ежедневной статистики`);
}

// Создание acquisition metrics
async function createAcquisitionMetrics() {
  console.log('🎯 Создание метрик привлечения пользователей...');
  
  const acquisitionData = [];
  const today = new Date();
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    
    const totalSignups = Math.floor(Math.random() * 10) + 2; // 2-12 регистраций в день
    const totalFirstTrades = Math.floor(totalSignups * (0.6 + Math.random() * 0.3)); // 60-90% конверсия
    const avgTimeToFirstTrade = Math.floor(Math.random() * 1440) + 60; // 1-24 часа в минутах
    
    acquisitionData.push({
      date,
      totalInstalls: Math.floor(totalSignups * 1.2), // 20% больше установок чем регистраций
      totalSignups,
      totalFirstTrades,
      totalFirstDeposits: Math.floor(totalFirstTrades * 0.3), // 30% делают первый депозит
      signupRate: ((totalSignups / (totalSignups * 1.2)) * 100).toFixed(4),
      tradeOpenRate: ((totalFirstTrades / totalSignups) * 100).toFixed(4),
      avgTimeToFirstTrade
    });
  }
  
  await db.insert(userAcquisitionMetrics).values(acquisitionData).onConflictDoNothing();
  console.log(`✅ Создано ${acquisitionData.length} записей метрик привлечения`);
}

// Создание engagement metrics
async function createEngagementMetrics() {
  console.log('🚀 Создание метрик вовлеченности...');
  
  const engagementData = [];
  const today = new Date();
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    
    const dau = Math.floor(Math.random() * 30) + 20; // 20-50 DAU
    const totalTrades = Math.floor(Math.random() * 100) + 50; // 50-150 сделок в день
    
    engagementData.push({
      date,
      dailyActiveUsers: dau,
      weeklyActiveUsers: Math.floor(dau * (6 + Math.random() * 2)), // WAU в 6-8 раз больше DAU
      monthlyActiveUsers: Math.floor(dau * (25 + Math.random() * 10)), // MAU в 25-35 раз больше DAU
      avgSessionDuration: Math.floor(Math.random() * 180) + 120, // 2-5 минут в секундах
      avgScreensPerSession: (Math.random() * 10 + 5).toFixed(2), // 5-15 экранов
      avgTradesPerUser: (totalTrades / dau).toFixed(4),
      avgVirtualBalanceUsed: (Math.random() * 5000 + 1000).toFixed(8), // $1000-6000
      totalTrades,
      totalVolume: (Math.random() * 500000 + 100000).toFixed(8) // $100K-600K
    });
  }
  
  await db.insert(engagementMetrics).values(engagementData).onConflictDoNothing();
  console.log(`✅ Создано ${engagementData.length} записей метрик вовлеченности`);
}

// Создание revenue metrics
async function createRevenueMetrics() {
  console.log('💰 Создание метрик доходов...');
  
  const revenueData = [];
  const today = new Date();
  
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    
    const totalPayingUsers = Math.floor(Math.random() * 8) + 2; // 2-10 платящих в день
    const premiumRevenue = totalPayingUsers * (499 + Math.random() * 100); // 499-599 руб за подписку
    const adRevenue = Math.random() * 1000 + 500; // $500-1500 с рекламы
    const totalRevenue = premiumRevenue + adRevenue;
    
    revenueData.push({
      date,
      totalRevenue: totalRevenue.toFixed(2),
      premiumRevenue: premiumRevenue.toFixed(2),
      adRevenue: adRevenue.toFixed(2),
      totalPayingUsers,
      newPayingUsers: Math.floor(totalPayingUsers * 0.7), // 70% новые
      arpu: (totalRevenue / 50).toFixed(2), // На 50 пользователей
      arppu: (totalRevenue / totalPayingUsers).toFixed(2),
      conversionRate: (totalPayingUsers / 50 * 100).toFixed(4), // На 50 пользователей
      churnRate: (Math.random() * 0.05).toFixed(4), // 0-5% отток
      lifetimeValue: (Math.random() * 5000 + 1000).toFixed(2) // $1000-6000 LTV
    });
  }
  
  await db.insert(revenueMetrics).values(revenueData).onConflictDoNothing();
  console.log(`✅ Создано ${revenueData.length} записей метрик доходов`);
}

// Создание cohort analysis
async function createCohortAnalysis() {
  console.log('👥 Создание когорт анализа...');
  
  const cohortData = [];
  const today = new Date();
  
  // Создаем когорты за последние 12 недель
  for (let week = 0; week < 12; week++) {
    const cohortWeek = new Date(today);
    cohortWeek.setDate(cohortWeek.getDate() - week * 7);
    
    const initialUsers = Math.floor(Math.random() * 20) + 10; // 10-30 пользователей в когорте
    
    // Создаем retention данные для каждой недели
    for (let period = 0; period <= Math.min(week, 8); period++) {
      const retentionRate = Math.max(0.1, 1 - (period * 0.15) - Math.random() * 0.1); // Убывающий retention
      const usersCount = Math.floor(initialUsers * retentionRate);
      const totalRevenue = usersCount * (Math.random() * 500 + 100); // $100-600 revenue per user
      
      cohortData.push({
        cohortWeek,
        periodNumber: period,
        usersCount,
        retentionRate: retentionRate.toFixed(4),
        totalRevenue: totalRevenue.toFixed(2),
        avgRevenuePerUser: (totalRevenue / Math.max(usersCount, 1)).toFixed(2)
      });
    }
  }
  
  await db.insert(cohortAnalysis).values(cohortData).onConflictDoNothing();
  console.log(`✅ Создано ${cohortData.length} записей когорт анализа`);
}

// Создание premium подписок
async function createPremiumSubscriptions(testUsers: any[]) {
  console.log('💎 Создание premium подписок...');
  
  const premiumUsers = testUsers.filter(user => user.isPremium);
  const subscriptions = [];
  
  for (const user of premiumUsers) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // Месячная подписка
    
    subscriptions.push({
      userId: user.id,
      planName: 'Premium Monthly',
      amount: '499.00',
      currency: 'RUB',
      startDate,
      endDate,
      status: 'active',
      paymentMethod: 'card',
      isActive: true
    });
  }
  
  await db.insert(premiumSubscriptions).values(subscriptions).onConflictDoNothing();
  console.log(`✅ Создано ${subscriptions.length} premium подписок`);
}

// Основная функция
async function main() {
  console.log('🎉 Запуск создания тестовых данных для BI Analytics...\n');
  
  try {
    // 1. Создаем тестовых пользователей
    const testUsers = await createTestUsers();
    
    // 2. Создаем тестовые сделки  
    const testDeals = await createTestDeals(testUsers);
    
    // 3. Создаем daily stats
    await createUserDailyStats(testUsers, testDeals);
    
    // 4. Создаем acquisition metrics
    await createAcquisitionMetrics();
    
    // 5. Создаем engagement metrics
    await createEngagementMetrics();
    
    // 6. Создаем revenue metrics
    await createRevenueMetrics();
    
    // 7. Создаем cohort analysis
    await createCohortAnalysis();
    
    // 8. Создаем premium подписки
    await createPremiumSubscriptions(testUsers);
    
    console.log('\n🎊 Все тестовые данные успешно созданы!');
    console.log('\n📊 Теперь в админской BI панели должны отображаться реальные метрики:');
    console.log('   • Пользователи: ~50 тестовых пользователей');
    console.log('   • Сделки: несколько сотен тестовых сделок');
    console.log('   • Ежедневная статистика за 30 дней');
    console.log('   • Метрики привлечения, вовлеченности и доходов');
    console.log('   • Когорт анализ за 12 недель');
    console.log('   • Premium подписки');
    console.log('\n🚀 Обновите админскую панель - данные должны появиться!');
    
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
  }
}

main();