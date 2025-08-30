import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function testApiResponse() {
  console.log('🧪 Тестирование ответа API...\n');

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

  // Проверим, что возвращает API /auth/user
  console.log('\n🌐 Проверяем API /auth/user...');
  
  try {
    const response = await fetch('http://localhost:8000/api/auth/user', {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=s%3A111907067370663926621.abc123' // Пример cookie
      }
    });

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
      
      // Попробуем без cookie
      console.log('\n🔄 Пробуем без cookie...');
      const response2 = await fetch('http://localhost:8000/api/auth/user', {
        credentials: 'include'
      });
      
      if (response2.ok) {
        const apiUser2 = await response2.json();
        console.log('✅ API /auth/user ответил без cookie');
        console.log('💰 Баланс из API:', apiUser2.balance);
        console.log('🪙 Монеты из API:', apiUser2.coins);
        console.log('⚡ Энергия из API:', apiUser2.energyTasksBonus);
      } else {
        console.log('❌ API /auth/user вернул ошибку без cookie:', response2.status, response2.statusText);
      }
    }
  } catch (error) {
    console.log('❌ Ошибка при запросе к API /auth/user:', error);
  }

  // Проверим, что происходит в storage.getUser
  console.log('\n🔍 Проверяем storage.getUser...');
  
  try {
    const { storage } = await import('../server/storage');
    const userFromStorage = await storage.getUser(userId);
    
    if (userFromStorage) {
      console.log('✅ storage.getUser вернул данные:');
      console.log('💰 Баланс из storage:', userFromStorage.balance);
      console.log('🪙 Монеты из storage:', userFromStorage.coins);
      console.log('⚡ Энергия из storage:', userFromStorage.energyTasksBonus);
      
      // Сравним с данными в БД
      const storageBalanceMatch = userFromStorage.balance === userFromDb[0].balance;
      const storageCoinsMatch = userFromStorage.coins === userFromDb[0].coins;
      const storageEnergyMatch = userFromStorage.energyTasksBonus === userFromDb[0].energyTasksBonus;

      console.log('\n🔍 Сравнение storage с БД:');
      console.log('💰 Баланс совпадает:', storageBalanceMatch);
      console.log('🪙 Монеты совпадают:', storageCoinsMatch);
      console.log('⚡ Энергия совпадает:', storageEnergyMatch);
    } else {
      console.log('❌ storage.getUser вернул null');
    }
  } catch (error) {
    console.log('❌ Ошибка при вызове storage.getUser:', error);
  }
}

testApiResponse().catch(console.error); 