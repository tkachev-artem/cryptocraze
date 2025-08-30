# CryptoCraze Environment Configuration Guide

This guide explains how to properly set up environment variables for the CryptoCraze fullstack TypeScript application.

## 🎯 Overview

The CryptoCraze application now uses a proper environment configuration system that:
- Separates development and production configurations
- Provides clear environment variable management
- Ensures Google OAuth works correctly in both environments
- Follows fullstack TypeScript best practices
- Makes it easy to switch between environments

## 📁 Environment Files Structure

```
/
├── .env                    # Current working environment (git-ignored)
├── .env.development        # Development-specific variables
├── .env.production        # Production-specific variables (uses env substitution)
├── .env.example           # Template with documentation
└── .env.production.example # Production template
```

## 🚀 Quick Start

### For Development

1. **Copy the development template:**
   ```bash
   cp .env.example .env.development
   ```

2. **Update development-specific values in `.env.development`:**
   - Set up local PostgreSQL database URL
   - Configure Google OAuth for localhost
   - Adjust feature flags for development

3. **Start the development environment:**
   ```bash
   npm run start:dev
   ```

### For Production

1. **Copy the production template:**
   ```bash
   cp .env.production.example .env.production
   ```

2. **Set production environment variables:**
   ```bash
   export TUNNEL_URL=https://your-domain.com
   export DATABASE_URL=postgresql://user:pass@host:port/db
   export SESSION_SECRET=your-secure-32-char-secret
   export GOOGLE_CLIENT_ID=your-production-client-id
   export GOOGLE_CLIENT_SECRET=your-production-client-secret
   ```

3. **Build and start production:**
   ```bash
   npm run build:all
   npm run start
   ```

## 🔧 Environment Loading Logic

The application uses a hierarchical environment loading system:

1. **Base `.env` file** is loaded first
2. **Environment-specific file** is loaded based on `NODE_ENV`:
   - `NODE_ENV=development` → loads `.env.development`
   - `NODE_ENV=production` → loads `.env.production`
3. Environment-specific values **override** base values

## 📋 Environment Variables Reference

### Core Application Settings
- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3001)
- `FRONTEND_PORT`: Frontend port (default: 5173)
- `PROXY_PORT`: Proxy port (default: 8080)

### URL Configuration
- `API_URL`: Backend API base URL
- `FRONTEND_URL`: Frontend application URL
- `CORS_ORIGIN`: CORS origin for API requests
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `TUNNEL_URL`: Production tunnel/domain URL

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `PGSSLMODE`: SSL mode for PostgreSQL (require/disable)
- `NODE_TLS_REJECT_UNAUTHORIZED`: TLS certificate validation (0/1)

### Redis Configuration
- `REDIS_URL`: Redis connection string

### Session & Security
- `SESSION_SECRET`: Secure session secret (min 32 characters)
- `SESSION_COOKIE_NAME`: Session cookie name
- `SESSION_COOKIE_SECURE`: Secure cookie flag (true/false)
- `SESSION_COOKIE_SAMESITE`: SameSite cookie attribute

### Google OAuth
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: OAuth callback URL

### External APIs (Optional)
- `BINANCE_API_KEY`: Binance API key for trading data
- `BINANCE_SECRET_KEY`: Binance API secret
- `COINGECKO_API_KEY`: CoinGecko API key for crypto data

### Feature Flags
- `ENABLE_REDIS_SCALING`: Enable Redis adapter for scaling
- `ENABLE_CLUSTER_MODE`: Enable Node.js cluster mode
- `ENABLE_RATE_LIMITING`: Enable API rate limiting
- `ENABLE_SWAGGER`: Enable Swagger API documentation
- `SKIP_MIGRATIONS`: Skip database migrations on startup
- `STATIC_ONLY`: Static-only mode (disable background workers)

### Logging
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `ENABLE_REQUEST_LOGGING`: Enable HTTP request logging

