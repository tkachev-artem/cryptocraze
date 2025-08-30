#!/bin/bash

# CryptoCraze Quick Start Script
# Автоматически настраивает и запускает проект для продакшена

echo "🚀 CryptoCraze - Быстрый запуск"
echo "================================"

# Проверка аргументов
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Использование: $0 [TUNNEL_URL] [режим]"
    echo ""
    echo "Параметры:"
    echo "  TUNNEL_URL   - URL тунеля для продакшена (ngrok, cloudflare, etc.)"
    echo "  режим        - dev (разработка) | prod (продакшен)"
    echo ""
    echo "Примеры:"
    echo "  $0                                    # Режим разработки"
    echo "  $0 dev                               # Режим разработки"
    echo "  $0 https://abc123.ngrok.io           # Продакшен с тунелем"
    echo "  $0 https://abc123.ngrok.io prod      # То же самое"
    echo ""
    exit 0
fi

TUNNEL_URL=$1
MODE=${2:-"auto"}

# Определение режима
if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" = "dev" ]; then
    MODE="dev"
    TUNNEL_URL=""
elif [[ $TUNNEL_URL =~ ^https?:// ]]; then
    MODE="prod"
else
    echo "❌ Ошибка: Неверный формат URL"
    echo "Используйте: $0 https://your-tunnel-url.com"
    exit 1
fi

echo "🔧 Конфигурация:"
echo "   Режим: $MODE"
if [ "$MODE" = "prod" ]; then
    echo "   Тунель: $TUNNEL_URL"
fi
echo ""

# Функция проверки зависимостей
check_dependencies() {
    echo "🔍 Проверка зависимостей..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js не найден. Установите Node.js 18+"
        exit 1
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        echo "❌ npm не найден"
        exit 1
    fi
    
    echo "✅ Зависимости найдены"
}

# Функция установки пакетов
install_packages() {
    echo "📦 Установка пакетов..."
    
    if [ ! -d "node_modules" ]; then
        echo "   Устанавливаем зависимости..."
        npm install --legacy-peer-deps || {
            echo "⚠️  Проблемы с установкой, пробуем альтернативный способ..."
            npm install --force || {
                echo "⚠️  Установка не удалась. Продолжаем без полной установки..."
                return 1
            }
        }
    else
        echo "✅ Пакеты уже установлены"
    fi
    
    return 0
}

# Функция настройки окружения
setup_environment() {
    echo "⚙️  Настройка окружения..."
    
    if [ "$MODE" = "dev" ]; then
        # Режим разработки
        cat > .env << 'EOF'
NODE_ENV=development
PORT=3001
FRONTEND_PORT=5173
PROXY_PORT=8080

# Development URLs
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080,http://localhost:3000

# Database (обновите с реальными данными)
DATABASE_URL=postgresql://user:password@localhost:5432/cryptocraze
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=dev-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173

# Features для разработки
ENABLE_SWAGGER=true
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=debug
EOF
        echo "✅ Конфигурация для разработки создана"
        
    else
        # Режим продакшена
        cat > .env << EOF
NODE_ENV=production
PORT=3001
PROXY_PORT=8080

# Production URLs
TUNNEL_URL=$TUNNEL_URL
API_URL=$TUNNEL_URL/api
FRONTEND_URL=$TUNNEL_URL
ALLOWED_ORIGINS=$TUNNEL_URL,http://localhost:5173

# Database (обновите с реальными данными)
DATABASE_URL=\${DATABASE_URL:-postgresql://user:password@localhost:5432/cryptocraze}
NEON_DATABASE_URL=\${NEON_DATABASE_URL:-}
REDIS_URL=\${REDIS_URL:-redis://localhost:6379}

# Security
SESSION_SECRET=\${SESSION_SECRET:-$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret")}
CORS_ORIGIN=$TUNNEL_URL

# Authentication (обновите с реальными данными)
GOOGLE_CLIENT_ID=\${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=\${GOOGLE_CLIENT_SECRET:-}
GOOGLE_CALLBACK_URL=$TUNNEL_URL/auth/google/callback

# External APIs (обновите с реальными ключами)
BINANCE_API_KEY=\${BINANCE_API_KEY:-}
BINANCE_SECRET_KEY=\${BINANCE_SECRET_KEY:-}
COINGECKO_API_KEY=\${COINGECKO_API_KEY:-}

# Production Features
ENABLE_SWAGGER=true
ENABLE_REQUEST_LOGGING=false
LOG_LEVEL=info
ENABLE_REDIS_SCALING=true
ENABLE_RATE_LIMITING=true
EOF
        echo "✅ Конфигурация для продакшена создана"
    fi
}

# Функция запуска Redis
start_redis() {
    echo "🔴 Запуск Redis..."
    
    if command -v docker &> /dev/null; then
        if [ -f "docker-compose.redis.yml" ]; then
            docker-compose -f docker-compose.redis.yml up -d || {
                echo "⚠️  Не удалось запустить Redis через Docker"
                return 1
            }
            echo "✅ Redis запущен"
        else
            echo "⚠️  docker-compose.redis.yml не найден"
            return 1
        fi
    else
        echo "⚠️  Docker не найден. Redis должен быть запущен вручную"
        return 1
    fi
}

# Функция сборки проекта
build_project() {
    if [ "$MODE" = "prod" ]; then
        echo "🔨 Сборка проекта..."
        
        # Сборка сервера
        echo "   Сборка сервера..."
        npm run build:server 2>/dev/null || {
            echo "   Компилируем сервер напрямую..."
            npx tsc -p tsconfig.server.json 2>/dev/null || echo "⚠️  Сборка сервера не удалась"
        }
        
        # Сборка фронтенда
        echo "   Сборка фронтенда..."
        npm run build 2>/dev/null || echo "⚠️  Сборка фронтенда не удалась"
        
        echo "✅ Сборка завершена"
    fi
}

# Функция запуска сервисов
start_services() {
    echo "🚀 Запуск сервисов..."
    
    if [ "$MODE" = "dev" ]; then
        echo "📝 Режим разработки:"
        echo "   🖥️  Backend: http://localhost:3001"
        echo "   🎨 Frontend: http://localhost:5173" 
        echo "   📚 API Docs: http://localhost:3001/api-docs"
        echo ""
        echo "Press Ctrl+C чтобы остановить все сервисы"
        echo ""
        
        # Запуск fullstack режима
        npm run fullstack
        
    else
        echo "🌐 Продакшен режим:"
        echo "   🌍 Приложение: $TUNNEL_URL"
        echo "   📡 API: $TUNNEL_URL/api" 
        echo "   📚 Документация: $TUNNEL_URL/api-docs"
        echo ""
        echo "Press Ctrl+C чтобы остановить все сервисы"
        echo ""
        
        # Запуск продакшен режима
        ./start-production.sh 2>/dev/null || {
            echo "🔄 Запуск напрямую..."
            
            # Запуск бекенда
            NODE_ENV=production npm run start &
            SERVER_PID=$!
            
            sleep 5
            
            # Запуск прокси
            NODE_ENV=production npm run proxy &
            PROXY_PID=$!
            
            cleanup() {
                echo ""
                echo "🛑 Остановка сервисов..."
                kill $SERVER_PID 2>/dev/null || true
                kill $PROXY_PID 2>/dev/null || true
                echo "✅ Сервисы остановлены"
                exit 0
            }
            
            trap cleanup SIGINT SIGTERM
            wait
        }
    fi
}

# Основная функция
main() {
    echo "Начинаем настройку CryptoCraze..."
    echo ""
    
    # Проверка зависимостей
    check_dependencies
    
    # Установка пакетов
    install_packages
    
    # Настройка окружения
    setup_environment
    
    # Запуск Redis
    start_redis
    
    # Сборка (только для продакшена)
    build_project
    
    echo ""
    echo "✅ Настройка завершена!"
    echo ""
    
    # Запуск сервисов
    start_services
}

# Запуск основной функции
main