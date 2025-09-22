import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function ageUser(userId: string, daysOld: number) {
  try {
    const ageDate = new Date();
    ageDate.setDate(ageDate.getDate() - daysOld);

    const result = await db
      .update(users)
      .set({
        createdAt: ageDate,
        updatedAt: ageDate,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id, createdAt: users.createdAt });

    if (result.length === 0) {
      console.error(`User ${userId} not found`);
      process.exit(1);
    }

    console.log(`User ${userId} aged to ${daysOld} days old (created: ${result[0].createdAt})`);
  } catch (error) {
    console.error('Error aging user:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Get command line arguments
const userId = process.argv[2];
const daysOld = parseInt(process.argv[3]) || 15;

if (!userId) {
  console.error('Usage: npm run age-user <userId> [daysOld]');
  process.exit(1);
}

ageUser(userId, daysOld);