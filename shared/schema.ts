import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
  decimal,
  boolean,
  serial,
  real,
  pgEnum,
  uuid,
  numeric,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  // Основная информация
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Финансы
  balance: decimal("balance", { precision: 15, scale: 2 }).default("10000.00"), // Деньги
  coins: integer("coins").default(0), // Монеты
  freeBalance: decimal("free_balance", { precision: 18, scale: 8 }).default("0"), // Свободные средства для сделок
  
  // Рейтинг и статистика
  ratingScore: integer("rating_score").default(0), // Рейтинг в баллах
  ratingRank30Days: integer("rating_rank_30_days"), // Номер в рейтинге за 30 дней
  
  // Торговля
  tradesCount: integer("trades_count").default(0), // Количество сделок
  totalTradesVolume: decimal("total_trades_volume", { precision: 15, scale: 2 }).default("0.00"), // Сумма сделок в деньгах
  successfulTradesPercentage: decimal("successful_trades_percentage", { precision: 5, scale: 2 }).default("0.00"), // Процент успешных сделок
  maxProfit: decimal("max_profit", { precision: 15, scale: 2 }).default("0.00"), // Максимальный профит
  maxLoss: decimal("max_loss", { precision: 15, scale: 2 }).default("0.00"), // Максимальный убыток
  averageTradeAmount: decimal("average_trade_amount", { precision: 15, scale: 2 }).default("0.00"), // Средняя сумма сделки
  
  // Награды
  rewardsCount: integer("rewards_count").default(0), // Количество наград
  
  // Энергетические задания
  energyTasksBonus: integer("energy_tasks_bonus").default(0), // Прогресс энергетических заданий (0-100), при 100 обнуляется и считается выполненным
  
  // Premium
  isPremium: boolean("is_premium").default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  
  // Роли
  role: varchar("role", { length: 20 }).default("user"), // 'user', 'admin', 'moderator'
});

// Типы уведомлений
export const notificationTypeEnum = pgEnum("notification_type", [
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
export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isActive: boolean("is_active").default(true),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// удалены: trading_pairs, trades, achievements, user_achievements, daily_rewards, loot_boxes, user_loot_history, price_history

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  timestamp: timestamp("timestamp").defaultNow(),
  sessionId: varchar("session_id"),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }),
}, (table) => [
  index("idx_analytics_user_id").on(table.userId),
  index("idx_analytics_event_type").on(table.eventType),
  index("idx_analytics_timestamp").on(table.timestamp),
  index("idx_analytics_session_id").on(table.sessionId),
]);

// Enhanced analytics tables for BI metrics

// User sessions tracking for engagement metrics
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in seconds
  screensOpened: integer("screens_opened").default(0),
  tradesOpened: integer("trades_opened").default(0),
  adsWatched: integer("ads_watched").default(0),
  virtualBalanceUsed: decimal("virtual_balance_used", { precision: 18, scale: 8 }).default("0"),
  deviceInfo: jsonb("device_info"), // device type, OS, app version
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_sessions_user_id").on(table.userId),
  index("idx_user_sessions_start_time").on(table.startTime),
  index("idx_user_sessions_session_id").on(table.sessionId),
]);

// User acquisition tracking
// Ad system types
export const adTypeEnum = pgEnum("ad_type", [
  'rewarded_video',
  'interstitial',
  'banner',
  'native'
]);

export const adPlacementEnum = pgEnum("ad_placement", [
  'task_completion',
  'wheel_spin',
  'box_opening',
  'trading_bonus',
  'screen_transition'
]);

export const adProviderEnum = pgEnum("ad_provider", [
  'google_admob',
  'google_adsense',
  'simulation'
]);

export const adRewardTypeEnum = pgEnum("ad_reward_type", [
  'money',
  'coins',
  'energy',
  'trading_bonus'
]);

