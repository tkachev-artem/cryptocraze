"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealsService = void 0;
const db_js_1 = require("../db.js");
const schema_1 = require("../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const unifiedPriceService_js_1 = require("./unifiedPriceService.js");
const storage_js_1 = require("../storage.js");
const autoRewards_js_1 = require("./autoRewards.js");
const workerManager_js_1 = require("./workers/workerManager.js");
const analyticsLogger_js_1 = __importDefault(require("../middleware/analyticsLogger.js"));
const notifications_js_1 = require("./notifications.js");
const translations_js_1 = require("../lib/translations.js");
exports.dealsService = {
    async openDeal({ userId, symbol, direction, amount, multiplier, takeProfit, stopLoss }) {
        // Проверка пользователя
        const user = await storage_js_1.storage.getUser(userId);
        if (!user)
            throw new Error(translations_js_1.serverTranslations.error('userNotFound'));
        // Автоматическое поддержание 30% в свободных средствах при нехватке
        const currentBalance = Number(user.balance || 0);
        const currentFree = Number(user.freeBalance || 0);
        if (currentFree < amount) {
            const total = Math.max(0, currentBalance + currentFree);
            const targetFree = Number((total * 0.3).toFixed(8));
            const targetBalance = Number((total - targetFree).toFixed(2));
            if (currentFree < targetFree) {
                await db_js_1.db.update(schema_1.users)
                    .set({ balance: targetBalance.toString(), freeBalance: targetFree.toString(), updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            }
            const [reloaded] = await db_js_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            if (!reloaded || Number(reloaded.freeBalance || 0) < amount) {
                throw new Error(translations_js_1.serverTranslations.error('insufficientFunds'));
            }
        }
        // Проверка символа и получение цены с Binance API
        let priceData = unifiedPriceService_js_1.unifiedPriceService.getPrice(symbol);
        if (!priceData) {
            await unifiedPriceService_js_1.unifiedPriceService.addPair(symbol);
            priceData = unifiedPriceService_js_1.unifiedPriceService.getPrice(symbol);
        }
        if (!priceData)
            throw new Error(translations_js_1.serverTranslations.error('symbolNotFound'));
        const openPrice = priceData.price;
        // Проверка плеча
        if (multiplier < 1 || multiplier > 100)
            throw new Error(translations_js_1.serverTranslations.error('invalidLeverage'));
        if (amount <= 0)
            throw new Error(translations_js_1.serverTranslations.error('invalidAmount'));
        // Валидация TP/SL
        if (takeProfit && takeProfit <= 0)
            throw new Error(translations_js_1.serverTranslations.error('invalidTakeProfit'));
        if (stopLoss && stopLoss <= 0)
            throw new Error(translations_js_1.serverTranslations.error('invalidStopLoss'));
        // Фиксируем цену открытия с бэка
        const now = new Date();
        const [deal] = await db_js_1.db.insert(schema_1.deals).values({
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
        await storage_js_1.storage.updateUserFreeBalance(userId, -amount);
        // Синхронизируем сделку с ClickHouse
        try {
            await analyticsLogger_js_1.default.syncDeal({
                id: deal.id,
                userId,
                symbol,
                direction,
                amount,
                multiplier,
                openPrice,
                takeProfit,
                stopLoss,
                openedAt: now,
                status: 'open'
            });
        }
        catch (error) {
            console.error('Failed to sync deal to ClickHouse:', error);
        }
        // Увеличиваем счетчик сделок пользователя
        await storage_js_1.storage.incrementUserTradesCount(userId);
        // Add order to worker monitoring if TP or SL is set
        if (takeProfit || stopLoss) {
            try {
                await workerManager_js_1.workerManager.addOrderToMonitoring({
                    dealId: deal.id,
                    userId,
                    symbol,
                    direction,
                    amount,
                    multiplier,
                    openPrice,
                    takeProfit,
                    stopLoss,
                    openedAt: now,
                });
                console.log(`[dealsService] Added order ${deal.id} to TP/SL monitoring`);
            }
            catch (error) {
                console.error(`[dealsService] Failed to add order ${deal.id} to monitoring:`, error);
                // Don't fail the deal opening, just log the error
            }
        }
        // Create notification for deal opened
        try {
            await notifications_js_1.notificationService.createTradeOpenedNotification(userId, deal.id, symbol, amount, direction);
            console.log(`[dealsService] Created trade opened notification for deal ${deal.id}`);
        }
        catch (error) {
            console.error(`[dealsService] Failed to create trade opened notification:`, error);
            // Don't fail the deal opening, just log the error
        }
        return {
            id: deal.id,
            status: deal.status,
            openPrice: deal.openPrice,
            openedAt: deal.openedAt,
        };
    },
    async closeDeal({ userId, dealId }) {
        console.log(`🔥🔥 [dealsService] НАЧИНАЕМ closeDeal: userId=${userId}, dealId=${dealId}`);
        // Remove from worker monitoring first (if it exists)
        try {
            await workerManager_js_1.workerManager.removeOrderFromMonitoring(dealId);
            console.log(`[dealsService] Removed order ${dealId} from TP/SL monitoring`);
        }
        catch (error) {
            console.error(`[dealsService] Failed to remove order ${dealId} from monitoring:`, error);
            // Continue with manual closure
        }
        // Получаем сделку
        const [deal] = await db_js_1.db.select().from(schema_1.deals).where((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId));
        if (!deal)
            throw new Error('Сделка не найдена');
        if (deal.userId !== userId)
            throw new Error('Нет доступа к сделке');
        if (deal.status !== 'open')
            throw new Error('Сделка уже закрыта');
        console.log(`[dealsService] Сделка найдена: ${deal.symbol}, направление: ${deal.direction}, сумма: ${deal.amount}`);
        // Получаем актуальную цену с Binance API
        let priceData = unifiedPriceService_js_1.unifiedPriceService.getPrice(deal.symbol);
        if (!priceData) {
            await unifiedPriceService_js_1.unifiedPriceService.addPair(deal.symbol);
            // Можно подождать 1 секунду, чтобы цена успела обновиться
            await new Promise(r => setTimeout(r, 1000));
            priceData = unifiedPriceService_js_1.unifiedPriceService.getPrice(deal.symbol);
        }
        if (!priceData)
            throw new Error('Не удалось получить цену');
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
        }
        else {
            profit = volume * (-priceChange);
        }
        // Рассчитываем комиссию (0.05%)
        const commission = volume * 0.0005;
        // Итоговая прибыль с учетом комиссии
        const finalProfit = profit - commission;
        // Обновляем сделку
        await db_js_1.db.update(schema_1.deals)
            .set({
            status: 'closed',
            closedAt: new Date(),
            closePrice: closePrice.toString(),
            profit: finalProfit.toString(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId));
        // Возвращаем средства + итоговую прибыль
        await storage_js_1.storage.updateUserFreeBalance(userId, amount + finalProfit);
        // Проверяем автоуровни после изменения средств
        await (0, autoRewards_js_1.applyAutoRewards)(userId);
        console.log(`[dealsService] Обновлен freeBalance: +${amount + finalProfit}`);
        // Обновляем статистику торговли пользователя
        await storage_js_1.storage.updateUserTradingStats(userId, finalProfit, amount);
        console.log(`[dealsService] Обновлена статистика торговли: прибыль=${finalProfit}`);
        // Синхронизируем закрытие сделки с ClickHouse
        const closedAt = new Date();
        try {
            await analyticsLogger_js_1.default.syncDeal({
                id: dealId,
                userId,
                symbol: deal.symbol,
                direction: deal.direction,
                amount: parseFloat(deal.amount),
                multiplier: deal.multiplier,
                openPrice: parseFloat(deal.openPrice),
                takeProfit: deal.takeProfit ? parseFloat(deal.takeProfit) : undefined,
                stopLoss: deal.stopLoss ? parseFloat(deal.stopLoss) : undefined,
                openedAt: deal.openedAt,
                closedAt,
                closePrice,
                profit: finalProfit,
                status: 'closed'
            });
        }
        catch (error) {
            console.error('Failed to sync closed deal to ClickHouse:', error);
        }
        // Обновляем прогресс заданий типа "daily_trade"
        console.log(`🔥🔥 [dealsService] СЕЙЧАС будем вызывать updateDailyTradeTasks для userId=${userId}`);
        await this.updateDailyTradeTasks(userId);
        console.log(`🔥🔥 [dealsService] updateDailyTradeTasks ЗАВЕРШЕН`);
        // Обновляем прогресс заданий типа "crypto_king" на основе прибыли
        console.log(`[dealsService] Вызываем updateCryptoKingTasks для userId=${userId}, прибыль=${finalProfit}`);
        await this.updateCryptoKingTasks(userId, finalProfit);
        console.log(`[dealsService] updateCryptoKingTasks завершен`);
        // Обновляем новые типы торговых заданий
        console.log(`[dealsService] Вызываем updateNewTradeTasksOnClose для userId=${userId}, прибыль=${finalProfit}`);
        await this.updateNewTradeTasksOnClose(userId, finalProfit);
        console.log(`[dealsService] updateNewTradeTasksOnClose завершен`);
        // Create notification for deal closed
        try {
            await notifications_js_1.notificationService.createTradeClosedNotification(userId, deal.id, deal.symbol, finalProfit);
            console.log(`[dealsService] Created trade closed notification for deal ${deal.id}`);
        }
        catch (error) {
            console.error(`[dealsService] Failed to create trade closed notification:`, error);
            // Don't fail the deal closing, just log the error
        }
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
    async updateDailyTradeTasks(userId) {
        try {
            console.log(`[dealsService] Обновляем прогресс заданий "daily_trade" для пользователя: ${userId}`);
            // Сначала проверим все активные задания пользователя
            const allActiveTasks = await db_js_1.db.select()
                .from(schema_1.userTasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userTasks.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userTasks.status, 'active')));
            console.log(`[dealsService] Всего активных заданий: ${allActiveTasks.length}`);
            allActiveTasks.forEach(task => {
                console.log(`[dealsService] Задание ${task.id}: taskType="${task.taskType}", title="${task.title}", прогресс=${task.progressCurrent}/${task.progressTotal}`);
            });
            // Фильтруем задания для daily_trader - исключаем новые типы торговых заданий
            const dailyTradeTasks = allActiveTasks.filter(task => {
                // Только задания типа daily_trader должны обновляться здесь
                const isDailyTrader = task.taskType === 'daily_trader';
                console.log(`[dealsService] 🔍 Проверка задания ${task.id} (${task.taskType}): isDailyTrader=${isDailyTrader}`);
                return isDailyTrader;
            });
            console.log(`[dealsService] Найдено торговых заданий: ${dailyTradeTasks.length}`);
            dailyTradeTasks.forEach(task => {
                console.log(`[dealsService] - Торговое задание: ${task.taskType} (${task.id}), прогресс: ${task.progressCurrent}/${task.progressTotal}`);
            });
            // Обновляем прогресс каждого задания
            for (const task of dailyTradeTasks) {
                const newProgress = Math.min(task.progressCurrent + 1, task.progressTotal);
                const isCompleted = newProgress >= task.progressTotal;
                const updateData = {
                    progressCurrent: newProgress
                };
                // НЕ завершаем задание автоматически - оставляем его активным для получения награды
                // if (isCompleted) {
                //   updateData.status = 'completed';
                //   updateData.completedAt = new Date();
                // }
                await db_js_1.db.update(schema_1.userTasks)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.userTasks.id, task.id));
                console.log(`[dealsService] Задание ${task.id} обновлено: прогресс ${task.progressCurrent} → ${newProgress}, завершено: ${isCompleted}`);
            }
        }
        catch (error) {
            console.error('[dealsService] Ошибка при обновлении заданий "daily_trade":', error);
        }
    },
    /**
     * Обновить прогресс заданий типа "crypto_king" на основе прибыли от сделок
     */
    async updateCryptoKingTasks(userId, profit) {
        try {
            console.log(`[dealsService] Обновляем прогресс заданий "crypto_king" для пользователя: ${userId}, прибыль: ${profit}`);
            // Находим активные задания типа "crypto_king"
            const cryptoKingTasks = await db_js_1.db.select()
                .from(schema_1.userTasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userTasks.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userTasks.taskType, 'crypto_king'), (0, drizzle_orm_1.eq)(schema_1.userTasks.status, 'active')));
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
                const updateData = {
                    progressCurrent: newProgress
                };
                // НЕ завершаем задание автоматически - оставляем его активным для получения награды
                // if (isCompleted) {
                //   updateData.status = 'completed';
                //   updateData.completedAt = new Date();
                // }
                await db_js_1.db.update(schema_1.userTasks)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.userTasks.id, task.id));
                console.log(`[dealsService] Задание "Крипто король" ${task.id} обновлено: прогресс ${task.progressCurrent} → ${newProgress} (зачтено: +${positiveProfitDollars}), завершено: ${isCompleted}`);
            }
        }
        catch (error) {
            console.error('[dealsService] Ошибка при обновлении заданий "crypto_king":', error);
        }
    },
    /**
     * Обновить прогресс новых типов торговых заданий при закрытии сделки
     */
    async updateNewTradeTasksOnClose(userId, profit) {
        try {
            console.log(`[dealsService] Обновляем прогресс новых торговых заданий для пользователя: ${userId}, прибыль: ${profit}`);
            // Получаем все активные торговые задания новых типов
            const tradeTasks = await db_js_1.db.select()
                .from(schema_1.userTasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userTasks.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userTasks.status, 'active'), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.userTasks.taskType, 'trade_close'), (0, drizzle_orm_1.eq)(schema_1.userTasks.taskType, 'trade_first_profit'), (0, drizzle_orm_1.eq)(schema_1.userTasks.taskType, 'trade_lucky'), (0, drizzle_orm_1.eq)(schema_1.userTasks.taskType, 'trade_master'))));
            console.log(`[dealsService] Найдено новых торговых заданий: ${tradeTasks.length}`);
            for (const task of tradeTasks) {
                let progressUpdate = 0;
                let shouldUpdate = false;
                // Определяем как обновлять прогресс в зависимости от типа задания
                if (task.taskType === 'trade_close') {
                    // Задание "Закрыть сделку" - +1 при любом закрытии
                    progressUpdate = 1;
                    shouldUpdate = true;
                }
                else if (task.taskType === 'trade_first_profit' || task.taskType === 'trade_lucky' || task.taskType === 'trade_master') {
                    // Задания на прибыль - добавляем прибыль в долларах (только положительную)
                    if (profit > 0) {
                        progressUpdate = Math.floor(profit); // Прибыль в долларах
                        shouldUpdate = true;
                    }
                }
                if (shouldUpdate) {
                    const newProgress = Math.min((task.progressCurrent || 0) + progressUpdate, task.progressTotal);
                    const isCompleted = newProgress >= task.progressTotal;
                    const updateData = {
                        progressCurrent: newProgress
                    };
                    // НЕ завершаем задание автоматически - оставляем его активным для получения награды
                    // if (isCompleted) {
                    //   updateData.status = 'completed';
                    //   updateData.completedAt = new Date();
                    // }
                    await db_js_1.db.update(schema_1.userTasks)
                        .set(updateData)
                        .where((0, drizzle_orm_1.eq)(schema_1.userTasks.id, task.id));
                    console.log(`[dealsService] Задание ${task.taskType} (${task.id}) обновлено: прогресс ${task.progressCurrent} → ${newProgress} (+${progressUpdate}), завершено: ${isCompleted}`);
                }
                else {
                    console.log(`[dealsService] Задание ${task.taskType} (${task.id}) не обновлено (нет прибыли или неподходящий тип)`);
                }
            }
        }
        catch (error) {
            console.error('[dealsService] Ошибка при обновлении новых торговых заданий:', error);
        }
    }
};
