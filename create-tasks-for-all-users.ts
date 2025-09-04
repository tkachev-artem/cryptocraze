import { TaskService } from './server/services/taskService';

// Создадим задания для всех возможных пользователей
const potentialUserIds = [
  '111907067370663926621', // Из прошлых тестов
  '116069980752518862717', // Админ
  // Добавим еще несколько возможных ID
];

console.log('🎯 Создаем задания для всех возможных пользователей...\n');

async function createTasksForAllUsers() {
  for (const userId of potentialUserIds) {
    console.log(`\n👤 Создаем задания для пользователя: ${userId}`);
    
    try {
      // Очищаем старые задания
      await TaskService.clearAllUserTasks(userId);
      console.log('   ✅ Очищены старые задания');
      
      // Создаем новые задания
      const tasks = await TaskService.getUserTasks(userId);
      console.log(`   ✅ Создано ${tasks.length} заданий`);
      
      if (tasks.length > 0) {
        tasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.taskType} - ${task.title}`);
        });
      }
      
    } catch (error) {
      console.error(`   ❌ Ошибка для пользователя ${userId}:`, error);
    }
  }
  
  console.log('\n🔄 Теперь обновите страницу и проверьте логи сервера!');
  console.log('Ищите строчку: [ROUTES] 🎯 FRONTEND REQUEST - Getting tasks for user: [ID]');
}

await createTasksForAllUsers();
console.log('\n🏁 Задания созданы для всех пользователей!');