// Ad sessions tracking table
export const adSessions = pgTable("ad_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  adId: varchar("ad_id", { length: 100 }).notNull(),
  adType: adTypeEnum("ad_type").notNull(),
  placement: adPlacementEnum("placement").notNull(),
  provider: adProviderEnum("provider").notNull().default('simulation'),
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  watchTime: integer("watch_time"), // Duration in milliseconds
  completed: boolean("completed").default(false),
  rewardClaimed: boolean("reward_claimed").default(false),
  fraudDetected: boolean("fraud_detected").default(false),
  fraudReason: text("fraud_reason"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceInfo: jsonb("device_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ad_sessions_user_id").on(table.userId),
  index("idx_ad_sessions_ad_id").on(table.adId),
  index("idx_ad_sessions_placement").on(table.placement),
  index("idx_ad_sessions_start_time").on(table.startTime),
  index("idx_ad_sessions_completed").on(table.completed),
  index("idx_ad_sessions_fraud_detected").on(table.fraudDetected),
]);

// Ad rewards tracking table
export const adRewards = pgTable("ad_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => adSessions.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rewardType: adRewardTypeEnum("reward_type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  multiplier: decimal("multiplier", { precision: 5, scale: 2 }).default("1.00"),
  bonusPercentage: integer("bonus_percentage"), // For trading bonus ads
  processed: boolean("processed").default(false),
  processedAt: timestamp("processed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ad_rewards_session_id").on(table.sessionId),
  index("idx_ad_rewards_user_id").on(table.userId),
  index("idx_ad_rewards_processed").on(table.processed),
  index("idx_ad_rewards_created_at").on(table.createdAt),
]);

// Ad performance metrics table
export const adPerformanceMetrics = pgTable("ad_performance_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull().defaultNow(),
  adType: adTypeEnum("ad_type").notNull(),
  placement: adPlacementEnum("placement").notNull(),
  provider: adProviderEnum("provider").notNull(),
  impressions: integer("impressions").default(0),
  completions: integer("completions").default(0),
  rewards: integer("rewards").default(0),
  fraudAttempts: integer("fraud_attempts").default(0),
  totalWatchTime: bigint("total_watch_time", { mode: 'number' }).default(0), // Total watch time in milliseconds
  totalRewardAmount: decimal("total_reward_amount", { precision: 18, scale: 8 }).default("0"),
  revenue: decimal("revenue", { precision: 18, scale: 8 }).default("0"), // Estimated ad revenue
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ad_performance_date").on(table.date),
  index("idx_ad_performance_type_placement").on(table.adType, table.placement),
]);

export const userAcquisition = pgTable("user_acquisition", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  installDate: timestamp("install_date").notNull().defaultNow(),
  firstOpenDate: timestamp("first_open_date"),
  signupDate: timestamp("signup_date"),
  firstTradeDate: timestamp("first_trade_date"),
  acquisitionSource: varchar("acquisition_source", { length: 100 }), // organic, google_ads, facebook_ads, etc.
  campaignId: varchar("campaign_id", { length: 100 }),
  adGroupId: varchar("ad_group_id", { length: 100 }),
  creativeId: varchar("creative_id", { length: 100 }),
  utmSource: varchar("utm_source", { length: 100 }),
  utmMedium: varchar("utm_medium", { length: 100 }),
  utmCampaign: varchar("utm_campaign", { length: 100 }),
  referralCode: varchar("referral_code", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_acquisition_install_date").on(table.installDate),
  index("idx_user_acquisition_source").on(table.acquisitionSource),
  index("idx_user_acquisition_first_trade").on(table.firstTradeDate),
]);

// Ad performance tracking
export const adEvents = pgTable("ad_events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  sessionId: varchar("session_id", { length: 255 }),
  adType: varchar("ad_type", { length: 30 }).notNull(), // rewarded_video, interstitial, banner
  adNetwork: varchar("ad_network", { length: 50 }), // admob, facebook, unity
  adUnitId: varchar("ad_unit_id", { length: 100 }),
  eventType: varchar("event_type", { length: 30 }).notNull(), // impression, click, reward, close
  rewardAmount: decimal("reward_amount", { precision: 18, scale: 8 }),
  rewardType: varchar("reward_type", { length: 20 }), // money, coins, energy, pro_days
  revenue: decimal("revenue", { precision: 10, scale: 6 }), // estimated revenue in USD
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // additional ad network specific data
}, (table) => [
  index("idx_ad_events_user_id").on(table.userId),
  index("idx_ad_events_timestamp").on(table.timestamp),
  index("idx_ad_events_type").on(table.adType, table.eventType),
  index("idx_ad_events_session_id").on(table.sessionId),
]);

