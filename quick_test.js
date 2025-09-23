const axios = require('axios');
const { filterUSDTPairs } = require('./server/utils/pairFilter');

async function quickTest() {
  try {
    console.log('🔍 Quick test of filtering logic...\n');
    
    // Fetch fresh data
    const [tickerResponse, exchangeInfoResponse] = await Promise.all([
      axios.get('https://api.binance.com/api/v3/ticker/price', { timeout: 15000 }),
      axios.get('https://api.binance.com/api/v3/exchangeInfo', { timeout: 15000 })
    ]);
    
    // Test filtering
    const result = filterUSDTPairs(
      tickerResponse.data, 
      exchangeInfoResponse.data.symbols, 
      false // Disable debug for clean output
    );
    
    console.log(`🎯 RESULT: ${result.stats.included} USDT pairs found`);
    console.log(`Expected: ~574 pairs`);
    console.log(`Status: ${result.stats.included >= 560 ? '✅ GOOD' : '❌ TOO FEW'}`);
    
    if (result.stats.included < 560) {
      console.log('\n⚠️ Still too few pairs. Let me check what might be wrong...');
      
      // Enable debug to see what's being excluded
      console.log('\n🔍 Running with debug enabled...');
      const debugResult = filterUSDTPairs(
        tickerResponse.data, 
        exchangeInfoResponse.data.symbols, 
        true // Enable debug
      );
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickTest();
