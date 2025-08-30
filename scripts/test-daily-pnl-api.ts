import * as fs from 'fs';
import * as path from 'path';

async function testDailyPnLAPI() {
  console.log('🧪 Testing Daily P/L API Endpoint');
  
  try {
    // Read cookies from the cookies.txt file for authentication
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    let cookieHeader = '';
    
    if (fs.existsSync(cookiesPath)) {
      cookieHeader = fs.readFileSync(cookiesPath, 'utf-8').trim();
      console.log('✅ Found authentication cookies');
    } else {
      console.log('❌ No cookies.txt found. You may need to authenticate first.');
    }

    // Test the endpoint
    const apiUrl = 'http://localhost:5000/api/analytics/user/daily-pnl';
    console.log(`\n📡 Testing endpoint: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Debug Script)'
      }
    });

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      console.log('❌ Authentication failed. The endpoint requires a valid user session.');
      console.log('💡 You may need to log in through the frontend first to get valid cookies.');
      return;
    }

    const responseText = await response.text();
    console.log(`\n📄 Raw Response Body:`, responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('\n✅ Parsed JSON Response:');
      console.log(JSON.stringify(data, null, 2));

      if (data.success && data.data) {
        console.log(`\n📈 Daily P/L Data Analysis:`);
        console.log(`- Number of days: ${data.data.length}`);
        
        if (data.data.length > 0) {
          console.log('- Sample entries:');
          data.data.slice(0, 3).forEach((day: any, index: number) => {
            console.log(`  ${index + 1}. ${day.date}: $${day.pnl} (${day.isProfit ? 'Profit' : 'Loss'})`);
          });

          const allZero = data.data.every((day: any) => day.pnl === 0);
          const totalPnL = data.data.reduce((sum: number, day: any) => sum + day.pnl, 0);
          
          console.log(`- All P/L values are zero: ${allZero ? '❌ YES (This is the problem!)' : '✅ NO'}`);
          console.log(`- Total P/L across all days: $${totalPnL.toFixed(2)}`);

          if (allZero) {
            console.log('\n🔍 ISSUE IDENTIFIED: All P/L values are zero despite having real deals in database');
            console.log('💡 This suggests there might be an issue with:');
            console.log('   1. The date filtering in the SQL query');
            console.log('   2. The user authentication/identification');
            console.log('   3. The profit field conversion or mapping');
          }
        } else {
          console.log('❌ No daily P/L data returned');
        }
      } else {
        console.log('❌ API response indicates failure or missing data');
      }

    } catch (parseError) {
      console.log('❌ Failed to parse JSON response:', parseError);
    }

  } catch (error) {
    console.error('❌ Error testing Daily P/L API:', error);
  }
}

// Run the test
testDailyPnLAPI().then(() => {
  console.log('\n✅ API test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});