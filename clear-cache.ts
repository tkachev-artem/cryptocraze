// Скрипт для очистки кэша заданий из localStorage

console.log('🧹 Очищаем localStorage от старых заданий...');

try {
  // Очищаем все ключи связанные с заданиями
  const keysToRemove = [
    'cryptocraze_tasks',
    'cryptocraze_task_completions', 
    'cryptocraze_task_cooldowns'
  ];
  
  keysToRemove.forEach(key => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ Удален ключ: ${key}`);
    } else {
      console.log(`ℹ️ Ключ не найден: ${key}`);
    }
  });
  
  console.log('🏁 Очистка localStorage завершена!');
  console.log('Теперь обновите страницу - задания должны загружаться только с сервера');
  
} catch (error) {
  console.error('❌ Ошибка очистки localStorage:', error);
}

export {};