import { db } from '../server/db';
import { premiumPlans } from '../shared/schema';
import { eq } from 'drizzle-orm';

const initPremiumPlans = async () => {
  try {
    console.log('🚀 Инициализация Premium планов...\n');

    // Создаем планы
    const plans = [
      {
        name: 'Premium Месяц',
        description: 'Premium подписка на 1 месяц',
        planType: 'month',
        price: '299.00',
        currency: 'RUB',
        features: [
          'Расширенная аналитика',
          'Приоритетная поддержка',
          'Эксклюзивные индикаторы',
          'Без рекламы',
          'Увеличенный лимит сделок'
        ],
        isActive: true
      },
      {
        name: 'Premium Год',
        description: 'Premium подписка на 1 год (экономия 20%)',
        planType: 'year',
        price: '2999.00',
        currency: 'RUB',
        features: [
          'Все функции месячного плана',
          'Экономия 20%',
          'Приоритетный доступ к новым функциям',
          'Персональный менеджер',
          'Эксклюзивные вебинары'
        ],
        isActive: true
      }
    ];

    for (const plan of plans) {
      try {
        await db.insert(premiumPlans).values(plan);
        console.log(`✅ Создан план: ${plan.name} - ${plan.price} ${plan.currency}`);
      } catch (error) {
        console.log(`⚠️ План ${plan.name} уже существует`);
      }
    }

    console.log('\n🎉 Premium планы инициализированы!');
    
    // Показываем созданные планы
    const activePlans = await db
      .select()
      .from(premiumPlans)
      .where(eq(premiumPlans.isActive, true));
    
    console.log('\n📋 Активные планы:');
    activePlans.forEach(plan => {
      console.log(`- ${plan.name}: ${plan.price} ${plan.currency}`);
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации Premium планов:', error);
  } finally {
    process.exit(0);
  }
};

initPremiumPlans(); 