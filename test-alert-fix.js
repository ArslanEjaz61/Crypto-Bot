/**
 * Test Alert Fix - Verify that percentage calculations are now correct
 */

const { 
  getCurrentMinuteCandle, 
  getCurrentPrice, 
  calculatePercentageChange, 
  checkPercentageCondition 
} = require('./server/services/alertServiceFixed');

const Alert = require('./server/models/alertModel');

/**
 * Test the fixed percentage calculation logic
 */
async function testAlertFix() {
  console.log('🧪 === TESTING ALERT FIX ===');
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log('');

  // Test pairs from the screenshot
  const testPairs = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT', 'DOTUSDT'];
  
  for (const symbol of testPairs) {
    console.log(`\n🔍 === TESTING ${symbol} ===`);
    
    try {
      // Get current price and 1-minute candle
      const currentPrice = await getCurrentPrice(symbol);
      const minuteCandle = await getCurrentMinuteCandle(symbol);
      
      if (!currentPrice || !minuteCandle) {
        console.log(`   ❌ Could not fetch data for ${symbol}`);
        continue;
      }
      
      // Test with 0.2% target (common threshold from screenshot)
      const testAlert = {
        symbol: symbol,
        direction: '<>',
        targetValue: 0.2,
        changePercentTimeframe: '1MIN'
      };
      
      // Calculate percentage change using 1-minute candle open (correct method)
      const changeData = calculatePercentageChange(currentPrice, minuteCandle.open, symbol);
      
      // Check if condition would be met
      const conditionResult = checkPercentageCondition(changeData.percentageChange, testAlert);
      
      console.log(`\n📊 === RESULTS FOR ${symbol} ===`);
      console.log(`   Current Price: ${currentPrice}`);
      console.log(`   1-Min Candle Open: ${minuteCandle.open}`);
      console.log(`   Actual 1-Min Change: ${changeData.percentageChange.toFixed(6)}%`);
      console.log(`   Target: ±0.2%`);
      console.log(`   Would Trigger: ${conditionResult.conditionMet ? '✅ YES' : '❌ NO'}`);
      console.log(`   Reason: ${conditionResult.reason}`);
      
      // Show what the old system would have done (using alert base price)
      const alerts = await Alert.find({ 
        symbol: symbol, 
        isActive: true,
        userExplicitlyCreated: true 
      });
      
      if (alerts.length > 0) {
        const alert = alerts[0];
        console.log(`\n🔍 === COMPARISON WITH EXISTING ALERT ===`);
        console.log(`   Alert Base Price: ${alert.basePrice}`);
        console.log(`   Old Calculation: ${((currentPrice - alert.basePrice) / alert.basePrice * 100).toFixed(6)}%`);
        console.log(`   New Calculation: ${changeData.percentageChange.toFixed(6)}%`);
        
        const oldChange = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
        const oldWouldTrigger = Math.abs(oldChange) >= 0.2;
        
        console.log(`   Old System Would Trigger: ${oldWouldTrigger ? '✅ YES' : '❌ NO'}`);
        console.log(`   New System Would Trigger: ${conditionResult.conditionMet ? '✅ YES' : '❌ NO'}`);
        
        if (oldWouldTrigger !== conditionResult.conditionMet) {
          console.log(`   🚨 DIFFERENCE DETECTED! The fix changes alert behavior.`);
          if (oldWouldTrigger && !conditionResult.conditionMet) {
            console.log(`   ✅ This prevents false positives (good fix)`);
          } else {
            console.log(`   ⚠️ This enables previously missed alerts`);
          }
        } else {
          console.log(`   ✅ Both systems agree (consistent behavior)`);
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Error testing ${symbol}:`, error.message);
    }
    
    console.log('\n' + '─'.repeat(60));
  }
}

/**
 * Test with actual alerts from database
 */
async function testWithRealAlerts() {
  console.log('\n🔍 === TESTING WITH REAL ALERTS FROM DATABASE ===');
  
  try {
    const alerts = await Alert.find({ 
      isActive: true,
      userExplicitlyCreated: true,
      targetType: 'percentage'
    }).limit(5);
    
    console.log(`Found ${alerts.length} percentage-based alerts to test`);
    
    for (const alert of alerts) {
      console.log(`\n🔍 Testing Alert: ${alert.symbol}`);
      console.log(`   Target: ${alert.direction} ${alert.targetValue}%`);
      console.log(`   Base Price: ${alert.basePrice}`);
      
      try {
        const currentPrice = await getCurrentPrice(alert.symbol);
        const minuteCandle = await getCurrentMinuteCandle(alert.symbol);
        
        if (!currentPrice || !minuteCandle) {
          console.log(`   ❌ Could not fetch data`);
          continue;
        }
        
        // Test old vs new calculation
        const oldChange = ((currentPrice - alert.basePrice) / alert.basePrice) * 100;
        const newChange = ((currentPrice - minuteCandle.open) / minuteCandle.open) * 100;
        
        console.log(`   Current Price: ${currentPrice}`);
        console.log(`   Minute Candle Open: ${minuteCandle.open}`);
        console.log(`   Old Change (base price): ${oldChange.toFixed(6)}%`);
        console.log(`   New Change (candle open): ${newChange.toFixed(6)}%`);
        
        // Check if alerts would trigger with each method
        let oldTriggers = false;
        let newTriggers = false;
        
        if (alert.direction === '>') {
          oldTriggers = oldChange >= alert.targetValue;
          newTriggers = newChange >= alert.targetValue;
        } else if (alert.direction === '<') {
          oldTriggers = oldChange <= -alert.targetValue;
          newTriggers = newChange <= -alert.targetValue;
        } else if (alert.direction === '<>') {
          oldTriggers = Math.abs(oldChange) >= Math.abs(alert.targetValue);
          newTriggers = Math.abs(newChange) >= Math.abs(alert.targetValue);
        }
        
        console.log(`   Old System Triggers: ${oldTriggers ? '✅ YES' : '❌ NO'}`);
        console.log(`   New System Triggers: ${newTriggers ? '✅ YES' : '❌ NO'}`);
        
        if (oldTriggers !== newTriggers) {
          console.log(`   🚨 BEHAVIOR CHANGE DETECTED!`);
        } else {
          console.log(`   ✅ Consistent behavior`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error testing alert:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing with real alerts:', error);
  }
}

// Run the tests
if (require.main === module) {
  testAlertFix()
    .then(() => testWithRealAlerts())
    .then(() => {
      console.log('\n✅ All tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testAlertFix,
  testWithRealAlerts
};
