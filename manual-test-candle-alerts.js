/**
 * Manual Test Candle Alerts
 * This script manually triggers the alert checking process to test candle alerts
 * Run with: node manual-test-candle-alerts.js
 */

const axios = require('axios');

// Configure axios
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

async function manualTestCandleAlerts() {
  console.log('🧪 Manual Test Candle Alerts...\n');
  
  try {
    // Test 1: Check favorite pairs
    console.log('1️⃣ Checking favorite pairs...');
    const cryptosResponse = await axios.get('/api/crypto');
    const cryptos = cryptosResponse.data.cryptos || cryptosResponse.data || [];
    const favoritePairs = cryptos.filter(crypto => crypto.isFavorite);
    
    console.log(`📊 Found ${favoritePairs.length} favorite pairs:`);
    favoritePairs.forEach(crypto => {
      console.log(`   ${crypto.symbol}: Price: ${crypto.price}`);
    });
    
    if (favoritePairs.length === 0) {
      console.log('❌ No favorite pairs found!');
      return;
    }
    
    // Test 2: Check candle alerts
    console.log('\n2️⃣ Checking candle alerts...');
    const alertsResponse = await axios.get('/api/alerts');
    const candleAlerts = alertsResponse.data.filter(alert => 
      alert.candleCondition !== 'NONE' && 
      alert.candleTimeframes && 
      alert.candleTimeframes.length > 0
    );
    
    console.log(`📊 Found ${candleAlerts.length} candle alerts:`);
    candleAlerts.forEach(alert => {
      console.log(`   ${alert.symbol}: ${alert.candleTimeframes.join(', ')} - ${alert.candleCondition}`);
    });
    
    if (candleAlerts.length === 0) {
      console.log('❌ No candle alerts found!');
      console.log('   Please create a candle alert first');
      return;
    }
    
    // Test 3: Test real-time candle data
    console.log('\n3️⃣ Testing real-time candle data...');
    const { getCurrentCandleData } = require('./server/services/candleMonitoringService');
    
    for (const alert of candleAlerts.slice(0, 3)) {
      try {
        console.log(`\n🔍 Testing ${alert.symbol}...`);
        
        const candleData = await getCurrentCandleData(alert.symbol, alert.candleTimeframes);
        
        for (const timeframe of alert.candleTimeframes) {
          const candle = candleData[timeframe];
          if (candle) {
            const { open, high, low, close } = candle;
            const isGreenCandle = close > open;
            
            console.log(`   📊 ${timeframe} Candle:`);
            console.log(`      OHLC: O:${open} H:${high} L:${low} C:${close}`);
            console.log(`      Is Green: ${isGreenCandle ? '✅ YES' : '❌ NO'}`);
            console.log(`      Condition: ${alert.candleCondition}`);
            
            if (alert.candleCondition === 'GREEN_CANDLE' && isGreenCandle) {
              console.log(`      🚨 ALERT WOULD TRIGGER!`);
            } else if (alert.candleCondition === 'RED_CANDLE' && !isGreenCandle) {
              console.log(`      🚨 ALERT WOULD TRIGGER!`);
            } else if (alert.candleCondition === 'ABOVE_OPEN' && close > open) {
              console.log(`      🚨 ALERT WOULD TRIGGER!`);
            } else if (alert.candleCondition === 'BELOW_OPEN' && close < open) {
              console.log(`      🚨 ALERT WOULD TRIGGER!`);
            } else {
              console.log(`      ⏳ Condition not met`);
            }
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error testing ${alert.symbol}:`, error.message);
      }
    }
    
    console.log('\n✅ Manual test completed!');
    console.log('\n🎯 If you see "ALERT WOULD TRIGGER!" above, the system is working!');
    console.log('   The cron job will check these conditions every minute and trigger alerts when met.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Manual Candle Alerts Test...\n');
  await manualTestCandleAlerts();
}

main();
