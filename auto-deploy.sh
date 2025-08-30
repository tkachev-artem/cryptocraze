#!/bin/bash

# Автоматический скрипт развертывания CryptoCraze в Yandex Cloud

SERVER_IP="84.201.139.242"
SERVER_USER="ubuntu"
PROJECT_NAME="cryptocraze"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎰 CryptoCraze - Автоматическое развертывание в Yandex Cloud${NC}"
echo -e "${BLUE}===============================================================${NC}"

# Создать архив
echo -e "${YELLOW}📦 Создание архива проекта...${NC}"
cd ..
tar -czf cryptocraze-deploy.tar.gz \
    --exclude=cryptocraze/node_modules \
    --exclude=cryptocraze/.git \
    --exclude=cryptocraze/dist \
    --exclude=cryptocraze/server-dist \
    --exclude=cryptocraze/*.tar.gz \
    cryptocraze/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Архив создан: $(du -h cryptocraze-deploy.tar.gz | cut -f1)${NC}"
else
    echo -e "${RED}❌ Ошибка создания архива${NC}"
    exit 1
fi

cd cryptocraze

# Показать публичный SSH ключ
echo -e "${BLUE}\n🔑 Ваш публичный SSH ключ:${NC}"
echo -e "${GREEN}$(cat ~/.ssh/id_rsa.pub)${NC}"

echo -e "${YELLOW}\n📋 Добавьте этот ключ в Yandex Cloud Console:${NC}"
echo -e "   1. Откройте: https://console.cloud.yandex.ru/"
echo -e "   2. Compute Cloud → Виртуальные машины → Ваш сервер"
echo -e "   3. SSH ключи → Добавить SSH ключ"
echo -e "   4. Вставьте ключ выше для пользователя 'ubuntu'"

# Проверить SSH подключение
echo -e "${YELLOW}\n🔗 Проверяем SSH подключение...${NC}"
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'Подключение успешно'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH подключение работает!${NC}"
    
    # Автоматическое развертывание
    echo -e "${YELLOW}\n🚀 Начинаем автоматическое развертывание...${NC}"
    
    # Загрузить архив
    echo -e "${YELLOW}📤 Загрузка проекта...${NC}"
    scp -o StrictHostKeyChecking=no ../cryptocraze-deploy.tar.gz $SERVER_USER@$SERVER_IP:~/
    
    # Развернуть на сервере
    echo -e "${YELLOW}🔧 Развертывание на сервере...${NC}"
    ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
        set -e
        
        echo "🗂 Распаковка проекта..."
        tar -xzf cryptocraze-deploy.tar.gz
        cd cryptocraze
        
        echo "📋 Проверка системы..."
        uname -a
        
        echo "🔍 Проверка Node.js..."
        if ! command -v node &> /dev/null; then
            echo "📥 Установка Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        echo "✅ Node.js версия: $(node --version)"
        echo "✅ npm версия: $(npm --version)"
        
        echo "📦 Установка зависимостей..."
        npm install
        
        echo "🔧 Настройка прав доступа..."
        chmod +x deploy-yandex-cloud.sh stop-deployment.sh
        
        echo "🚀 Запуск развертывания..."
        ./deploy-yandex-cloud.sh
ENDSSH
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}\n🎉 Развертывание завершено успешно!${NC}"
        echo -e "${GREEN}📱 Проверьте логи для получения публичного URL${NC}"
        
        # Получить URL из логов
        echo -e "${YELLOW}\n📊 Получение публичного URL...${NC}"
        ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd cryptocraze && grep -o 'https://[a-zA-Z0-9\-]*\.trycloudflare\.com' tunnel.log | head -1" 2>/dev/null && echo -e "${GREEN}☝️ Это ваш публичный URL!${NC}"
        
    else
        echo -e "${RED}❌ Ошибка развертывания${NC}"
        echo -e "${YELLOW}📋 Проверьте логи на сервере:${NC}"
        echo -e "   ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && tail -f app.log'"
    fi
    
else
    echo -e "${RED}❌ SSH подключение недоступно${NC}"
    echo -e "${YELLOW}\n📋 Выполните ручное развертывание:${NC}"
    echo -e "${YELLOW}===============================================${NC}"
    
    echo -e "${GREEN}1. Добавьте SSH ключ в Yandex Cloud Console${NC}"
    echo -e "${GREEN}2. Или подключитесь через браузер в консоли${NC}"
    echo -e "${GREEN}3. Загрузите архив: ../cryptocraze-deploy.tar.gz${NC}"
    echo -e "${GREEN}4. Выполните на сервере:${NC}"
    
    cat << 'ENDMANUAL'
    
    # Распаковать проект
    tar -xzf cryptocraze-deploy.tar.gz
    cd cryptocraze
    
    # Установить Node.js (если нет)
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Установить зависимости
    npm install
    
    # Запустить развертывание
    chmod +x deploy-yandex-cloud.sh
    ./deploy-yandex-cloud.sh
    
ENDMANUAL
    
    echo -e "${BLUE}📖 Подробная инструкция: SSH-SETUP-GUIDE.md${NC}"
    echo -e "${BLUE}📖 Полное руководство: FINAL-DEPLOYMENT-GUIDE.md${NC}"
fi

# Очистка
echo -e "${YELLOW}\n🧹 Очистка временных файлов...${NC}"
rm -f ../cryptocraze-deploy.tar.gz

echo -e "${BLUE}\n🎰 Развертывание CryptoCraze завершено!${NC}"
echo -e "${GREEN}Рулетка теперь будет работать корректно! ✨${NC}"