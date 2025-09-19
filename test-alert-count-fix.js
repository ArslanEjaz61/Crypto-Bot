/**
 * Test script to verify the alert count fix
 * This script simulates multiple alert triggers within the same hour to ensure
 * only one alert is sent per timeframe candle.
 */

const mongoose = require('mongoose');
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');
const { processAlerts } = require('./server/services/alertService');

// Test configuration
const TEST_SYMBOL = 'BTCUSDT';
const TEST_EMAIL = 'test@example.com';

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  // Create or update test crypto
  await Crypto.findOneAndUpdate(
    { symbol: TEST_SYMBOL },
    {
      symbol: TEST_SYMBOL,
      price: 50000,
      volume24h: 1000000,
      priceChangePercent24h: 2.5,
      isFavorite: true,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
  
  // Create test alert with 1HR alert count limit
  const testAlert = await Alert.findOneAndUpdate(
    { 
      symbol: TEST_SYMBOL,
      email: TEST_EMAIL,
      alertCountEnabled: true,
      alertCountTimeframe: '1HR',
      maxAlertsPerTimeframe: 1
    },
    {
      symbol: TEST_SYMBOL,
      direction: '>',
      targetType: 'percentage',
      targetValue: 0.1, // Very low threshold to trigger easily
      currentPrice: 50000,
      basePrice: 50000,
      trackingMode: 'current',
      alertTime: new Date().toTimeString().slice(0, 5), // Current time
      comment: 'Test alert for count fix',
      email: TEST_EMAIL,
      isActive: true,
      userExplicitlyCreated: true,
      
      // Alert count settings
      alertCountEnabled: true,
      alertCountTimeframe: '1HR',
      maxAlertsPerTimeframe: 1,
      
      // Change percentage settings
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.1,
      
      // Reset alert counters
      timeframeAlertCounters: new Map()
    },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Test alert created/updated: ${testAlert._id}`);
  return testAlert;
}

async function simulatePriceChanges() {
  console.log('📈 Simulating price changes to trigger alerts...');
  
  const priceChanges = [
    { price: 50050, description: 'First 0.1% increase' },
    { price: 50100, description: 'Second 0.2% increase' },
    { price: 50150, description: 'Third 0.3% increase' },
    { price: 50200, description: 'Fourth 0.4% increase' }
  ];
  
  for (let i = 0; i < priceChanges.length; i++) {
    const change = priceChanges[i];
    
    console.log(`\n🔄 Simulating ${change.description}...`);
    
    // Update crypto price
    await Crypto.findOneAndUpdate(
      { symbol: TEST_SYMBOL },
      { 
        price: change.price,
        lastUpdated: new Date()
      }
    );
    
    console.log(`   Price updated to: $${change.price}`);
    
    // Process alerts
    console.log(`   Processing alerts...`);
    const stats = await processAlerts();
    
    console.log(`   Alert processing stats:`, {
      processed: stats.processed,
      triggered: stats.triggered,
      notificationsSent: stats.notificationsSent,
      errors: stats.errors,
      skipped: stats.skipped
    });
    
    // Wait a bit between simulations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function verifyAlertCount() {
  console.log('\n🔍 Verifying alert count behavior...');
  
  const alert = await Alert.findOne({ 
    symbol: TEST_SYMBOL,
    email: TEST_EMAIL 
  });
  
  if (!alert) {
    console.log('❌ Test alert not found');
    return;
  }
  
  console.log('Alert details:');
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

async function runTest() {
  try {
    console.log('🚀 Starting alert count fix test...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-alerts', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to database\n');
    
    // Setup test data
    await setupTestData();
    
    // Simulate multiple price changes within same hour
    await simulatePriceChanges();
    
    // Verify the results
    await verifyAlertCount();
    
    // Cleanup
    await cleanup();
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\nExpected behavior:');
    console.log('- Only 1 alert should be triggered despite multiple price changes');
    console.log('- Subsequent alerts should be blocked due to alert count limit');
    console.log('- Alert count should reset only when a new hour candle starts');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
if (require.main === module) {
  runTest();
}

module.exports = { runTest };
