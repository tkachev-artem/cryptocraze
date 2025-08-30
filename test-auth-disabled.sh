#!/bin/bash

# Скрипт для тестирования админских эндпоинтов с отключенной авторизацией

echo "🔧 Starting CryptoCraze server with auth disabled for testing..."
echo ""

# Экспортируем переменную для отключения авторизации
export DISABLE_AUTH=true
export NODE_ENV=development

# Показываем что авторизация отключена
echo "🔐 DISABLE_AUTH=true"
echo "🌍 NODE_ENV=$NODE_ENV"
echo ""

# Запускаем сервер в фоновом режиме
echo "🚀 Starting server..."
npm run dev:server &
SERVER_PID=$!

# Ждем запуска сервера
sleep 5

# Проверяем что сервер запустился
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Server is running on http://localhost:3001"
    echo ""
    
    # Запускаем тесты
    echo "🧪 Running admin endpoint tests..."
    node test-admin-endpoints.cjs
    
    # Результат тестов
    TEST_RESULT=$?
    
else
    echo "❌ Server failed to start"
    TEST_RESULT=1
fi

# Останавливаем сервер
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

exit $TEST_RESULT