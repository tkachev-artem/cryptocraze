# CryptoCraze Backend - Production Ready

## Overview

CryptoCraze is a full-stack cryptocurrency trading platform with real-time features, gamification, and unified tunnel support for production deployment.

## Architecture

### Backend Components
- **Express.js Server** - Main API server with TypeScript
- **Socket.IO** - Real-time communication for live trading
- **Redis** - Caching and session storage
- **PostgreSQL** - Primary database with Drizzle ORM
- **WebSocket** - Live price feeds and chart updates

### Frontend Integration
- **React 19** - Modern frontend framework
- **Redux Toolkit** - State management
- **Vite** - Build tool and development server
- **Unified Proxy** - Production tunnel routing

## API Endpoints

### Authentication
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/user` - Get current user
- `PUT /api/auth/user/update` - Update user profile
- `POST /api/auth/logout` - Logout user

### Trading
- `GET /api/trading/pairs` - Get available trading pairs
- `GET /api/trading/price/:symbol` - Get current price
- `POST /api/trading/open` - Open new trade
- `GET /api/trading/trades` - Get user trade history
- `GET /api/trading/stats` - Get trading statistics

### Binance Integration
- `GET /api/binance/price/:symbol` - Binance price data
- `GET /api/binance/candlestick/:symbol` - Candlestick data
- `GET /api/binance/stats/:symbol` - Trading statistics
- `GET /api/binance/symbols` - Available symbols

### Gamification & Tasks
- `GET /api/gamification/progress` - User progress
- `POST /api/gamification/daily-reward` - Claim daily reward
- `GET /api/tasks/active` - Active tasks
- `POST /api/tasks/:id/progress` - Update task progress
- `GET /api/energy/progress` - Energy system status

### Premium Features
- `GET /api/premium/plans` - Available plans
- `POST /api/premium/subscribe` - Subscribe to plan
- `GET /api/premium/status` - Subscription status

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification

### Admin (Requires Admin Role)
- `GET /api/admin/users` - List users
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/notifications/broadcast` - Broadcast notification

## Real-time Features

### Socket.IO Events

#### Client → Server
- `join_room` - Join trading room
- `leave_room` - Leave trading room
- `subscribe_prices` - Subscribe to price updates
- `unsubscribe_prices` - Unsubscribe from prices

#### Server → Client
- `price_update` - Live price updates
- `trade_update` - Trade status changes
- `notification` - New notifications
- `user_update` - User data changes

## Database Schema

### Core Tables
- `users` - User profiles and authentication
- `deals` - Trading positions and history
- `notifications` - User notifications
- `tasks` - Gamification tasks
- `task_templates` - Task blueprints
- `premium_subscriptions` - Premium memberships
- `reward_tiers` - Reward system

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- Docker (optional)

### Quick Start

1. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Update .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npm run db:migrate
   npm run db:init
   ```

4. **Start Redis**
   ```bash
   npm run redis:up
   ```

5. **Development Mode**
   ```bash
   npm run fullstack
   # Starts both frontend (5173) and backend (3001)
   ```

## Production Deployment

### Method 1: Automated Script
```bash
./deploy-production.sh https://your-tunnel-url.com
```

### Method 2: Manual Steps

1. **Build Project**
   ```bash
   npm run build:server
   npm run build
   ```

2. **Setup Environment**
   ```bash
   export NODE_ENV=production
   export TUNNEL_URL=https://your-tunnel-url.com
   ```

3. **Start Services**
   ```bash
   npm run start        # Backend server
   npm run proxy        # Unified proxy
   ```

4. **Health Check**
   ```bash
   ./health-check.sh
   ```

## Production Scripts

### `start-fullstack.sh`
Starts development environment with hot reload

### `deploy-production.sh`
Complete production deployment automation

### `unified-proxy.js`
Routes API and frontend requests through single tunnel

### `update-tunnel-url.sh`
Updates tunnel configuration dynamically

## Configuration Files

### Package Scripts
- `dev:server` - Start backend development server
- `build:server` - Build TypeScript server
- `fullstack` - Start full development stack
- `proxy` - Start unified proxy
- `redis:up/down` - Manage Redis container

### Environment Variables
```bash
# Core
NODE_ENV=production
PORT=3001
TUNNEL_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
SESSION_SECRET=your_secret

# External APIs
BINANCE_API_KEY=your_key
BINANCE_SECRET_KEY=your_secret
COINGECKO_API_KEY=your_key
```

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Rate Limiting** - API rate limiting
- **Session Management** - Secure sessions
- **Input Validation** - Request validation
- **SQL Injection Protection** - Parameterized queries

## Monitoring & Logging

- **Swagger UI** - API documentation at `/api-docs`
- **Health Checks** - System health monitoring
- **Error Handling** - Centralized error management
- **Request Logging** - Configurable logging

## Troubleshooting

### Common Issues

1. **npm install fails**
   ```bash
   npm install --legacy-peer-deps --force
   ```

2. **Redis connection errors**
   ```bash
   npm run redis:up
   docker ps | grep redis
   ```

3. **Database migration fails**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **CORS errors in production**
   - Update `ALLOWED_ORIGINS` in .env
   - Verify tunnel URL configuration

### Performance Optimization

- **Redis Scaling** - Enabled by default
- **Connection Pooling** - PostgreSQL connections
- **Caching** - API response caching
- **Compression** - Response compression
- **Static Asset Serving** - Optimized delivery

## API Documentation

Full API documentation is available at `/api-docs` when the server is running.

## Support

For issues and questions:
- Check logs in `/Users/artemtkacev/Desktop/cryptocraze/logs`
- Review health check results
- Verify environment configuration
- Check database connectivity

## Version History

- **v2.0** - Production-ready release with tunnel support
- **v1.0** - Initial development version