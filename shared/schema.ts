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
});

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
