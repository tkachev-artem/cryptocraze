"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = require("./routes");
const migrator_1 = require("drizzle-orm/node-postgres/migrator");
const db_1 = require("./db");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Compression middleware for better performance
app.use((0, compression_1.default)({
    level: 6, // Balance between compression ratio and speed
    threshold: 1024, // Only compress files larger than 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    }
}));
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
// Request parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
async function bootstrap() {
    try {
        // Optionally skip DB migrations to allow static serving without DB
        const shouldSkipMigrations = (process.env.SKIP_MIGRATIONS || '').toLowerCase() === 'true';
        if (!shouldSkipMigrations) {
            await (0, migrator_1.migrate)(db_1.db, { migrationsFolder: 'drizzle' });
        }
        // Optionally disable background workers for static-only mode
        const staticOnly = (process.env.STATIC_ONLY || '').toLowerCase() === 'true';
        if (!staticOnly) {
            await Promise.resolve().then(() => __importStar(require('./services/dealsAutoCloser')));
        }
        const server = await (0, routes_1.registerRoutes)(app);
        // Serve static files AFTER routes are registered
        const publicDir = path_1.default.resolve(process.cwd(), NODE_ENV === 'production' ? 'dist' : 'public');
        app.use(express_1.default.static(publicDir, {
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
                // Enable compression for text files
                if (filePath.match(/\.(js|css|html|json|svg)$/)) {
                    res.setHeader('Content-Encoding', 'gzip');
                }
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
            res.sendFile(path_1.default.join(publicDir, 'index.html'), (err) => {
                if (err)
                    next();
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
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}
bootstrap();
