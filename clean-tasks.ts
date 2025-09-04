import { TaskService } from './server/services/taskService';

async function cleanAndCreateTasks() {
  const userId = '116069980752518862717';
  console.log('🧹 Очищаем все старые задания...');
  
  // Очищаем все старые задания
  await TaskService.clearAllUserTasks(userId);
  console.log('✅ Все задания очищены');
  
  // Создаем новые задания
  console.log('🎯 Создаем новые задания...');
  const tasks = await TaskService.getUserTasks(userId);
  
  console.log(`✅ Создано ${tasks.length} новых заданий:`);
  tasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${task.taskType} - ${task.title}`);
  });
}

cleanAndCreateTasks().then(() => {
  console.log('🏁 Готово! Обновите страницу.');
}).catch(console.error);