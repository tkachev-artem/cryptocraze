// Простой тест админских эндпоинтов
const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function main() {
  console.log('🧪 Testing admin analytics endpoints...\n');
  
  const endpoints = [
    '/api/admin/analytics/overview',
    '/api/admin/analytics/engagement?days=30', 
    '/api/admin/analytics/revenue?days=30'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const result = await testEndpoint(endpoint);
      console.log(`  Status: ${result.status}`);
      if (result.status === 200) {
        console.log(`  ✅ Success`);
        if (result.data && typeof result.data === 'object') {
          console.log(`  Data keys: ${Object.keys(result.data).join(', ')}`);
        }
      } else {
        console.log(`  ❌ Failed: ${result.data?.message || JSON.stringify(result.data)}`);
      }
      console.log('');
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
}

main();