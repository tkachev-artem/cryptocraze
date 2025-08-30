#!/usr/bin/env node

import http from 'http';
import https from 'https';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TUNNEL_URL = process.env.TUNNEL_URL;

console.log('🧪 CryptoCraze API Endpoint Tests');
console.log('================================');
console.log(`Base URL: ${BASE_URL}`);
if (TUNNEL_URL) console.log(`Tunnel URL: ${TUNNEL_URL}`);
console.log('');

// Test endpoints
const endpoints = [
  { path: '/api/trading/pairs', method: 'GET', description: 'Trading Pairs' },
  { path: '/api/binance/symbols', method: 'GET', description: 'Binance Symbols' },
  { path: '/api/rating', method: 'GET', description: 'User Rating' },
  { path: '/api-docs', method: 'GET', description: 'API Documentation' },
  { path: '/health', method: 'GET', description: 'Health Check' }
];

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = {
      method,
      timeout: 10000,
      headers: {
        'User-Agent': 'CryptoCraze-API-Test',
        'Accept': 'application/json'
      }
    };

    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Test function
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  
  try {
    console.log(`🔍 Testing: ${endpoint.description} (${endpoint.method} ${endpoint.path})`);
    const response = await makeRequest(url, endpoint.method);
    
    let status = '❌ FAIL';
    let details = '';
    
    if (response.status >= 200 && response.status < 300) {
      status = '✅ PASS';
      details = `Status: ${response.status}`;
    } else if (response.status === 401) {
      status = '🔒 AUTH';
      details = 'Authentication required (expected)';
    } else if (response.status === 404) {
      status = '❓ NOT FOUND';
      details = 'Endpoint not found';
    } else {
      status = '⚠️  WARN';
      details = `Status: ${response.status}`;
    }
    
    // Try to parse JSON response
    let jsonData = null;
    try {
      jsonData = JSON.parse(response.body);
      if (jsonData && typeof jsonData === 'object') {
        details += ', JSON: ✓';
        if (Array.isArray(jsonData)) {
          details += ` (${jsonData.length} items)`;
        } else if (jsonData.error) {
          details += ` (Error: ${jsonData.error})`;
        }
      }
    } catch (e) {
      if (response.body.includes('<!DOCTYPE html>')) {
        details += ', HTML: ✓';
      } else {
        details += ', Invalid JSON';
      }
    }
    
    console.log(`   ${status} ${details}`);
    return { endpoint: endpoint.path, success: response.status < 400 };
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { endpoint: endpoint.path, success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log(''); // Add spacing
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('📊 Test Summary');
  console.log('===============');
  console.log(`Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
  console.log('');
  
  if (passed === total) {
    console.log('🎉 All tests passed! API is ready for production.');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.');
    console.log('');
    console.log('💡 Common solutions:');
    console.log('   - Ensure server is running: npm run dev:server');
    console.log('   - Check database connection');
    console.log('   - Verify Redis is running: npm run redis:up');
    console.log('   - Review server logs for errors');
  }
  
  // If tunnel URL is provided, test it too
  if (TUNNEL_URL && TUNNEL_URL !== BASE_URL) {
    console.log('');
    console.log('🌐 Testing Tunnel URL...');
    
    try {
      const tunnelTest = await makeRequest(`${TUNNEL_URL}/api/rating`);
      if (tunnelTest.status < 400) {
        console.log('✅ Tunnel is working correctly');
      } else {
        console.log(`⚠️  Tunnel returned status: ${tunnelTest.status}`);
      }
    } catch (error) {
      console.log(`❌ Tunnel test failed: ${error.message}`);
    }
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node test-api-endpoints.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  API_URL        Base API URL (default: http://localhost:3001)');
  console.log('  TUNNEL_URL     Tunnel URL for production testing');
  console.log('');
  console.log('Examples:');
  console.log('  node test-api-endpoints.js');
  console.log('  API_URL=http://localhost:3001 node test-api-endpoints.js');
  console.log('  TUNNEL_URL=https://abc123.ngrok.io node test-api-endpoints.js');
  process.exit(0);
}

// Run the tests
runTests().catch(console.error);