import { TaskService } from './server/services/taskService';

async function checkUserTasks() {
  const userId = '116069980752518862717';
  console.log('📋 Проверяем задания пользователя...\n');
  
  const tasks = await TaskService.getUserTasks(userId);
  
  console.log(`Всего заданий: ${tasks.length}`);
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. ${(task as any).taskType}`);
    console.log(`   Название: ${task.title}`);
    console.log(`   Прогресс: ${task.progress.current}/${task.progress.total}`);
    console.log(`   Статус: ${task.status}`);
    console.log(`   ID: ${task.id}`);
    console.log('');
  });
}

checkUserTasks().catch(console.error);