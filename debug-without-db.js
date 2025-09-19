/**
 * Debug Alert Issue Without Database
 * 
 * This shows the core problem without needing database connection
 */

const axios = require('axios');

const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * Get 1-minute candle data
 */
async function getMinuteCandle(symbol) {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: '1m',
        limit: 2
      },
      timeout: 10000
    });

    const [prevKline, currentKline] = response.data;
    
    return {
      current: {
        openTime: parseInt(currentKline[0]),
        open: parseFloat(currentKline[1]),
        close: parseFloat(currentKline[4]),
        timestamp: new Date(parseInt(currentKline[0]))
      },
      previous: {
        openTime: parseInt(prevKline[0]),
        close: parseFloat(prevKline[4])
      }
    };
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get current price
 */
async function getCurrentPrice(symbol) {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/ticker/price`, {
      params: { symbol: symbol },
      timeout: 5000
    });
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Simulate alert base price (what the current system uses)
 */
function getSimulatedAlertBasePrice(currentPrice) {
  // Simulate that alert was created 1 hour ago with a different price
  // This is what causes the false triggers
  return currentPrice * (0.995 + Math.random() * 0.01); // ±0.5-1% difference
}

/**
 * Debug the core issue
 */
async function debugCoreIssue() {
  console.log('🚨 === CORE ALERT ISSUE DEBUG ===');
  console.log(`🕐 Time: ${new Date().toISOString()}`);
  console.log('');

  const pairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];
  
  for (const symbol of pairs) {
    console.log(`\n🔍 === ${symbol} ===`);
    
    const currentPrice = await getCurrentPrice(symbol);
    const candleData = await getMinuteCandle(symbol);
    
    if (!currentPrice || !candleData) {
      console.log(`   ❌ Could not fetch data`);
      continue;
    }

    const { current: currentCandle } = candleData;
    
    // Simulate what happens in the current broken system
    const alertBasePrice = getSimulatedAlertBasePrice(currentPrice);
    
    // Calculate percentage changes
    const changeFromCandleOpen = ((currentPrice - currentCandle.open) / currentCandle.open) * 100;
    const changeFromAlertBase = ((currentPrice - alertBasePrice) / alertBasePrice) * 100;
    
    console.log(`   Current Price: ${currentPrice}`);
    console.log(`   1-Min Candle Open: ${currentCandle.open}`);
    console.log(`   Simulated Alert Base: ${alertBasePrice}`);
    console.log('');
    console.log(`   Change from Candle Open: ${changeFromCandleOpen.toFixed(6)}%`);
    console.log(`   Change from Alert Base: ${changeFromAlertBase.toFixed(6)}%`);
    console.log('');
    
    // Check against 0.2% threshold
    const threshold = 0.2;
    const candleOpenTriggers = Math.abs(changeFromCandleOpen) >= threshold;
    const alertBaseTriggers = Math.abs(changeFromAlertBase) >= threshold;
    
    console.log(`   🎯 0.2% Threshold Check:`);
    console.log(`   Using Candle Open: ${candleOpenTriggers ? '✅ TRIGGER' : '❌ NO TRIGGER'}`);
    console.log(`   Using Alert Base: ${alertBaseTriggers ? '✅ TRIGGER' : '❌ NO TRIGGER'}`);
    
    if (alertBaseTriggers && !candleOpenTriggers) {
      console.log(`   🚨 PROBLEM: Alert would fire incorrectly!`);
      console.log(`   💡 The system is using alert base price instead of candle open price`);
    } else if (!alertBaseTriggers && candleOpenTriggers) {
      console.log(`   ⚠️ MISSED: Alert would miss a legitimate trigger`);
    } else {
      console.log(`   ✅ Both methods agree`);
    }
  }
  
  console.log('\n📋 === EXPLANATION ===');
  console.log('The current alert system uses "basePrice" (price when alert was created)');
  console.log('instead of the 1-minute candle open price for percentage calculations.');
  console.log('');
  console.log('This causes two problems:');
  console.log('1. False positives: Alerts fire when 1-minute change is < 0.2%');
  console.log('2. Missed alerts: Legitimate 1-minute changes are ignored');
  console.log('');
  console.log('🔧 SOLUTION: Use 1-minute candle open price as the base for calculations');
}

// Run the debug
debugCoreIssue()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
