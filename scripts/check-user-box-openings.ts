import { db } from '../server/db';
import { boxOpenings, users, boxTypes } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkBoxOpenings() {
  try {
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'exsiseprogram@gmail.com'))
      .limit(1);

    if (!user.length) {
      console.log('❌ Пользователь не найден');
      return;
    }

    const openings = await db
      .select({
        id: boxOpenings.id,
        boxType: boxTypes.type,
        boxName: boxTypes.name,
        prizeType: boxOpenings.prizeType,
        amount: boxOpenings.amount,
        energySpent: boxOpenings.energySpent,
        openedAt: boxOpenings.openedAt,
      })
      .from(boxOpenings)
      .innerJoin(boxTypes, eq(boxOpenings.boxTypeId, boxTypes.id))
      .where(eq(boxOpenings.userId, user[0].id))
      .orderBy(boxOpenings.openedAt);

    console.log('📦 История открытий коробок:');
    if (openings.length === 0) {
      console.log('  Нет открытий');
    } else {
      openings.forEach((opening, index) => {
        console.log(`  ${index + 1}. ${opening.boxName}: ${opening.prizeType === 'pro' ? 'PRO' : '$' + opening.amount} (энергия: ${opening.energySpent}) - ${opening.openedAt}`);
      });
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkBoxOpenings(); 