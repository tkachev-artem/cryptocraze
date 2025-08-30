# CryptoCraze Production Deployment Guide

## 🚀 Полная инструкция по настройке деплоя с Cloudflare Tunnel

### Архитектура решения
- **Frontend + Backend**: На одном сервере (84.201.169.106)
- **Reverse Proxy**: Nginx для статики и API
- **Process Manager**: PM2 для backend
- **Tunnel**: Один Cloudflare Tunnel для всего приложения
- **Автоматизация**: Скрипты для деплоя и мониторинга

---

## 📋 Подготовка сервера

### 1. Подключение к серверу
```bash
ssh -l tkachevartem 84.201.169.106
```

### 2. Первичная настройка сервера
```bash
# Загрузите файлы проекта на сервер
scp -r . tkachevartem@84.201.169.106:/home/tkachevartem/cryptocraze/

# Запустите настройку сервера
cd /home/tkachevartem/cryptocraze
chmod +x setup-server.sh
./setup-server.sh
```

---

## 🔧 Настройка Cloudflare Tunnel

### 1. Аутентификация в Cloudflare
```bash
cloudflared tunnel login
```

### 2. Создание туннеля
```bash
cloudflared tunnel create cryptocraze-tunnel
```

### 3. Настройка конфигурации
```bash
# Скопируйте файл конфигурации
cp cloudflare-tunnel-config.yml ~/.cloudflared/config.yml

# Обновите домен в файле конфигурации
nano ~/.cloudflared/config.yml
# Замените "your-domain.com" на ваш реальный домен
```

### 4. Настройка DNS в Cloudflare Dashboard
1. Войдите в Cloudflare Dashboard
2. Выберите ваш домен
3. Перейдите в раздел DNS
4. Добавьте CNAME запись:
   - **Name**: your-domain.com (или @)
   - **Target**: [tunnel-id].cfargotunnel.com
   - **Proxy status**: Proxied (оранжевое облако)

---

## 🛠️ Деплой приложения

### 1. Полный деплой (первый раз)
```bash
cd /home/tkachevartem/cryptocraze
chmod +x deploy-production.sh
./deploy-production.sh
```

### 2. Быстрый деплой (обновления)
```bash
./quick-deploy.sh
```

---

## 📊 Мониторинг и управление

### 1. Проверка статуса всех сервисов
```bash
./monitoring.sh
```

### 2. Управление отдельными сервисами
```bash
# Backend (PM2)
pm2 status
pm2 logs cryptocraze-backend
pm2 restart cryptocraze-backend

# Nginx
sudo systemctl status nginx
sudo nginx -t  # проверка конфигурации
sudo nginx -s reload  # перезагрузка конфигурации

# Redis
sudo systemctl status redis-server

# Cloudflare Tunnel
sudo systemctl status cloudflared
journalctl -fu cloudflared
```

### 3. Просмотр логов
```bash
# Backend логи
pm2 logs cryptocraze-backend

# Nginx логи
tail -f /var/log/nginx/cryptocraze_access.log
tail -f /var/log/nginx/cryptocraze_error.log

# System логи
journalctl -fu cryptocraze-backend
journalctl -fu cloudflared
```

---

## 🎨 Исправление проблем с CSS

### Проблема: CSS периодически не загружается

Причины и решения:

1. **Неправильные MIME типы**
   ```bash
   ./fix-css-issues.sh
   ```

2. **Кеширование браузера**
   - Очистите кеш браузера (Ctrl+Shift+R)
   - Проверьте заголовки кеширования в DevTools

3. **Проблемы с путями к файлам**
   ```bash
   # Проверьте существование CSS файлов
   ls -la /home/tkachevartem/cryptocraze/dist/assets/
   
   # Проверьте права доступа
   sudo chown -R www-data:www-data /home/tkachevartem/cryptocraze/dist/
   sudo chmod -R 755 /home/tkachevartem/cryptocraze/dist/
   ```

4. **Тестирование CSS загрузки**
   ```bash
   ./test-css-loading.sh
   ```

---

## 🔄 Процедуры автодеплоя

