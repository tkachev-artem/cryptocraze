import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testApiWithCookies() {
  console.log('🧪 Тестирование API с cookies...\n');

  // Найдем пользователя с ID из логов
  const userId = '111907067370663926621';
  console.log(`👤 Пользователь: ${userId}`);

  // Проверим данные в БД
  const userFromDb = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userFromDb.length) {
    console.log('❌ Пользователь не найден в БД');
    return;
  }

  console.log('📊 Данные в БД:');
  console.log('💰 Баланс в БД:', userFromDb[0].balance);
  console.log('🪙 Монеты в БД:', userFromDb[0].coins);
  console.log('⚡ Энергия в БД:', userFromDb[0].energyTasksBonus);

  // Проверим, что возвращает API /auth/user через прокси
  console.log('\n🌐 Проверяем API /auth/user через прокси...');
  
  try {
    // Попробуем через прокси (как делает фронтенд)
    const response = await fetch('http://localhost:5173/api/auth/user', {
      credentials: 'include'
    });

    console.log('📊 Статус ответа:', response.status);
    console.log('📊 Заголовки ответа:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const apiUser = await response.json();
      console.log('✅ API /auth/user ответил успешно');
      console.log('💰 Баланс из API:', apiUser.balance);
      console.log('🪙 Монеты из API:', apiUser.coins);
      console.log('⚡ Энергия из API:', apiUser.energyTasksBonus);

      // Сравним с данными в БД
      const balanceMatch = apiUser.balance === userFromDb[0].balance;
      const coinsMatch = apiUser.coins === userFromDb[0].coins;
      const energyMatch = apiUser.energyTasksBonus === userFromDb[0].energyTasksBonus;

      console.log('\n🔍 Сравнение API с БД:');
      console.log('💰 Баланс совпадает:', balanceMatch);
      console.log('🪙 Монеты совпадают:', coinsMatch);
      console.log('⚡ Энергия совпадает:', energyMatch);

      if (balanceMatch && coinsMatch && energyMatch) {
        console.log('\n✅ API /auth/user возвращает актуальные данные!');
      } else {
        console.log('\n❌ API /auth/user возвращает устаревшие данные!');
      }
    } else {
      console.log('❌ API /auth/user вернул ошибку:', response.status, response.statusText);
      
      // Попробуем получить текст ошибки
      try {
        const errorText = await response.text();
        console.log('📄 Текст ошибки:', errorText);
      } catch (e) {
        console.log('❌ Не удалось получить текст ошибки');
      }
    }
  } catch (error) {
    console.log('❌ Ошибка при запросе к API /auth/user:', error);
  }

  // Проверим, что возвращает API напрямую (без прокси)
  console.log('\n🌐 Проверяем API /auth/user напрямую...');
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/user', {
      credentials: 'include'
    });

    console.log('📊 Статус ответа (прямой):', response.status);

    if (response.ok) {
      const apiUser = await response.json();
      console.log('✅ API /auth/user ответил успешно (прямой)');
      console.log('💰 Баланс из API:', apiUser.balance);
      console.log('🪙 Монеты из API:', apiUser.coins);
      console.log('⚡ Энергия из API:', apiUser.energyTasksBonus);
    } else {
      console.log('❌ API /auth/user вернул ошибку (прямой):', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Ошибка при прямом запросе к API /auth/user:', error);
  }
}

testApiWithCookies().catch(console.error); 