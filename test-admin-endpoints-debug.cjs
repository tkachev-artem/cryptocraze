#!/usr/bin/env node

/**
 * Test script to debug admin analytics API endpoints
 */

const http = require('http');
const https = require('https');

// Test URLs
const endpoints = [
  'http://localhost:3001/api/admin/analytics/overview',
  'http://localhost:3001/api/admin/analytics/engagement?days=30',
  'http://localhost:3001/api/admin/analytics/revenue?days=30',
  'http://localhost:5173/api/admin/analytics/overview',
  'http://localhost:5173/api/admin/analytics/engagement?days=30',
  'http://localhost:5173/api/admin/analytics/revenue?days=30',
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.get(url, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 200) // First 200 chars only
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        error: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        error: 'Request timeout after 5s'
      });
    });
  });
}

async function main() {
  console.log('🧪 Testing Admin Analytics API endpoints...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    } else {
      console.log(`✅ Status: ${result.status}`);
      if (result.data) {
        console.log(`📄 Response: ${result.data.replace(/\n/g, ' ')}`);
      }
    }
    console.log('---');
  }
  
  console.log('✅ Test completed!');
}

main().catch(console.error);