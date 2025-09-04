import { TaskService } from './server/services/taskService';

async function fixDuplicateTasks() {
  const userId = '116069980752518862717';
  console.log('🧹 Исправляем проблему дубликатов заданий...\n');
  
  // 1. Очищаем все задания
  console.log('1. Очищаем все старые задания...');
  await TaskService.clearAllUserTasks(userId);
  console.log('   ✅ Все задания очищены');
  
  // 2. Создаем новые задания через правильный метод
  console.log('\n2. Создаем новые задания через ensureUserHasTasks...');
  const newTasks = await TaskService.ensureUserHasTasks(userId);
  
  console.log(`\n✅ Создано ${newTasks.length} новых заданий:`);
  newTasks.forEach((task, index) => {
    console.log(`   ${index + 1}. ${(task as any).taskType} - ${task.title}`);
  });
  
  console.log('\n🏁 Готово!');
  console.log('💡 Теперь GET /api/tasks НЕ будет автоматически создавать задания');
  console.log('💡 Задания создаются только через ensureUserHasTasks()');
  console.log('💡 Это должно решить проблему дубликатов');
}

fixDuplicateTasks().catch(console.error);