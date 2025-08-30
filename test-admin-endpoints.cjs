#!/usr/bin/env node

// Тест админских эндпоинтов аналитики
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const endpoints = [
  '/api/admin/analytics/overview',
  '/api/admin/analytics/engagement?days=30', 
  '/api/admin/analytics/revenue?days=30',
  '/api/admin/analytics/retention?days=30',
  '/api/admin/analytics/acquisition?days=30'
];

async function testEndpoint(endpoint) {
  try {
    console.log(`🔍 Testing ${endpoint}...`);
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`✅ ${endpoint} - Status: ${response.status}`);
    if (response.data) {
      console.log(`   Response keys: ${Object.keys(response.data).join(', ')}`);
    }
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`❌ ${endpoint} - Status: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`❌ ${endpoint} - Connection refused (server not running?)`);
    } else {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
    return false;
  }
}

async function testProcessDaily() {
  try {
    console.log(`🔍 Testing POST /api/admin/analytics/process-daily...`);
    const response = await axios.post(`${BASE_URL}/api/admin/analytics/process-daily`, {}, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`✅ POST /api/admin/analytics/process-daily - Status: ${response.status}`);
    if (response.data) {
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    }
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`❌ POST /api/admin/analytics/process-daily - Status: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    } else {
      console.log(`❌ POST /api/admin/analytics/process-daily - Error: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Testing CryptoCraze Admin Analytics Endpoints\n');
  
  // Проверяем доступность сервера
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not accessible. Please check:');
    console.log('   1. Server is running on http://localhost:3001');
    console.log('   2. Server has DISABLE_AUTH=true for testing');
    console.log('   3. BI analytics tables are created and populated\n');
    process.exit(1);
  }
  
  let successCount = 0;
  const totalTests = endpoints.length + 1; // +1 for process-daily
  
  // Тест GET эндпоинтов
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint);
    if (success) successCount++;
    console.log(); // пустая строка для разделения
  }
  
  // Тест POST эндпоинта
  const processSuccess = await testProcessDaily();
  if (processSuccess) successCount++;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${successCount}/${totalTests} endpoints passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 All admin analytics endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some endpoints failed. Check the logs above for details.');
    console.log('\n💡 Common issues:');
    console.log('   - Server needs DISABLE_AUTH=true for testing without OAuth');
    console.log('   - BI analytics tables might not be populated');
    console.log('   - Database connection issues');
    process.exit(1);
  }
}

main().catch(console.error);