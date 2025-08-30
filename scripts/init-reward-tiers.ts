import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { rewardTiers } from '../shared/schema';

const generateRewardTiers = () => {
  // Ровно список по ТЗ (1..50)
  const t: Array<{ level: number; accountMoney: number; reward: number; proDays?: number }> = [
    { level: 1, accountMoney: 5000, reward: 500 },
    { level: 2, accountMoney: 10000, reward: 1000 },
    { level: 3, accountMoney: 15000, reward: 1500 },
    { level: 4, accountMoney: 20000, reward: 2000 },
    { level: 5, accountMoney: 25000, reward: 2500 },
    { level: 6, accountMoney: 30000, reward: 3000 },
    { level: 7, accountMoney: 35000, reward: 3500 },
    { level: 8, accountMoney: 40000, reward: 4000 },
    { level: 9, accountMoney: 45000, reward: 4500 },
    { level: 10, accountMoney: 50000, reward: 5000, proDays: 3 },
    { level: 11, accountMoney: 60000, reward: 6000 },
    { level: 12, accountMoney: 70000, reward: 7000 },
    { level: 13, accountMoney: 80000, reward: 8000 },
    { level: 14, accountMoney: 90000, reward: 9000 },
    { level: 15, accountMoney: 100000, reward: 10000 },
    { level: 16, accountMoney: 110000, reward: 11000 },
    { level: 17, accountMoney: 120000, reward: 12000 },
    { level: 18, accountMoney: 130000, reward: 13000 },
    { level: 19, accountMoney: 140000, reward: 14000 },
    { level: 20, accountMoney: 150000, reward: 15000, proDays: 5 },
    { level: 21, accountMoney: 160000, reward: 16000 },
    { level: 22, accountMoney: 170000, reward: 17000 },
    { level: 23, accountMoney: 180000, reward: 18000 },
    { level: 24, accountMoney: 190000, reward: 19000 },
    { level: 25, accountMoney: 200000, reward: 20000 },
    { level: 26, accountMoney: 210000, reward: 21000 },
    { level: 27, accountMoney: 220000, reward: 22000 },
    { level: 28, accountMoney: 230000, reward: 23000 },
    { level: 29, accountMoney: 240000, reward: 24000 },
    { level: 30, accountMoney: 250000, reward: 25000, proDays: 5 },
    { level: 31, accountMoney: 260000, reward: 26000 },
    { level: 32, accountMoney: 270000, reward: 27000 },
    { level: 33, accountMoney: 280000, reward: 28000 },
    { level: 34, accountMoney: 290000, reward: 29000 },
    { level: 35, accountMoney: 300000, reward: 30000 },
    { level: 36, accountMoney: 310000, reward: 31000 },
    { level: 37, accountMoney: 320000, reward: 32000 },
    { level: 38, accountMoney: 330000, reward: 33000 },
    { level: 39, accountMoney: 340000, reward: 34000 },
    { level: 40, accountMoney: 350000, reward: 35000, proDays: 7 },
    { level: 41, accountMoney: 400000, reward: 40000 },
    { level: 42, accountMoney: 450000, reward: 45000 },
    { level: 43, accountMoney: 475000, reward: 47500 },
    { level: 44, accountMoney: 490000, reward: 49000 },
    { level: 45, accountMoney: 495000, reward: 49500 },
    { level: 46, accountMoney: 498000, reward: 49800 },
    { level: 47, accountMoney: 498500, reward: 49850 },
    { level: 48, accountMoney: 499000, reward: 49900 },
    { level: 49, accountMoney: 499500, reward: 49950 },
    { level: 50, accountMoney: 500000, reward: 50000, proDays: 10 },
  ];
  return t.map(x => ({
    level: x.level,
    accountMoney: x.accountMoney,
    reward: x.reward,
    proDays: x.proDays ?? null,
    isActive: true,
  }));
};

async function main() {
  const tiers = generateRewardTiers();
  // Полная перезапись справочника
  await db.execute(sql`TRUNCATE TABLE "reward_tiers" RESTART IDENTITY;`);
  await db.insert(rewardTiers).values(tiers);
  console.log(`Inserted ${tiers.length} reward tiers`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