// Daily aggregated metrics for faster BI queries
export const dailyMetrics = pgTable("daily_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(), // date at 00:00 UTC
  
  // User Acquisition Metrics
  newInstalls: integer("new_installs").default(0),
  newSignups: integer("new_signups").default(0),
  newFirstTrades: integer("new_first_trades").default(0),
  
  // Engagement Metrics
  dailyActiveUsers: integer("daily_active_users").default(0),
  totalSessions: integer("total_sessions").default(0),
  avgSessionDuration: decimal("avg_session_duration", { precision: 10, scale: 2 }), // in minutes
  totalTradesOpened: integer("total_trades_opened").default(0),
  totalScreensOpened: integer("total_screens_opened").default(0),
  avgVirtualBalanceUsed: decimal("avg_virtual_balance_used", { precision: 18, scale: 8 }),
  
  // Retention Metrics (calculated for this day's cohort)
  retentionD1: decimal("retention_d1", { precision: 5, scale: 2 }), // percentage
  retentionD3: decimal("retention_d3", { precision: 5, scale: 2 }),
  retentionD7: decimal("retention_d7", { precision: 5, scale: 2 }),
  retentionD30: decimal("retention_d30", { precision: 5, scale: 2 }),
  
  // Monetization Metrics
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).default("0"),
  premiumSubscriptions: integer("premium_subscriptions").default(0),
  arpu: decimal("arpu", { precision: 10, scale: 2 }), // Average Revenue Per User
  arppu: decimal("arppu", { precision: 10, scale: 2 }), // Average Revenue Per Paying User
  
  // Ad Performance Metrics
  adImpressions: integer("ad_impressions").default(0),
  adClicks: integer("ad_clicks").default(0),
  adRewards: integer("ad_rewards").default(0),
  adRevenue: decimal("ad_revenue", { precision: 15, scale: 2 }).default("0"),
  ctr: decimal("ctr", { precision: 5, scale: 2 }), // Click Through Rate
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_daily_metrics_date").on(table.date),
]);

// User cohorts for retention analysis
export const userCohorts = pgTable("user_cohorts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  cohortDate: timestamp("cohort_date").notNull(), // install date truncated to day
  daysSinceInstall: integer("days_since_install").notNull(),
  isActive: boolean("is_active").default(false), // was user active on this day
  tradesCount: integer("trades_count").default(0),
  sessionDuration: integer("session_duration").default(0), // in seconds
  virtualBalanceUsed: decimal("virtual_balance_used", { precision: 18, scale: 8 }).default("0"),
  recordDate: timestamp("record_date").notNull(), // the actual date being recorded
}, (table) => [
  index("idx_user_cohorts_cohort_date").on(table.cohortDate),
  index("idx_user_cohorts_user_id").on(table.userId),
  index("idx_user_cohorts_record_date").on(table.recordDate),
  index("idx_user_cohorts_days_since").on(table.daysSinceInstall),
]);

// Premium подписки
export const premiumSubscriptions = pgTable("premium_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  telegramId: varchar("telegram_id", { length: 50 }),
  paymentId: varchar("payment_id", { length: 100 }).notNull().unique(),
  planType: varchar("plan_type", { length: 20 }).notNull(), // 'month', 'year'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("RUB"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'succeeded', 'canceled', 'failed'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(false),
});

