#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../shared/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL_DISABLE_VERIFY?.toLowerCase() === 'true' 
    ? { rejectUnauthorized: false } 
    : undefined,
});

const db = drizzle(pool, { schema });

async function grantAdminRole(userId: string) {
  try {
    console.log(`🔍 Поиск пользователя с ID: ${userId}`);
    
    // Найти пользователя
    const user = await db.select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    
    if (user.length === 0) {
      console.error(`❌ Пользователь с ID ${userId} не найден`);
      process.exit(1);
    }
    
    const currentUser = user[0];
    console.log(`👤 Найден пользователь: ${currentUser.name || 'Без имени'} (${currentUser.email || 'email не указан'})`);
    console.log(`🔒 Текущая роль: ${currentUser.role}`);
    
    if (currentUser.role === 'admin') {
      console.log(`✅ Пользователь уже имеет права администратора`);
      process.exit(0);
    }
    
    // Обновить роль на admin
    await db.update(schema.users)
      .set({ role: 'admin' })
      .where(eq(schema.users.id, userId));
    
    console.log(`🎉 Успешно! Пользователю ${currentUser.name || userId} выданы права администратора`);
    console.log(`📝 Роль изменена с "${currentUser.role}" на "admin"`);
    
  } catch (error) {
    console.error(`❌ Ошибка при выдаче админских прав:`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получить User ID из аргументов командной строки
const userId = process.argv[2];

if (!userId) {
  console.error(`❌ Использование: tsx grantAdmin.ts <USER_ID>`);
  console.log(`\n📝 Пример: tsx grantAdmin.ts 123456789`);
  console.log(`\n💡 Чтобы найти ID пользователя, выполните SQL-запрос:`);
  console.log(`   SELECT id, name, email, role FROM users WHERE email = 'user@example.com';`);
  process.exit(1);
}

console.log(`🚀 Выдача админских прав пользователю: ${userId}`);
grantAdminRole(userId);