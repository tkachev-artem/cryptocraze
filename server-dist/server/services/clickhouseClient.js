"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClickHouseStats = exports.closeClickHouseConnection = exports.testClickHouseConnection = exports.getClickHouseClient = void 0;
const client_1 = require("@clickhouse/client");
/**
 * ClickHouse Client Configuration and Connection
 * Используется для высокопроизводительной аналитики в admin dashboard
 */
let clickhouseClient = null;
const getClickHouseClient = () => {
    if (!clickhouseClient) {
        const config = {
            url: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
            username: process.env.CLICKHOUSE_USERNAME || 'default',
            password: process.env.CLICKHOUSE_PASSWORD || '',
            database: process.env.CLICKHOUSE_DATABASE || 'cryptocraze_analytics',
            clickhouse_settings: {
                // Оптимизация для быстрых аналитических запросов
                async_insert: 1,
                wait_for_async_insert: 1,
                async_insert_max_data_size: 10485760, // 10MB
                async_insert_busy_timeout_ms: 200,
            },
            compression: {
                response: true,
                request: true,
            },
            keep_alive: {
                enabled: true,
            },
            // Увеличиваем таймауты для больших аналитических запросов
            request_timeout: 60000, // 60 секунд
            max_open_connections: 10,
        };
        console.log('[ClickHouse] Initializing client with config:', {
            url: config.url,
            database: config.database,
            username: config.username
        });
        clickhouseClient = (0, client_1.createClient)(config);
    }
    return clickhouseClient;
};
exports.getClickHouseClient = getClickHouseClient;
/**
 * Проверка соединения с ClickHouse
 */
const testClickHouseConnection = async () => {
    try {
        const client = (0, exports.getClickHouseClient)();
        // Проверяем подключение простым запросом
        const result = await client.query({
            query: 'SELECT version() AS version',
            format: 'JSONEachRow',
        });
        const data = await result.json();
        const version = data[0]?.version;
        console.log('[ClickHouse] Connection successful, version:', version);
        return {
            success: true,
            version
        };
    }
    catch (error) {
        console.error('[ClickHouse] Connection failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};
exports.testClickHouseConnection = testClickHouseConnection;
/**
 * Закрытие соединения с ClickHouse
 */
const closeClickHouseConnection = async () => {
    if (clickhouseClient) {
        try {
            await clickhouseClient.close();
            console.log('[ClickHouse] Connection closed successfully');
        }
        catch (error) {
            console.error('[ClickHouse] Error closing connection:', error);
        }
        finally {
            clickhouseClient = null;
        }
    }
};
exports.closeClickHouseConnection = closeClickHouseConnection;
/**
 * Получение статистики соединения
 */
const getClickHouseStats = () => {
    return {
        isConnected: clickhouseClient !== null,
        config: {
            url: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
            database: process.env.CLICKHOUSE_DATABASE || 'cryptocraze_analytics',
        }
    };
};
exports.getClickHouseStats = getClickHouseStats;
// Graceful shutdown
process.on('SIGTERM', exports.closeClickHouseConnection);
process.on('SIGINT', exports.closeClickHouseConnection);
