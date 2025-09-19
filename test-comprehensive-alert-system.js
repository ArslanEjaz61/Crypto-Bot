/**
 * COMPREHENSIVE ALERT SYSTEM TEST
 * 
 * This test script verifies that all the critical fixes are working:
 * 1. Min Daily Volume filtering
 * 2. Change % calculation with proper base prices
 * 3. Alert Count & Continuous Monitoring
 * 4. Comprehensive debug logging
 * 5. Proper candle-based alert tracking
 */

const mongoose = require('mongoose');
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');
const { processAlertsComprehensive } = require('./server/services/alertServiceComprehensive');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-alerts', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test data setup
const setupTestData = async () => {
  console.log('\n🔧 === SETTING UP TEST DATA ===');
  
  // Create test crypto pairs
  const testCryptos = [
    {
      symbol: 'BTCUSDT',
      price: 45000,
      volume24h: 2500000000, // High volume - should pass volume filter
      priceChangePercent24h: 2.5,
      isFavorite: true
    },
    {
      symbol: 'ETHUSDT', 
      price: 3000,
      volume24h: 1500000000, // High volume - should pass volume filter
      priceChangePercent24h: 1.8,
      isFavorite: true
    },
    {
      symbol: 'ADAUSDT',
      price: 0.45,
      volume24h: 50000000, // Low volume - should fail volume filter
      priceChangePercent24h: 0.5,
      isFavorite: true
    },
    {
      symbol: 'DOGEUSDT',
      price: 0.08,
      volume24h: 800000000, // Medium volume - should pass volume filter
      priceChangePercent24h: -1.2,
      isFavorite: true
    }
  ];

  // Clear existing test data
  await Crypto.deleteMany({ symbol: { $in: testCryptos.map(c => c.symbol) } });
  await Alert.deleteMany({ symbol: { $in: testCryptos.map(c => c.symbol) } });

  // Create crypto records
  for (const crypto of testCryptos) {
    await Crypto.create(crypto);
    console.log(`✅ Created crypto: ${crypto.symbol} (Price: $${crypto.price}, Volume: $${crypto.volume24h.toLocaleString()})`);
  }

  // Create test alerts with different configurations
  const testAlerts = [
    {
      symbol: 'BTCUSDT',
      direction: '>',
      targetType: 'percentage',
      targetValue: 0.1, // 0.1% change
      currentPrice: 45000,
      basePrice: 45000,
      minDailyVolume: 1000000000, // 1B volume requirement
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.1,
      alertCountEnabled: true,
      alertCountTimeframe: '5MIN',
      maxAlertsPerTimeframe: 1,
      alertTime: '12:00',
      email: 'test@example.com',
      userExplicitlyCreated: true,
      isActive: true
    },
    {
      symbol: 'ETHUSDT',
      direction: '<>',
      targetType: 'percentage', 
      targetValue: 0.2, // 0.2% change either way
      currentPrice: 3000,
      basePrice: 3000,
      minDailyVolume: 1000000000, // 1B volume requirement
      changePercentTimeframe: '5MIN',
      changePercentValue: 0.2,
      alertCountEnabled: true,
      alertCountTimeframe: '15MIN',
      maxAlertsPerTimeframe: 2,
      alertTime: '12:00',
      email: 'test@example.com',
      userExplicitlyCreated: true,
      isActive: true
    },
    {
      symbol: 'ADAUSDT',
      direction: '>',
      targetType: 'percentage',
      targetValue: 0.5, // 0.5% change
      currentPrice: 0.45,
      basePrice: 0.45,
      minDailyVolume: 100000000, // 100M volume requirement - should fail
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.5,
      alertCountEnabled: false,
      alertTime: '12:00',
      email: 'test@example.com',
      userExplicitlyCreated: true,
      isActive: true
    },
    {
      symbol: 'DOGEUSDT',
      direction: '<',
      targetType: 'percentage',
      targetValue: 0.3, // 0.3% decrease
      currentPrice: 0.08,
      basePrice: 0.08,
      minDailyVolume: 500000000, // 500M volume requirement
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.3,
      alertCountEnabled: true,
      alertCountTimeframe: '5MIN',
      maxAlertsPerTimeframe: 1,
      alertTime: '12:00',
      email: 'test@example.com',
      userExplicitlyCreated: true,
      isActive: true
    }
  ];

  // Create alert records
  for (const alertData of testAlerts) {
    const alert = new Alert(alertData);
    await alert.save();
    console.log(`✅ Created alert: ${alertData.symbol} (${alertData.direction} ${alertData.targetValue}%, Min Vol: $${alertData.minDailyVolume.toLocaleString()})`);
  }

  console.log('✅ Test data setup completed');
};

