-- ============================================
-- CryptoCraze Database Initialization Script
-- ============================================
-- Полная инициализация PostgreSQL базы данных
-- Включает все таблицы, ENUMs, индексы и начальные данные

-- ============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================

-- Премиум планы
INSERT INTO premium_plans (name, description, plan_type, price, currency, features, is_active) 
SELECT 'Premium Месяц', 'Premium подписка на 1 месяц', 'month', 6.99, 'USD', 
       '["Расширенная аналитика", "Приоритетная поддержка", "Эксклюзивные индикаторы", "Без рекламы", "Увеличенный лимит сделок"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE name = 'Premium Месяц');

INSERT INTO premium_plans (name, description, plan_type, price, currency, features, is_active)
SELECT 'Premium Год', 'Premium подписка на 1 год (экономия 20%)', 'year', 64.99, 'USD', 
       '["Все функции месячного плана", "Экономия 20%", "Приоритетный доступ к новым функциям", "Персональный менеджер", "Эксклюзивные вебинары"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE name = 'Premium Год');

-- Шаблоны заданий
INSERT INTO task_templates (template_id, task_type, title, description, reward_type, reward_amount, progress_total, icon, category, rarity, expires_in_hours, is_active) VALUES
-- Видео задания
('video_wheel', 'video_wheel', 'tasks.videoWheel.title', 'tasks.videoWheel.description', 'wheel', 'random', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_money', 'video_money', 'tasks.videoMoney.title', 'tasks.videoMoney.description', 'money', '1000', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_coins', 'video_coins', 'tasks.videoCoins.title', 'tasks.videoCoins.description', 'coins', '30', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_energy', 'video_energy', 'tasks.videoEnergy.title', 'tasks.videoEnergy.description', 'energy', '18', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_mega', 'video_mega', 'tasks.videoMega.title', 'tasks.videoMega.description', 'mixed', '12_energy_1500_money', 1, '/trials/video.svg', 'video', 'rare', 12, true),

-- Ежедневные задания
('daily_bonus', 'daily_bonus', 'tasks.dailyBonus.title', 'tasks.dailyBonus.description', 'money', '750', 1, '/trials/energy.svg', 'daily', 'common', 24, true),
('daily_trader', 'daily_trader', 'tasks.dailyTrader.title', 'tasks.dailyTrader.description', 'coins', '40', 1, '/trials/trade.svg', 'daily', 'common', 24, true),

-- Торговые задания
('trade_first_profit', 'trade_first_profit', 'tasks.tradeFirstProfit.title', 'tasks.tradeFirstProfit.description', 'coins', '25', 100, '/trials/trade.svg', 'trade', 'common', 24, true),
('trade_lucky', 'trade_lucky', 'tasks.tradeLucky.title', 'tasks.tradeLucky.description', 'mixed', '8_energy_800_money', 500, '/trials/trade.svg', 'trade', 'rare', 24, true),
('trade_close', 'trade_close', 'tasks.tradeClose.title', 'tasks.tradeClose.description', 'money', '600', 1, '/trials/trade.svg', 'trade', 'common', 24, true),
('trade_master', 'trade_master', 'tasks.tradeMaster.title', 'tasks.tradeMaster.description', 'mixed', '15_energy_2000_money', 1000, '/trials/trade.svg', 'trade', 'epic', 24, true),

-- Premium задания
('premium_login', 'premium_login', 'tasks.premiumLogin.title', 'tasks.premiumLogin.description', 'coins', '35', 1, '/trials/premium.svg', 'premium', 'rare', 24, true),
('premium_vip', 'premium_vip', 'tasks.premiumVip.title', 'tasks.premiumVip.description', 'mixed', '5_energy_20_coins', 1, '/trials/premium.svg', 'premium', 'rare', 24, true)
;

-- Типы коробок
INSERT INTO box_types (type, name, required_energy, description, is_active) 
SELECT 'red', 'Красная коробка', 10, 'Обычная красная коробка с базовыми призами', true
WHERE NOT EXISTS (SELECT 1 FROM box_types WHERE type = 'red');

