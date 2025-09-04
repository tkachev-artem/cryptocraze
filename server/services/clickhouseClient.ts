import { createClient, ClickHouseClient } from '@clickhouse/client';

/**
 * ClickHouse Client Configuration and Connection
 * Используется для высокопроизводительной аналитики в admin dashboard
 */

let clickhouseClient: ClickHouseClient | null = null;

export const getClickHouseClient = (): ClickHouseClient => {
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

    clickhouseClient = createClient(config);
  }

  return clickhouseClient;
};

/**
 * Проверка соединения с ClickHouse
 */
export const testClickHouseConnection = async (): Promise<{ success: boolean; error?: string; version?: string }> => {
  try {
    const client = getClickHouseClient();
    
    // Проверяем подключение простым запросом
    const result = await client.query({
      query: 'SELECT version() AS version',
      format: 'JSONEachRow',
    });
    
    const data = await result.json<{ version: string }>();
    const version = data[0]?.version;
    
    console.log('[ClickHouse] Connection successful, version:', version);
    
    return { 
      success: true, 
      version 
    };
  } catch (error: any) {
    console.error('[ClickHouse] Connection failed:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

/**
 * Закрытие соединения с ClickHouse
 */
export const closeClickHouseConnection = async (): Promise<void> => {
  if (clickhouseClient) {
    try {
      await clickhouseClient.close();
      console.log('[ClickHouse] Connection closed successfully');
    } catch (error) {
      console.error('[ClickHouse] Error closing connection:', error);
    } finally {
      clickhouseClient = null;
    }
  }
};

/**
 * Получение статистики соединения
 */
export const getClickHouseStats = () => {
  return {
    isConnected: clickhouseClient !== null,
    config: {
      url: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'cryptocraze_analytics',
    }
  };
};

// Graceful shutdown
process.on('SIGTERM', closeClickHouseConnection);
process.on('SIGINT', closeClickHouseConnection);