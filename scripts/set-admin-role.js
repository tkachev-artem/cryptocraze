// Скрипт для назначения роли админа
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const setAdminRole = async (userId) => {
  try {
    console.log(`🔧 Назначение роли админа пользователю ${userId}...\n`);
    
    // Сначала проверим, существует ли пользователь
    const checkQuery = 'SELECT id, email, first_name, last_name FROM users WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Пользователь не найден');
      return;
    }
    
    const user = checkResult.rows[0];
    console.log(`👤 Пользователь найден:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email || 'Не указан'}`);
    console.log(`   Имя: ${user.first_name || 'Не указано'} ${user.last_name || ''}`);
    console.log('');
    
    // Добавим поле role в таблицу users, если его нет
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'user\'');
      console.log('✅ Поле role добавлено в таблицу users');
    } catch (error) {
      console.log('ℹ️  Поле role уже существует');
    }
    
    // Назначим роль админа
    const updateQuery = 'UPDATE users SET role = $1 WHERE id = $2';
    const updateResult = await pool.query(updateQuery, ['admin', userId]);
    
    if (updateResult.rowCount > 0) {
      console.log('✅ Роль админа успешно назначена!');
      console.log('');
      console.log('🎯 Теперь вы можете использовать этот ID для авторизации в Swagger:');
      console.log(`   ID: ${userId}`);
      console.log(`   Email: ${user.email || 'Не указан'}`);
      console.log('');
      console.log('📝 Для авторизации в Swagger:');
      console.log('   1. Откройте http://localhost:8000/api-docs');
      console.log('   2. Нажмите "Authorize" в правом верхнем углу');
      console.log('   3. Войдите через Google OAuth с этим аккаунтом');
      console.log('   4. Теперь у вас есть доступ к админским эндпоинтам');
    } else {
      console.log('❌ Ошибка назначения роли');
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
};

// Получаем ID из аргументов командной строки или используем админа по умолчанию
const userId = process.argv[2] || '116069980752518862717'; // ID Admin Platform

console.log('🚀 Скрипт назначения роли админа\n');
console.log('Доступные пользователи:');
console.log('1. 111907067370663926621 - exsiseprogram@gmail.com (Артём Ткачёв)');
console.log('2. 116069980752518862717 - cryptocrazegame@gmail.com (Admin Platform)');
console.log('');

setAdminRole(userId); 