### Frontend Configuration (VITE_*)
All `VITE_*` variables are accessible in the frontend:

- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version
- `VITE_APP_ENV`: Application environment
- `VITE_API_BASE_URL`: API base URL for frontend
- `VITE_SOCKET_PATH`: Socket.IO path
- `VITE_SOCKET_TRANSPORTS`: Socket.IO transports
- `VITE_ENABLE_*`: Feature flags for frontend
- `VITE_*_INTERVAL`: Performance timing settings
- `VITE_*_CACHE_*`: Cache duration settings

## 🔐 Google OAuth Setup

### Development Setup

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create or select a project**
3. **Enable Google+ API**
4. **Create OAuth 2.0 credentials:**
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. **Update `.env.development`:**
   ```
   GOOGLE_CLIENT_ID=your-dev-client-id
   GOOGLE_CLIENT_SECRET=your-dev-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
   ```

### Production Setup

1. **Create separate OAuth credentials for production**
2. **Configure for your production domain:**
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`
3. **Set production environment variables:**
   ```bash
   export GOOGLE_CLIENT_ID=your-prod-client-id
   export GOOGLE_CLIENT_SECRET=your-prod-client-secret
   ```

## 🎨 Development vs Production Differences

| Setting | Development | Production |
|---------|-------------|------------|
| `NODE_ENV` | development | production |
| URLs | localhost | your-domain.com |
| Database | Local PostgreSQL | Production database |
| Session Cookie Secure | false | true |
| Rate Limiting | false | true |
| Swagger | true | false |
| Logging Level | debug | info |
| Request Logging | true | false |
| HTTPS Upgrade | false | true |
| CSP | false | true |
| Cache Duration | Short (1 day) | Long (7 days) |

## 🛠️ NPM Scripts

The following scripts are configured to use proper environment variables:

### Development
```bash
npm run dev          # Start frontend (development mode)
npm run dev:server   # Start backend (development mode)
npm run start:dev    # Start both frontend and backend with Redis
```

### Production
```bash
npm run build        # Build frontend (production mode)
npm run build:server # Build backend (production mode)
npm run build:all    # Build both frontend and backend
npm run start        # Start production server
npm run start:cluster # Start production server in cluster mode
```

## 🔍 Troubleshooting

### Common Issues

1. **Google OAuth "redirect_uri_mismatch" error:**
   - Check that `GOOGLE_CALLBACK_URL` matches your OAuth configuration
   - Ensure the callback URL includes `/api/auth/google/callback`

2. **CORS errors:**
   - Verify `CORS_ORIGIN` and `ALLOWED_ORIGINS` include your frontend URL
   - Check that frontend and backend URLs are correctly configured

3. **Environment variables not loading:**
   - Ensure `NODE_ENV` is set correctly
   - Check that environment-specific files exist and have correct values
   - Restart the server after changing environment files

4. **Database connection errors:**
   - Verify `DATABASE_URL` is correct for your environment
   - Check SSL settings (`PGSSLMODE`, `NODE_TLS_REJECT_UNAUTHORIZED`)

### Debug Environment Loading

You can debug environment loading by adding logs in `server/index.ts`:

```typescript
console.log('Environment variables loaded:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('API_URL:', process.env.API_URL);
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
```

## 🔒 Security Best Practices

1. **Never commit actual `.env` files** - they're git-ignored for security
2. **Use environment variable substitution** in production:
   ```bash
   DATABASE_URL=${DATABASE_URL:-fallback-value}
   ```
3. **Generate strong session secrets** (min 32 characters)
4. **Use separate OAuth credentials** for dev and production
5. **Enable security features** in production:
   - `SESSION_COOKIE_SECURE=true`
   - `ENABLE_RATE_LIMITING=true`
   - `VITE_ENABLE_CSP=true`
   - `VITE_ENABLE_HSTS=true`

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

🎉 **Your CryptoCraze application now has a robust, secure, and maintainable environment configuration system!**