import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './db';
import { initializeWorkerSystem, shutdownWorkerSystem } from './services/workers/index.js';
import NgrokService from './services/ngrokService.js';

// Load environment variables with environment-specific file support
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load base .env file first
dotenv.config();

// Then load environment-specific .env file if it exists
if (NODE_ENV === 'development') {
  dotenv.config({ path: '.env.development', override: true });
} else if (NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production', override: true });
}

console.log(`🚀 Starting CryptoCraze server in ${NODE_ENV} mode`);
console.log(`📡 Server will run on port ${process.env.PORT || 1111}`);

const app = express();
const PORT = process.env.PORT || 1111;

// Compression middleware for better performance (exclude static assets)
app.use(compression({
  level: 6, // Balance between compression ratio and speed
  threshold: 1024, // Only compress files larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Don't compress static assets that might have issues with Cloudflare tunnel
    if (req.path.match(/\.(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/)) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security middleware (relaxed for Docker)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid connection issues in Docker
  crossOriginEmbedderPolicy: false
}));

// КРИТИЧНЫЙ middleware для торговых операций
app.use((req, res, next) => {
  // Торговые эндпоинты не кешируются НИКОГДА
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    // КРИТИЧНО: отключаем все виды кеширования для торговли
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Vary', '*');
  }
  
  // ТОРГОВЫЕ ЗАГОЛОВКИ ДЛЯ СТАБИЛЬНОСТИ
  if (req.path.startsWith('/api/deals') || req.path.startsWith('/api/trade')) {
    res.setHeader('X-Trading-Request', 'true');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  }
  
  next();
});

// CORS configuration  
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:1111',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000'
];

if (process.env.TUNNEL_URL) {
  allowedOrigins.push(process.env.TUNNEL_URL);
}

// In Docker, also allow container internal communication
if (NODE_ENV === 'production') {
  allowedOrigins.push('http://app:1111');
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

async function bootstrap() {
  try {
    console.log('🚀 Bootstrap started - initializing server components...');
    
    // Start the HTTP server FIRST to bind to port, then initialize other services
    const server = await registerRoutes(app);
    
    // Start listening immediately for health checks
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
      if (process.env.TUNNEL_URL) {
        console.log(`🌐 Tunnel URL: ${process.env.TUNNEL_URL}`);
      }
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log('✅ Server ready to accept connections');
    });

    // Initialize background services after server is listening
    console.log('🔄 Initializing background services...');

    // Initialize Ngrok tunnel if enabled
    try {
      const publicUrl = await NgrokService.start();
      if (publicUrl) {
        console.log(`🌍 Ngrok tunnel active: ${publicUrl}`);
        console.log(`🔐 OAuth callback URL: ${NgrokService.getOAuthCallbackUrl()}`);
      }
    } catch (error) {
      console.warn('⚠️ Ngrok initialization failed:', error instanceof Error ? error.message : error);
    }
    
    // Optionally skip DB migrations to allow static serving without DB
    const shouldSkipMigrations = (process.env.SKIP_MIGRATIONS || '').toLowerCase() === 'true';
    if (!shouldSkipMigrations) {
      console.log('🔄 Running database migrations...');
      await migrate(db, { migrationsFolder: 'drizzle' });
      console.log('✅ Database migrations completed');
    }

    // Optionally disable background workers for static-only mode or when worker system is disabled
    const staticOnly = (process.env.STATIC_ONLY || '').toLowerCase() === 'true';
    const disableWorkers = (process.env.DISABLE_WORKERS || '').toLowerCase() === 'true';
    if (!staticOnly && !disableWorkers) {
      console.log('🔄 Starting background services...');
      await import('./services/dealsAutoCloser');
      
      // Initialize the TP/SL worker system
      console.log('🔧 Initializing TP/SL worker system...');
      try {
        await initializeWorkerSystem();
        console.log('✅ TP/SL worker system initialized');
      } catch (error) {
        console.error('❌ Failed to initialize TP/SL worker system:', error);
        console.log('⚠️  Server will continue without worker system');
      }
    }

    console.log('🎉 All services initialized successfully');

    // Setup Ngrok graceful shutdown
    NgrokService.setupGracefulShutdown();

    // Graceful shutdown handlers (worker system has its own handlers)
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n📡 ${signal} received. Starting graceful shutdown...`);
      
      try {
        // Close HTTP server
        server.close(() => {
          console.log('✅ HTTP server closed');
        });
        
        // Worker system will handle its own shutdown via its own handlers
        
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
