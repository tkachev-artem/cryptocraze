import express from 'express';
import httpProxy from 'http-proxy';

const app = express();
const proxy = httpProxy.createProxyServer();
const PORT = process.env.PROXY_PORT || 8080;
const API_TARGET = 'http://localhost:3001';

console.log(`🔄 Simple Proxy Server starting...`);
console.log(`📡 API Target: ${API_TARGET}`);

// Debug middleware
app.use((req, res, next) => {
  console.log(`📥 REQUEST: ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: API_TARGET
    }
  });
});

// Handle all requests
app.use('*', (req, res) => {
  console.log(`🔄 Proxying: ${req.method} ${req.originalUrl} -> ${API_TARGET}`);
  
  // Set proper headers for proxy
  req.headers['x-forwarded-proto'] = 'https';
  req.headers['x-forwarded-host'] = 'taste-adventures-locate-posted.trycloudflare.com';
  
  proxy.web(req, res, {
    target: API_TARGET,
    changeOrigin: true, // Enable change origin for better compatibility
    followRedirects: false,
    selfHandleResponse: false, // Let http-proxy handle responses
    xfwd: true, // Add X-Forwarded-* headers
    secure: false, // Allow insecure backends
    preserveHeaderKeyCase: true // Preserve header case
  }, (err) => {
    console.error('🚨 Proxy Error:', err.message);
    if (!res.headersSent) {
      res.status(503).json({ error: 'Backend service unavailable', details: err.message });
    }
  });
});

// Handle WebSocket upgrades
app.server = app.listen(PORT, () => {
  console.log(`✅ Simple Proxy Server running on port ${PORT}`);
  console.log(`🌐 Access your app at: http://localhost:${PORT}`);
});

app.server.on('upgrade', (req, socket, head) => {
  console.log(`🔌 WebSocket upgrade: ${req.url}`);
  proxy.ws(req, socket, head, {
    target: API_TARGET
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down proxy server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down proxy server...');
  process.exit(0);
});