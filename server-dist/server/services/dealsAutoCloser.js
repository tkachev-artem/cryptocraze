"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const cryptoApi_js_1 = require("./cryptoApi.js");
const dealsService_js_1 = require("./dealsService.js");
const storage_js_1 = require("../storage.js");
// Проверка TP/SL при обновлении цены
cryptoApi_js_1.cryptoApi.on('priceUpdate', async (priceData) => {
    try {
        const now = new Date();
        // Получаем все открытые сделки по symbol
        const openDeals = await db_js_1.db.select().from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.symbol, priceData.symbol), (0, drizzle_orm_1.eq)(schema_1.deals.status, 'open')));
        for (const deal of openDeals) {
            const tp = deal.takeProfit ? Number(deal.takeProfit) : undefined;
            const sl = deal.stopLoss ? Number(deal.stopLoss) : undefined;
            const openPrice = Number(deal.openPrice);
            const direction = deal.direction;
            const price = priceData.price;
            let shouldClose = false;
            // TP
            if (tp !== undefined) {
                if ((direction === 'up' && price >= tp) || (direction === 'down' && price <= tp)) {
                    shouldClose = true;
                }
            }
            // SL
            if (!shouldClose && sl !== undefined) {
                if ((direction === 'up' && price <= sl) || (direction === 'down' && price >= sl)) {
                    shouldClose = true;
                }
            }
            if (shouldClose) {
                await dealsService_js_1.dealsService.closeDeal({ userId: deal.userId, dealId: deal.id });
            }
        }
    }
    catch (e) {
        console.error('dealsAutoCloser TP/SL error:', e);
    }
});
// Периодическая проверка на 48 часов
// info: auto close scheduler started
setInterval(async () => {
    try {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const expiredDeals = await db_js_1.db.select().from(schema_1.deals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deals.status, 'open'), (0, drizzle_orm_1.lt)(schema_1.deals.openedAt, cutoff)));
        if (expiredDeals.length > 0) {
            // info: expired deals found
            for (const deal of expiredDeals) {
                try {
                    // info: auto closing deal
                    await dealsService_js_1.dealsService.closeDeal({ userId: deal.userId, dealId: deal.id });
                    // info: deal auto closed
                }
                catch (error) {
                    console.error(`❌ Ошибка автозакрытия сделки #${deal.id}:`, error);
                }
            }
        }
    }
    catch (e) {
        console.error('dealsAutoCloser 48h error:', e);
    }
}, 5 * 60 * 1000); // каждые 5 минут
// Ежечасное начисление $50 на баланс каждого пользователя
setInterval(async () => {
    try {
        const pageSize = 500;
        let offset = 0;
        while (true) {
            const users = await storage_js_1.storage.getAllUsers(pageSize, offset);
            if (users.length === 0)
                break;
            for (const u of users) {
                await storage_js_1.storage.updateUserBalance(u.id, 50);
            }
            if (users.length < pageSize)
                break;
            offset += pageSize;
        }
    }
    catch (e) {
        console.error('hourly credit error:', e);
    }
}, 60 * 60 * 1000); // каждый час