### Git Hooks (рекомендуемый способ)

1. **Создайте webhook в GitHub/GitLab**
   - URL: `https://your-domain.com/api/webhook`
   - Secret: установите в переменных окружения

2. **Добавьте endpoint в backend** (server/routes.ts):
   ```typescript
   app.post('/api/webhook', (req, res) => {
     const { exec } = require('child_process');
     
     // Проверка secret
     const signature = req.headers['x-hub-signature-256'];
     // ... проверка подписи
     
     // Запуск деплоя
     exec('/home/tkachevartem/cryptocraze/quick-deploy.sh', (error, stdout, stderr) => {
       if (error) {
         console.error('Deploy error:', error);
         return res.status(500).json({ error: 'Deploy failed' });
       }
       res.json({ success: true, output: stdout });
     });
   });
   ```

### Cron Jobs
```bash
# Добавьте в crontab для автоматических обновлений
crontab -e

# Деплой каждые 30 минут (если есть изменения)
*/30 * * * * cd /home/tkachevartem/cryptocraze && git fetch && [ $(git rev-list HEAD...origin/main --count) != 0 ] && ./quick-deploy.sh
```

---

## 🛡️ Безопасность и производительность

### 1. SSL/HTTPS
Cloudflare автоматически обеспечивает HTTPS. Настройки:
- SSL/TLS mode: **Full (strict)**
- Always Use HTTPS: **On**
- HTTP Strict Transport Security: **Enable**

### 2. Firewall (UFW)
```bash
sudo ufw status
# Должны быть открыты только: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

### 3. Backup стратегия
```bash
# Автоматический backup перед каждым деплоем
# См. deploy-production.sh - создается в /home/tkachevartem/backup-*

# Ручной backup
tar -czf backup-$(date +%Y%m%d).tar.gz /home/tkachevartem/cryptocraze
```

### 4. Мониторинг ресурсов
```bash
# Использование памяти и CPU
htop

# Дисковое пространство
df -h

# Сетевые соединения
netstat -tulpn | grep :3001
```

---

## 🔧 Troubleshooting

### Частые проблемы:

1. **Backend не стартует**
   ```bash
   pm2 logs cryptocraze-backend
   # Проверьте переменные окружения
   # Проверьте подключение к базе данных
   ```

2. **CSS/JS файлы не загружаются**
   ```bash
   ./fix-css-issues.sh
   sudo nginx -s reload
   ```

3. **Cloudflare Tunnel не работает**
   ```bash
   cloudflared tunnel run cryptocraze-tunnel
   # Проверьте конфигурацию DNS
   # Проверьте ~/.cloudflared/config.yml
   ```

4. **Redis недоступен**
   ```bash
   sudo systemctl start redis-server
   redis-cli ping  # должно вернуть PONG
   ```

5. **Nginx ошибки конфигурации**
   ```bash
   sudo nginx -t
   # Исправьте ошибки в /etc/nginx/sites-available/cryptocraze
   sudo nginx -s reload
   ```

---

## 📈 Масштабирование

### Для высоких нагрузок:

1. **Кластеризация backend**
   - Используйте `npm run start:cluster` вместо обычного запуска
   - Настройте Redis для session storage

2. **CDN для статики**
   - Настройте Cloudflare для кеширования статических файлов
   - Page Rules для агрессивного кеширования

3. **Database optimization**
   - Настройте connection pooling
   - Добавьте Redis для кеширования запросов

---

## 📞 Контакты и поддержка

Для получения помощи:
1. Проверьте логи: `./monitoring.sh`
2. Запустите диагностику: `./fix-css-issues.sh`
3. Создайте issue в репозитории проекта

**Важные команды для быстрого восстановления:**
```bash
# Полный перезапуск всех сервисов
sudo systemctl restart nginx redis-server cloudflared
pm2 restart cryptocraze-backend

# Rollback к предыдущей версии
# Найдите папку backup в /home/tkachevartem/backup-*
# sudo systemctl stop all && cp -r /home/tkachevartem/backup-* /home/tkachevartem/cryptocraze/
```