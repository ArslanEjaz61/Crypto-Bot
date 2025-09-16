/**
 * Test script for candle monitoring functionality
 * Run with: node test-candle-monitoring.js
 */

const { 
  getCurrentCandleData, 
  checkCandleCondition, 
  convertTimeframeToInterval,
  monitorCandleCondition 
} = require('./server/services/candleMonitoringService');

async function testCandleMonitoring() {
  console.log('🧪 Testing Candle Monitoring Service...\n');

  try {
    // Test 1: Convert timeframes
    console.log('1️⃣ Testing timeframe conversion:');
    const timeframes = ['5MIN', '15MIN', '1HR', '4HR', '12HR', 'D', 'W'];
    timeframes.forEach(tf => {
      const interval = convertTimeframeToInterval(tf);
      console.log(`   ${tf} → ${interval}`);
    });
    console.log('');

    // Test 2: Get current candle data
    console.log('2️⃣ Testing current candle data retrieval:');
    const symbol = 'BTCUSDT';
    const testTimeframes = ['5MIN', '1HR', 'D'];
    
    console.log(`   Fetching candle data for ${symbol}...`);
    const candleData = await getCurrentCandleData(symbol, testTimeframes);
    
    Object.entries(candleData).forEach(([timeframe, candle]) => {
      if (candle) {
        console.log(`   ${timeframe}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`);
      } else {
        console.log(`   ${timeframe}: No data`);
      }
    });
    console.log('');

    // Test 3: Test candle conditions
    console.log('3️⃣ Testing candle condition detection:');
    
    // Create test candles for different conditions
    const testCandles = {
      greenCandle: { open: 100, high: 105, low: 98, close: 103 },
      redCandle: { open: 100, high: 102, low: 95, close: 97 },
      doji: { open: 100, high: 101, low: 99, close: 100.1 },
      bullishHammer: { open: 100, high: 101, low: 90, close: 100.5 },
      bearishHammer: { open: 100, high: 110, low: 99, close: 99.5 },
      longUpperWick: { open: 100, high: 120, low: 99, close: 101 },
      longLowerWick: { open: 100, high: 101, low: 80, close: 99 }
    };

    const conditions = [
      'GREEN_CANDLE', 'RED_CANDLE', 'DOJI', 'BULLISH_HAMMER', 
      'BEARISH_HAMMER', 'LONG_UPPER_WICK', 'LONG_LOWER_WICK'
    ];

    Object.entries(testCandles).forEach(([candleName, candle]) => {
      console.log(`   Testing ${candleName}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`);
      
      conditions.forEach(condition => {
        const result = checkCandleCondition(candle, condition);
        if (result) {
          console.log(`     ✅ ${condition}: TRUE`);
        }
      });
      console.log('');
    });

    // Test 4: Test real-time monitoring
    console.log('4️⃣ Testing real-time candle monitoring:');
    const monitoringResult = await monitorCandleCondition(symbol, '1HR', 'GREEN_CANDLE');
    
    console.log(`   Symbol: ${monitoringResult.symbol}`);
    console.log(`   Timeframe: ${monitoringResult.timeframe}`);
    console.log(`   Condition: ${monitoringResult.condition}`);
    console.log(`   New Candle Started: ${monitoringResult.newCandleStarted}`);
    console.log(`   Condition Met: ${monitoringResult.conditionMet}`);
    console.log(`   Should Trigger Alert: ${monitoringResult.shouldTriggerAlert}`);
    
    if (monitoringResult.currentCandle) {
      const c = monitoringResult.currentCandle;
      console.log(`   Current Candle: O:${c.open} H:${c.high} L:${c.low} C:${c.close}`);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCandleMonitoring();
