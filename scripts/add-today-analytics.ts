import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

async function addTodayData() {
  console.log('📊 Добавление данных аналитики за сегодня...');
  
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // 1. User Acquisition Metrics для сегодня
    console.log('📈 Добавляем acquisition metrics за сегодня...');
    await db.execute(sql`
      INSERT INTO user_acquisition_metrics (date, total_installs, total_signups, total_first_trades, total_first_deposits, signup_rate, trade_open_rate, avg_time_to_first_trade)
      VALUES 
        (${todayStr}, 32, 26, 19, 5, 0.8125, 0.7308, 95)
      ON CONFLICT (date) DO UPDATE SET
        total_installs = EXCLUDED.total_installs,
        total_signups = EXCLUDED.total_signups,
        total_first_trades = EXCLUDED.total_first_trades,
        total_first_deposits = EXCLUDED.total_first_deposits,
        signup_rate = EXCLUDED.signup_rate,
        trade_open_rate = EXCLUDED.trade_open_rate,
        avg_time_to_first_trade = EXCLUDED.avg_time_to_first_trade;
    `);
    
    // 2. Engagement Metrics для сегодня  
    console.log('🚀 Добавляем engagement metrics за сегодня...');
    await db.execute(sql`
      INSERT INTO engagement_metrics (date, daily_active_users, weekly_active_users, monthly_active_users, avg_session_duration, avg_screens_per_session, avg_trades_per_user, avg_virtual_balance_used, total_trades, total_volume)
      VALUES 
        (${todayStr}, 48, 295, 1290, 275, 9.80, 3.6000, 2900.00000000, 165, 780000.00000000)
      ON CONFLICT (date) DO UPDATE SET
        daily_active_users = EXCLUDED.daily_active_users,
        weekly_active_users = EXCLUDED.weekly_active_users,
        monthly_active_users = EXCLUDED.monthly_active_users,
        avg_session_duration = EXCLUDED.avg_session_duration,
        avg_screens_per_session = EXCLUDED.avg_screens_per_session,
        avg_trades_per_user = EXCLUDED.avg_trades_per_user,
        avg_virtual_balance_used = EXCLUDED.avg_virtual_balance_used,
        total_trades = EXCLUDED.total_trades,
        total_volume = EXCLUDED.total_volume;
    `);
    
    // 3. Revenue Metrics для сегодня
    console.log('💰 Добавляем revenue metrics за сегодня...');
    await db.execute(sql`
      INSERT INTO revenue_metrics (date, total_revenue, premium_revenue, ad_revenue, total_paying_users, new_paying_users, arpu, arppu, conversion_rate, churn_rate, lifetime_value)
      VALUES 
        (${todayStr}, 3400.00, 2600.00, 800.00, 13, 10, 58.62, 261.54, 0.2241, 0.0360, 3200.00)
      ON CONFLICT (date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        premium_revenue = EXCLUDED.premium_revenue,
        ad_revenue = EXCLUDED.ad_revenue,
        total_paying_users = EXCLUDED.total_paying_users,
        new_paying_users = EXCLUDED.new_paying_users,
        arpu = EXCLUDED.arpu,
        arppu = EXCLUDED.arppu,
        conversion_rate = EXCLUDED.conversion_rate,
        churn_rate = EXCLUDED.churn_rate,
        lifetime_value = EXCLUDED.lifetime_value;
    `);
    
    console.log('✅ Данные за сегодня добавлены успешно!');
    console.log('📊 Теперь админская панель должна показывать:');
    console.log('   📈 Signups: 26, First trades: 19');
    console.log('   🚀 DAU: 48, Total trades: 165');
    console.log('   💰 Revenue: $3,400, ARPU: $58.62, ARPPU: $261.54');
    console.log('   🎯 Conversion: 22.41%');
    console.log('');
    console.log('🎉 Обновите админскую панель!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

addTodayData();