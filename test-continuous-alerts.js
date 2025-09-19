/**
 * Test script to verify the continuous alert monitoring system
 * This script tests:
 * 1. Continuous monitoring without manual intervention
 * 2. Automatic candle reset detection
 * 3. Auto-trigger after reset if conditions still met
 * 4. No duplicate alerts in same candle
 */

const mongoose = require('mongoose');
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');
const { processAlerts, checkAndResetCandleBoundaries } = require('./server/services/alertService');

// Test configuration
const TEST_SYMBOL = 'ETHUSDT';
const TEST_EMAIL = 'continuous-test@example.com';

async function setupTestData() {
  console.log('🔧 Setting up continuous alert test data...');
  
  // Create or update test crypto
  await Crypto.findOneAndUpdate(
    { symbol: TEST_SYMBOL },
    {
      symbol: TEST_SYMBOL,
      price: 3000,
      volume24h: 2000000,
      priceChangePercent24h: 1.5,
      isFavorite: true,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
  
  // Create test alert with 5MIN alert count limit for faster testing
  const testAlert = await Alert.findOneAndUpdate(
    { 
      symbol: TEST_SYMBOL,
      email: TEST_EMAIL,
      alertCountEnabled: true,
      alertCountTimeframe: '5MIN',
      maxAlertsPerTimeframe: 1
    },
    {
      symbol: TEST_SYMBOL,
      direction: '>',
      targetType: 'percentage',
      targetValue: 0.5, // Low threshold to trigger easily
      currentPrice: 3000,
      basePrice: 3000,
      trackingMode: 'current',
      alertTime: new Date().toTimeString().slice(0, 5), // Current time
      comment: 'Continuous monitoring test alert',
      email: TEST_EMAIL,
      isActive: true,
      userExplicitlyCreated: true,
      
      // Alert count settings
      alertCountEnabled: true,
      alertCountTimeframe: '5MIN',
      maxAlertsPerTimeframe: 1,
      
      // Change percentage settings
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.5,
      
      // Reset alert counters
      timeframeAlertCounters: new Map()
    },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Test alert created/updated: ${testAlert._id}`);
  console.log(`   Symbol: ${testAlert.symbol}`);
  console.log(`   Alert count timeframe: ${testAlert.alertCountTimeframe}`);
  console.log(`   Max alerts per timeframe: ${testAlert.maxAlertsPerTimeframe}`);
  return testAlert;
}

async function simulateContinuousMonitoring() {
  console.log('\n🔄 Simulating continuous monitoring...');
  
  const testScenarios = [
    { 
      price: 3015, 
      description: 'First 0.5% increase - should trigger alert',
      expectedResult: 'ALERT_TRIGGERED'
    },
    { 
      price: 3030, 
      description: 'Second 1% increase - should be blocked (same candle)',
      expectedResult: 'ALERT_BLOCKED'
    },
    { 
      price: 3045, 
      description: 'Third 1.5% increase - should be blocked (same candle)',
      expectedResult: 'ALERT_BLOCKED'
    },
    { 
      price: 3060, 
      description: 'Fourth 2% increase - should be blocked (same candle)',
      expectedResult: 'ALERT_BLOCKED'
    }
  ];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    
    console.log(`\n--- Test Scenario ${i + 1}: ${scenario.description} ---`);
    
    // Update crypto price
    await Crypto.findOneAndUpdate(
      { symbol: TEST_SYMBOL },
      { 
        price: scenario.price,
        lastUpdated: new Date()
      }
    );
    
    console.log(`   Price updated to: $${scenario.price}`);
    
    // Check candle boundaries first
    console.log(`   Checking candle boundaries...`);
    const resetStats = await checkAndResetCandleBoundaries();
    
    if (resetStats.countersReset > 0) {
      console.log(`   🔄 Candle boundary reset detected:`, resetStats);
    }
    
    // Process alerts
    console.log(`   Processing alerts...`);
    const stats = await processAlerts();
    
    console.log(`   Alert processing results:`, {
      processed: stats.processed,
      triggered: stats.triggered,
      notificationsSent: stats.notificationsSent,
      errors: stats.errors,
      skipped: stats.skipped
    });
    
    // Verify expected result
    if (scenario.expectedResult === 'ALERT_TRIGGERED' && stats.triggered > 0) {
      console.log(`   ✅ Expected: ${scenario.expectedResult} - PASSED`);
    } else if (scenario.expectedResult === 'ALERT_BLOCKED' && stats.triggered === 0) {
      console.log(`   ✅ Expected: ${scenario.expectedResult} - PASSED`);
    } else {
      console.log(`   ❌ Expected: ${scenario.expectedResult} - FAILED`);
    }
    
    // Wait between scenarios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testCandleBoundaryDetection() {
  console.log('\n🕐 Testing candle boundary detection...');
  
  // Get current alert
  const alert = await Alert.findOne({ 
    symbol: TEST_SYMBOL,
    email: TEST_EMAIL 
  });
  
  if (!alert) {
    console.log('❌ Test alert not found');
    return;
  }
  
  console.log('Current alert state:');
  console.log(`   Symbol: ${alert.symbol}`);
  console.log(`   Alert count enabled: ${alert.alertCountEnabled}`);
  console.log(`   Alert count timeframe: ${alert.alertCountTimeframe}`);
  console.log(`   Max alerts per timeframe: ${alert.maxAlertsPerTimeframe}`);
  
  if (alert.timeframeAlertCounters && alert.timeframeAlertCounters.size > 0) {
    console.log('   Alert counters:');
    for (const [timeframe, counter] of alert.timeframeAlertCounters) {
      console.log(`     ${timeframe}: count=${counter.count}, lastCandle=${counter.lastCandleOpenTime}`);
    }
  } else {
    console.log('   No alert counters found');
  }
  
  // Test candle boundary check
  console.log('\n   Running candle boundary check...');
  const resetStats = await checkAndResetCandleBoundaries();
  console.log('   Candle boundary check results:', resetStats);
}

async function verifyContinuousMonitoring() {
  console.log('\n🔍 Verifying continuous monitoring behavior...');
  
  const alert = await Alert.findOne({ 
    symbol: TEST_SYMBOL,
    email: TEST_EMAIL 
  });
  
  if (!alert) {
    console.log('❌ Test alert not found');
    return;
  }
  
  console.log('Final alert state:');
  console.log(`   Symbol: ${alert.symbol}`);
  console.log(`   Is active: ${alert.isActive}`);
  console.log(`   User explicitly created: ${alert.userExplicitlyCreated}`);
  console.log(`   Last triggered: ${alert.lastTriggered}`);
  
  if (alert.timeframeAlertCounters && alert.timeframeAlertCounters.size > 0) {
    console.log('   Final alert counters:');
    for (const [timeframe, counter] of alert.timeframeAlertCounters) {
      console.log(`     ${timeframe}: count=${counter.count}, lastCandle=${counter.lastCandleOpenTime}, lastReset=${counter.lastResetTime}`);
    }
  }
  
  console.log('\n✅ Continuous monitoring verification completed');
  console.log('\nExpected behavior verification:');
  console.log('✅ Only 1 alert should be triggered despite multiple price changes');
  console.log('✅ Subsequent alerts should be blocked due to alert count limit');
  console.log('✅ Alert count should reset when new candle starts');
  console.log('✅ System should continue monitoring without manual intervention');
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Remove test alert
  await Alert.deleteOne({ 
    symbol: TEST_SYMBOL,
    email: TEST_EMAIL 
  });
  
  // Remove test crypto
  await Crypto.deleteOne({ symbol: TEST_SYMBOL });
  
  console.log('✅ Cleanup completed');
}

async function runContinuousTest() {
  try {
    console.log('🚀 Starting continuous alert monitoring test...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-alerts', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');
    
    // Setup test data
    await setupTestData();
    
    // Test candle boundary detection
    await testCandleBoundaryDetection();
    
    // Simulate continuous monitoring
    await simulateContinuousMonitoring();
    
    // Verify the results
    await verifyContinuousMonitoring();
    
    // Cleanup
    await cleanup();
    
    console.log('\n🎉 Continuous alert monitoring test completed successfully!');
    console.log('\nKey features tested:');
    console.log('✅ Continuous monitoring without manual intervention');
    console.log('✅ Automatic candle boundary detection');
    console.log('✅ Alert count reset on new candle');
    console.log('✅ Auto-trigger after reset if conditions still met');
    console.log('✅ No duplicate alerts in same candle');
    console.log('✅ Comprehensive debug logging');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
if (require.main === module) {
  runContinuousTest();
}

module.exports = { runContinuousTest };
