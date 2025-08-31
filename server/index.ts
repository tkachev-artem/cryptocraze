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
console.log(`📡 Server will run on port ${process.env.PORT || 3001}`);

const app = express();
const PORT = process.env.PORT || 3001;

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000'
];

if (process.env.TUNNEL_URL) {
  allowedOrigins.push(process.env.TUNNEL_URL);
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
    // Optionally skip DB migrations to allow static serving without DB
    const shouldSkipMigrations = (process.env.SKIP_MIGRATIONS || '').toLowerCase() === 'true';
    if (!shouldSkipMigrations) {
      await migrate(db, { migrationsFolder: 'drizzle' });
    }

    // Optionally disable background workers for static-only mode
    const staticOnly = (process.env.STATIC_ONLY || '').toLowerCase() === 'true';
    if (!staticOnly) {
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

    const server = await registerRoutes(app);
    
    // Serve static files AFTER routes are registered
    const publicDir = path.resolve(process.cwd(), NODE_ENV === 'production' ? 'dist' : 'public');
    app.use(express.static(publicDir, { 
      index: false,
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // Aggressive caching for static assets
        if (filePath.match(/\.(svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
        }
        // Cache JS/CSS with shorter time for updates
        else if (filePath.match(/\.(js|css)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
        // JSON files (like manifests) - shorter cache
        else if (filePath.endsWith('.json')) {
          res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
        }
        // Let compression middleware handle encoding automatically
      }
    }));

    // Fallback to index.html for any non-API route without using path patterns (avoids path-to-regexp issues)
    app.use((req, res, next) => {
      // Skip API routes, health checks, docs, socket.io, and static file extensions
      if (req.path.startsWith('/api') || 
          req.path === '/health' || 
          req.path === '/api-docs' || 
          req.path.startsWith('/socket.io') ||
          req.path.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|json|woff|woff2|ttf|eot)$/)) {
        return next();
      }
      res.sendFile(path.join(publicDir, 'index.html'), (err) => {
        if (err) next();
      });
    });

    server.listen(Number(PORT), () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔒 CORS origins: ${allowedOrigins.join(', ')}`);
      if (process.env.TUNNEL_URL) {
        console.log(`🌐 Tunnel URL: ${process.env.TUNNEL_URL}`);
      }
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });

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