// Premium планы
export const premiumPlans = pgTable("premium_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  planType: varchar("plan_type", { length: 20 }).notNull(), // 'month', 'year'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("RUB"),
  features: jsonb("features"), // Список функций
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Таблица уровней наград (tiers)
export const rewardTiers = pgTable("reward_tiers", {
  id: serial("id").primaryKey(),
  level: integer("level").notNull().unique(), // Требуемое значение rewards_count
  accountMoney: integer("account_money").notNull(), // Порог денег на аккаунте
  reward: integer("reward").notNull(), // Размер награды
  proDays: integer("pro_days"), // Дополнительные дни PRO
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 32 }).notNull(),
  symbol: varchar('symbol', { length: 16 }).notNull(),
  direction: varchar('direction', { length: 8 }).notNull(),
  amount: numeric('amount', { precision: 18, scale: 8 }).notNull(),
  multiplier: integer('multiplier').notNull(),
  openPrice: numeric('open_price', { precision: 18, scale: 8 }).notNull(),
  takeProfit: numeric('take_profit', { precision: 18, scale: 8 }),
  stopLoss: numeric('stop_loss', { precision: 18, scale: 8 }),
  openedAt: timestamp('opened_at').notNull().defaultNow(),
  status: varchar('status', { length: 16 }).notNull().default('open'),
  closedAt: timestamp('closed_at'),
  closePrice: numeric('close_price', { precision: 18, scale: 8 }),
  profit: numeric('profit', { precision: 18, scale: 8 }),
});

// Таблица заданий пользователей
export const userTasks = pgTable('user_tasks', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskType: varchar('task_type', { length: 50 }).notNull(), // 'video_bonus', 'trade_bonus', etc.
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  rewardType: varchar('reward_type', { length: 20 }).notNull(), // 'money', 'coins', 'energy', 'mixed', 'wheel'
  rewardAmount: varchar('reward_amount', { length: 50 }).notNull(), // '1K', '100', etc.
  progressCurrent: integer('progress_current').default(0),
  progressTotal: integer('progress_total').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'), // 'active', 'completed', 'expired'
  icon: varchar('icon', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at'),
});

