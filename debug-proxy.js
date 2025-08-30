import http from 'http';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});
const server = http.createServer();

server.on('request', (req, res) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  console.log(`🔗 Headers:`, JSON.stringify(req.headers, null, 2));
  
  proxy.web(req, res, {
    target: 'http://localhost:3001',
    changeOrigin: true
  }, (err) => {
    console.error('❌ Proxy error:', err.message);
    res.writeHead(502, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({error: 'Proxy error', details: err.message}));
  });
});

server.listen(8080, () => {
  console.log('🚀 Debug proxy running on port 8080');
});