import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testAuthSession() {
  try {
    // Получаем пользователя из БД
    const user = await db
      .select({ 
        id: users.id,
        email: users.email,
        energyTasksBonus: users.energyTasksBonus,
        balance: users.balance
      })
      .from(users)
      .where(eq(users.email, 'exsiseprogram@gmail.com'))
      .limit(1);

    if (!user.length) {
      console.log('❌ Пользователь не найден в БД');
      return;
    }

    console.log('👤 Пользователь в БД:');
    console.log('  ID:', user[0].id);
    console.log('  Email:', user[0].email);
    console.log('  Энергия:', user[0].energyTasksBonus);
    console.log('  Баланс:', user[0].balance);

    // Тестируем API без аутентификации
    console.log('\n🌐 Тестируем API /auth/user без аутентификации...');
    try {
      const response = await fetch('http://localhost:8000/api/auth/user', {
        credentials: 'include',
      });
      
      console.log('  Статус:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('  Данные:', data);
      } else {
        const error = await response.text();
        console.log('  Ошибка:', error);
      }
    } catch (error) {
      console.log('  Ошибка запроса:', error);
    }

    // Тестируем с простой сессией
    console.log('\n🌐 Тестируем API /auth/user с простой сессией...');
    try {
      const response = await fetch('http://localhost:8000/api/auth/user', {
        credentials: 'include',
        headers: {
          'Cookie': `connect.sid=s%3A${user[0].id}.test123`
        }
      });
      
      console.log('  Статус:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('  Данные:', data);
      } else {
        const error = await response.text();
        console.log('  Ошибка:', error);
      }
    } catch (error) {
      console.log('  Ошибка запроса:', error);
    }

    // Тестируем через прокси (фронтенд)
    console.log('\n🌐 Тестируем API /auth/user через прокси...');
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      console.log('  Статус:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('  Данные:', data);
      } else {
        const error = await response.text();
        console.log('  Ошибка:', error);
      }
    } catch (error) {
      console.log('  Ошибка запроса:', error);
    }

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testAuthSession(); 