INSERT INTO box_types (type, name, required_energy, description, is_active)
SELECT 'green', 'Зеленая коробка', 25, 'Улучшенная зеленая коробка с лучшими призами', true
WHERE NOT EXISTS (SELECT 1 FROM box_types WHERE type = 'green');

INSERT INTO box_types (type, name, required_energy, description, is_active)
SELECT 'x', 'X коробка', 50, 'Премиальная X коробка с эксклюзивными призами', true
WHERE NOT EXISTS (SELECT 1 FROM box_types WHERE type = 'x');

-- Призы для коробок
INSERT INTO prizes (box_type_id, prize_type, amount, pro_days, chance) 
SELECT 
  bt.id, 
  CASE 
    WHEN bt.type = 'red' THEN 'money'::prize_type
    WHEN bt.type = 'green' THEN 'money'::prize_type
    ELSE 'pro'::prize_type
  END,
  CASE 
    WHEN bt.type = 'red' THEN 100.00
    WHEN bt.type = 'green' THEN 500.00
    ELSE NULL
  END,
  CASE 
    WHEN bt.type = 'x' THEN 7
    ELSE NULL
  END,
  CASE 
    WHEN bt.type = 'red' THEN 70.00
    WHEN bt.type = 'green' THEN 60.00
    ELSE 30.00
  END
FROM box_types bt
;

-- Полная система наград (50 уровней)
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active) 
SELECT 1, 5000, 500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 1);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 2, 10000, 1000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 2);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 3, 15000, 1500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 3);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 4, 20000, 2000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 4);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 5, 25000, 2500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 5);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 6, 30000, 3000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 6);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 7, 35000, 3500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 7);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 8, 40000, 4000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 8);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 9, 45000, 4500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 9);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 10, 50000, 5000, 3, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 10);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 11, 60000, 6000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 11);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 12, 70000, 7000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 12);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 13, 80000, 8000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 13);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 14, 90000, 9000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 14);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 15, 100000, 10000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 15);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 16, 110000, 11000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 16);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 17, 120000, 12000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 17);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 18, 130000, 13000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 18);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 19, 140000, 14000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 19);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 20, 150000, 15000, 5, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 20);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 21, 160000, 16000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 21);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 22, 170000, 17000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 22);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 23, 180000, 18000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 23);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 24, 190000, 19000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 24);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 25, 200000, 20000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 25);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 26, 210000, 21000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 26);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 27, 220000, 22000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 27);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 28, 230000, 23000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 28);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 29, 240000, 24000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 29);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 30, 250000, 25000, 5, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 30);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 31, 260000, 26000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 31);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 32, 270000, 27000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 32);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 33, 280000, 28000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 33);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 34, 290000, 29000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 34);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 35, 300000, 30000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 35);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 36, 310000, 31000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 36);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 37, 320000, 32000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 37);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 38, 330000, 33000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 38);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 39, 340000, 34000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 39);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 40, 350000, 35000, 7, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 40);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 41, 400000, 40000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 41);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 42, 450000, 45000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 42);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 43, 475000, 47500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 43);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 44, 490000, 49000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 44);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 45, 495000, 49500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 45);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 46, 498000, 49800, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 46);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 47, 498500, 49850, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 47);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 48, 499000, 49900, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 48);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 49, 499500, 49950, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 49);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 50, 500000, 50000, 10, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 50);

-- ============================================
-- ЗАВЕРШЕНИЕ
-- ============================================

-- Обновляем статистику для оптимизатора
ANALYZE;

-- Выводим информацию о созданных объектах
SELECT 'Database initialization completed!' as message;
SELECT 'Total tables created: ' || count(*) as tables_info FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Premium plans: ' || count(*) as premium_plans FROM premium_plans WHERE is_active = true;
SELECT 'Task templates: ' || count(*) as task_templates FROM task_templates WHERE is_active = true;
SELECT 'Box types: ' || count(*) as box_types FROM box_types WHERE is_active = true;
SELECT 'Available prizes: ' || count(*) as prizes FROM prizes WHERE is_active = true;