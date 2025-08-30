import fetch from 'node-fetch';

const testReplaceAPI = async () => {
  console.log('🔄 Тестирование HTTP API замены заданий...\n');
  
  const baseUrl = 'http://localhost:8000';
  const taskId = '231'; // ID задания для замены
  
  try {
    console.log('🌐 Базовый URL:', baseUrl);
    console.log('🎯 Задание для замены:', taskId);
    
    // Тест 1: Проверяем доступность сервера
    console.log('\n📋 Тест 1: Проверка доступности сервера...');
    try {
      const healthResponse = await fetch(`${baseUrl}/api/tasks`);
      console.log(`✅ Сервер доступен: ${healthResponse.status}`);
    } catch (error) {
      console.log('❌ Сервер недоступен:', error);
      console.log('   Запустите сервер: npm run dev');
      return;
    }
    
    // Тест 2: Пытаемся заменить задание
    console.log('\n📋 Тест 2: Замена задания...');
    try {
      const replaceResponse = await fetch(`${baseUrl}/api/tasks/${taskId}/replace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log(`📊 Статус ответа: ${replaceResponse.status}`);
      
      if (replaceResponse.ok) {
        const data = await replaceResponse.json();
        console.log('✅ Ответ сервера:');
        console.log('   success:', data.success);
        console.log('   replaced:', data.replaced);
        
        if (data.replaced) {
          console.log('   oldTask:', data.oldTask?.title);
          console.log('   newTask:', data.newTask?.title);
        } else {
          console.log('   task:', data.task?.title);
        }
      } else {
        const errorText = await replaceResponse.text();
        console.log('❌ Ошибка сервера:', errorText);
      }
    } catch (error) {
      console.log('❌ Ошибка запроса:', error);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
};

// Запускаем тест
testReplaceAPI().catch(console.error); 