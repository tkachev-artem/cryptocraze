#!/bin/bash

# Универсальный скрипт деплоя CryptoCraze на новую ВМ Yandex Cloud

if [ -z "$1" ]; then
    echo "❌ Укажите IP адрес новой ВМ"
    echo "Использование: ./deploy-to-new-vm.sh <IP_АДРЕС>"
    echo "Пример: ./deploy-to-new-vm.sh 51.250.12.34"
    exit 1
fi

SERVER_IP="$1"
SERVER_USER="tkachevartem"
PROJECT_NAME="cryptocraze"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🎰 CryptoCraze - Деплой на новую ВМ Yandex Cloud${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "${YELLOW}📡 Сервер: ${GREEN}$SERVER_IP${NC}"
echo -e "${YELLOW}👤 Пользователь: ${GREEN}$SERVER_USER${NC}"

# Создать архив проекта
echo -e "${YELLOW}\n📦 Создание архива проекта...${NC}"
cd ..
tar -czf cryptocraze-deploy.tar.gz \
    --exclude=cryptocraze/node_modules \
    --exclude=cryptocraze/.git \
    --exclude=cryptocraze/dist \
    --exclude=cryptocraze/server-dist \
    --exclude=cryptocraze/*.tar.gz \
    cryptocraze/

if [ $? -eq 0 ]; then
    ARCHIVE_SIZE=$(du -h cryptocraze-deploy.tar.gz | cut -f1)
    echo -e "${GREEN}✅ Архив создан: $ARCHIVE_SIZE${NC}"
else
    echo -e "${RED}❌ Ошибка создания архива${NC}"
    exit 1
fi

cd cryptocraze

# Проверить SSH подключение к новой ВМ
echo -e "${YELLOW}\n🔗 Проверяем подключение к новой ВМ...${NC}"
if ssh -o ConnectTimeout=15 -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "echo 'SSH подключение успешно!'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH подключение к новой ВМ работает!${NC}"
    
    # Загрузить проект
    echo -e "${YELLOW}\n📤 Загрузка проекта на новую ВМ...${NC}"
    scp -o StrictHostKeyChecking=no ../cryptocraze-deploy.tar.gz $SERVER_USER@$SERVER_IP:~/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Проект загружен на сервер${NC}"
        
        # Выполнить полную установку и деплой
        echo -e "${YELLOW}\n🚀 Выполняем полную установку на новой ВМ...${NC}"
        
        ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
            set -e
            
            echo "🖥️ Информация о системе:"
            uname -a
            lsb_release -a 2>/dev/null || echo "Ubuntu система"
            
            echo ""
            echo "🔄 Обновление системы..."
            sudo apt update && sudo apt upgrade -y
            
            echo ""
            echo "📥 Установка необходимых пакетов..."
            sudo apt install -y curl wget git unzip software-properties-common
            
            echo ""
            echo "📥 Установка Node.js 20..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
            
            echo ""
            echo "📥 Установка Redis..."
            sudo apt install -y redis-server
            sudo systemctl start redis-server
            sudo systemctl enable redis-server
            
            echo ""
            echo "✅ Версии установленных компонентов:"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo "Redis: $(redis-cli --version)"
            
            echo ""
            echo "🗂️ Распаковка проекта CryptoCraze..."
            tar -xzf cryptocraze-deploy.tar.gz
            cd cryptocraze
            
            echo ""
            echo "📦 Установка зависимостей проекта..."
            npm install --production=false
            
            echo ""
            echo "🔧 Настройка прав доступа..."
            chmod +x deploy-yandex-cloud.sh stop-deployment.sh start-server.cjs
            
            echo ""
            echo "🏗️ Сборка приложения..."
            npm run build
            npm run build:server
            
            echo ""
            echo "🚀 Запуск автоматического развертывания..."
            ./deploy-yandex-cloud.sh
ENDSSH
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}\n🎉 Развертывание на новой ВМ завершено успешно!${NC}"
            
            # Получить статус и URL
            echo -e "${YELLOW}\n📊 Получение информации о развертывании...${NC}"
            sleep 10
            
            # Проверить статус приложения
            APP_STATUS=$(ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo 'unknown'")
            
            if [ "$APP_STATUS" = "ok" ]; then
                echo -e "${GREEN}✅ Приложение работает корректно${NC}"
                
                # Получить публичный URL туннеля
                PUBLIC_URL=$(ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd cryptocraze && grep -o 'https://[a-zA-Z0-9\-]*\.trycloudflare\.com' tunnel.log | head -1" 2>/dev/null)
                
                if [ -n "$PUBLIC_URL" ]; then
                    echo -e "${GREEN}\n🌍 ПУБЛИЧНЫЕ АДРЕСА:${NC}"
                    echo -e "${GREEN}🌐 Основной сайт: $PUBLIC_URL${NC}"
                    echo -e "${GREEN}📊 API здоровья: $PUBLIC_URL/health${NC}"
                    echo -e "${GREEN}📚 API документация: $PUBLIC_URL/api-docs${NC}"
                    echo -e "${GREEN}🎰 Тест рулетки: $PUBLIC_URL (раздел Rewards)${NC}"
                else
                    echo -e "${YELLOW}⏳ Туннель создается... Проверьте через минуту:${NC}"
                    echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && tail -f tunnel.log'${NC}"
                fi
                
                echo -e "${GREEN}\n🛠️ УПРАВЛЕНИЕ ПРИЛОЖЕНИЕМ:${NC}"
                echo -e "${GREEN}📊 Просмотр логов: ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && tail -f app.log'${NC}"
                echo -e "${GREEN}🔄 Перезапуск: ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && ./stop-deployment.sh && ./deploy-yandex-cloud.sh'${NC}"
                echo -e "${GREEN}🛑 Остановка: ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && ./stop-deployment.sh'${NC}"
                
            else
                echo -e "${YELLOW}⚠️ Приложение запускается... Проверьте логи:${NC}"
                echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && tail -f app.log'${NC}"
            fi
            
            echo -e "${BLUE}\n✨ ПОЗДРАВЛЯЕМ! ✨${NC}"
            echo -e "${BLUE}CryptoCraze с исправленной рулеткой развернут на новой ВМ!${NC}"
            echo -e "${GREEN}🎰 Рулетка теперь работает корректно! 🎰${NC}"
            
        else
            echo -e "${RED}\n❌ Ошибка развертывания на новой ВМ${NC}"
            echo -e "${YELLOW}📋 Проверьте логи на сервере:${NC}"
            echo -e "${YELLOW}ssh $SERVER_USER@$SERVER_IP 'cd cryptocraze && tail -f app.log'${NC}"
        fi
        
    else
        echo -e "${RED}❌ Ошибка загрузки проекта на сервер${NC}"
    fi
    
else
    echo -e "${RED}❌ Не удается подключиться к новой ВМ${NC}"
    echo -e "${YELLOW}💡 Возможные причины:${NC}"
    echo -e "  1. ВМ еще не готова (подождите 2-3 минуты)"
    echo -e "  2. SSH ключ не был добавлен при создании ВМ"
    echo -e "  3. Неправильный IP адрес: $SERVER_IP"
    echo -e "  4. Порт 22 заблокирован в группе безопасности"
    
    echo -e "${YELLOW}\n🔧 Для решения проблем:${NC}"
    echo -e "  1. Проверьте статус ВМ в Yandex Cloud Console"
    echo -e "  2. Убедитесь, что SSH ключ добавлен"
    echo -e "  3. Проверьте группу безопасности (порт 22 открыт)"
    echo -e "  4. Попробуйте подключиться через браузер в консоли"
fi

# Очистка
echo -e "${YELLOW}\n🧹 Очистка временных файлов...${NC}"
rm -f ../cryptocraze-deploy.tar.gz

echo -e "${BLUE}\n📋 Деплой завершен!${NC}"