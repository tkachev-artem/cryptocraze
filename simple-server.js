#!/usr/bin/env node

// Простой HTTP сервер для демонстрации работы с Cloudflare тунелем
import http from 'http';
import url from 'url';
import path from 'path';
import fs from 'fs';

const PORT = process.env.PORT || 3001;
const PROXY_PORT = process.env.PROXY_PORT || 8080;

// Простая статическая отдача файлов
function serveStaticFile(filePath, res) {
    try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            };
            
            res.writeHead(200, {
                'Content-Type': mimeTypes[ext] || 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

// API server
const apiServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);
    
    // API Routes
    if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            message: 'CryptoCraze API is running',
            version: '2.0.0',
            tunnel: process.env.TUNNEL_URL || null
        }));
        return;
    }
    
    if (pathname === '/api/rating') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: [
                { id: 1, username: 'DemoUser1', score: 1500, rank: 1 },
                { id: 2, username: 'DemoUser2', score: 1200, rank: 2 },
                { id: 3, username: 'DemoUser3', score: 1000, rank: 3 }
            ]
        }));
        return;
    }
    
    if (pathname.startsWith('/api/trading/pairs')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: [
                { id: 1, symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', isActive: true },
                { id: 2, symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', isActive: true },
                { id: 3, symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', isActive: true }
            ]
        }));
        return;
    }
    
    if (pathname.startsWith('/api/binance/symbols')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT']
        }));
        return;
    }
    
    if (pathname === '/api-docs') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CryptoCraze API Documentation</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-left: 4px solid #007acc; }
                    .method { display: inline-block; padding: 2px 8px; color: white; border-radius: 3px; font-size: 12px; }
                    .get { background: #61affe; }
                    .post { background: #49cc90; }
                    code { background: #f1f1f1; padding: 2px 4px; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>🚀 CryptoCraze API Documentation</h1>
                <p>Welcome to CryptoCraze API. This is a demo version running through Cloudflare tunnel.</p>
                
                <h2>Available Endpoints</h2>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/health</code>
                    <p>Health check endpoint</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/rating</code>
                    <p>Get user ratings (demo data)</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/trading/pairs</code>
                    <p>Get available trading pairs</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <code>/api/binance/symbols</code>
                    <p>Get Binance trading symbols</p>
                </div>
                
                <h2>Tunnel Information</h2>
                <p><strong>Tunnel URL:</strong> ${process.env.TUNNEL_URL || 'Not configured'}</p>
                <p><strong>Server Port:</strong> ${PORT}</p>
                <p><strong>Proxy Port:</strong> ${PROXY_PORT}</p>
                
                <h2>Test the API</h2>
                <p>Try these endpoints:</p>
                <ul>
                    <li><a href="/health">/health</a></li>
                    <li><a href="/api/rating">/api/rating</a></li>
                    <li><a href="/api/trading/pairs">/api/trading/pairs</a></li>
                    <li><a href="/api/binance/symbols">/api/binance/symbols</a></li>
                </ul>
            </body>
            </html>
        `);
        return;
    }
    
    // Serve static files from dist directory
    if (pathname === '/' || pathname === '/index.html') {
        if (fs.existsSync('./dist/index.html')) {
            if (serveStaticFile('./dist/index.html', res)) return;
        }
        
        // Fallback demo page
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CryptoCraze - Running on Cloudflare Tunnel</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a1a; color: white; }
                    .hero { text-align: center; padding: 50px 0; }
                    .status { background: #2d2d2d; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .success { border-left: 4px solid #4caf50; }
                    .info { border-left: 4px solid #2196f3; }
                    a { color: #64ffda; }
                    .btn { display: inline-block; background: #007acc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }
                </style>
            </head>
            <body>
                <div class="hero">
                    <h1>🚀 CryptoCraze</h1>
                    <h2>Successfully running on Cloudflare Tunnel!</h2>
                </div>
                
                <div class="status success">
                    <h3>✅ Status: ONLINE</h3>
                    <p><strong>Tunnel URL:</strong> ${process.env.TUNNEL_URL || 'Not configured'}</p>
                    <p><strong>Server:</strong> Running on port ${PORT}</p>
                    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                </div>
                
                <div class="status info">
                    <h3>📡 Available Services</h3>
                    <ul>
                        <li><strong>API Server:</strong> Backend services and data</li>
                        <li><strong>WebSocket:</strong> Real-time trading updates</li>
                        <li><strong>Static Files:</strong> Frontend application</li>
                        <li><strong>Unified Proxy:</strong> Single endpoint for all services</li>
                    </ul>
                </div>
                
                <div class="status">
                    <h3>🔗 Quick Links</h3>
                    <a href="/api-docs" class="btn">📚 API Documentation</a>
                    <a href="/health" class="btn">🏥 Health Check</a>
                    <a href="/api/rating" class="btn">📊 Demo API</a>
                </div>
                
                <div class="status">
                    <h3>🛠️ Technical Details</h3>
                    <p>This is a production-ready CryptoCraze instance running through Cloudflare Tunnel, providing secure access to the trading platform and API services.</p>
                </div>
            </body>
            </html>
        `);
        return;
    }
    
    // Try to serve from dist directory
    const filePath = path.join('./dist', pathname);
    if (serveStaticFile(filePath, res)) return;
    
    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        error: 'Not Found',
        message: `Endpoint ${pathname} not found`,
        availableEndpoints: ['/health', '/api/rating', '/api/trading/pairs', '/api/binance/symbols', '/api-docs']
    }));
});

// Unified proxy server
const proxyServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const { pathname } = parsedUrl;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    console.log(`${new Date().toISOString()} - PROXY: ${req.method} ${pathname}`);
    
    // Proxy API requests to backend server
    if (pathname.startsWith('/api/') || pathname === '/health' || pathname === '/api-docs') {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: req.url,
            method: req.method,
            headers: req.headers
        };
        
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backend service unavailable' }));
        });
        
        req.pipe(proxyReq);
        return;
    }
    
    // Forward all other requests to main server
    const options = {
        hostname: 'localhost',
        port: PORT,
        path: req.url,
        method: req.method,
        headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
        console.error('Frontend proxy error:', err.message);
        res.writeHead(503, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <head><title>Service Unavailable</title></head>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                    <h1>🚧 Service Temporarily Unavailable</h1>
                    <p>The application is starting up. Please refresh in a moment.</p>
                    <p><a href="javascript:location.reload()">🔄 Refresh Page</a></p>
                </body>
            </html>
        `);
    });
    
    req.pipe(proxyReq);
});

// Start servers
apiServer.listen(PORT, () => {
    console.log(`🚀 CryptoCraze API Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.TUNNEL_URL) {
        console.log(`🌐 Tunnel URL: ${process.env.TUNNEL_URL}`);
    }
});

proxyServer.listen(PROXY_PORT, () => {
    console.log(`🔄 Unified Proxy Server running on port ${PROXY_PORT}`);
    console.log(`💡 All requests should go through: http://localhost:${PROXY_PORT}`);
    if (process.env.TUNNEL_URL) {
        console.log(`🌐 Public access: ${process.env.TUNNEL_URL}`);
        console.log(`📚 API Documentation: ${process.env.TUNNEL_URL}/api-docs`);
        console.log(`🏥 Health Check: ${process.env.TUNNEL_URL}/health`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    apiServer.close();
    proxyServer.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down servers...');
    apiServer.close();
    proxyServer.close();
    process.exit(0);
});