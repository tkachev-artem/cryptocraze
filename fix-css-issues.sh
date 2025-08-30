#!/bin/bash

# Скрипт для исправления проблем с CSS
echo "🎨 Fixing CSS loading issues..."

PROJECT_DIR="/home/tkachevartem/cryptocraze"
cd "$PROJECT_DIR" || exit 1

# 1. Проверка MIME типов в Nginx
echo "Checking Nginx MIME types..."
sudo cp /etc/nginx/mime.types /etc/nginx/mime.types.backup 2>/dev/null || true

# Добавляем специфичные MIME типы для CSS
sudo tee -a /etc/nginx/mime.types > /dev/null << 'EOF'

# Additional MIME types for CSS files
text/css                    css;
application/javascript      js mjs;
EOF

# 2. Создание дополнительной конфигурации для статических файлов
cat > nginx-static-fix.conf << 'STATIC_EOF'
# Дополнительная конфигурация для исправления проблем со статикой

# Точное соответствие для CSS файлов
location ~* \.css$ {
    add_header Content-Type "text/css; charset=utf-8";
    add_header Cache-Control "public, max-age=31536000";
    add_header Access-Control-Allow-Origin "*";
    
    # Проверяем файлы с хешем
    try_files $uri $uri/ =404;
    
    expires 1y;
    gzip_static on;
    access_log off;
}

# Точное соответствие для JS файлов
location ~* \.js$ {
    add_header Content-Type "application/javascript; charset=utf-8";
    add_header Cache-Control "public, max-age=31536000";
    add_header Access-Control-Allow-Origin "*";
    
    try_files $uri $uri/ =404;
    
    expires 1y;
    gzip_static on;
    access_log off;
}

# Обработка файлов в директории assets
location /assets/ {
    add_header Cache-Control "public, max-age=31536000";
    add_header Access-Control-Allow-Origin "*";
    
    # Специальная обработка для CSS в assets
    location ~* /assets/.*\.css$ {
        add_header Content-Type "text/css; charset=utf-8";
    }
    
    # Специальная обработка для JS в assets  
    location ~* /assets/.*\.js$ {
        add_header Content-Type "application/javascript; charset=utf-8";
    }
    
    try_files $uri $uri/ =404;
    expires 1y;
}

# Fallback для любых статических файлов
location ~* \.(ico|jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|otf)$ {
    add_header Cache-Control "public, max-age=31536000";
    add_header Access-Control-Allow-Origin "*";
    expires 1y;
    access_log off;
}
STATIC_EOF

# 3. Обновляем основную конфигурацию Nginx с исправлениями
cat > nginx-site-fixed.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name localhost;
    root /home/tkachevartem/cryptocraze/dist;
    index index.html;

    # Включаем gzip для лучшего сжатия
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_proxied any;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/xml+rss
        application/atom+xml
        image/svg+xml
        font/truetype
        font/opentype
        application/vnd.ms-fontobject;

    # Отключаем логирование для статических файлов
    location ~* \.(css|js|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        access_log off;
        log_not_found off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # MIME типы принудительно
    location ~* \.css$ {
        add_header Content-Type "text/css; charset=utf-8" always;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Access-Control-Allow-Origin "*" always;
        
        expires 1y;
        try_files $uri $uri/ =404;
    }

    location ~* \.js$ {
        add_header Content-Type "application/javascript; charset=utf-8" always;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Access-Control-Allow-Origin "*" always;
        
        expires 1y;
        try_files $uri $uri/ =404;
    }

    # Обработка директории assets с приоритетом
    location /assets/ {
        # Принудительно устанавливаем MIME типы
        location ~* \.css$ {
            add_header Content-Type "text/css; charset=utf-8" always;
            add_header Cache-Control "public, max-age=31536000, immutable" always;
            try_files $uri =404;
        }
        
        location ~* \.js$ {
            add_header Content-Type "application/javascript; charset=utf-8" always;
            add_header Cache-Control "public, max-age=31536000, immutable" always;
            try_files $uri =404;
        }
        
        # Остальные файлы в assets
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    # API проксирование
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket для Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA routing с проверкой существования файлов
    location / {
        # Сначала пытаемся найти файл
        try_files $uri $uri/ @spa_fallback;
        
        # Если это HTML файл, устанавливаем правильные заголовки
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate" always;
            add_header Pragma "no-cache" always;
            add_header Expires "0" always;
        }
    }

    # Fallback для SPA
    location @spa_fallback {
        try_files /index.html =404;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Логирование для отладки CSS проблем
    access_log /var/log/nginx/cryptocraze_access.log combined;
    error_log /var/log/nginx/cryptocraze_error.log warn;
}
NGINX_EOF

# 4. Применяем исправления
echo "Applying Nginx fixes..."
sudo cp nginx-site-fixed.conf /etc/nginx/sites-available/cryptocraze

# 5. Тестируем конфигурацию
echo "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    echo "Reloading Nginx..."
    sudo nginx -s reload
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# 6. Проверяем права доступа к файлам dist
echo "Checking file permissions..."
sudo chown -R www-data:www-data /home/tkachevartem/cryptocraze/dist/
sudo chmod -R 755 /home/tkachevartem/cryptocraze/dist/

# 7. Создаем тест для проверки CSS загрузки
echo "Creating CSS test script..."
cat > test-css-loading.sh << 'TEST_EOF'
#!/bin/bash

echo "🧪 Testing CSS loading..."

# Проверяем основные CSS файлы
css_files=$(find /home/tkachevartem/cryptocraze/dist/assets -name "*.css" -type f | head -5)

for css_file in $css_files; do
    filename=$(basename "$css_file")
    url_path="/assets/$filename"
    
    echo "Testing: $url_path"
    
    response=$(curl -s -I "http://localhost$url_path")
    content_type=$(echo "$response" | grep -i "content-type" | cut -d' ' -f2-)
    status=$(echo "$response" | head -1 | cut -d' ' -f2)
    
    echo "  Status: $status"
    echo "  Content-Type: $content_type"
    
    if [[ "$content_type" == *"text/css"* ]]; then
        echo "  ✅ CSS MIME type correct"
    else
        echo "  ❌ CSS MIME type incorrect: $content_type"
    fi
    echo ""
done

echo "Testing index.html CSS references..."
curl -s http://localhost/ | grep -o 'href="[^"]*\.css' | sed 's/href="//' | while read css_url; do
    echo "Found CSS: $css_url"
    curl -s -I "http://localhost$css_url" | head -3
    echo ""
done
TEST_EOF

chmod +x test-css-loading.sh

echo "🎉 CSS fixes applied!"
echo ""
echo "Next steps:"
echo "1. Run: ./test-css-loading.sh - to test CSS loading"
echo "2. Check browser dev tools for any remaining 404s"
echo "3. Clear browser cache completely"
echo "4. Monitor: tail -f /var/log/nginx/cryptocraze_error.log"