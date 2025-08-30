#!/bin/bash

# Скрипт мониторинга сервисов
echo "📊 CryptoCraze Services Monitoring"
echo "=================================="

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция проверки статуса
check_service() {
    local service=$1
    local port=$2
    local name=$3
    
    if systemctl is-active --quiet $service 2>/dev/null; then
        echo -e "${GREEN}✅ $name: Running${NC}"
        if [ ! -z "$port" ]; then
            if curl -s --max-time 3 http://localhost:$port > /dev/null 2>&1; then
                echo -e "   ${GREEN}🌐 Port $port: Responding${NC}"
            else
                echo -e "   ${RED}🚫 Port $port: Not responding${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ $name: Not running${NC}"
    fi
}

# Проверка PM2 процессов
check_pm2() {
    echo -e "\n${YELLOW}PM2 Processes:${NC}"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Memory: \(.monit.memory | tonumber / 1024 / 1024 | round)MB)"' 2>/dev/null || echo "PM2 not available or no processes"
}

# Проверка дискового пространства
check_disk() {
    echo -e "\n${YELLOW}Disk Usage:${NC}"
    df -h | grep -E '^/dev/' | awk '{ printf "%-20s %s used of %s (%s)\n", $1, $3, $2, $5 }'
}

# Проверка памяти
check_memory() {
    echo -e "\n${YELLOW}Memory Usage:${NC}"
    free -h | grep -E '^Mem:' | awk '{ printf "Used: %s / %s (%s%%)\n", $3, $2, int($3/$2*100) }'
}

# Проверка логов на ошибки (последние 10 минут)
check_errors() {
    echo -e "\n${YELLOW}Recent Errors (last 10 minutes):${NC}"
    journalctl --since "10 minutes ago" --priority=err --no-pager -n 5 | tail -n 5 || echo "No recent errors"
}

# Основные проверки
echo -e "\n${YELLOW}System Services:${NC}"
check_service "nginx" "80" "Nginx"
check_service "redis-server" "6379" "Redis"
check_service "cryptocraze-backend" "3001" "Backend API"
check_service "cloudflared" "" "Cloudflare Tunnel"

check_pm2
check_disk
check_memory
check_errors

# Проверка статуса API
echo -e "\n${YELLOW}API Health Check:${NC}"
api_response=$(curl -s --max-time 5 http://localhost:3001/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API: Responding${NC}"
    echo "Response: $api_response"
else
    echo -e "${RED}❌ API: Not responding${NC}"
fi

echo -e "\n=================================="
echo -e "🔍 Use these commands for more details:"
echo -e "  systemctl status [service-name]"
echo -e "  pm2 logs cryptocraze-backend"
echo -e "  journalctl -fu [service-name]"
echo -e "  nginx -t (test config)"