# CryptoCraze Production Deployment Guide

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- All environment variables configured
- Database and Redis accessible

### 1. Configure Environment

Copy the example environment file:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` with your actual values:

```bash
# Required: Database
DATABASE_URL=postgresql://user:password@host:5432/cryptocraze

# Required: Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_secure_random_string_min_32_chars

# Required: Application URL
TUNNEL_URL=https://your-domain.com

# Optional: External APIs
BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret
```

### 2. Deploy

Run the deployment script:

```bash
./deploy-production.sh
```

The script will:
- ✅ Build the Docker image with wheel fix
- ✅ Start PostgreSQL and Redis containers
- ✅ Run database migrations
- ✅ Start the application
- ✅ Perform health checks

### 3. Verify Deployment

Your application will be available at:
- **Main app**: http://localhost:3001
- **API**: http://localhost:3001/api
- **Health check**: http://localhost:3001/health
- **API docs**: http://localhost:3001/api-docs

## 📋 Management Commands

### View logs
```bash
docker-compose -f docker-compose.production.yml logs -f
```

### Stop application
```bash
docker-compose -f docker-compose.production.yml down
```

### Restart application
```bash
docker-compose -f docker-compose.production.yml restart
```

### Update application
```bash
# Rebuild and redeploy
./deploy-production.sh
```


## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `SESSION_SECRET` | ✅ | Secure session secret (32+ chars) |
| `TUNNEL_URL` | ✅ | Public URL for the application |
| `REDIS_URL` | ⚠️ | Redis connection (uses container if not set) |
| `BINANCE_API_KEY` | ❌ | Binance API key (for real data) |
| `BINANCE_API_SECRET` | ❌ | Binance API secret |

## 🐛 Issues Fixed

This deployment includes the following fixes:
- ✅ **Wheel Animation**: Fixed roulette wheel not spinning
- ✅ **API Integration**: Fixed wheel/spin 500 errors
- ✅ **TypeScript Build**: Fixed compilation errors
- ✅ **Production Build**: Optimized Docker image
- ✅ **Environment Config**: Production-ready configuration

## 📞 Support

The application should work out of the box with proper configuration! 🎉
