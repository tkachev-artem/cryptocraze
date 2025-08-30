"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boxOpeningsRelations = exports.prizesRelations = exports.boxTypesRelations = exports.analyticsRelations = exports.usersRelations = exports.boxOpenings = exports.prizes = exports.boxTypes = exports.prizeTypeEnum = exports.boxTypeEnum = exports.taskTemplates = exports.userTasks = exports.deals = exports.rewardTiers = exports.premiumPlans = exports.premiumSubscriptions = exports.analytics = exports.userNotifications = exports.notificationTypeEnum = exports.users = exports.sessions = void 0;
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
});
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
