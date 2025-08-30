import { db } from '../db.js';
import { deals, users, userTasks } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { unifiedPriceService } from './unifiedPriceService.js';
import { storage } from '../storage.js';
import { applyAutoRewards } from './autoRewards.js';

export const dealsService = {
  async openDeal({ userId, symbol, direction, amount, multiplier, takeProfit, stopLoss }: {
    userId: string,
    symbol: string,
    direction: 'up' | 'down',
    amount: number,
    multiplier: number,
    takeProfit?: number,
    stopLoss?: number,
  }) {
    // Проверка пользователя
    const user = await storage.getUser(userId);
    if (!user) throw new Error('Пользователь не найден');
    // Автоматическое поддержание 30% в свободных средствах при нехватке
    const currentBalance = Number(user.balance || 0);
    const currentFree = Number(user.freeBalance || 0);
    if (currentFree < amount) {
      const total = Math.max(0, currentBalance + currentFree);
      const targetFree = Number((total * 0.3).toFixed(8));
      const targetBalance = Number((total - targetFree).toFixed(2));
      if (currentFree < targetFree) {
        await db.update(users)
          .set({ balance: targetBalance.toString(), freeBalance: targetFree.toString(), updatedAt: new Date() as any })
          .where(eq(users.id as any, userId));
      }
      const [reloaded] = await db.select().from(users).where(eq(users.id as any, userId));
      if (!reloaded || Number(reloaded.freeBalance || 0) < amount) {
        throw new Error('Недостаточно средств');
      }
    }

    // Проверка символа и получение цены с Binance API
    let priceData = unifiedPriceService.getPrice(symbol);
    if (!priceData) {
      await unifiedPriceService.addPair(symbol);
      priceData = unifiedPriceService.getPrice(symbol);
    }
    if (!priceData) throw new Error('Символ не найден или не поддерживается');
    const openPrice = priceData.price;

    // Проверка плеча
    if (multiplier < 1 || multiplier > 100) throw new Error('Некорректное значение плеча');
    if (amount <= 0) throw new Error('Сумма должна быть больше 0');

    // Валидация TP/SL
    if (takeProfit && takeProfit <= 0) throw new Error('Некорректный Take Profit');
    if (stopLoss && stopLoss <= 0) throw new Error('Некорректный Stop Loss');

    // Фиксируем цену открытия с бэка
    const now = new Date();
    const [deal] = await db.insert(deals).values({
      userId,
      symbol,
      direction,
      amount: amount.toString(),
      multiplier,
      openPrice: openPrice.toString(),
      takeProfit: takeProfit?.toString(),
      stopLoss: stopLoss?.toString(),
      openedAt: now,
      status: 'open',
    }).returning();

    // Замораживаем средства
    await storage.updateUserFreeBalance(userId, -amount);

    // Увеличиваем счетчик сделок пользователя
    await storage.incrementUserTradesCount(userId);

    return {
      id: deal.id,
      status: deal.status,
      openPrice: deal.openPrice,
      openedAt: deal.openedAt,
    };
  },

  async closeDeal({ userId, dealId }: { userId: string, dealId: number }) {
    console.log(`[dealsService] Закрытие сделки: userId=${userId}, dealId=${dealId}`);
    
    // Получаем сделку
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    if (!deal) throw new Error('Сделка не найдена');
    if (deal.userId !== userId) throw new Error('Нет доступа к сделке');
    if (deal.status !== 'open') throw new Error('Сделка уже закрыта');
    
    console.log(`[dealsService] Сделка найдена: ${deal.symbol}, направление: ${deal.direction}, сумма: ${deal.amount}`);

    // Получаем актуальную цену с Binance API
    let priceData = unifiedPriceService.getPrice(deal.symbol);
    if (!priceData) {
      await unifiedPriceService.addPair(deal.symbol);
      // Можно подождать 1 секунду, чтобы цена успела обновиться
      await new Promise(r => setTimeout(r, 1000));
      priceData = unifiedPriceService.getPrice(deal.symbol);
    }
    if (!priceData) throw new Error('Не удалось получить цену');
    const closePrice = priceData.price;

    // Расчёт результата по формуле:
    // volume = amount × multiplier
    // priceChange = (closePrice - openPrice) / openPrice
    // if direction === 'up': profit = volume × priceChange
    // else: profit = volume × (-priceChange)
    // commission = volume × 0.0005
    // finalProfit = profit - commission
    
    const amount = Number(deal.amount);
    const multiplier = deal.multiplier;
    const openPrice = Number(deal.openPrice);
    
    // Рассчитываем объем сделки
    const volume = amount * multiplier;
    
    // Рассчитываем изменение цены
    const priceChange = (closePrice - openPrice) / openPrice;
    
    // Рассчитываем прибыль в зависимости от направления
    let profit = 0;
    if (deal.direction === 'up') {
      profit = volume * priceChange;
    } else {
      profit = volume * (-priceChange);
    }
    
    // Рассчитываем комиссию (0.05%)
    const commission = volume * 0.0005;
    
    // Итоговая прибыль с учетом комиссии
    const finalProfit = profit - commission;

    // Обновляем сделку
    await db.update(deals)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closePrice: closePrice.toString(),
        profit: finalProfit.toString(),
      })
      .where(eq(deals.id, dealId));

    // Возвращаем средства + итоговую прибыль
    await storage.updateUserFreeBalance(userId, amount + finalProfit);
    // Проверяем автоуровни после изменения средств
    await applyAutoRewards(userId);
    console.log(`[dealsService] Обновлен freeBalance: +${amount + finalProfit}`);

    // Обновляем статистику торговли пользователя
    await storage.updateUserTradingStats(userId, finalProfit, amount);
    console.log(`[dealsService] Обновлена статистика торговли: прибыль=${finalProfit}`);

    // Обновляем прогресс заданий типа "daily_trade"
    console.log(`[dealsService] Вызываем updateDailyTradeTasks для userId=${userId}`);
    await this.updateDailyTradeTasks(userId);
    console.log(`[dealsService] updateDailyTradeTasks завершен`);

    // Обновляем прогресс заданий типа "crypto_king" на основе прибыли
    console.log(`[dealsService] Вызываем updateCryptoKingTasks для userId=${userId}, прибыль=${finalProfit}`);
    await this.updateCryptoKingTasks(userId, finalProfit);
    console.log(`[dealsService] updateCryptoKingTasks завершен`);

    return {
      id: deal.id,
      status: 'closed',
      closePrice,
      closedAt: new Date(),
      profit: finalProfit,
    };
  },

  /**
   * Обновить прогресс заданий типа "daily_trade" при закрытии сделки
   */
  async updateDailyTradeTasks(userId: string): Promise<void> {
    try {
      console.log(`[dealsService] Обновляем прогресс заданий "daily_trade" для пользователя: ${userId}`);
      
      // Сначала проверим все активные задания пользователя
      const allActiveTasks = await db.select()
        .from(userTasks)
        .where(
          and(
            eq(userTasks.userId, userId),
            eq(userTasks.status, 'active')
          )
        );

      console.log(`[dealsService] Всего активных заданий: ${allActiveTasks.length}`);
      allActiveTasks.forEach(task => {
        console.log(`[dealsService] Задание ${task.id}: taskType="${task.taskType}", title="${task.title}", прогресс=${task.progressCurrent}/${task.progressTotal}`);
      });
      
      // Находим активные задания типа "daily_trade"
      const dailyTradeTasks = await db.select()
        .from(userTasks)
        .where(
          and(
            eq(userTasks.userId, userId),
            eq(userTasks.taskType, 'daily_trade'),
            eq(userTasks.status, 'active')
          )
        );

      console.log(`[dealsService] Найдено заданий "daily_trade": ${dailyTradeTasks.length}`);

      // Обновляем прогресс каждого задания
      for (const task of dailyTradeTasks) {
        const newProgress = Math.min(task.progressCurrent + 1, task.progressTotal);
        const isCompleted = newProgress >= task.progressTotal;

        const updateData: any = {
          progressCurrent: newProgress
        };

        // НЕ завершаем задание автоматически - оставляем его активным для получения награды
        // if (isCompleted) {
        //   updateData.status = 'completed';
        //   updateData.completedAt = new Date();
        // }

        await db.update(userTasks)
          .set(updateData)
          .where(eq(userTasks.id, task.id));

        console.log(`[dealsService] Задание ${task.id} обновлено: прогресс ${task.progressCurrent} → ${newProgress}, завершено: ${isCompleted}`);
      }
    } catch (error) {
      console.error('[dealsService] Ошибка при обновлении заданий "daily_trade":', error);
    }
  },

  /**
   * Обновить прогресс заданий типа "crypto_king" на основе прибыли от сделок
   */
  async updateCryptoKingTasks(userId: string, profit: number): Promise<void> {
    try {
      console.log(`[dealsService] Обновляем прогресс заданий "crypto_king" для пользователя: ${userId}, прибыль: ${profit}`);
      
      // Находим активные задания типа "crypto_king"
      const cryptoKingTasks = await db.select()
        .from(userTasks)
        .where(
          and(
            eq(userTasks.userId, userId),
            eq(userTasks.taskType, 'crypto_king'),
            eq(userTasks.status, 'active')
          )
        );

      console.log(`[dealsService] Найдено заданий "crypto_king": ${cryptoKingTasks.length}`);

      // Обновляем прогресс каждого задания на основе прибыли
      for (const task of cryptoKingTasks) {
        // Учитываем только положительную часть прибыли и округляем до целых долларов
        const positiveProfitDollars = Math.max(0, Math.floor(profit));
        if (positiveProfitDollars <= 0) {
          console.log(`[dealsService] Прибыль неположительная, прогресс не изменен (profit=${profit}).`);
          continue;
        }

        // Добавляем прибыль к текущему прогрессу
        const newProgress = Math.min((task.progressCurrent || 0) + positiveProfitDollars, task.progressTotal);
        const isCompleted = newProgress >= task.progressTotal;

        const updateData: any = {
          progressCurrent: newProgress
        };

        // НЕ завершаем задание автоматически - оставляем его активным для получения награды
        // if (isCompleted) {
        //   updateData.status = 'completed';
        //   updateData.completedAt = new Date();
        // }

        await db.update(userTasks)
          .set(updateData)
          .where(eq(userTasks.id, task.id));

        console.log(`[dealsService] Задание "Крипто король" ${task.id} обновлено: прогресс ${task.progressCurrent} → ${newProgress} (зачтено: +${positiveProfitDollars}), завершено: ${isCompleted}`);
      }
    } catch (error) {
      console.error('[dealsService] Ошибка при обновлении заданий "crypto_king":', error);
    }
  }
};