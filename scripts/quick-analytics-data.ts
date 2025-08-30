import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function createQuickData() {
  console.log('⚡ Быстрое создание BI данных...');
  
  try {
    // 1. User Acquisition Metrics - простые данные
    console.log('📈 Добавляем acquisition metrics...');
    await db.execute(sql`
      INSERT INTO user_acquisition_metrics (date, total_installs, total_signups, total_first_trades, total_first_deposits, signup_rate, trade_open_rate, avg_time_to_first_trade)
      VALUES 
        (NOW() - INTERVAL '1 day', 25, 20, 15, 3, 0.8000, 0.7500, 120),
        (NOW() - INTERVAL '2 days', 30, 25, 18, 4, 0.8333, 0.7200, 150),
        (NOW() - INTERVAL '3 days', 22, 18, 12, 2, 0.8182, 0.6667, 90),
        (NOW() - INTERVAL '4 days', 35, 28, 22, 5, 0.8000, 0.7857, 180),
        (NOW() - INTERVAL '5 days', 28, 23, 17, 4, 0.8214, 0.7391, 210)
      ON CONFLICT (date) DO NOTHING;
    `);
    
    // 2. Engagement Metrics  
    console.log('🚀 Добавляем engagement metrics...');
    await db.execute(sql`
      INSERT INTO engagement_metrics (date, daily_active_users, weekly_active_users, monthly_active_users, avg_session_duration, avg_screens_per_session, avg_trades_per_user, avg_virtual_balance_used, total_trades, total_volume)
      VALUES 
        (NOW() - INTERVAL '1 day', 45, 280, 1250, 240, 8.50, 3.2000, 2500.00000000, 150, 750000.00000000),
        (NOW() - INTERVAL '2 days', 52, 290, 1280, 260, 9.20, 3.8000, 2800.00000000, 180, 820000.00000000),  
        (NOW() - INTERVAL '3 days', 38, 270, 1200, 220, 7.80, 2.9000, 2200.00000000, 120, 680000.00000000),
        (NOW() - INTERVAL '4 days', 61, 310, 1350, 280, 10.10, 4.2000, 3200.00000000, 220, 950000.00000000),
        (NOW() - INTERVAL '5 days', 42, 275, 1220, 250, 8.90, 3.1000, 2600.00000000, 140, 720000.00000000)
      ON CONFLICT (date) DO NOTHING;
    `);
    
    // 3. Revenue Metrics
    console.log('💰 Добавляем revenue metrics...');
    await db.execute(sql`
      INSERT INTO revenue_metrics (date, total_revenue, premium_revenue, ad_revenue, total_paying_users, new_paying_users, arpu, arppu, conversion_rate, churn_rate, lifetime_value)
      VALUES 
        (NOW() - INTERVAL '1 day', 2500.00, 1800.00, 700.00, 8, 6, 55.56, 312.50, 0.1778, 0.0450, 2800.00),
        (NOW() - INTERVAL '2 days', 3200.00, 2400.00, 800.00, 12, 9, 61.54, 266.67, 0.2308, 0.0380, 3100.00),
        (NOW() - INTERVAL '3 days', 1800.00, 1200.00, 600.00, 6, 4, 47.37, 300.00, 0.1579, 0.0520, 2400.00),
        (NOW() - INTERVAL '4 days', 4100.00, 3000.00, 1100.00, 15, 12, 67.21, 273.33, 0.2459, 0.0320, 3500.00),
        (NOW() - INTERVAL '5 days', 2800.00, 2000.00, 800.00, 10, 8, 66.67, 280.00, 0.2381, 0.0410, 2900.00)
      ON CONFLICT (date) DO NOTHING;
    `);
    
    // 4. Cohort Analysis - простые данные
    console.log('👥 Добавляем cohort analysis...');
    await db.execute(sql`
      INSERT INTO cohort_analysis (cohort_week, period_number, users_count, retention_rate, total_revenue, avg_revenue_per_user)
      VALUES 
        (NOW() - INTERVAL '1 week', 0, 25, 1.0000, 5000.00, 200.00),
        (NOW() - INTERVAL '1 week', 1, 20, 0.8000, 4000.00, 200.00),
        (NOW() - INTERVAL '2 weeks', 0, 30, 1.0000, 6000.00, 200.00),
        (NOW() - INTERVAL '2 weeks', 1, 22, 0.7333, 4400.00, 200.00),
        (NOW() - INTERVAL '2 weeks', 2, 18, 0.6000, 3600.00, 200.00),
        (NOW() - INTERVAL '3 weeks', 0, 22, 1.0000, 4400.00, 200.00),
        (NOW() - INTERVAL '3 weeks', 1, 16, 0.7273, 3200.00, 200.00),
        (NOW() - INTERVAL '3 weeks', 2, 12, 0.5455, 2400.00, 200.00),
        (NOW() - INTERVAL '3 weeks', 3, 9, 0.4091, 1800.00, 200.00)
      ON CONFLICT (cohort_week, period_number) DO NOTHING;
    `);
    
    console.log('✅ Тестовые данные созданы!');
    console.log('\n📊 Добавлено:');
    console.log('   • 5 дней acquisition metrics');
    console.log('   • 5 дней engagement metrics (DAU: 38-61)');
    console.log('   • 5 дней revenue metrics ($1800-4100/день)');
    console.log('   • 9 записей cohort analysis');
    console.log('\n🎉 Обновите админскую панель - теперь должны быть данные!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

createQuickData();