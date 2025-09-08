#!/bin/bash

# Скрипт для выдачи админских прав пользователю
# Использование: ./grant-admin.sh

echo "🔐 Скрипт выдачи админских прав"
echo "================================"

# Если передан USER_ID как аргумент
if [ ! -z "$1" ]; then
    USER_ID="$1"
else
    echo "💡 Для поиска пользователя выполните SQL-запрос:"
    echo "   docker exec cryptocraze-postgres-1 psql -U postgres -d crypto_analyzer -c \"SELECT id, name, email, role FROM users WHERE email = 'user@example.com';\""
    echo ""
    read -p "🔍 Введите User ID: " USER_ID
fi

if [ -z "$USER_ID" ]; then
    echo "❌ User ID не может быть пустым"
    exit 1
fi

echo ""
echo "🚀 Выдача админских прав пользователю: $USER_ID"

# Проверить, что контейнеры запущены
if ! docker ps | grep -q cryptocraze-app-1; then
    echo "❌ Контейнер приложения не запущен"
    exit 1
fi

# Запустить скрипт внутри контейнера приложения
docker exec cryptocraze-app-1 node server/scripts/grantAdminSimple.cjs "$USER_ID"

echo ""
echo "✨ Готово!"