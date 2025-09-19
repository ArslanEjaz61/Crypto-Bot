/**
 * Debug Specific Pairs - Target the exact pairs shown in your screenshot
 * 
 * This script will show you exactly why alerts are firing incorrectly
 * for the specific pairs you mentioned.
 */

const axios = require('axios');
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');

const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * Get detailed 1-minute candle information
 */
async function getDetailedMinuteCandle(symbol) {
  try {
    console.log(`🔍 Fetching detailed 1-minute data for ${symbol}...`);
    
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: '1m',
        limit: 5 // Get last 5 candles for context
      },
      timeout: 10000
    });

    if (!response.data || response.data.length < 1) {
      throw new Error('No candle data received');
    }

    const candles = response.data.map((kline, index) => ({
      index: response.data.length - 1 - index, // 0 = most recent
      openTime: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: parseInt(kline[6]),
      timestamp: new Date(parseInt(kline[0]))
    }));

    const currentCandle = candles[0]; // Most recent
    const previousCandle = candles[1];

    return {
      current: currentCandle,
      previous: previousCandle,
      all: candles
    };
  } catch (error) {
    console.error(`❌ Error fetching candle data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Get current price from multiple sources for comparison
 */
async function getCurrentPriceMultiSource(symbol) {
  try {
    // Get from ticker/price endpoint
    const priceResponse = await axios.get(`${BINANCE_API_BASE}/api/v3/ticker/price`, {
      params: { symbol: symbol },
      timeout: 5000
    });

    // Get from 24hr ticker for additional context
    const statsResponse = await axios.get(`${BINANCE_API_BASE}/api/v3/ticker/24hr`, {
      params: { symbol: symbol },
      timeout: 5000
    });

    return {
      currentPrice: parseFloat(priceResponse.data.price),
      lastPrice: parseFloat(statsResponse.data.lastPrice),
      openPrice: parseFloat(statsResponse.data.openPrice),
      highPrice: parseFloat(statsResponse.data.highPrice),
      lowPrice: parseFloat(statsResponse.data.lowPrice),
      priceChangePercent24h: parseFloat(statsResponse.data.priceChangePercent)
    };
  } catch (error) {
    console.error(`❌ Error fetching price data for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Debug a specific pair in detail
 */
async function debugSpecificPair(symbol) {
  console.log(`\n🚨 === DETAILED DEBUG FOR ${symbol} ===`);
  console.log(`🕐 Debug Time: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Get candle data
    const candleData = await getDetailedMinuteCandle(symbol);
    if (!candleData) {
      console.log(`❌ Could not fetch candle data for ${symbol}`);
      return;
    }

    // Get price data
    const priceData = await getCurrentPriceMultiSource(symbol);
    if (!priceData) {
      console.log(`❌ Could not fetch price data for ${symbol}`);
      return;
    }

    const { current: currentCandle, previous: previousCandle } = candleData;

    console.log(`📊 === CURRENT PRICE DATA ===`);
    console.log(`   Current Price (ticker): ${priceData.currentPrice}`);
    console.log(`   Last Price (24hr): ${priceData.lastPrice}`);
    console.log(`   24h Open Price: ${priceData.openPrice}`);
    console.log(`   24h High: ${priceData.highPrice}`);
    console.log(`   24h Low: ${priceData.lowPrice}`);
    console.log(`   24h Change: ${priceData.priceChangePercent24h}%`);
    console.log('');

    console.log(`🕐 === CURRENT 1-MINUTE CANDLE ===`);
    console.log(`   Open Time: ${currentCandle.timestamp.toISOString()}`);
    console.log(`   Open: ${currentCandle.open}`);
    console.log(`   High: ${currentCandle.high}`);
    console.log(`   Low: ${currentCandle.low}`);
    console.log(`   Close: ${currentCandle.close}`);
    console.log(`   Volume: ${currentCandle.volume}`);
    console.log('');

    console.log(`🕐 === PREVIOUS 1-MINUTE CANDLE ===`);
    console.log(`   Open Time: ${previousCandle.timestamp.toISOString()}`);
    console.log(`   Open: ${previousCandle.open}`);
    console.log(`   Close: ${previousCandle.close}`);
    console.log('');

    // Calculate different percentage changes
    const changeFromCurrentCandleOpen = ((priceData.currentPrice - currentCandle.open) / currentCandle.open) * 100;
    const changeFromPreviousCandleClose = ((priceData.currentPrice - previousCandle.close) / previousCandle.close) * 100;
    const changeWithinCurrentCandle = ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100;

    console.log(`📈 === PERCENTAGE CHANGES ===`);
    console.log(`   From Current Candle Open (1-min start): ${changeFromCurrentCandleOpen.toFixed(6)}%`);
    console.log(`   From Previous Candle Close: ${changeFromPreviousCandleClose.toFixed(6)}%`);
    console.log(`   Within Current Candle (O→C): ${changeWithinCurrentCandle.toFixed(6)}%`);
    console.log('');

    // Check against 0.2% threshold (common from screenshot)
    const threshold = 0.2;
    console.log(`🎯 === THRESHOLD ANALYSIS (${threshold}%) ===`);
    console.log(`   Current Candle Open Change: ${Math.abs(changeFromCurrentCandleOpen) >= threshold ? '✅ TRIGGER' : '❌ NO TRIGGER'} (${changeFromCurrentCandleOpen.toFixed(6)}%)`);
    console.log(`   Previous Candle Close Change: ${Math.abs(changeFromPreviousCandleClose) >= threshold ? '✅ TRIGGER' : '❌ NO TRIGGER'} (${changeFromPreviousCandleClose.toFixed(6)}%)`);
    console.log(`   Within Current Candle: ${Math.abs(changeWithinCurrentCandle) >= threshold ? '✅ TRIGGER' : '❌ NO TRIGGER'} (${changeWithinCurrentCandle.toFixed(6)}%)`);
    console.log('');

    // Check alerts for this symbol
    const alerts = await Alert.find({ 
      symbol: symbol, 
      isActive: true,
      userExplicitlyCreated: true 
    });

    if (alerts.length > 0) {
      console.log(`🚨 === ACTIVE ALERTS FOR ${symbol} ===`);
      
      for (const alert of alerts) {
        console.log(`   Alert ID: ${alert._id}`);
        console.log(`   Target: ${alert.direction} ${alert.targetValue}%`);
        console.log(`   Base Price (when created): ${alert.basePrice}`);
        console.log(`   Timeframe: ${alert.changePercentTimeframe || '1MIN'}`);
        console.log(`   Last Triggered: ${alert.lastTriggered || 'Never'}`);
        console.log('');

        // Calculate what the current system would do
        const changeFromBasePrice = ((priceData.currentPrice - alert.basePrice) / alert.basePrice) * 100;
        
        console.log(`   📊 === CURRENT SYSTEM CALCULATION ===`);
        console.log(`   Base Price: ${alert.basePrice} (from when alert was created)`);
        console.log(`   Current Price: ${priceData.currentPrice}`);
        console.log(`   Change from Base: ${changeFromBasePrice.toFixed(6)}%`);
        
        // Check if current system would trigger
        let currentSystemTriggers = false;
        if (alert.direction === '>') {
          currentSystemTriggers = changeFromBasePrice >= alert.targetValue;
        } else if (alert.direction === '<') {
          currentSystemTriggers = changeFromBasePrice <= -alert.targetValue;
        } else if (alert.direction === '<>') {
          currentSystemTriggers = Math.abs(changeFromBasePrice) >= Math.abs(alert.targetValue);
        }
        
        console.log(`   Would Trigger: ${currentSystemTriggers ? '✅ YES' : '❌ NO'}`);
        console.log('');

        // Calculate what the CORRECT system should do (using 1-minute candle open)
        console.log(`   🔧 === CORRECT SYSTEM CALCULATION ===`);
        console.log(`   Base Price: ${currentCandle.open} (1-minute candle open)`);
        console.log(`   Current Price: ${priceData.currentPrice}`);
        console.log(`   Change from Candle Open: ${changeFromCurrentCandleOpen.toFixed(6)}%`);
        
        let correctSystemTriggers = false;
        if (alert.direction === '>') {
          correctSystemTriggers = changeFromCurrentCandleOpen >= alert.targetValue;
        } else if (alert.direction === '<') {
          correctSystemTriggers = changeFromCurrentCandleOpen <= -alert.targetValue;
        } else if (alert.direction === '<>') {
          correctSystemTriggers = Math.abs(changeFromCurrentCandleOpen) >= Math.abs(alert.targetValue);
        }
        
        console.log(`   Should Trigger: ${correctSystemTriggers ? '✅ YES' : '❌ NO'}`);
        console.log('');

        // Show the problem
        if (currentSystemTriggers && !correctSystemTriggers) {
          console.log(`   🚨 === PROBLEM DETECTED ===`);
          console.log(`   ❌ Current system would FIRE alert (wrong!)`);
          console.log(`   ✅ Correct system would NOT fire alert`);
          console.log(`   🔧 Issue: Using alert base price instead of 1-minute candle open`);
          console.log(`   💡 Fix: Use ${currentCandle.open} as base price instead of ${alert.basePrice}`);
        } else if (!currentSystemTriggers && correctSystemTriggers) {
          console.log(`   ⚠️ === MISSED ALERT ===`);
          console.log(`   ❌ Current system would NOT fire alert`);
          console.log(`   ✅ Correct system SHOULD fire alert`);
          console.log(`   🔧 Issue: Missing legitimate alerts due to wrong base price`);
        } else if (currentSystemTriggers && correctSystemTriggers) {
          console.log(`   ✅ === CORRECT BEHAVIOR ===`);
          console.log(`   Both systems agree - alert should fire`);
        } else {
          console.log(`   ✅ === CORRECT BEHAVIOR ===`);
          console.log(`   Both systems agree - alert should NOT fire`);
        }
        
        console.log('');
        console.log('─'.repeat(60));
        console.log('');
      }
    } else {
      console.log(`ℹ️ No active alerts found for ${symbol}`);
    }

  } catch (error) {
    console.error(`❌ Error debugging ${symbol}:`, error);
  }
}

/**
 * Main debug function
 */
async function debugAllPairs() {
  console.log('🚨 === DEBUGGING SPECIFIC PAIRS FROM SCREENSHOT ===');
  console.log(`🕐 Debug Started: ${new Date().toISOString()}`);
  console.log('');

  // Add the specific pairs you want to debug
  const pairsToDebug = [
    'BTCUSDT',
    'ETHUSDT', 
    'ADAUSDT',
    'SOLUSDT',
    'DOTUSDT'
    // Add more pairs from your screenshot here
  ];

  for (const symbol of pairsToDebug) {
    await debugSpecificPair(symbol);
  }

  console.log('\n✅ Debug completed for all pairs');
  console.log('\n📋 === SUMMARY ===');
  console.log('If you see "PROBLEM DETECTED" above, those are the alerts firing incorrectly.');
  console.log('The fix is to use 1-minute candle open price instead of alert base price.');
  console.log('Run the alertServiceFixed.js to implement the corrected logic.');
}

// Run the debug script
if (require.main === module) {
  debugAllPairs()
    .then(() => {
      console.log('\n🎯 Next steps:');
      console.log('1. Review the debug output above');
      console.log('2. Run: node test-alert-fix.js to test the fix');
      console.log('3. Replace the alert service with the fixed version');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  debugAllPairs,
  debugSpecificPair,
  getDetailedMinuteCandle,
  getCurrentPriceMultiSource
};
