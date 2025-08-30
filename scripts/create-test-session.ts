import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function createTestSession() {
  try {
    // Получаем пользователя
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
      console.log('❌ Пользователь не найден');
      return;
    }

    console.log('👤 Пользователь:');
    console.log('  ID:', user[0].id);
    console.log('  Email:', user[0].email);
    console.log('  Энергия:', user[0].energyTasksBonus);
    console.log('  Баланс:', user[0].balance);

    // Создаем простую сессию для тестирования
    console.log('\n🔐 Создаем тестовую сессию...');
    
    // Имитируем Google Auth сессию
    const sessionData = {
      user: {
        id: user[0].id,
        email: user[0].email,
        firstName: 'Test',
        lastName: 'User'
      }
    };

    console.log('✅ Сессия создана:');
    console.log('  Session ID:', `s%3A${user[0].id}.test123`);
    console.log('  User ID:', sessionData.user.id);
    console.log('  Email:', sessionData.user.email);

    console.log('\n🌐 Тестируем API с сессией...');
    
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
        console.log('  ✅ API ответил успешно!');
        console.log('  Энергия из API:', data.energyTasksBonus);
        console.log('  Баланс из API:', data.balance);
        
        if (data.energyTasksBonus === user[0].energyTasksBonus) {
          console.log('  ✅ Энергия совпадает с БД!');
        } else {
          console.log('  ❌ Энергия НЕ совпадает с БД!');
          console.log('    Ожидалось:', user[0].energyTasksBonus);
          console.log('    Получено:', data.energyTasksBonus);
        }
      } else {
        const error = await response.text();
        console.log('  ❌ Ошибка API:', error);
      }
    } catch (error) {
      console.log('  ❌ Ошибка запроса:', error);
    }

    console.log('\n📋 Инструкции для тестирования:');
    console.log('1. Откройте браузер и перейдите на http://localhost:5173');
    console.log('2. Откройте DevTools (F12)');
    console.log('3. В консоли выполните:');
    console.log(`   document.cookie = "connect.sid=s%3A${user[0].id}.test123; path=/; domain=localhost"`);
    console.log('4. Обновите страницу');
    console.log('5. Проверьте, что энергия отображается корректно');

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

createTestSession(); 