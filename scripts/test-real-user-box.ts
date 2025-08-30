import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { PrizeService } from '../server/services/prizeService';

async function testRealUserBox() {
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
    console.log('  Энергия до:', user[0].energyTasksBonus);
    console.log('  Баланс до:', user[0].balance);

    // Проверяем требования по энергии
    const requiredEnergy = await PrizeService.getRequiredEnergy('red');
    console.log('📋 Требуется энергии для красной коробки:', requiredEnergy);

    if ((user[0].energyTasksBonus || 0) < requiredEnergy) {
      console.log('❌ Недостаточно энергии');
      return;
    }

    console.log('🎁 Открываем красную коробку...');
    
    // Открываем коробку
    const result = await PrizeService.openBox(user[0].id, 'red');
    
    console.log('✅ Результат открытия:');
    console.log('  Приз:', result.prize.prizeType === 'pro' ? `PRO ${result.prize.proDays} дней` : `$${result.prize.amount}`);
    console.log('  Потрачено энергии:', result.energySpent);
    console.log('  Получено денег:', result.balanceUpdate);

    // Проверяем обновленные данные
    const updatedUser = await db
      .select({ 
        energyTasksBonus: users.energyTasksBonus,
        balance: users.balance
      })
      .from(users)
      .where(eq(users.id, user[0].id))
      .limit(1);

    console.log('🔋 Данные после открытия:');
    console.log('  Энергия после:', updatedUser[0]?.energyTasksBonus);
    console.log('  Баланс после:', updatedUser[0]?.balance);

    // Проверяем, что энергия действительно вычтена
    const expectedEnergy = (user[0].energyTasksBonus || 0) - requiredEnergy;
    if (updatedUser[0]?.energyTasksBonus === expectedEnergy) {
      console.log('✅ Энергия корректно вычтена!');
    } else {
      console.log('❌ Энергия НЕ вычтена!');
      console.log('  Ожидалось:', expectedEnergy);
      console.log('  Получено:', updatedUser[0]?.energyTasksBonus);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testRealUserBox(); 