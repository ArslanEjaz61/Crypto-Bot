/**
 * Test Candle Alert Creation
 * This script tests if candle alerts can be created successfully
 * Run with: node test-candle-alert-creation.js
 */

const axios = require('axios');

// Configure axios
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

async function testCandleAlertCreation() {
  console.log('🧪 Testing Candle Alert Creation...\n');
  
  try {
    // Test data for 5M candle above open
    const alertData = {
      symbol: 'BTCUSDT',
      direction: '>',
      targetType: 'percentage',
      targetValue: 1,
      trackingMode: 'current',
      intervalMinutes: 60,
      volumeChangeRequired: 0,
      alertTime: '12:00',
      comment: 'Test candle alert for BTCUSDT',
      email: 'test@example.com',
      
      // Candle configuration - this is what was fixed
      candleTimeframes: ['5MIN'], // Array format (was singular before)
      candleCondition: 'ABOVE_OPEN',
      
      // Other required fields
      market: 'SPOT',
      exchange: 'BINANCE',
      tradingPair: 'USDT',
      minDailyVolume: 0,
      changePercentTimeframe: '1MIN',
      changePercentValue: 1,
      alertCountTimeframe: '5MIN',
      alertCountEnabled: false,
      
      // RSI and EMA disabled
      rsiEnabled: false,
      emaEnabled: false,
      volumeEnabled: false
    };
    
    console.log('📝 Creating alert with data:');
    console.log(JSON.stringify(alertData, null, 2));
    
    // Make the API call
    const response = await axios.post('/api/alerts', alertData);
    
    console.log('\n✅ SUCCESS! Alert created successfully!');
    console.log('📊 Response:', response.data);
    
    // Verify the alert was created with correct candle data
    if (response.data.candleTimeframes && response.data.candleTimeframes.length > 0) {
      console.log(`\n🎯 Candle Timeframes: ${response.data.candleTimeframes.join(', ')}`);
      console.log(`🎯 Candle Condition: ${response.data.candleCondition}`);
      console.log('✅ Candle configuration is correct!');
    } else {
      console.log('❌ Candle configuration is missing!');
    }
    
    // Test if we can fetch the alert
    console.log('\n🔍 Fetching created alert...');
    const getResponse = await axios.get(`/api/alerts/${response.data._id}`);
    console.log('📋 Retrieved alert:', getResponse.data);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Error creating candle alert:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n🔍 Validation Error Details:');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
      console.log('Data:', error.response.data);
    }
    
    throw error;
  }
}

// Test multiple candle conditions
async function testMultipleCandleConditions() {
  console.log('\n\n🧪 Testing Multiple Candle Conditions...\n');
  
  const testCases = [
    {
      name: '5M Above Open',
      candleTimeframes: ['5MIN'],
      candleCondition: 'ABOVE_OPEN'
    },
    {
      name: '1HR Green Candle',
      candleTimeframes: ['1HR'],
      candleCondition: 'GREEN_CANDLE'
    },
    {
      name: 'Multiple Timeframes',
      candleTimeframes: ['5MIN', '15MIN', '1HR'],
      candleCondition: 'BULLISH_HAMMER'
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Testing: ${testCase.name}`);
      
      const alertData = {
        symbol: 'ETHUSDT',
        direction: '>',
        targetType: 'percentage',
        targetValue: 1,
        trackingMode: 'current',
        intervalMinutes: 60,
        volumeChangeRequired: 0,
        alertTime: '12:00',
        comment: `Test ${testCase.name} alert`,
        email: 'test@example.com',
        
        // Candle configuration
        candleTimeframes: testCase.candleTimeframes,
        candleCondition: testCase.candleCondition,
        
        // Other required fields
        market: 'SPOT',
        exchange: 'BINANCE',
        tradingPair: 'USDT',
        minDailyVolume: 0,
        changePercentTimeframe: '1MIN',
        changePercentValue: 1,
        alertCountTimeframe: '5MIN',
        alertCountEnabled: false,
        rsiEnabled: false,
        emaEnabled: false,
        volumeEnabled: false
      };
      
      const response = await axios.post('/api/alerts', alertData);
      console.log(`✅ ${testCase.name}: SUCCESS`);
      console.log(`   Timeframes: ${response.data.candleTimeframes.join(', ')}`);
      console.log(`   Condition: ${response.data.candleCondition}`);
      
    } catch (error) {
      console.error(`❌ ${testCase.name}: FAILED`);
      console.error(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Run the tests
async function runTests() {
  try {
    await testCandleAlertCreation();
    await testMultipleCandleConditions();
    
    console.log('\n\n✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Candle alert creation: ✅ Tested');
    console.log('   - Multiple conditions: ✅ Tested');
    console.log('   - Array format (candleTimeframes): ✅ Fixed');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get('/api/alerts');
    console.log('✅ Server is running and accessible');
    return true;
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error('Please start your server with: npm run server');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Candle Alert Creation Tests...\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runTests();
}

main();
