#!/bin/bash

# Скрипт для выдачи админских прав пользователю
# Использование: ./grant-admin.sh

echo "🔐 Скрипт выдачи админских прав"
echo "================================"

# Проверить, установлен ли tsx
if ! command -v tsx &> /dev/null; then
    echo "❌ tsx не установлен. Устанавливаем..."
    npm install -g tsx
fi

# Если передан USER_ID как аргумент
if [ ! -z "$1" ]; then
    USER_ID="$1"
else
    echo "💡 Для поиска пользователя выполните SQL-запрос:"
    echo "   SELECT id, name, email, role FROM users WHERE email = 'user@example.com';"
    echo ""
    read -p "🔍 Введите User ID: " USER_ID
fi

if [ -z "$USER_ID" ]; then
    echo "❌ User ID не может быть пустым"
    exit 1
fi

echo ""
echo "🚀 Выдача админских прав пользователю: $USER_ID"

# Скопировать скрипт в контейнер (если еще не скопирован)
docker cp cryptocraze/server/scripts/grantAdminSimple.cjs cryptocraze-app-1:/app/server/scripts/ 2>/dev/null || true

# Запустить скрипт внутри контейнера приложения
docker exec cryptocraze-app-1 node server/scripts/grantAdminSimple.cjs "$USER_ID"

echo ""
echo "✨ Готово!"