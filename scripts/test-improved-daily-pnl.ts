// Using built-in fetch (Node.js 18+)

async function testImprovedDailyPnL() {
  console.log('🧪 Testing Improved Daily P/L Endpoint');
  
  try {
    const apiUrl = 'http://localhost:5000/api/analytics/user/daily-pnl';
    console.log(`📡 Testing endpoint: ${apiUrl}`);
    
    // Test without authentication to see error handling
    console.log('\n1️⃣ Testing without authentication...');
    const unauthResponse = await fetch(apiUrl);
    console.log(`Status: ${unauthResponse.status}`);
    
    if (unauthResponse.status === 401) {
      console.log('✅ Authentication check working correctly');
    }
    
    // Note: For a full test with authentication, you would need:
    // 1. Valid session cookies
    // 2. Or implement a test authentication method
    // 3. Or test with a development user
    
    console.log('\n📝 Test completed. To test with real data:');
    console.log('1. Open the frontend application');
    console.log('2. Log in with a user account');
    console.log('3. Navigate to /analytics page');
    console.log('4. Check server logs for detailed Daily P/L debugging information');
    console.log('5. Look for logs starting with [Daily P/L] 🚀');
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error);
  }
}

testImprovedDailyPnL().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});