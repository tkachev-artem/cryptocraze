import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { } from '../shared/schema';

async function initializeDatabase() {
  console.log('🚀 Инициализация базы данных...');

  try {
    console.log('📦 Инициализация выполнена (ничего добавлять не требуется по текущей схеме).');

    console.log('✅ База данных успешно инициализирована!');
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error);
    throw error;
  }
}

// Запуск инициализации
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Инициализация завершена!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
} 