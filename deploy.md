# CryptoCraze Deploy

## Быстрый запуск

```bash
./deploy/deploy-docker.sh
```

## Что запустится

- **PostgreSQL** (порт 5433) - основная база данных
- **ClickHouse** (порт 8123) - аналитика 
- **Redis** (порт 6379) - кэширование
- **Nginx** (порт 1111) - веб-сервер
- **App** - основное приложение

## После запуска

Откройте: **http://localhost:1111**

## Остановка

```bash
docker-compose down
```

## Логи

```bash
docker-compose logs -f [service_name]
```