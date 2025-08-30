#!/bin/bash

# Скрипт для деплоя после настройки SSH

SERVER_IP="84.201.139.242"
SERVER_USER="ubuntu"

echo "🚀 Автоматический деплой CryptoCraze после настройки SSH"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверить SSH подключение
echo -e "${YELLOW}🔗 Проверяем SSH подключение...${NC}"
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'SSH работает!'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH подключение установлено!${NC}"
    
    # Создать архив
    echo -e "${YELLOW}📦 Создание архива...${NC}"
    cd ..
    tar -czf cryptocraze-deploy.tar.gz --exclude=cryptocraze/node_modules --exclude=cryptocraze/.git cryptocraze/
    cd cryptocraze
    
    # Загрузить проект
    echo -e "${YELLOW}📤 Загрузка проекта на сервер...${NC}"
    scp -o StrictHostKeyChecking=no ../cryptocraze-deploy.tar.gz $SERVER_USER@$SERVER_IP:~/
    
    # Развернуть на сервере
    echo -e "${YELLOW}🚀 Развертывание приложения...${NC}"
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
        set -e
        
        echo "🗂 Распаковка проекта..."
        tar -xzf cryptocraze-deploy.tar.gz
        cd cryptocraze
        
        echo "🔍 Проверка Node.js..."
        if ! command -v node &> /dev/null; then
            echo "📥 Установка Node.js 20..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        echo "✅ Node.js: $(node --version)"
        echo "✅ npm: $(npm --version)"
        
        echo "📦 Установка зависимостей..."
        npm install
        
        echo "🔧 Настройка прав доступа..."
        chmod +x deploy-yandex-cloud.sh stop-deployment.sh
        
        echo "🚀 Запуск автоматического развертывания..."
        ./deploy-yandex-cloud.sh
ENDSSH
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}🎉 Развертывание завершено успешно!${NC}"
        
        # Получить публичный URL
        sleep 5
        echo -e "${YELLOW}📊 Получение публичного URL...${NC}"
        PUBLIC_URL=$(ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd cryptocraze && grep -o 'https://[a-zA-Z0-9\-]*\.trycloudflare\.com' tunnel.log | head -1" 2>/dev/null)
        
        if [ -n "$PUBLIC_URL" ]; then
            echo -e "${GREEN}🌍 Публичный URL: $PUBLIC_URL${NC}"
            echo -e "${GREEN}📊 Health check: $PUBLIC_URL/health${NC}"
            echo -e "${GREEN}🎰 Тест рулетки: $PUBLIC_URL (Rewards раздел)${NC}"
        else
            echo -e "${YELLOW}⏳ URL генерируется... Проверьте логи:${NC}"
            echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && tail -f tunnel.log'${NC}"
        fi
        
        echo -e "${GREEN}\n✅ CryptoCraze с рабочей рулеткой развернут! 🎰✨${NC}"
        
    else
        echo -e "${RED}❌ Ошибка развертывания${NC}"
    fi
    
    # Очистка
    rm -f ../cryptocraze-deploy.tar.gz
    
else
    echo -e "${RED}❌ SSH подключение все еще недоступно${NC}"
    echo -e "${YELLOW}💡 Убедитесь, что SSH ключ добавлен в Yandex Cloud Console${NC}"
    echo -e "${YELLOW}💡 Или используйте ручное развертывание через браузер${NC}"
fi