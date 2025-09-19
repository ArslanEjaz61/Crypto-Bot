/**
 * Debug Alert Percentage Calculation
 * 
 * This script helps debug why alerts are firing with incorrect percentage calculations.
 * It checks the actual 1-minute price changes vs the target percentage.
 */

const axios = require('axios');
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');

// Configuration
const DEBUG_PAIRS = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT']; // Add your problematic pairs here
const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * Get current 1-minute candle data from Binance
 */
async function getCurrentMinuteCandle(symbol) {
  try {
    console.log(`🔍 Fetching 1-minute candle data for ${symbol}...`);
    
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: '1m',
        limit: 2 // Get current and previous candle
      },
      timeout: 10000
    });

    if (!response.data || response.data.length < 2) {
      throw new Error('Insufficient candle data received');
    }

    // Parse current and previous candles
    const [prevKline, currentKline] = response.data;
    
    const prevCandle = {
      openTime: parseInt(prevKline[0]),
      open: parseFloat(prevKline[1]),
      high: parseFloat(prevKline[2]),
      low: parseFloat(prevKline[3]),
      close: parseFloat(prevKline[4]),
      volume: parseFloat(prevKline[5]),
      closeTime: parseInt(prevKline[6])
    };

    const currentCandle = {
      openTime: parseInt(currentKline[0]),
      open: parseFloat(currentKline[1]),
      high: parseFloat(currentKline[2]),
      low: parseFloat(currentKline[3]),
      close: parseFloat(currentKline[4]),
      volume: parseFloat(currentKline[5]),
      closeTime: parseInt(currentKline[6])
    };

    console.log(`✅ Retrieved candle data for ${symbol}:`);
    console.log(`   Previous candle: ${new Date(prevCandle.openTime).toISOString()} - O:${prevCandle.open} C:${prevCandle.close}`);
    console.log(`   Current candle: ${new Date(currentCandle.openTime).toISOString()} - O:${currentCandle.open} C:${currentCandle.close}`);

    return { prevCandle, currentCandle };
  } catch (error) {
    console.error(`❌ Error fetching candle data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get current price from Binance
 */
async function getCurrentPrice(symbol) {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/ticker/price`, {
      params: { symbol: symbol },
      timeout: 5000
    });
    return parseFloat(response.data.price);
  } catch (error) {
    console.error(`❌ Error fetching current price for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Debug alert percentage calculations
 */
async function debugAlertCalculations() {
  console.log('🚨 === ALERT PERCENTAGE CALCULATION DEBUG ===');
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get all active alerts for debugging pairs
    const alerts = await Alert.find({
      isActive: true,
      symbol: { $in: DEBUG_PAIRS }
    });

    console.log(`📊 Found ${alerts.length} active alerts for debug pairs: ${DEBUG_PAIRS.join(', ')}`);
    console.log('');

    for (const alert of alerts) {
      console.log(`🔍 === DEBUGGING ALERT: ${alert.symbol} ===`);
      console.log(`   Alert ID: ${alert._id}`);
      console.log(`   Target Type: ${alert.targetType}`);
      console.log(`   Target Value: ${alert.targetValue}%`);
      console.log(`   Direction: ${alert.direction}`);
      console.log(`   Base Price (when alert created): ${alert.basePrice}`);
      console.log('');

      // Get current price
      const currentPrice = await getCurrentPrice(alert.symbol);
      if (!currentPrice) {
        console.log(`   ❌ Could not fetch current price for ${alert.symbol}`);
        continue;
      }

      // Get 1-minute candle data
      const candleData = await getCurrentMinuteCandle(alert.symbol);
      if (!candleData) {
        console.log(`   ❌ Could not fetch candle data for ${alert.symbol}`);
        continue;
      }

      const { prevCandle, currentCandle } = candleData;

      // Calculate different percentage changes
      const changeFromBase = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
      const changeFromCurrentCandleOpen = ((currentPrice - currentCandle.open) / currentCandle.open) * 100;
      const changeFromPrevCandleClose = ((currentPrice - prevCandle.close) / prevCandle.close) * 100;
      const changeWithinCurrentCandle = ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100;

      console.log(`📈 === PRICE CALCULATIONS ===`);
      console.log(`   Current Price (real-time): ${currentPrice}`);
      console.log(`   Current Candle Open: ${currentCandle.open}`);
      console.log(`   Current Candle Close: ${currentCandle.close}`);
      console.log(`   Previous Candle Close: ${prevCandle.close}`);
      console.log('');

      console.log(`📊 === PERCENTAGE CHANGES ===`);
      console.log(`   Change from Base Price (when alert created): ${changeFromBase.toFixed(4)}%`);
      console.log(`   Change from Current Candle Open (1-min start): ${changeFromCurrentCandleOpen.toFixed(4)}%`);
      console.log(`   Change from Previous Candle Close: ${changeFromPrevCandleClose.toFixed(4)}%`);
      console.log(`   Change within Current Candle (O→C): ${changeWithinCurrentCandle.toFixed(4)}%`);
      console.log('');

      // Check which calculation would trigger the alert
      console.log(`🎯 === ALERT TRIGGER ANALYSIS ===`);
      console.log(`   Target: ${alert.direction} ${alert.targetValue}%`);
      
      const targetValue = parseFloat(alert.targetValue);
      
      // Check using base price (current system)
      let basePriceTriggers = false;
      if (alert.direction === '>') {
        basePriceTriggers = changeFromBase >= targetValue;
      } else if (alert.direction === '<') {
        basePriceTriggers = changeFromBase <= -targetValue;
      } else if (alert.direction === '<>') {
        basePriceTriggers = Math.abs(changeFromBase) >= Math.abs(targetValue);
      }

      // Check using current candle open (correct approach)
      let candleOpenTriggers = false;
      if (alert.direction === '>') {
        candleOpenTriggers = changeFromCurrentCandleOpen >= targetValue;
      } else if (alert.direction === '<') {
        candleOpenTriggers = changeFromCurrentCandleOpen <= -targetValue;
      } else if (alert.direction === '<>') {
        candleOpenTriggers = Math.abs(changeFromCurrentCandleOpen) >= Math.abs(targetValue);
      }

      console.log(`   Using Base Price: ${basePriceTriggers ? '✅ WOULD TRIGGER' : '❌ WOULD NOT TRIGGER'}`);
      console.log(`   Using Candle Open: ${candleOpenTriggers ? '✅ WOULD TRIGGER' : '❌ WOULD NOT TRIGGER'}`);
      console.log('');

      // Show the problem
      if (basePriceTriggers && !candleOpenTriggers) {
        console.log(`🚨 === PROBLEM DETECTED ===`);
        console.log(`   ❌ Alert would fire using base price (${changeFromBase.toFixed(4)}%)`);
        console.log(`   ✅ But should NOT fire using 1-min candle open (${changeFromCurrentCandleOpen.toFixed(4)}%)`);
        console.log(`   🔧 The alert is using the wrong base price!`);
        console.log(`   💡 It should use the current 1-minute candle open price: ${currentCandle.open}`);
        console.log(`   📅 Current candle started: ${new Date(currentCandle.openTime).toISOString()}`);
      } else if (!basePriceTriggers && candleOpenTriggers) {
        console.log(`⚠️ === MISSED ALERT ===`);
        console.log(`   ❌ Alert would NOT fire using base price (${changeFromBase.toFixed(4)}%)`);
        console.log(`   ✅ But SHOULD fire using 1-min candle open (${changeFromCurrentCandleOpen.toFixed(4)}%)`);
        console.log(`   🔧 The alert is missing legitimate triggers!`);
      } else if (basePriceTriggers && candleOpenTriggers) {
        console.log(`✅ === CORRECT BEHAVIOR ===`);
        console.log(`   Both calculations agree - alert should trigger`);
      } else {
        console.log(`✅ === CORRECT BEHAVIOR ===`);
        console.log(`   Both calculations agree - alert should NOT trigger`);
      }

      console.log('');
      console.log('─'.repeat(80));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

/**
 * Test with specific pairs mentioned in the issue
 */
async function testSpecificPairs() {
  console.log('🧪 === TESTING SPECIFIC PAIRS FROM SCREENSHOT ===');
  
  const testPairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];
  
  for (const symbol of testPairs) {
    console.log(`\n🔍 Testing ${symbol}:`);
    
    const candleData = await getCurrentMinuteCandle(symbol);
    if (!candleData) continue;
    
    const { currentCandle } = candleData;
    const currentPrice = await getCurrentPrice(symbol);
    
    if (!currentPrice) continue;
    
    const minuteChange = ((currentPrice - currentCandle.open) / currentCandle.open) * 100;
    
    console.log(`   Current Price: ${currentPrice}`);
    console.log(`   1-Min Candle Open: ${currentCandle.open}`);
    console.log(`   1-Min Change: ${minuteChange.toFixed(4)}%`);
    console.log(`   Target (0.2%): ${Math.abs(minuteChange) >= 0.2 ? '✅ TRIGGER' : '❌ NO TRIGGER'}`);
  }
}

// Run the debug script
if (require.main === module) {
  debugAlertCalculations()
    .then(() => testSpecificPairs())
    .then(() => {
      console.log('\n✅ Debug script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  debugAlertCalculations,
  testSpecificPairs,
  getCurrentMinuteCandle,
  getCurrentPrice
};
