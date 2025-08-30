import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';

const app = express();
const PORT = process.env.PROXY_PORT || 8080;

const API_TARGET = 'http://localhost:3001';
const FRONTEND_TARGET = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log(`🔄 Unified Proxy Server starting...`);
console.log(`📡 API Target: ${API_TARGET}`);
console.log(`🎨 Frontend Target: ${FRONTEND_TARGET}`);

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📥 REQUEST: ${req.method} ${req.url}`);
  next();
});

// API proxy - handle all /api requests
app.use('/api', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('🚨 API Proxy Error:', err.message);
    res.status(500).json({ error: 'Backend service unavailable' });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 API: ${req.method} ${req.originalUrl} -> ${API_TARGET}${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ API Response: ${proxyRes.statusCode} for ${req.originalUrl}`);
  }
}));

// Socket.IO proxy for real-time features
app.use('/socket.io', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  ws: true,
  onError: (err, req, res) => {
    console.error('Socket.IO Proxy Error:', err.message);
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔌 Socket.IO: ${req.method} ${req.originalUrl} -> ${API_TARGET}${req.url}`);
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: API_TARGET,
      frontend: FRONTEND_TARGET
    }
  });
});

// API-docs proxy
app.use('/api-docs', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📚 API-DOCS: ${req.method} ${req.originalUrl} -> ${API_TARGET}${req.url}`);
  }
}));

// Frontend proxy - handle all other requests to the API server (single-origin deployment)
app.use('/', createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  ws: true,
  // Skip API and Socket.IO requests - they should be handled by specific middlewares above
  filter: (pathname, req) => {
    console.log(`🔍 Filter check: ${pathname} -> ${!pathname.startsWith('/api') && !pathname.startsWith('/socket.io')}`);
    return !pathname.startsWith('/api') && !pathname.startsWith('/socket.io');
  },
  onError: (err, req, res) => {
    console.error('Frontend Proxy Error:', err.message);
    res.status(503).send(`
      <html>
        <head><title>Service Unavailable</title></head>
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>🚧 Service Unavailable</h1>
          <p>The backend server is not responding.</p>
          <p>Please check the server status.</p>
        </body>
      </html>
    `);
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🎨 Static/Frontend: ${req.method} ${req.originalUrl} -> ${API_TARGET}${req.url}`);
  }
}));

app.listen(PORT, () => {
  console.log(`✅ Unified Proxy Server running on port ${PORT}`);
  console.log(`🌐 Access your app at: http://localhost:${PORT}`);
  console.log(`💡 API requests: http://localhost:${PORT}/api/*`);
  console.log(`🔌 Socket.IO: http://localhost:${PORT}/socket.io/*`);
  console.log(`🎨 Frontend: http://localhost:${PORT}/*`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down proxy server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down proxy server...');
  process.exit(0);
});