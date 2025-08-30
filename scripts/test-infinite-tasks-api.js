const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000';

// Имитируем сессию пользователя (в реальном приложении это будет через OAuth)
const mockSession = {
  // Здесь должны быть реальные куки сессии
};

const testInfiniteTasksAPI = async () => {
  console.log('🌐 Тестирование API бесконечных заданий...\n');
  
  try {
    // Шаг 1: Получить задания (с автоматическим пополнением)
    console.log('📋 Шаг 1: Получаем задания с автоматическим пополнением...');
    const tasksResponse = await fetch(`${API_BASE}/api/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=your-session-cookie' // Замените на реальную сессию
      }
    });
    
    if (!tasksResponse.ok) {
      console.log(`❌ Ошибка получения заданий: ${tasksResponse.status}`);
      console.log('💡 Убедитесь, что сервер запущен и вы авторизованы');
      return;
    }
    
    const tasksData = await tasksResponse.json();
    console.log(`✅ Получено заданий: ${tasksData.tasks.length}`);
    
    if (tasksData.createdTasks) {
      console.log(`🎉 Автоматически создано новых заданий: ${tasksData.createdTasks.length}`);
    }
    
    // Показываем задания
    tasksData.tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
      console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
      console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
    });
    
    // Шаг 2: Завершить первое задание
    if (tasksData.tasks.length > 0) {
      console.log('\n📋 Шаг 2: Завершаем первое задание...');
      const firstTask = tasksData.tasks[0];
      console.log(`Завершаем: ${firstTask.title} (ID: ${firstTask.id})`);
      
      const progressResponse = await fetch(`${API_BASE}/api/tasks/${firstTask.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'session=your-session-cookie' // Замените на реальную сессию
        },
        body: JSON.stringify({
          progress: firstTask.progress.total
        })
      });
      
      if (!progressResponse.ok) {
        console.log(`❌ Ошибка обновления прогресса: ${progressResponse.status}`);
        return;
      }
      
      const progressData = await progressResponse.json();
      console.log('✅ Задание завершено!');
      console.log(`Статус: ${progressData.task.status}`);
      
      if (progressData.newTask) {
        console.log('🎉 Новое задание создано автоматически!');
        console.log(`Новое задание: ${progressData.newTask.title} (ID: ${progressData.newTask.id})`);
        console.log(`Прогресс: ${progressData.newTask.progress.current}/${progressData.newTask.progress.total}`);
        console.log(`Награда: ${progressData.newTask.reward.amount} ${progressData.newTask.reward.type}`);
      }
    }
    
    // Шаг 3: Тестируем автоматическое пополнение
    console.log('\n📋 Шаг 3: Тестируем автоматическое пополнение...');
    const refillResponse = await fetch(`${API_BASE}/api/tasks/auto-refill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=your-session-cookie' // Замените на реальную сессию
      }
    });
    
    if (!refillResponse.ok) {
      console.log(`❌ Ошибка автоматического пополнения: ${refillResponse.status}`);
      return;
    }
    
    const refillData = await refillResponse.json();
    console.log(`✅ ${refillData.message}`);
    
    if (refillData.createdTasks) {
      console.log(`Создано заданий: ${refillData.createdTasks.length}`);
      refillData.createdTasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title} (ID: ${task.id})`);
      });
    }
    
    // Шаг 4: Финальная проверка
    console.log('\n📋 Шаг 4: Финальная проверка...');
    const finalResponse = await fetch(`${API_BASE}/api/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=your-session-cookie' // Замените на реальную сессию
      }
    });
    
    const finalData = await finalResponse.json();
    console.log(`Финальное количество активных заданий: ${finalData.tasks.length}`);
    
    finalData.tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ID: ${task.id} - ${task.title}`);
      console.log(`      Прогресс: ${task.progress.current}/${task.progress.total}`);
      console.log(`      Награда: ${task.reward.amount} ${task.reward.type}`);
    });
    
    console.log('\n🎉 API тестирование завершено!');
    console.log('📱 Система бесконечных заданий работает корректно через API');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.log('\n💡 Убедитесь, что:');
    console.log('   1. Сервер запущен на http://localhost:8000');
    console.log('   2. Вы авторизованы через Google OAuth');
    console.log('   3. Замените "your-session-cookie" на реальную сессию');
  }
};

// Инструкции по использованию
console.log('🚀 Инструкции по тестированию API:');
console.log('1. Запустите сервер: npm run dev');
console.log('2. Авторизуйтесь через Google OAuth');
console.log('3. Получите куки сессии из браузера');
console.log('4. Замените "your-session-cookie" в скрипте на реальные куки');
console.log('5. Запустите: node scripts/test-infinite-tasks-api.js\n');

testInfiniteTasksAPI(); 