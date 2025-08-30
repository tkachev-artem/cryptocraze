"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDailyStatsRelations = exports.adPerformanceMetrics = exports.revenueMetrics = exports.engagementMetrics = exports.userAcquisitionMetrics = exports.cohortAnalysis = exports.userDailyStats = exports.boxOpeningsRelations = exports.prizesRelations = exports.boxTypesRelations = exports.analyticsRelations = exports.usersRelations = exports.boxOpenings = exports.prizes = exports.boxTypes = exports.prizeTypeEnum = exports.boxTypeEnum = exports.taskTemplates = exports.userTasks = exports.deals = exports.rewardTiers = exports.premiumPlans = exports.premiumSubscriptions = exports.userCohorts = exports.dailyMetrics = exports.adEvents = exports.userAcquisition = exports.userSessions = exports.analytics = exports.userNotifications = exports.notificationTypeEnum = exports.users = exports.sessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Session storage table for Replit Auth
exports.sessions = (0, pg_core_1.pgTable)("sessions", {
    sid: (0, pg_core_1.varchar)("sid").primaryKey(),
    sess: (0, pg_core_1.jsonb)("sess").notNull(),
    expire: (0, pg_core_1.timestamp)("expire").notNull(),
}, (table) => [(0, pg_core_1.index)("IDX_session_expire").on(table.expire)]);
// User storage table
exports.users = (0, pg_core_1.pgTable)("users", {
    // Основная информация
    id: (0, pg_core_1.varchar)("id").primaryKey().notNull(),
    email: (0, pg_core_1.varchar)("email").unique(),
    firstName: (0, pg_core_1.varchar)("first_name"),
    lastName: (0, pg_core_1.varchar)("last_name"),
    profileImageUrl: (0, pg_core_1.varchar)("profile_image_url"),
    phone: (0, pg_core_1.varchar)("phone"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    // Финансы
    balance: (0, pg_core_1.decimal)("balance", { precision: 15, scale: 2 }).default("10000.00"), // Деньги
    coins: (0, pg_core_1.integer)("coins").default(0), // Монеты
    freeBalance: (0, pg_core_1.decimal)("free_balance", { precision: 18, scale: 8 }).default("0"), // Свободные средства для сделок
    // Рейтинг и статистика
    ratingScore: (0, pg_core_1.integer)("rating_score").default(0), // Рейтинг в баллах
    ratingRank30Days: (0, pg_core_1.integer)("rating_rank_30_days"), // Номер в рейтинге за 30 дней
    // Торговля
    tradesCount: (0, pg_core_1.integer)("trades_count").default(0), // Количество сделок
    totalTradesVolume: (0, pg_core_1.decimal)("total_trades_volume", { precision: 15, scale: 2 }).default("0.00"), // Сумма сделок в деньгах
    successfulTradesPercentage: (0, pg_core_1.decimal)("successful_trades_percentage", { precision: 5, scale: 2 }).default("0.00"), // Процент успешных сделок
    maxProfit: (0, pg_core_1.decimal)("max_profit", { precision: 15, scale: 2 }).default("0.00"), // Максимальный профит
    maxLoss: (0, pg_core_1.decimal)("max_loss", { precision: 15, scale: 2 }).default("0.00"), // Максимальный убыток
    averageTradeAmount: (0, pg_core_1.decimal)("average_trade_amount", { precision: 15, scale: 2 }).default("0.00"), // Средняя сумма сделки
    // Награды
    rewardsCount: (0, pg_core_1.integer)("rewards_count").default(0), // Количество наград
    // Энергетические задания
    energyTasksBonus: (0, pg_core_1.integer)("energy_tasks_bonus").default(0), // Прогресс энергетических заданий (0-100), при 100 обнуляется и считается выполненным
    // Premium
    isPremium: (0, pg_core_1.boolean)("is_premium").default(false),
    premiumExpiresAt: (0, pg_core_1.timestamp)("premium_expires_at"),
    // Роли
    role: (0, pg_core_1.varchar)("role", { length: 20 }).default("user"), // 'user', 'admin', 'moderator'
});
// Типы уведомлений
exports.notificationTypeEnum = (0, pg_core_1.pgEnum)("notification_type", [
    'auto_close_trade',
    'daily_reward',
    'personal_messages',
    'maintenance',
    'trade_opened',
    'trade_closed',
    'achievement_unlocked',
    'system_alert'
]);
// Таблица уведомлений пользователей
exports.userNotifications = (0, pg_core_1.pgTable)("user_notifications", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id", { length: 255 }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    type: (0, exports.notificationTypeEnum)("type").notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    message: (0, pg_core_1.text)("message"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    isRead: (0, pg_core_1.boolean)("is_read").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow()
});
// удалены: trading_pairs, trades, achievements, user_achievements, daily_rewards, loot_boxes, user_loot_history, price_history
exports.analytics = (0, pg_core_1.pgTable)("analytics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 50 }).notNull(),
    eventData: (0, pg_core_1.jsonb)("event_data"),
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow(),
    sessionId: (0, pg_core_1.varchar)("session_id"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
}, (table) => [
    (0, pg_core_1.index)("idx_analytics_user_id").on(table.userId),
    (0, pg_core_1.index)("idx_analytics_event_type").on(table.eventType),
    (0, pg_core_1.index)("idx_analytics_timestamp").on(table.timestamp),
    (0, pg_core_1.index)("idx_analytics_session_id").on(table.sessionId),
]);
// Enhanced analytics tables for BI metrics
// User sessions tracking for engagement metrics
exports.userSessions = (0, pg_core_1.pgTable)("user_sessions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 255 }).notNull(),
    startTime: (0, pg_core_1.timestamp)("start_time").notNull().defaultNow(),
    endTime: (0, pg_core_1.timestamp)("end_time"),
    duration: (0, pg_core_1.integer)("duration"), // in seconds
    screensOpened: (0, pg_core_1.integer)("screens_opened").default(0),
    tradesOpened: (0, pg_core_1.integer)("trades_opened").default(0),
    adsWatched: (0, pg_core_1.integer)("ads_watched").default(0),
    virtualBalanceUsed: (0, pg_core_1.decimal)("virtual_balance_used", { precision: 18, scale: 8 }).default("0"),
    deviceInfo: (0, pg_core_1.jsonb)("device_info"), // device type, OS, app version
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_user_sessions_user_id").on(table.userId),
    (0, pg_core_1.index)("idx_user_sessions_start_time").on(table.startTime),
    (0, pg_core_1.index)("idx_user_sessions_session_id").on(table.sessionId),
]);
// User acquisition tracking
exports.userAcquisition = (0, pg_core_1.pgTable)("user_acquisition", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }).unique(),
    installDate: (0, pg_core_1.timestamp)("install_date").notNull().defaultNow(),
    firstOpenDate: (0, pg_core_1.timestamp)("first_open_date"),
    signupDate: (0, pg_core_1.timestamp)("signup_date"),
    firstTradeDate: (0, pg_core_1.timestamp)("first_trade_date"),
    acquisitionSource: (0, pg_core_1.varchar)("acquisition_source", { length: 100 }), // organic, google_ads, facebook_ads, etc.
    campaignId: (0, pg_core_1.varchar)("campaign_id", { length: 100 }),
    adGroupId: (0, pg_core_1.varchar)("ad_group_id", { length: 100 }),
    creativeId: (0, pg_core_1.varchar)("creative_id", { length: 100 }),
    utmSource: (0, pg_core_1.varchar)("utm_source", { length: 100 }),
    utmMedium: (0, pg_core_1.varchar)("utm_medium", { length: 100 }),
    utmCampaign: (0, pg_core_1.varchar)("utm_campaign", { length: 100 }),
    referralCode: (0, pg_core_1.varchar)("referral_code", { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_user_acquisition_install_date").on(table.installDate),
    (0, pg_core_1.index)("idx_user_acquisition_source").on(table.acquisitionSource),
    (0, pg_core_1.index)("idx_user_acquisition_first_trade").on(table.firstTradeDate),
]);
// Ad performance tracking
exports.adEvents = (0, pg_core_1.pgTable)("ad_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").references(() => exports.users.id, { onDelete: 'cascade' }),
    sessionId: (0, pg_core_1.varchar)("session_id", { length: 255 }),
    adType: (0, pg_core_1.varchar)("ad_type", { length: 30 }).notNull(), // rewarded_video, interstitial, banner
    adNetwork: (0, pg_core_1.varchar)("ad_network", { length: 50 }), // admob, facebook, unity
    adUnitId: (0, pg_core_1.varchar)("ad_unit_id", { length: 100 }),
    eventType: (0, pg_core_1.varchar)("event_type", { length: 30 }).notNull(), // impression, click, reward, close
    rewardAmount: (0, pg_core_1.decimal)("reward_amount", { precision: 18, scale: 8 }),
    rewardType: (0, pg_core_1.varchar)("reward_type", { length: 20 }), // money, coins, energy, pro_days
    revenue: (0, pg_core_1.decimal)("revenue", { precision: 10, scale: 6 }), // estimated revenue in USD
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow(),
    metadata: (0, pg_core_1.jsonb)("metadata"), // additional ad network specific data
}, (table) => [
    (0, pg_core_1.index)("idx_ad_events_user_id").on(table.userId),
    (0, pg_core_1.index)("idx_ad_events_timestamp").on(table.timestamp),
    (0, pg_core_1.index)("idx_ad_events_type").on(table.adType, table.eventType),
    (0, pg_core_1.index)("idx_ad_events_session_id").on(table.sessionId),
]);
// Daily aggregated metrics for faster BI queries
exports.dailyMetrics = (0, pg_core_1.pgTable)("daily_metrics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    date: (0, pg_core_1.timestamp)("date").notNull(), // date at 00:00 UTC
    // User Acquisition Metrics
    newInstalls: (0, pg_core_1.integer)("new_installs").default(0),
    newSignups: (0, pg_core_1.integer)("new_signups").default(0),
    newFirstTrades: (0, pg_core_1.integer)("new_first_trades").default(0),
    // Engagement Metrics
    dailyActiveUsers: (0, pg_core_1.integer)("daily_active_users").default(0),
    totalSessions: (0, pg_core_1.integer)("total_sessions").default(0),
    avgSessionDuration: (0, pg_core_1.decimal)("avg_session_duration", { precision: 10, scale: 2 }), // in minutes
    totalTradesOpened: (0, pg_core_1.integer)("total_trades_opened").default(0),
    totalScreensOpened: (0, pg_core_1.integer)("total_screens_opened").default(0),
    avgVirtualBalanceUsed: (0, pg_core_1.decimal)("avg_virtual_balance_used", { precision: 18, scale: 8 }),
    // Retention Metrics (calculated for this day's cohort)
    retentionD1: (0, pg_core_1.decimal)("retention_d1", { precision: 5, scale: 2 }), // percentage
    retentionD3: (0, pg_core_1.decimal)("retention_d3", { precision: 5, scale: 2 }),
    retentionD7: (0, pg_core_1.decimal)("retention_d7", { precision: 5, scale: 2 }),
    retentionD30: (0, pg_core_1.decimal)("retention_d30", { precision: 5, scale: 2 }),
    // Monetization Metrics
    totalRevenue: (0, pg_core_1.decimal)("total_revenue", { precision: 15, scale: 2 }).default("0"),
    premiumSubscriptions: (0, pg_core_1.integer)("premium_subscriptions").default(0),
    arpu: (0, pg_core_1.decimal)("arpu", { precision: 10, scale: 2 }), // Average Revenue Per User
    arppu: (0, pg_core_1.decimal)("arppu", { precision: 10, scale: 2 }), // Average Revenue Per Paying User
    // Ad Performance Metrics
    adImpressions: (0, pg_core_1.integer)("ad_impressions").default(0),
    adClicks: (0, pg_core_1.integer)("ad_clicks").default(0),
    adRewards: (0, pg_core_1.integer)("ad_rewards").default(0),
    adRevenue: (0, pg_core_1.decimal)("ad_revenue", { precision: 15, scale: 2 }).default("0"),
    ctr: (0, pg_core_1.decimal)("ctr", { precision: 5, scale: 2 }), // Click Through Rate
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_daily_metrics_date").on(table.date),
]);
// User cohorts for retention analysis
exports.userCohorts = (0, pg_core_1.pgTable)("user_cohorts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    cohortDate: (0, pg_core_1.timestamp)("cohort_date").notNull(), // install date truncated to day
    daysSinceInstall: (0, pg_core_1.integer)("days_since_install").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(false), // was user active on this day
    tradesCount: (0, pg_core_1.integer)("trades_count").default(0),
    sessionDuration: (0, pg_core_1.integer)("session_duration").default(0), // in seconds
    virtualBalanceUsed: (0, pg_core_1.decimal)("virtual_balance_used", { precision: 18, scale: 8 }).default("0"),
    recordDate: (0, pg_core_1.timestamp)("record_date").notNull(), // the actual date being recorded
}, (table) => [
    (0, pg_core_1.index)("idx_user_cohorts_cohort_date").on(table.cohortDate),
    (0, pg_core_1.index)("idx_user_cohorts_user_id").on(table.userId),
    (0, pg_core_1.index)("idx_user_cohorts_record_date").on(table.recordDate),
    (0, pg_core_1.index)("idx_user_cohorts_days_since").on(table.daysSinceInstall),
]);
// Premium подписки
exports.premiumSubscriptions = (0, pg_core_1.pgTable)("premium_subscriptions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    telegramId: (0, pg_core_1.varchar)("telegram_id", { length: 50 }),
    paymentId: (0, pg_core_1.varchar)("payment_id", { length: 100 }).notNull().unique(),
    planType: (0, pg_core_1.varchar)("plan_type", { length: 20 }).notNull(), // 'month', 'year'
    amount: (0, pg_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default("RUB"),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("pending"), // 'pending', 'succeeded', 'canceled', 'failed'
    metadata: (0, pg_core_1.jsonb)("metadata"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    isActive: (0, pg_core_1.boolean)("is_active").default(false),
});
// Premium планы
exports.premiumPlans = (0, pg_core_1.pgTable)("premium_plans", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    planType: (0, pg_core_1.varchar)("plan_type", { length: 20 }).notNull(), // 'month', 'year'
    price: (0, pg_core_1.decimal)("price", { precision: 10, scale: 2 }).notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default("RUB"),
    features: (0, pg_core_1.jsonb)("features"), // Список функций
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Таблица уровней наград (tiers)
exports.rewardTiers = (0, pg_core_1.pgTable)("reward_tiers", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    level: (0, pg_core_1.integer)("level").notNull().unique(), // Требуемое значение rewards_count
    accountMoney: (0, pg_core_1.integer)("account_money").notNull(), // Порог денег на аккаунте
    reward: (0, pg_core_1.integer)("reward").notNull(), // Размер награды
    proDays: (0, pg_core_1.integer)("pro_days"), // Дополнительные дни PRO
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.deals = (0, pg_core_1.pgTable)('deals', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 32 }).notNull(),
    symbol: (0, pg_core_1.varchar)('symbol', { length: 16 }).notNull(),
    direction: (0, pg_core_1.varchar)('direction', { length: 8 }).notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 18, scale: 8 }).notNull(),
    multiplier: (0, pg_core_1.integer)('multiplier').notNull(),
    openPrice: (0, pg_core_1.numeric)('open_price', { precision: 18, scale: 8 }).notNull(),
    takeProfit: (0, pg_core_1.numeric)('take_profit', { precision: 18, scale: 8 }),
    stopLoss: (0, pg_core_1.numeric)('stop_loss', { precision: 18, scale: 8 }),
    openedAt: (0, pg_core_1.timestamp)('opened_at').notNull().defaultNow(),
    status: (0, pg_core_1.varchar)('status', { length: 16 }).notNull().default('open'),
    closedAt: (0, pg_core_1.timestamp)('closed_at'),
    closePrice: (0, pg_core_1.numeric)('close_price', { precision: 18, scale: 8 }),
    profit: (0, pg_core_1.numeric)('profit', { precision: 18, scale: 8 }),
});
// Таблица заданий пользователей
exports.userTasks = (0, pg_core_1.pgTable)('user_tasks', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    taskType: (0, pg_core_1.varchar)('task_type', { length: 50 }).notNull(), // 'video_bonus', 'trade_bonus', etc.
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    rewardType: (0, pg_core_1.varchar)('reward_type', { length: 20 }).notNull(), // 'money', 'coins', 'energy', 'mixed', 'wheel'
    rewardAmount: (0, pg_core_1.varchar)('reward_amount', { length: 50 }).notNull(), // '1K', '100', etc.
    progressCurrent: (0, pg_core_1.integer)('progress_current').default(0),
    progressTotal: (0, pg_core_1.integer)('progress_total').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).notNull().default('active'), // 'active', 'completed', 'expired'
    icon: (0, pg_core_1.varchar)('icon', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
});
// Таблица шаблонов заданий (для админов)
exports.taskTemplates = (0, pg_core_1.pgTable)('task_templates', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    templateId: (0, pg_core_1.varchar)('template_id', { length: 100 }).notNull().unique(), // Уникальный ID шаблона
    taskType: (0, pg_core_1.varchar)('task_type', { length: 50 }).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    rewardType: (0, pg_core_1.varchar)('reward_type', { length: 20 }).notNull(), // 'money', 'coins', 'energy', 'mixed', 'wheel'
    rewardAmount: (0, pg_core_1.varchar)('reward_amount', { length: 50 }).notNull(),
    progressTotal: (0, pg_core_1.integer)('progress_total').notNull(),
    icon: (0, pg_core_1.varchar)('icon', { length: 255 }),
    category: (0, pg_core_1.varchar)('category', { length: 20 }).notNull(), // 'daily', 'video', 'trade', 'social', 'premium', 'crypto', 'energy'
    rarity: (0, pg_core_1.varchar)('rarity', { length: 20 }).notNull(), // 'common', 'rare', 'epic', 'legendary'
    expiresInHours: (0, pg_core_1.integer)('expires_in_hours').notNull().default(24),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdBy: (0, pg_core_1.varchar)('created_by', { length: 255 }).references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
});
// Enum для типов коробок
exports.boxTypeEnum = (0, pg_core_1.pgEnum)("box_type", ['red', 'green', 'x']);
// Enum для типов призов
exports.prizeTypeEnum = (0, pg_core_1.pgEnum)("prize_type", ['money', 'pro']);
// Таблица типов коробок
exports.boxTypes = (0, pg_core_1.pgTable)("box_types", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    type: (0, exports.boxTypeEnum)("type").notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
    requiredEnergy: (0, pg_core_1.integer)("required_energy").notNull(),
    description: (0, pg_core_1.text)("description"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Таблица призов
exports.prizes = (0, pg_core_1.pgTable)("prizes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    boxTypeId: (0, pg_core_1.integer)("box_type_id").notNull().references(() => exports.boxTypes.id, { onDelete: 'cascade' }),
    prizeType: (0, exports.prizeTypeEnum)("prize_type").notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 15, scale: 2 }), // Для денежных призов
    proDays: (0, pg_core_1.integer)("pro_days"), // Для PRO призов
    chance: (0, pg_core_1.decimal)("chance", { precision: 5, scale: 2 }).notNull(), // Шанс выпадения в процентах
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
// Таблица истории открытий коробок
exports.boxOpenings = (0, pg_core_1.pgTable)("box_openings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id", { length: 255 }).notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    boxTypeId: (0, pg_core_1.integer)("box_type_id").notNull().references(() => exports.boxTypes.id),
    prizeId: (0, pg_core_1.integer)("prize_id").notNull().references(() => exports.prizes.id),
    prizeType: (0, exports.prizeTypeEnum)("prize_type").notNull(),
    amount: (0, pg_core_1.decimal)("amount", { precision: 15, scale: 2 }), // Полученная сумма
    proDays: (0, pg_core_1.integer)("pro_days"), // Полученные дни PRO
    energySpent: (0, pg_core_1.integer)("energy_spent").notNull(), // Потраченная энергия
    openedAt: (0, pg_core_1.timestamp)("opened_at").defaultNow(),
});
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    analytics: many(exports.analytics),
    boxOpenings: many(exports.boxOpenings),
}));
exports.analyticsRelations = (0, drizzle_orm_1.relations)(exports.analytics, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.analytics.userId],
        references: [exports.users.id],
    }),
}));
exports.boxTypesRelations = (0, drizzle_orm_1.relations)(exports.boxTypes, ({ many }) => ({
    prizes: many(exports.prizes),
    boxOpenings: many(exports.boxOpenings),
}));
exports.prizesRelations = (0, drizzle_orm_1.relations)(exports.prizes, ({ one, many }) => ({
    boxType: one(exports.boxTypes, {
        fields: [exports.prizes.boxTypeId],
        references: [exports.boxTypes.id],
    }),
    boxOpenings: many(exports.boxOpenings),
}));
exports.boxOpeningsRelations = (0, drizzle_orm_1.relations)(exports.boxOpenings, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.boxOpenings.userId],
        references: [exports.users.id],
    }),
    boxType: one(exports.boxTypes, {
        fields: [exports.boxOpenings.boxTypeId],
        references: [exports.boxTypes.id],
    }),
    prize: one(exports.prizes, {
        fields: [exports.boxOpenings.prizeId],
        references: [exports.prizes.id],
    }),
}));
// BI Analytics Tables
exports.userDailyStats = (0, pg_core_1.pgTable)("user_daily_stats", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    date: (0, pg_core_1.timestamp)("date").notNull(),
    tradesCount: (0, pg_core_1.integer)("trades_count").default(0),
    tradesVolume: (0, pg_core_1.decimal)("trades_volume", { precision: 18, scale: 8 }).default("0"),
    totalProfit: (0, pg_core_1.decimal)("total_profit", { precision: 18, scale: 8 }).default("0"),
    sessionDuration: (0, pg_core_1.integer)("session_duration").default(0), // in minutes
    screensViewed: (0, pg_core_1.integer)("screens_viewed").default(0),
    energyUsed: (0, pg_core_1.integer)("energy_used").default(0),
    coinsEarned: (0, pg_core_1.integer)("coins_earned").default(0),
    premiumActive: (0, pg_core_1.boolean)("premium_active").default(false),
}, (table) => [
    (0, pg_core_1.index)("idx_user_daily_stats_user_date").on(table.userId, table.date),
    (0, pg_core_1.index)("idx_user_daily_stats_date").on(table.date),
]);
exports.cohortAnalysis = (0, pg_core_1.pgTable)("cohort_analysis", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    cohortWeek: (0, pg_core_1.timestamp)("cohort_week").notNull(), // Week when user registered
    periodNumber: (0, pg_core_1.integer)("period_number").notNull(), // Weeks since registration (0, 1, 2, 3...)
    usersCount: (0, pg_core_1.integer)("users_count").notNull(),
    retentionRate: (0, pg_core_1.decimal)("retention_rate", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
    totalRevenue: (0, pg_core_1.decimal)("total_revenue", { precision: 18, scale: 2 }).default("0"),
    avgRevenuePerUser: (0, pg_core_1.decimal)("avg_revenue_per_user", { precision: 18, scale: 2 }).default("0"),
}, (table) => [
    (0, pg_core_1.index)("idx_cohort_week_period").on(table.cohortWeek, table.periodNumber),
]);
exports.userAcquisitionMetrics = (0, pg_core_1.pgTable)("user_acquisition_metrics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    date: (0, pg_core_1.timestamp)("date").notNull(),
    totalInstalls: (0, pg_core_1.integer)("total_installs").default(0),
    totalSignups: (0, pg_core_1.integer)("total_signups").default(0),
    totalFirstTrades: (0, pg_core_1.integer)("total_first_trades").default(0),
    totalFirstDeposits: (0, pg_core_1.integer)("total_first_deposits").default(0),
    signupRate: (0, pg_core_1.decimal)("signup_rate", { precision: 5, scale: 4 }), // signup/install
    tradeOpenRate: (0, pg_core_1.decimal)("trade_open_rate", { precision: 5, scale: 4 }), // first_trade/signup
    avgTimeToFirstTrade: (0, pg_core_1.integer)("avg_time_to_first_trade"), // in minutes
}, (table) => [
    (0, pg_core_1.index)("idx_acquisition_date").on(table.date),
]);
exports.engagementMetrics = (0, pg_core_1.pgTable)("engagement_metrics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    date: (0, pg_core_1.timestamp)("date").notNull(),
    dailyActiveUsers: (0, pg_core_1.integer)("daily_active_users").default(0),
    weeklyActiveUsers: (0, pg_core_1.integer)("weekly_active_users").default(0),
    monthlyActiveUsers: (0, pg_core_1.integer)("monthly_active_users").default(0),
    avgSessionDuration: (0, pg_core_1.integer)("avg_session_duration").default(0), // in minutes
    avgScreensPerSession: (0, pg_core_1.decimal)("avg_screens_per_session", { precision: 5, scale: 2 }),
    avgTradesPerUser: (0, pg_core_1.decimal)("avg_trades_per_user", { precision: 8, scale: 4 }),
    avgVirtualBalanceUsed: (0, pg_core_1.decimal)("avg_virtual_balance_used", { precision: 18, scale: 8 }),
    totalTrades: (0, pg_core_1.integer)("total_trades").default(0),
    totalVolume: (0, pg_core_1.decimal)("total_volume", { precision: 20, scale: 8 }).default("0"),
}, (table) => [
    (0, pg_core_1.index)("idx_engagement_date").on(table.date),
]);
exports.revenueMetrics = (0, pg_core_1.pgTable)("revenue_metrics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    date: (0, pg_core_1.timestamp)("date").notNull(),
    totalRevenue: (0, pg_core_1.decimal)("total_revenue", { precision: 18, scale: 2 }).default("0"),
    premiumRevenue: (0, pg_core_1.decimal)("premium_revenue", { precision: 18, scale: 2 }).default("0"),
    adRevenue: (0, pg_core_1.decimal)("ad_revenue", { precision: 18, scale: 2 }).default("0"),
    totalPayingUsers: (0, pg_core_1.integer)("total_paying_users").default(0),
    newPayingUsers: (0, pg_core_1.integer)("new_paying_users").default(0),
    arpu: (0, pg_core_1.decimal)("arpu", { precision: 18, scale: 2 }).default("0"), // Average Revenue Per User
    arppu: (0, pg_core_1.decimal)("arppu", { precision: 18, scale: 2 }).default("0"), // Average Revenue Per Paying User
    conversionRate: (0, pg_core_1.decimal)("conversion_rate", { precision: 5, scale: 4 }), // paying_users/total_users
    churnRate: (0, pg_core_1.decimal)("churn_rate", { precision: 5, scale: 4 }),
    lifetimeValue: (0, pg_core_1.decimal)("lifetime_value", { precision: 18, scale: 2 }).default("0"),
}, (table) => [
    (0, pg_core_1.index)("idx_revenue_date").on(table.date),
]);
// Ad Performance Metrics Table
exports.adPerformanceMetrics = (0, pg_core_1.pgTable)("ad_performance_metrics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    date: (0, pg_core_1.timestamp)("date").notNull(),
    totalAdSpend: (0, pg_core_1.decimal)("total_ad_spend", { precision: 18, scale: 2 }).default("0"),
    totalInstalls: (0, pg_core_1.integer)("total_installs").default(0),
    totalConversions: (0, pg_core_1.integer)("total_conversions").default(0),
    totalRevenue: (0, pg_core_1.decimal)("total_revenue", { precision: 18, scale: 2 }).default("0"),
    cpi: (0, pg_core_1.decimal)("cpi", { precision: 8, scale: 2 }).default("0"), // Cost Per Install
    cpa: (0, pg_core_1.decimal)("cpa", { precision: 8, scale: 2 }).default("0"), // Cost Per Action
    roas: (0, pg_core_1.decimal)("roas", { precision: 8, scale: 4 }).default("0"), // Return On Ad Spend
    adImpressions: (0, pg_core_1.bigint)("ad_impressions", { mode: "number" }).default(0),
    adClicks: (0, pg_core_1.integer)("ad_clicks").default(0),
    clickThroughRate: (0, pg_core_1.decimal)("click_through_rate", { precision: 5, scale: 4 }).default("0"),
    conversionRate: (0, pg_core_1.decimal)("conversion_rate", { precision: 5, scale: 4 }).default("0"),
    avgRevenuePerInstall: (0, pg_core_1.decimal)("avg_revenue_per_install", { precision: 8, scale: 2 }).default("0"),
}, (table) => [
    (0, pg_core_1.index)("idx_ad_performance_date").on(table.date),
]);
// Relations for BI Analytics
exports.userDailyStatsRelations = (0, drizzle_orm_1.relations)(exports.userDailyStats, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.userDailyStats.userId],
        references: [exports.users.id],
    }),
}));
