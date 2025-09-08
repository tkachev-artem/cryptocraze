#!/usr/bin/env node
const { Pool } = require('pg');

// Получить переменные окружения
require('dotenv').config();

async function grantAdminRole(userId) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL_DISABLE_VERIFY?.toLowerCase() === 'true' 
      ? { rejectUnauthorized: false } 
      : undefined,
  });

  try {
    console.log(`🔍 Поиск пользователя с ID: ${userId}`);
    
    // Найти пользователя
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      console.error(`❌ Пользователь с ID ${userId} не найден`);
      process.exit(1);
    }
    
    const currentUser = userResult.rows[0];
    console.log(`👤 Найден пользователь: ${currentUser.name || 'Без имени'} (${currentUser.email || 'email не указан'})`);
    console.log(`🔒 Текущая роль: ${currentUser.role}`);
    
    if (currentUser.role === 'admin') {
      console.log(`✅ Пользователь уже имеет права администратора`);
      process.exit(0);
    }
    
    // Обновить роль на admin
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', userId]);
    
    console.log(`🎉 Успешно! Пользователю ${currentUser.name || userId} выданы права администратора`);
    console.log(`📝 Роль изменена с "${currentUser.role}" на "admin"`);
    
  } catch (error) {
    console.error(`❌ Ошибка при выдаче админских прав:`, error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получить User ID из аргументов командной строки
const userId = process.argv[2];

if (!userId) {
  console.error(`❌ Использование: node grantAdminSimple.js <USER_ID>`);
  console.log(`\n📝 Пример: node grantAdminSimple.js 123456789`);
  console.log(`\n💡 Чтобы найти ID пользователя, выполните SQL-запрос:`);
  console.log(`   SELECT id, name, email, role FROM users WHERE email = 'user@example.com';`);
  process.exit(1);
}

console.log(`🚀 Выдача админских прав пользователю: ${userId}`);
grantAdminRole(userId);