# Deploy CryptoCraze на сервере

## Быстрый старт

```bash
# Клонировать репозиторий
git clone <repo-url>
cd cryptocraze

# Запустить развертывание
./deploy/deploy-docker.sh
```

## Требования

- Docker
- Docker Compose
- 2GB+ RAM
- Открытые порты: 1111, 5433, 6379, 8123

## Что запустится

- **App**: http://localhost:1111
- **PostgreSQL**: порт 5433
- **Redis**: порт 6379  
- **ClickHouse**: порт 8123

## Управление

```bash
# Остановить
docker-compose down

# Перезапустить
docker-compose restart

# Логи
docker-compose logs -f [service]
```

## Автономность

Скрипт полностью автоматический - создает все БД, таблицы, данные без вмешательства.