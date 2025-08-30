#!/usr/bin/env tsx

import { db } from '../server/db';
import { prizes, boxTypes } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface PrizeData {
  id?: number;
  boxTypeId: number;
  prizeType: 'money' | 'pro';
  amount?: number;
  proDays?: number;
  chance: number;
}

async function listPrizes(boxType?: string) {
  try {
    let query = db
      .select({
        id: prizes.id,
        boxType: boxTypes.type,
        boxName: boxTypes.name,
        prizeType: prizes.prizeType,
        amount: prizes.amount,
        proDays: prizes.proDays,
        chance: prizes.chance,
        isActive: prizes.isActive,
      })
      .from(prizes)
      .innerJoin(boxTypes, eq(prizes.boxTypeId, boxTypes.id));

    if (boxType) {
      query = query.where(eq(boxTypes.type, boxType as any));
    }

    const prizeList = await query;

    console.log('\n🎁 Список призов:');
    console.log('─'.repeat(80));
    
    let currentBoxType = '';
    for (const prize of prizeList) {
      if (prize.boxType !== currentBoxType) {
        currentBoxType = prize.boxType;
        console.log(`\n📦 ${prize.boxName} (${prize.boxType.toUpperCase()}):`);
        console.log('─'.repeat(40));
      }
      
      const prizeText = prize.prizeType === 'pro' 
        ? `PRO ${prize.proDays} дней`
        : `$${prize.amount?.toLocaleString()}`;
      
      const status = prize.isActive ? '✅' : '❌';
      console.log(`${status} ID: ${prize.id} | ${prizeText} | Шанс: ${prize.chance}%`);
    }
    
    console.log('\n');
  } catch (error) {
    console.error('❌ Ошибка получения списка призов:', error);
  }
}

async function addPrize(boxType: string, prizeType: 'money' | 'pro', value: number, chance: number) {
  try {
    // Получаем ID типа коробки
    const boxTypeRecord = await db
      .select({ id: boxTypes.id })
      .from(boxTypes)
      .where(eq(boxTypes.type, boxType as any))
      .limit(1);

    if (!boxTypeRecord.length) {
      console.error(`❌ Тип коробки '${boxType}' не найден`);
      return;
    }

    const prizeData: PrizeData = {
      boxTypeId: boxTypeRecord[0].id,
      prizeType,
      chance,
    };

    if (prizeType === 'money') {
      prizeData.amount = value;
    } else {
      prizeData.proDays = value;
    }

    await db.insert(prizes).values(prizeData);
    
    const prizeText = prizeType === 'pro' 
      ? `PRO ${value} дней`
      : `$${value.toLocaleString()}`;
    
    console.log(`✅ Приз добавлен: ${prizeText} для ${boxType} коробки (шанс: ${chance}%)`);
  } catch (error) {
    console.error('❌ Ошибка добавления приза:', error);
  }
}

async function updatePrize(prizeId: number, updates: Partial<PrizeData>) {
  try {
    await db.update(prizes)
      .set(updates)
      .where(eq(prizes.id, prizeId));
    
    console.log(`✅ Приз ID ${prizeId} обновлен`);
  } catch (error) {
    console.error('❌ Ошибка обновления приза:', error);
  }
}

async function deletePrize(prizeId: number) {
  try {
    await db.delete(prizes).where(eq(prizes.id, prizeId));
    console.log(`✅ Приз ID ${prizeId} удален`);
  } catch (error) {
    console.error('❌ Ошибка удаления приза:', error);
  }
}

async function togglePrize(prizeId: number) {
  try {
    const prize = await db
      .select({ isActive: prizes.isActive })
      .from(prizes)
      .where(eq(prizes.id, prizeId))
      .limit(1);

    if (!prize.length) {
      console.error(`❌ Приз ID ${prizeId} не найден`);
      return;
    }

    await db.update(prizes)
      .set({ isActive: !prize[0].isActive })
      .where(eq(prizes.id, prizeId));
    
    const status = !prize[0].isActive ? 'активирован' : 'деактивирован';
    console.log(`✅ Приз ID ${prizeId} ${status}`);
  } catch (error) {
    console.error('❌ Ошибка переключения статуса приза:', error);
  }
}

function showHelp() {
  console.log(`
🎁 Управление призами

Использование:
  tsx manage-prizes.ts <команда> [параметры]

Команды:
  list [boxType]                    - Показать все призы (опционально для конкретной коробки)
  add <boxType> <type> <value> <chance> - Добавить приз
  update <id> <field> <value>       - Обновить приз
  delete <id>                       - Удалить приз
  toggle <id>                       - Активировать/деактивировать приз
  help                              - Показать эту справку

Параметры:
  boxType: red, green, x
  type: money, pro
  value: сумма денег или количество дней PRO
  chance: шанс в процентах (0.1-100)
  field: amount, proDays, chance, isActive

Примеры:
  tsx manage-prizes.ts list
  tsx manage-prizes.ts list red
  tsx manage-prizes.ts add red money 5000 10
  tsx manage-prizes.ts add green pro 14 2
  tsx manage-prizes.ts update 1 chance 15
  tsx manage-prizes.ts toggle 1
  tsx manage-prizes.ts delete 1
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'list':
        await listPrizes(args[1]);
        break;
        
      case 'add':
        if (args.length < 5) {
          console.error('❌ Недостаточно параметров для команды add');
          return;
        }
        await addPrize(args[1], args[2] as 'money' | 'pro', Number(args[3]), Number(args[4]));
        break;
        
      case 'update':
        if (args.length < 4) {
          console.error('❌ Недостаточно параметров для команды update');
          return;
        }
        const updates: any = {};
        updates[args[2]] = args[2] === 'isActive' ? args[3] === 'true' : Number(args[3]);
        await updatePrize(Number(args[1]), updates);
        break;
        
      case 'delete':
        if (args.length < 2) {
          console.error('❌ Недостаточно параметров для команды delete');
          return;
        }
        await deletePrize(Number(args[1]));
        break;
        
      case 'toggle':
        if (args.length < 2) {
          console.error('❌ Недостаточно параметров для команды toggle');
          return;
        }
        await togglePrize(Number(args[1]));
        break;
        
      default:
        console.error(`❌ Неизвестная команда: ${command}`);
        showHelp();
    }
  } catch (error) {
    console.error('❌ Ошибка выполнения команды:', error);
  }
}

// Запускаем скрипт
main(); 