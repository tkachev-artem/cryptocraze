// Скрипт для проверки роли админа
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const checkAdminRole = async () => {
  try {
    console.log('🔍 Проверка роли админа...\n');
    
    const query = 'SELECT id, email, first_name, last_name, role FROM users WHERE role = \'admin\'';
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ Админы не найдены');
      console.log('Запустите скрипт set-admin-role.js для назначения роли админа');
    } else {
      console.log(`✅ Найдено ${result.rows.length} администраторов:`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'Не указан'}`);
        console.log(`   Имя: ${user.first_name || 'Не указано'} ${user.last_name || ''}`);
        console.log(`   Роль: ${user.role}`);
        console.log('');
      });
      
      console.log('🎯 Для авторизации в Swagger используйте:');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log('');
      console.log('📝 Инструкция по авторизации:');
      console.log('   1. Откройте http://localhost:8000/api-docs');
      console.log('   2. Нажмите "Authorize" в правом верхнем углу');
      console.log('   3. Войдите через Google OAuth с этим аккаунтом');
      console.log('   4. Теперь у вас есть доступ к админским эндпоинтам');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки роли админа:', error);
  } finally {
    await pool.end();
  }
};

checkAdminRole();