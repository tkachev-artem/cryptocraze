import { db } from '../server/db';
import { users } from '../shared/schema';

async function findRealUser() {
  console.log('🔍 Поиск реальных пользователей в БД...');
  
  try {
    const realUsers = await db.select().from(users).limit(5);
    
    console.log(`Найдено пользователей: ${realUsers.length}`);
    
    if (realUsers.length > 0) {
      console.log('\n👥 Реальные пользователи:');
      realUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}`);
        console.log(`     Name: ${user.name || 'N/A'}`);
        console.log(`     GoogleID: ${user.googleId || 'N/A'}`);
        console.log(`     Balance: ${user.balance || '0'}`);
        console.log('');
      });
      
      return realUsers[0].id;
    } else {
      console.log('❌ В базе нет пользователей!');
      return null;
    }
  } catch (error) {
    console.error('❌ Ошибка при поиске пользователей:', error);
    return null;
  }
}

findRealUser().then(userId => {
  if (userId) {
    console.log(`✅ Используем пользователя: ${userId}`);
  }
  process.exit(0);
}).catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});