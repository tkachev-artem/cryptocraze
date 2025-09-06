# 🚀 CryptoCraze Unified Deployment Guide

## 📋 Quick Start

### Option 1: Full Docker Stack (Recommended)
```bash
# All services in Docker containers
./start-unified.sh
```

### Option 2: Local Development
```bash
# App only, external databases
npm run deploy:local
```

### Option 3: Manual Steps
```bash
npm run build:all
docker-compose up -d
# Wait for services...
npm run start
```

---

## 🌍 Local Development Access

### Application URLs:
- **Frontend:** http://localhost:1111
- **API:** http://localhost:1111/api
- **Admin Dashboard:** http://localhost:1111/admin/dashboard

### Google OAuth Setup for localhost:
```
Authorized JavaScript origins:
http://localhost:1111

Authorized redirect URIs:
http://localhost:1111/api/auth/google/callback
```

---

## 🔧 Services & Ports

| Service     | Port | URL                                    |
|-------------|------|----------------------------------------|
| **App**     | 1111 | http://localhost:1111                 |
| PostgreSQL  | 5433 | postgresql://postgres:password@localhost:5433/crypto_analyzer |
| Redis       | 6379 | redis://localhost:6379                |
| ClickHouse  | 8123 | http://localhost:8123                 |

---

## 📊 Key URLs

- **Frontend**: http://localhost:1111
- **API**: http://localhost:1111/api/*  
- **Admin Dashboard**: http://localhost:1111/admin/dashboard
- **Health Check**: http://localhost:1111/health
- **API Docs**: http://localhost:1111/api-docs

---

## 🐳 Docker Commands

### Start all services:
```bash
docker-compose up -d --build
```

### View logs:
```bash
docker-compose logs -f app
```

### Stop all services:
```bash
docker-compose down
```

### Reset data:
```bash
docker-compose down -v  # Removes volumes too
```

---

## 🔍 Troubleshooting

### Check service health:
```bash
docker-compose ps
```

### Database connection issues:
```bash
docker-compose logs postgres
# Wait for "database system is ready to accept connections"
```

### ClickHouse issues:
```bash
docker-compose logs clickhouse
# Check for "Ready for connections" message
```

### App not serving static files:
```bash
# Ensure build completed successfully
npm run build
ls -la dist/  # Should contain index.html and assets/
```

---

## 🎯 Production Checklist

- [ ] All services start successfully
- [ ] Frontend loads at http://localhost:1111
- [ ] API responds at http://localhost:1111/api/health
- [ ] Admin dashboard accessible
- [ ] Google OAuth configured for localhost
- [ ] Database migrations completed
- [ ] ClickHouse analytics working
- [ ] Redis caching functional

---

## 📱 Local Testing

1. Open http://localhost:1111 in browser
2. Test Google OAuth login (configured for localhost)
3. Verify all features work correctly
4. Test admin dashboard at http://localhost:1111/admin/dashboard

**Ready for production deployment! 🚀**