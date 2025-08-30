#!/bin/bash

set -e

echo "🚀 Starting production deployment..."

# Переменные
PROJECT_DIR="/home/tkachevartem/cryptocraze"
BACKUP_DIR="/home/tkachevartem/backup-$(date +%Y%m%d-%H%M%S)"
DOMAIN="your-domain.com"  # Замените на ваш домен

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Функция для проверки успешности команды
check_command() {
    if [ $? -eq 0 ]; then
        log "✅ $1"
    else
        log "❌ $1 failed"
        exit 1
    fi
}

# 1. Создание бэкапа текущей версии
log "Creating backup..."
if [ -d "$PROJECT_DIR" ]; then
    cp -r "$PROJECT_DIR" "$BACKUP_DIR"
    check_command "Backup created at $BACKUP_DIR"
fi

# 2. Переход в директорию проекта
cd "$PROJECT_DIR" || { log "❌ Project directory not found"; exit 1; }

# 3. Остановка текущих сервисов
log "Stopping current services..."
pm2 stop cryptocraze-backend 2>/dev/null || true
sudo systemctl stop nginx 2>/dev/null || true
sudo systemctl stop redis-server 2>/dev/null || true

# 4. Обновление кода из Git
log "Pulling latest code..."
git pull origin main
check_command "Git pull completed"

# 5. Установка/обновление зависимостей
log "Installing dependencies..."
npm ci --production
check_command "Dependencies installed"

# 6. Сборка приложения
log "Building application..."
npm run build
npm run build:server
check_command "Application built"

# 7. Создание необходимых директорий
log "Creating directories..."
mkdir -p logs
mkdir -p /var/log/nginx
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# 8. Настройка Nginx
log "Configuring Nginx..."
sudo cp nginx-site.conf /etc/nginx/sites-available/cryptocraze
sudo ln -sf /etc/nginx/sites-available/cryptocraze /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Тестирование конфигурации Nginx
sudo nginx -t
check_command "Nginx configuration is valid"

# 9. Настройка systemd сервисов
log "Setting up systemd services..."

# PM2 service
sudo tee /etc/systemd/system/cryptocraze-backend.service > /dev/null << SERVICE_EOF
[Unit]
Description=CryptoCraze Backend Service
After=network.target

[Service]
Type=forking
User=tkachevartem
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/pm2 start pm2.config.js --no-daemon
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Cloudflare Tunnel service
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << TUNNEL_EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=tkachevartem
ExecStart=/usr/local/bin/cloudflared tunnel run cryptocraze-tunnel
Restart=always
RestartSec=5
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5s

[Install]
WantedBy=multi-user.target
TUNNEL_EOF

# 10. Перезагрузка systemd и включение сервисов
log "Enabling systemd services..."
sudo systemctl daemon-reload
sudo systemctl enable cryptocraze-backend
sudo systemctl enable cloudflared
sudo systemctl enable nginx
sudo systemctl enable redis-server

# 11. Запуск сервисов
log "Starting services..."

# Запуск Redis
sudo systemctl start redis-server
sleep 2
check_command "Redis started"

# Запуск backend
sudo systemctl start cryptocraze-backend
sleep 5
check_command "Backend started"

# Запуск Nginx
sudo systemctl start nginx
check_command "Nginx started"

# Запуск Cloudflare Tunnel
sudo systemctl start cloudflared
sleep 3
check_command "Cloudflare Tunnel started"

# 12. Проверка статуса сервисов
log "Checking service status..."
echo "Backend status:"
pm2 status
echo "Nginx status:"
sudo systemctl status nginx --no-pager -l
echo "Cloudflare Tunnel status:"
sudo systemctl status cloudflared --no-pager -l

# 13. Проверка доступности API
log "Testing API endpoint..."
sleep 5
curl -f http://localhost:3001/api/health || log "⚠️ API health check failed"

# 14. Очистка старых логов и временных файлов
log "Cleaning up..."
find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
npm prune --production

log "🎉 Deployment completed successfully!"
log "🌐 Your application should be available at: https://$DOMAIN"
log "📊 Monitor services with: sudo systemctl status cryptocraze-backend nginx cloudflared"
log "📋 View logs with: pm2 logs cryptocraze-backend"
log "🔄 To rollback: sudo systemctl stop all services && cp -r $BACKUP_DIR/* $PROJECT_DIR/"

# 15. Финальная проверка
echo ""
echo "=== Final Health Check ==="
echo "Backend: $(curl -s http://localhost:3001/api/health 2>/dev/null || echo 'FAILED')"
echo "Frontend files: $(ls -la dist/index.html 2>/dev/null || echo 'NOT FOUND')"
echo "PM2 processes: $(pm2 jlist 2>/dev/null | jq length 2>/dev/null || echo 'CHECK MANUALLY')"
echo ""
