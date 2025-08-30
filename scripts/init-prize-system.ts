import { db } from '../server/db';
import { boxTypes, prizes } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function initPrizeSystem() {
  try {
    console.log('🎁 Инициализация системы призов...');

    // Проверяем, есть ли уже типы коробок
    const existingBoxTypes = await db.select().from(boxTypes);
    
    if (existingBoxTypes.length > 0) {
      console.log('✅ Типы коробок уже существуют, пропускаем создание...');
    } else {
      console.log('📦 Создание типов коробок...');
      
      // Создаем типы коробок
      await db.insert(boxTypes).values([
        {
          type: 'red',
          name: 'Красная коробка',
          requiredEnergy: 30,
          description: 'Базовая коробка с небольшими призами'
        },
        {
          type: 'green',
          name: 'Зеленая коробка',
          requiredEnergy: 70,
          description: 'Средняя коробка с хорошими призами'
        },
        {
          type: 'x',
          name: 'X коробка',
          requiredEnergy: 100,
          description: 'Премиум коробка с лучшими призами'
        }
      ]);
      
      console.log('✅ Типы коробок созданы');
    }

    // Получаем ID типов коробок
    const boxTypesData = await db.select().from(boxTypes);
    const redBoxId = boxTypesData.find(bt => bt.type === 'red')?.id;
    const greenBoxId = boxTypesData.find(bt => bt.type === 'green')?.id;
    const xBoxId = boxTypesData.find(bt => bt.type === 'x')?.id;

    if (!redBoxId || !greenBoxId || !xBoxId) {
      throw new Error('Не удалось найти ID типов коробок');
    }

    // Проверяем, есть ли уже призы
    const existingPrizes = await db.select().from(prizes);
    
    if (existingPrizes.length > 0) {
      console.log('✅ Призы уже существуют, пропускаем создание...');
    } else {
      console.log('🎁 Создание призов...');
      
      // Призы для красной коробки
      await db.insert(prizes).values([
        { boxTypeId: redBoxId, prizeType: 'money', amount: 100, chance: 15 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 200, chance: 12 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 300, chance: 10 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 400, chance: 8 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 500, chance: 7 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 600, chance: 6 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 700, chance: 5 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 800, chance: 4 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 900, chance: 3 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 1000, chance: 3 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 1200, chance: 2 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 1500, chance: 2 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 1800, chance: 1.5 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 2000, chance: 1.5 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 2500, chance: 1 },
        { boxTypeId: redBoxId, prizeType: 'money', amount: 3000, chance: 1 },
        { boxTypeId: redBoxId, prizeType: 'pro', proDays: 3, chance: 0.5 }
      ]);

      // Призы для зеленой коробки
      await db.insert(prizes).values([
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 500, chance: 15 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 1000, chance: 12 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 1500, chance: 10 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 2000, chance: 8 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 2500, chance: 7 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 3000, chance: 6 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 4000, chance: 5 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 5000, chance: 4 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 6000, chance: 3 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 7000, chance: 3 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 8000, chance: 2 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 10000, chance: 2 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 12000, chance: 1.5 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 15000, chance: 1.5 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 20000, chance: 1 },
        { boxTypeId: greenBoxId, prizeType: 'money', amount: 25000, chance: 1 },
        { boxTypeId: greenBoxId, prizeType: 'pro', proDays: 7, chance: 1 }
      ]);

      // Призы для X коробки
      await db.insert(prizes).values([
        { boxTypeId: xBoxId, prizeType: 'money', amount: 1000, chance: 15 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 2000, chance: 12 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 3000, chance: 10 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 5000, chance: 8 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 7000, chance: 7 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 10000, chance: 6 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 15000, chance: 5 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 20000, chance: 4 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 25000, chance: 3 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 30000, chance: 3 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 40000, chance: 2 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 50000, chance: 2 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 75000, chance: 1.5 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 100000, chance: 1.5 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 150000, chance: 1 },
        { boxTypeId: xBoxId, prizeType: 'money', amount: 200000, chance: 1 },
        { boxTypeId: xBoxId, prizeType: 'pro', proDays: 30, chance: 2 }
      ]);
      
      console.log('✅ Призы созданы');
    }

    console.log('🎉 Система призов успешно инициализирована!');
    
    // Выводим статистику
    const totalPrizes = await db.select().from(prizes);
    console.log(`📊 Всего призов: ${totalPrizes.length}`);
    
    const redPrizes = totalPrizes.filter(p => p.boxTypeId === redBoxId);
    const greenPrizes = totalPrizes.filter(p => p.boxTypeId === greenBoxId);
    const xPrizes = totalPrizes.filter(p => p.boxTypeId === xBoxId);
    
    console.log(`🔴 Красная коробка: ${redPrizes.length} призов`);
    console.log(`🟢 Зеленая коробка: ${greenPrizes.length} призов`);
    console.log(`❌ X коробка: ${xPrizes.length} призов`);

  } catch (error) {
    console.error('❌ Ошибка инициализации системы призов:', error);
    process.exit(1);
  }
}

// Запускаем инициализацию
initPrizeSystem(); 