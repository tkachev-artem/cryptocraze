import { db } from '../db.js';
import { deals } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { cryptoApi } from './cryptoApi.js';
import { dealsService } from './dealsService.js';
import { storage } from '../storage.js';

// Проверка TP/SL при обновлении цены
cryptoApi.on('priceUpdate', async (priceData: { symbol: string, price: number }) => {
  try {
    const now = new Date();
    // Получаем все открытые сделки по symbol
    const openDeals = await db.select().from(deals)
      .where(and(eq(deals.symbol, priceData.symbol), eq(deals.status, 'open')));
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
        await dealsService.closeDeal({ userId: deal.userId, dealId: deal.id });
      }
    }
  } catch (e) {
    console.error('dealsAutoCloser TP/SL error:', e);
  }
});

// Периодическая проверка на 48 часов
  // info: auto close scheduler started

setInterval(async () => {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const expiredDeals = await db.select().from(deals)
      .where(and(eq(deals.status, 'open'), lt(deals.openedAt, cutoff)));
    
    if (expiredDeals.length > 0) {
    // info: expired deals found
      
      for (const deal of expiredDeals) {
        try {
      // info: auto closing deal
          await dealsService.closeDeal({ userId: deal.userId, dealId: deal.id });
      // info: deal auto closed
        } catch (error) {
          console.error(`❌ Ошибка автозакрытия сделки #${deal.id}:`, error);
        }
      }
    }
  } catch (e) {
    console.error('dealsAutoCloser 48h error:', e);
  }
}, 5 * 60 * 1000); // каждые 5 минут

// Ежечасное начисление $50 на баланс каждого пользователя
setInterval(async () => {
  try {
    const pageSize = 500;
    let offset = 0;
    while (true) {
      const users = await storage.getAllUsers(pageSize, offset);
      if (users.length === 0) break;
      for (const u of users) {
        await storage.updateUserBalance(u.id, 50);
      }
      if (users.length < pageSize) break;
      offset += pageSize;
    }
  } catch (e) {
    console.error('hourly credit error:', e);
  }
}, 60 * 60 * 1000); // каждый час