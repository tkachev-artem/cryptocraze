#!/bin/bash

# Первичная настройка сервера для деплоя
echo "🛠️ Initial server setup for CryptoCraze deployment"

set -e

# Обновление системы
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
echo "Installing required packages..."
sudo apt install -y \
    nginx \
    redis-server \
    curl \
    wget \
    git \
    htop \
    ufw \
    jq \
    build-essential

# Установка Node.js (последняя LTS версия)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 глобально
echo "Installing PM2..."
sudo npm install -g pm2

# Установка Cloudflare Tunnel
echo "Installing Cloudflare Tunnel..."
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb

# Настройка файрвола
echo "Configuring UFW firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Настройка директории проекта
echo "Setting up project directory..."
PROJECT_DIR="/home/tkachevartem/cryptocraze"
mkdir -p "$PROJECT_DIR"
mkdir -p "$PROJECT_DIR/logs"

# Клонирование репозитория (если не существует)
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo "Project directory is empty. You need to:"
    echo "1. Clone your repository: git clone <your-repo-url> $PROJECT_DIR"
    echo "2. Or upload your project files to $PROJECT_DIR"
fi

# Настройка прав доступа
echo "Setting up permissions..."
sudo chown -R $USER:$USER "$PROJECT_DIR"

# Создание пользователя для веб-сервера (если не существует)
if ! id "www-data" &>/dev/null; then
    sudo useradd -r -s /bin/false www-data
fi

# Настройка Redis
echo "Configuring Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Настройка Nginx
echo "Configuring Nginx..."
sudo systemctl enable nginx
sudo rm -f /etc/nginx/sites-enabled/default

# Создание службы мониторинга
echo "Setting up monitoring service..."
sudo tee /etc/systemd/system/cryptocraze-monitor.service > /dev/null << 'EOF'
[Unit]
Description=CryptoCraze Monitoring Service
After=network.target

[Service]
Type=oneshot
User=tkachevartem
ExecStart=/home/tkachevartem/cryptocraze/monitoring.sh
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF

# Создание таймера для периодического мониторинга
sudo tee /etc/systemd/system/cryptocraze-monitor.timer > /dev/null << 'EOF'
[Unit]
Description=CryptoCraze Monitoring Timer
Requires=cryptocraze-monitor.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Включение мониторинга
sudo systemctl daemon-reload
sudo systemctl enable cryptocraze-monitor.timer
sudo systemctl start cryptocraze-monitor.timer

# Настройка логротации
echo "Setting up log rotation..."
sudo tee /etc/logrotate.d/cryptocraze > /dev/null << 'EOF'
/home/tkachevartem/cryptocraze/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        /bin/kill -HUP `cat /var/run/nginx.pid 2> /dev/null` 2> /dev/null || true
    endscript
}

/var/log/nginx/cryptocraze_*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        /bin/kill -USR1 `cat /var/run/nginx.pid 2> /dev/null` 2> /dev/null || true
    endscript
}
EOF

echo "✅ Server setup completed!"
echo ""
echo "Next steps:"
echo "1. Upload your project to: $PROJECT_DIR"
echo "2. Set up Cloudflare Tunnel:"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create cryptocraze-tunnel"
echo "   cp cloudflare-tunnel-config.yml ~/.cloudflared/config.yml"
echo "3. Configure your domain in Cloudflare Dashboard"
echo "4. Run: ./deploy-production.sh"
echo ""
echo "Useful commands:"
echo "- Check services: ./monitoring.sh"
echo "- Quick deploy: ./quick-deploy.sh"
echo "- Fix CSS issues: ./fix-css-issues.sh"
echo "- View logs: journalctl -fu cryptocraze-backend"