// Таблица шаблонов заданий (для админов)
export const taskTemplates = pgTable('task_templates', {
  id: serial('id').primaryKey(),
  templateId: varchar('template_id', { length: 100 }).notNull().unique(), // Уникальный ID шаблона
  taskType: varchar('task_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  rewardType: varchar('reward_type', { length: 20 }).notNull(), // 'money', 'coins', 'energy', 'mixed', 'wheel'
  rewardAmount: varchar('reward_amount', { length: 50 }).notNull(),
  progressTotal: integer('progress_total').notNull(),
  icon: varchar('icon', { length: 255 }),
  category: varchar('category', { length: 20 }).notNull(), // 'daily', 'video', 'trade', 'social', 'premium', 'crypto', 'energy'
  rarity: varchar('rarity', { length: 20 }).notNull(), // 'common', 'rare', 'epic', 'legendary'
  expiresInHours: integer('expires_in_hours').notNull().default(24),
  isActive: boolean('is_active').default(true),
  createdBy: varchar('created_by', { length: 255 }).references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Deal = {
  id: number;
  userId: string;
  symbol: string;
  direction: 'up' | 'down';
  amount: string;
  multiplier: number;
  openPrice: string;
  takeProfit?: string;
  stopLoss?: string;
  openedAt: Date;
  status: 'open' | 'closed';
  closedAt?: Date;
  closePrice?: string;
  profit?: string;
};

// Enum для типов коробок
export const boxTypeEnum = pgEnum("box_type", ['red', 'green', 'x']);

// Enum для типов призов
export const prizeTypeEnum = pgEnum("prize_type", ['money', 'pro']);

// Таблица типов коробок
export const boxTypes = pgTable("box_types", {
  id: serial("id").primaryKey(),
  type: boxTypeEnum("type").notNull().unique(),
  name: varchar("name", { length: 50 }).notNull(),
  requiredEnergy: integer("required_energy").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Таблица призов
export const prizes = pgTable("prizes", {
  id: serial("id").primaryKey(),
  boxTypeId: integer("box_type_id").notNull().references(() => boxTypes.id, { onDelete: 'cascade' }),
  prizeType: prizeTypeEnum("prize_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }), // Для денежных призов
  proDays: integer("pro_days"), // Для PRO призов
  chance: decimal("chance", { precision: 5, scale: 2 }).notNull(), // Шанс выпадения в процентах
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Таблица истории открытий коробок
export const boxOpenings = pgTable("box_openings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  boxTypeId: integer("box_type_id").notNull().references(() => boxTypes.id),
  prizeId: integer("prize_id").notNull().references(() => prizes.id),
  prizeType: prizeTypeEnum("prize_type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }), // Полученная сумма
  proDays: integer("pro_days"), // Полученные дни PRO
  energySpent: integer("energy_spent").notNull(), // Потраченная энергия
  openedAt: timestamp("opened_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  analytics: many(analytics),
  boxOpenings: many(boxOpenings),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  user: one(users, {
    fields: [analytics.userId],
    references: [users.id],
  }),
}));

export const boxTypesRelations = relations(boxTypes, ({ many }) => ({
  prizes: many(prizes),
  boxOpenings: many(boxOpenings),
}));

export const prizesRelations = relations(prizes, ({ one, many }) => ({
  boxType: one(boxTypes, {
    fields: [prizes.boxTypeId],
    references: [boxTypes.id],
  }),
  boxOpenings: many(boxOpenings),
}));

export const boxOpeningsRelations = relations(boxOpenings, ({ one }) => ({
  user: one(users, {
    fields: [boxOpenings.userId],
    references: [users.id],
  }),
  boxType: one(boxTypes, {
    fields: [boxOpenings.boxTypeId],
    references: [boxTypes.id],
  }),
  prize: one(prizes, {
    fields: [boxOpenings.prizeId],
    references: [prizes.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
// удалены типы: Trade, InsertTrade, TradingPair, Achievement, UserAchievement, DailyReward, LootBox, UserLootHistory, PriceHistory
export type Analytics = typeof analytics.$inferSelect;

// BI Analytics Tables
export const userDailyStats = pgTable("user_daily_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  tradesCount: integer("trades_count").default(0),
  tradesVolume: decimal("trades_volume", { precision: 18, scale: 8 }).default("0"),
  totalProfit: decimal("total_profit", { precision: 18, scale: 8 }).default("0"),
  sessionDuration: integer("session_duration").default(0), // in minutes
  screensViewed: integer("screens_viewed").default(0),
  energyUsed: integer("energy_used").default(0),
  coinsEarned: integer("coins_earned").default(0),
  premiumActive: boolean("premium_active").default(false),
}, (table) => [
  index("idx_user_daily_stats_user_date").on(table.userId, table.date),
  index("idx_user_daily_stats_date").on(table.date),
]);

export const cohortAnalysis = pgTable("cohort_analysis", {
  id: serial("id").primaryKey(),
  cohortWeek: timestamp("cohort_week").notNull(), // Week when user registered
  periodNumber: integer("period_number").notNull(), // Weeks since registration (0, 1, 2, 3...)
  usersCount: integer("users_count").notNull(),
  retentionRate: decimal("retention_rate", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  totalRevenue: decimal("total_revenue", { precision: 18, scale: 2 }).default("0"),
  avgRevenuePerUser: decimal("avg_revenue_per_user", { precision: 18, scale: 2 }).default("0"),
}, (table) => [
  index("idx_cohort_week_period").on(table.cohortWeek, table.periodNumber),
]);

export const userAcquisitionMetrics = pgTable("user_acquisition_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalInstalls: integer("total_installs").default(0),
  totalSignups: integer("total_signups").default(0),
  totalFirstTrades: integer("total_first_trades").default(0),
  totalFirstDeposits: integer("total_first_deposits").default(0),
  signupRate: decimal("signup_rate", { precision: 5, scale: 4 }), // signup/install
  tradeOpenRate: decimal("trade_open_rate", { precision: 5, scale: 4 }), // first_trade/signup
  avgTimeToFirstTrade: integer("avg_time_to_first_trade"), // in minutes
}, (table) => [
  index("idx_acquisition_date").on(table.date),
]);

export const engagementMetrics = pgTable("engagement_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  dailyActiveUsers: integer("daily_active_users").default(0),
  weeklyActiveUsers: integer("weekly_active_users").default(0),
  monthlyActiveUsers: integer("monthly_active_users").default(0),
  avgSessionDuration: integer("avg_session_duration").default(0), // in minutes
  avgScreensPerSession: decimal("avg_screens_per_session", { precision: 5, scale: 2 }),
  avgTradesPerUser: decimal("avg_trades_per_user", { precision: 8, scale: 4 }),
  avgVirtualBalanceUsed: decimal("avg_virtual_balance_used", { precision: 18, scale: 8 }),
  totalTrades: integer("total_trades").default(0),
  totalVolume: decimal("total_volume", { precision: 20, scale: 8 }).default("0"),
}, (table) => [
  index("idx_engagement_date").on(table.date),
]);

export const revenueMetrics = pgTable("revenue_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalRevenue: decimal("total_revenue", { precision: 18, scale: 2 }).default("0"),
  premiumRevenue: decimal("premium_revenue", { precision: 18, scale: 2 }).default("0"),
  adRevenue: decimal("ad_revenue", { precision: 18, scale: 2 }).default("0"),
  totalPayingUsers: integer("total_paying_users").default(0),
  activePayingUsers: integer("active_paying_users").default(0),
  newPayingUsers: integer("new_paying_users").default(0),
  arpu: decimal("arpu", { precision: 18, scale: 2 }).default("0"), // Average Revenue Per User
  arppu: decimal("arppu", { precision: 18, scale: 2 }).default("0"), // Average Revenue Per Paying User
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }), // paying_users/total_users
  churnRate: decimal("churn_rate", { precision: 5, scale: 4 }),
  lifetimeValue: decimal("lifetime_value", { precision: 18, scale: 2 }).default("0"),
}, (table) => [
  index("idx_revenue_date").on(table.date),
]);

// Ad Performance Analytics Table (BI)
export const adPerformanceAnalytics = pgTable("ad_performance_analytics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalAdSpend: decimal("total_ad_spend", { precision: 18, scale: 2 }).default("0"),
  totalInstalls: integer("total_installs").default(0),
  totalConversions: integer("total_conversions").default(0),
  totalRevenue: decimal("total_revenue", { precision: 18, scale: 2 }).default("0"),
  cpi: decimal("cpi", { precision: 8, scale: 2 }).default("0"), // Cost Per Install
  cpa: decimal("cpa", { precision: 8, scale: 2 }).default("0"), // Cost Per Action
  roas: decimal("roas", { precision: 8, scale: 4 }).default("0"), // Return On Ad Spend
  adImpressions: bigint("ad_impressions", { mode: "number" }).default(0),
  adClicks: integer("ad_clicks").default(0),
  clickThroughRate: decimal("click_through_rate", { precision: 5, scale: 4 }).default("0"),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }).default("0"),
  avgRevenuePerInstall: decimal("avg_revenue_per_install", { precision: 8, scale: 2 }).default("0"),
}, (table) => [
  index("idx_ad_performance_analytics_date").on(table.date),
]);

// Relations for BI Analytics
export const userDailyStatsRelations = relations(userDailyStats, ({ one }) => ({
  user: one(users, {
    fields: [userDailyStats.userId],
    references: [users.id],
  }),
}));

// Type exports
export type UserDailyStats = typeof userDailyStats.$inferSelect;
export type CohortAnalysis = typeof cohortAnalysis.$inferSelect;
export type UserAcquisitionMetrics = typeof userAcquisitionMetrics.$inferSelect;
export type EngagementMetrics = typeof engagementMetrics.$inferSelect;
export type RevenueMetrics = typeof revenueMetrics.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type PremiumSubscription = typeof premiumSubscriptions.$inferSelect;
export type PremiumPlan = typeof premiumPlans.$inferSelect;
export type RewardTier = typeof rewardTiers.$inferSelect;
export type InsertRewardTier = typeof rewardTiers.$inferInsert;
export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = typeof userTasks.$inferInsert;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = typeof taskTemplates.$inferInsert;
export type BoxType = typeof boxTypes.$inferSelect;
export type InsertBoxType = typeof boxTypes.$inferInsert;
export type Prize = typeof prizes.$inferSelect;
export type InsertPrize = typeof prizes.$inferInsert;
export type BoxOpening = typeof boxOpenings.$inferSelect;
export type InsertBoxOpening = typeof boxOpenings.$inferInsert;

// Analytics Types
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
export type UserAcquisition = typeof userAcquisition.$inferSelect;
export type InsertUserAcquisition = typeof userAcquisition.$inferInsert;
export type AdEvent = typeof adEvents.$inferSelect;
export type InsertAdEvent = typeof adEvents.$inferInsert;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;
export type InsertDailyMetrics = typeof dailyMetrics.$inferInsert;
export type UserCohort = typeof userCohorts.$inferSelect;
export type InsertUserCohort = typeof userCohorts.$inferInsert;

// BI Analytics Interfaces
export interface BiMetricsResponse {
  success: boolean;
  data: {
    userAcquisition?: UserAcquisitionMetrics;
    engagement?: EngagementMetrics;
    retention?: RetentionMetrics;
    monetization?: MonetizationMetrics;
    adPerformance?: AdPerformanceMetrics;
  };
  timestamp: string;
}

export interface UserAcquisitionMetrics {
  installs: number;
  signupRate: number;
  tradeOpenRate: number;
  installsBySource: { source: string; count: number }[];
  dailyInstalls: { date: string; count: number }[];
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionsPerUser: number;
  avgSessionDuration: number; // minutes
  tradesPerUser: number;
  avgVirtualBalanceUsed: string;
  screenOpensByType: { screen: string; count: number }[];
}

export interface RetentionMetrics {
  d1: number; // percentage
  d3: number;
  d7: number;
  d30: number;
  churnRate: number;
  cohortAnalysis: CohortData[];
}

export interface CohortData {
  cohortDate: string;
  usersCount: number;
  retentionByDay: { day: number; retained: number; percentage: number }[];
}

export interface MonetizationMetrics {
  totalRevenue: string;
  arpu: string; // Average Revenue Per User
  arppu: string; // Average Revenue Per Paying User
  conversionToPaid: number; // percentage
  premiumSubscriptions: number;
  revenueBySource: { source: string; amount: string }[];
}

export interface AdPerformanceMetrics {
  impressions: number;
  clicks: number;
  ctr: number; // Click Through Rate percentage
  rewards: number;
  revenue: string;
  cpi: string; // Cost Per Install
  cpa: string; // Cost Per Action
  roas: number; // Return On Ad Spend
  performanceByNetwork: { network: string; impressions: number; revenue: string }[];
}

export interface UserDashboardMetrics {
  totalTrades: number;
  successfulTradesPercentage: number;
  totalProfit: string;
  maxProfit: string;
  maxLoss: string;
  averageTradeAmount: string;
  topDeals: TopDeal[];
  profitLossChart: ProfitLossDataPoint[];
  tradingPerformance: TradingPerformanceMetrics;
  realtimeStats: RealtimeStats;
}

export interface TopDeal {
  id: number;
  symbol: string;
  direction: 'up' | 'down';
  profit: string;
  profitPercentage: number;
  openPrice: string;
  closePrice: string;
  openedAt: string;
  closedAt: string;
  duration: number; // minutes
}

export interface ProfitLossDataPoint {
  date: string;
  profit: string;
  loss: string;
  netProfit: string;
  tradesCount: number;
}

export interface TradingPerformanceMetrics {
  winRate: number; // percentage
  avgWinAmount: string;
  avgLossAmount: string;
  profitFactor: number; // total profit / total loss
  sharpeRatio: number;
  maxDrawdown: string;
  bestTradingDay: string;
  worstTradingDay: string;
}

export interface RealtimeStats {
  currentBalance: string;
  freeBalance: string;
  openDealsCount: number;
  todayProfit: string;
  todayTrades: number;
  currentStreak: number; // consecutive wins/losses
  streakType: 'win' | 'loss';
}
