#!/bin/bash

# Скрипт для загрузки проекта на Yandex Cloud сервер

SERVER_IP="84.201.139.242"
SERVER_USER="ubuntu"

echo "🚀 Подготовка к загрузке CryptoCraze на сервер Yandex Cloud"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Создать архив для загрузки
echo -e "${YELLOW}📦 Создание архива для загрузки...${NC}"
cd ..
tar -czf cryptocraze-deploy.tar.gz \
    --exclude=cryptocraze/node_modules \
    --exclude=cryptocraze/.git \
    --exclude=cryptocraze/dist \
    --exclude=cryptocraze/server-dist \
    --exclude=cryptocraze/*.tar.gz \
    --exclude=cryptocraze/.next \
    --exclude=cryptocraze/.cache \
    cryptocraze/

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Архив создан: cryptocraze-deploy.tar.gz${NC}"
    echo -e "${GREEN}📊 Размер: $(du -h cryptocraze-deploy.tar.gz | cut -f1)${NC}"
else
    echo -e "${RED}❌ Ошибка создания архива${NC}"
    exit 1
fi

cd cryptocraze

# Проверить подключение к серверу
echo -e "${YELLOW}🔗 Проверка подключения к серверу...${NC}"
if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'Подключение успешно'" 2>/dev/null; then
    echo -e "${GREEN}✅ Подключение к серверу успешно${NC}"
    
    # Загрузить архив
    echo -e "${YELLOW}📤 Загрузка архива на сервер...${NC}"
    scp -o StrictHostKeyChecking=no ../cryptocraze-deploy.tar.gz $SERVER_USER@$SERVER_IP:~/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Архив загружен на сервер${NC}"
        
        # Распаковать и настроить на сервере
        echo -e "${YELLOW}📦 Распаковка и настройка на сервере...${NC}"
        ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
            echo '🗂 Распаковка архива...'
            tar -xzf cryptocraze-deploy.tar.gz
            cd cryptocraze
            
            echo '🔧 Настройка прав доступа...'
            chmod +x deploy-yandex-cloud.sh
            chmod +x stop-deployment.sh
            
            echo '📋 Проверка файлов...'
            ls -la deploy-yandex-cloud.sh start-server.cjs .env.production
            
            echo '✅ Проект готов к деплою!'
            echo ''
            echo '🚀 Для запуска выполните:'
            echo '  cd cryptocraze'
            echo '  ./deploy-yandex-cloud.sh'
        "
        
        echo -e "${GREEN}🎉 Проект успешно загружен и настроен!${NC}"
        echo -e "${YELLOW}📋 Следующие шаги:${NC}"
        echo -e "  1. Подключитесь к серверу: ${GREEN}ssh $SERVER_USER@$SERVER_IP${NC}"
        echo -e "  2. Перейдите в директорию: ${GREEN}cd cryptocraze${NC}"
        echo -e "  3. Запустите деплой: ${GREEN}./deploy-yandex-cloud.sh${NC}"
        
    else
        echo -e "${RED}❌ Ошибка загрузки на сервер${NC}"
        exit 1
    fi
    
else
    echo -e "${RED}❌ Не удается подключиться к серверу${NC}"
    echo -e "${YELLOW}💡 Возможные решения:${NC}"
    echo -e "  1. Настройте SSH ключи"
    echo -e "  2. Проверьте IP адрес сервера: $SERVER_IP"
    echo -e "  3. Используйте Yandex Cloud Console для подключения"
    echo -e "  4. Загрузите архив вручную: ../cryptocraze-deploy.tar.gz"
fi

# Очистка
echo -e "${YELLOW}🧹 Очистка временных файлов...${NC}"
rm -f ../cryptocraze-deploy.tar.gz
echo -e "${GREEN}✅ Готово!${NC}"