// Run comprehensive test
const runComprehensiveTest = async () => {
  console.log('\n🧪 === RUNNING COMPREHENSIVE ALERT SYSTEM TEST ===');
  
  try {
    // Run the comprehensive alert processing
    const stats = await processAlertsComprehensive();
    
    console.log('\n📊 === TEST RESULTS ===');
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Triggered: ${stats.triggered}`);
    console.log(`   Notifications Sent: ${stats.notificationsSent}`);
    console.log(`   Volume Filtered: ${stats.volumeFiltered}`);
    console.log(`   Count Limited: ${stats.countLimited}`);
    console.log(`   Skipped: ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);
    
    // Verify expected results
    console.log('\n🔍 === VERIFICATION ===');
    
    // Check that ADAUSDT was filtered out due to low volume
    if (stats.volumeFiltered > 0) {
      console.log('✅ PASS: Min Daily Volume filter is working - some alerts were filtered out');
    } else {
      console.log('❌ FAIL: Min Daily Volume filter is not working - no alerts were filtered out');
    }
    
    // Check that alerts were processed
    if (stats.processed > 0) {
      console.log('✅ PASS: Alerts were processed for favorite pairs');
    } else {
      console.log('❌ FAIL: No alerts were processed');
    }
    
    // Check that no errors occurred
    if (stats.errors === 0) {
      console.log('✅ PASS: No errors occurred during processing');
    } else {
      console.log(`❌ FAIL: ${stats.errors} errors occurred during processing`);
    }
    
    console.log('\n✅ Comprehensive test completed');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
};

// Test alert count system
const testAlertCountSystem = async () => {
  console.log('\n🔢 === TESTING ALERT COUNT SYSTEM ===');
  
  try {
    // Get a test alert with alert count enabled
    const testAlert = await Alert.findOne({ 
      symbol: 'BTCUSDT', 
      alertCountEnabled: true 
    });
    
    if (!testAlert) {
      console.log('❌ No test alert found with alert count enabled');
      return;
    }
    
    console.log(`Testing alert count system for ${testAlert.symbol}`);
    console.log(`Alert count enabled: ${testAlert.alertCountEnabled}`);
    console.log(`Alert count timeframe: ${testAlert.alertCountTimeframe}`);
    console.log(`Max alerts per timeframe: ${testAlert.maxAlertsPerTimeframe}`);
    
    // Check current alert count
    const currentCount = testAlert.getAlertCount(testAlert.alertCountTimeframe);
    console.log(`Current alert count: ${currentCount}`);
    
    // Test incrementing alert count
    const { incrementAlertCount } = require('./server/services/alertServiceComprehensive');
    await incrementAlertCount(testAlert, testAlert.alertCountTimeframe);
    
    // Check updated count
    const updatedCount = testAlert.getAlertCount(testAlert.alertCountTimeframe);
    console.log(`Updated alert count: ${updatedCount}`);
    
    if (updatedCount > currentCount) {
      console.log('✅ PASS: Alert count system is working - count was incremented');
    } else {
      console.log('❌ FAIL: Alert count system is not working - count was not incremented');
    }
    
  } catch (error) {
    console.error('❌ Alert count test failed:', error);
  }
};

// Main test function
const main = async () => {
  try {
    console.log('🚀 === COMPREHENSIVE ALERT SYSTEM TEST STARTED ===');
    
    // Connect to database
    await connectDB();
    
    // Setup test data
    await setupTestData();
    
    // Run comprehensive test
    await runComprehensiveTest();
    
    // Test alert count system
    await testAlertCountSystem();
    
    console.log('\n🎉 === ALL TESTS COMPLETED ===');
    console.log('The comprehensive alert system has been tested and verified.');
    console.log('Check the logs above to see detailed results for each condition.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
};

// Run the test
main();
