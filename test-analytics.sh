#!/bin/bash

echo "🧪 ТЕСТИРОВАНИЕ CLICKHOUSE АНАЛИТИКИ"
echo "=================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Базовый URL
BASE_URL="http://localhost:5000"

echo -e "\n${BLUE}1. Проверка доступности сервера${NC}"
if curl -s --max-time 5 "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✅ Сервер доступен${NC}"
else
    echo -e "${RED}❌ Сервер недоступен${NC}"
    exit 1
fi

echo -e "\n${BLUE}2. Проверка admin API (требует авторизации)${NC}"
response_code=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$BASE_URL/api/admin/analytics/overview-v2")
if [ "$response_code" = "403" ]; then
    echo -e "${GREEN}✅ API защищён авторизацией (код 403)${NC}"
elif [ "$response_code" = "200" ]; then
    echo -e "${GREEN}✅ API работает (код 200)${NC}"
else
    echo -e "${RED}❌ Проблема с API (код $response_code)${NC}"
fi

echo -e "\n${BLUE}3. Запуск интеграционных тестов${NC}"
if command -v npx > /dev/null; then
    echo "Запускаем тест ClickHouse..."
    npx tsx scripts/test-full-clickhouse-integration.ts 2>&1 | tail -5
else
    echo -e "${RED}❌ NPX недоступен${NC}"
fi

echo -e "\n${BLUE}4. Проверка ClickHouse подключения${NC}"
if command -v clickhouse-client > /dev/null; then
    echo "Проверяем ClickHouse..."
    clickhouse-client --query "SELECT 1" 2>/dev/null && echo -e "${GREEN}✅ ClickHouse работает${NC}" || echo -e "${RED}❌ ClickHouse недоступен${NC}"
else
    # Проверяем через curl
    if curl -s --max-time 3 "http://localhost:8123/" > /dev/null; then
        echo -e "${GREEN}✅ ClickHouse доступен на порту 8123${NC}"
    else
        echo -e "${RED}❌ ClickHouse недоступен на порту 8123${NC}"
    fi
fi

echo -e "\n${BLUE}5. Сводка для мануального тестирования${NC}"
echo "Для полного тестирования выполните:"
echo "1. Откройте http://localhost:3000"
echo "2. Авторизуйтесь через Google"
echo "3. Откройте сделки, выполните торговые операции"
echo "4. Посмотрите задания с рекламой"
echo "5. Проверьте админ-панель"
echo ""
echo -e "${GREEN}Тест завершён!${NC}"