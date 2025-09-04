import { db } from '../db.js';
import { deals, users } from '../../shared/schema';
import { clickhouseAnalyticsService } from '../services/clickhouseAnalyticsService.js';

/**
 * Скрипт для миграции существующих сделок из PostgreSQL в ClickHouse
 */
async function migrateDealsToClickHouse() {
  console.log('[Migration] Начинаем миграцию сделок в ClickHouse...');

  try {
    // Инициализируем схему ClickHouse
    await clickhouseAnalyticsService.initializeSchema();
    console.log('[Migration] Схема ClickHouse инициализирована');

    // Получаем все сделки из PostgreSQL
    console.log('[Migration] Загружаем сделки из PostgreSQL...');
    const allDeals = await db.select().from(deals);
    console.log(`[Migration] Найдено ${allDeals.length} сделок для миграции`);

    if (allDeals.length === 0) {
      console.log('[Migration] Нет сделок для миграции');
      return;
    }

    // Мигрируем сделки батчами по 100
    const batchSize = 100;
    let migratedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allDeals.length; i += batchSize) {
      const batch = allDeals.slice(i, i + batchSize);
      console.log(`[Migration] Обрабатываем батч ${Math.floor(i/batchSize) + 1}/${Math.ceil(allDeals.length/batchSize)} (${batch.length} сделок)`);

      for (const deal of batch) {
        try {
          // Преобразуем сделку в формат для ClickHouse
          const clickHouseDeal = {
            id: deal.id,
            userId: deal.userId,
            symbol: deal.symbol,
            direction: deal.direction as 'up' | 'down',
            amount: parseFloat(deal.amount),
            multiplier: deal.multiplier,
            openPrice: parseFloat(deal.openPrice),
            takeProfit: deal.takeProfit ? parseFloat(deal.takeProfit) : undefined,
            stopLoss: deal.stopLoss ? parseFloat(deal.stopLoss) : undefined,
            openedAt: deal.openedAt,
            closedAt: deal.closedAt || undefined,
            closePrice: deal.closePrice ? parseFloat(deal.closePrice) : undefined,
            profit: deal.profit ? parseFloat(deal.profit) : undefined,
            status: deal.status as 'open' | 'closed'
          };

          await clickhouseAnalyticsService.syncDeal(clickHouseDeal);
          migratedCount++;

          if (migratedCount % 50 === 0) {
            console.log(`[Migration] Прогресс: ${migratedCount}/${allDeals.length} сделок`);
          }
        } catch (error) {
          console.error(`[Migration] Ошибка при миграции сделки ${deal.id}:`, error);
          errorCount++;
        }
      }

      // Небольшая пауза между батчами
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[Migration] Миграция завершена!`);
    console.log(`[Migration] Успешно мигрировано: ${migratedCount} сделок`);
    console.log(`[Migration] Ошибок: ${errorCount}`);

    // Проверим результат
    const stats = await clickhouseAnalyticsService.getDashboardOverview();
    console.log('[Migration] Статистика ClickHouse после миграции:', {
      totalTrades: stats.trading.totalTrades,
      activeDeals: stats.trading.activeDeals,
      totalPnl: stats.trading.totalPnl
    });

  } catch (error) {
    console.error('[Migration] Критическая ошибка миграции:', error);
    process.exit(1);
  }
}

// Функция для миграции пользователей (создание базовых записей)
async function migrateUsersToClickHouse() {
  console.log('[Migration] Начинаем создание базовых записей пользователей в ClickHouse...');

  try {
    // Получаем всех пользователей
    const allUsers = await db.select().from(users);
    console.log(`[Migration] Найдено ${allUsers.length} пользователей`);

    let migratedCount = 0;

    for (const user of allUsers) {
      try {
        // Создаем базовое событие входа для каждого пользователя
        await clickhouseAnalyticsService.logUserEvent(
          parseInt(user.id),
          'migration_user',
          {
            email: user.email || 'unknown',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            createdAt: user.createdAt
          },
          'migration-session'
        );
        migratedCount++;
      } catch (error) {
        console.error(`[Migration] Ошибка при создании записи пользователя ${user.id}:`, error);
      }
    }

    console.log(`[Migration] Создано записей пользователей: ${migratedCount}`);

  } catch (error) {
    console.error('[Migration] Ошибка при миграции пользователей:', error);
  }
}

// Основная функция
async function main() {
  console.log('[Migration] Запуск полной миграции в ClickHouse...');
  
  try {
    // Сначала мигрируем пользователей
    await migrateUsersToClickHouse();
    
    // Затем сделки
    await migrateDealsToClickHouse();
    
    console.log('[Migration] Полная миграция завершена успешно!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запуск только если скрипт вызван напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateDealsToClickHouse, migrateUsersToClickHouse };