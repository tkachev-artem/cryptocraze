#!/usr/bin/env node

// Simple test script to verify notification system functionality
// Run with: node test-notification-system.js

const API_BASE_URL = 'http://localhost:3005/api';

console.log('🧪 Testing Notification System...\n');

// Test helper functions
const testFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
};

// Test functions
async function testGetNotifications() {
  console.log('📋 Testing: Get notifications...');
  try {
    const notifications = await testFetch(`${API_BASE_URL}/notifications`);
    console.log(`✅ Success: Retrieved ${notifications.length || 0} notifications`);
    
    if (notifications.length > 0) {
      console.log(`   Latest notification: "${notifications[0].title}"`);
    }
    
    return notifications;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return [];
  }
}

async function testCreateTradeNotification() {
  console.log('\n💰 Testing: Create trade opened notification...');
  try {
    const notification = await testFetch(`${API_BASE_URL}/notifications/create`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'trade_opened',
        title: 'Test Trade Opened',
        message: 'Test notification for opened trade'
      })
    });
    
    console.log(`✅ Success: Created notification with ID ${notification.id}`);
    return notification;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function testCreateDailyTaskNotification() {
  console.log('\n📝 Testing: Create daily task notification...');
  try {
    const notification = await testFetch(`${API_BASE_URL}/notifications/create`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'daily_reward',
        title: 'New Daily Task Available!',
        message: 'A new daily task "Test Task" is now available'
      })
    });
    
    console.log(`✅ Success: Created notification with ID ${notification.id}`);
    return notification;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return null;
  }
}

async function testAutoCleanup() {
  console.log('\n🧹 Testing: Auto-cleanup functionality...');
  try {
    // Create multiple notifications to trigger cleanup
    const notifications = [];
    for (let i = 0; i < 12; i++) {
      const notification = await testFetch(`${API_BASE_URL}/notifications/create`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'system_alert',
          title: `Test Notification ${i + 1}`,
          message: `This is test notification number ${i + 1}`
        })
      });
      notifications.push(notification);
    }
    
    console.log(`✅ Created ${notifications.length} test notifications`);
    
    // Check if cleanup occurred
    const finalNotifications = await testGetNotifications();
    console.log(`📊 Auto-cleanup result: ${finalNotifications.length} notifications remaining`);
    
    if (finalNotifications.length <= 9) {
      console.log('✅ Auto-cleanup working correctly!');
    } else {
      console.log('⚠️  Auto-cleanup may not be working as expected');
    }
    
    return finalNotifications;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return [];
  }
}

// Run all tests
async function runTests() {
  try {
    console.log('🚀 Starting notification system tests...\n');
    
    // Test basic functionality
    await testGetNotifications();
    await testCreateTradeNotification();
    await testCreateDailyTaskNotification();
    
    // Test auto-cleanup
    await testAutoCleanup();
    
    console.log('\n🎉 All tests completed!');
    console.log('\nℹ️  Note: These tests require:');
    console.log('   - Server running on localhost:3005');
    console.log('   - Valid authentication session');
    console.log('   - Database connection');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  }
}

// Check if we're running in Node.js
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ or fetch polyfill');
  console.log('📝 Install with: npm install -g node-fetch');
  console.log('🔄 Or upgrade to Node.js 18+');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);