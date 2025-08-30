import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const userId = '111907067370663926621';

async function main() {
  console.log('Обновление freeBalance для пользователя:', userId);
  
  // Получаем текущий баланс пользователя
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  
  if (!user) {
    console.error('Пользователь не найден');
    return;
  }
  
  console.log('Текущий balance:', user.balance);
  console.log('Текущий freeBalance:', user.freeBalance);
  
  // Обновляем freeBalance = balance
  await db.update(users)
    .set({ freeBalance: user.balance })
    .where(eq(users.id, userId));
  
  console.log('freeBalance обновлен на:', user.balance);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); }); 