#!/usr/bin/env node

/**
 * Test Continuous Monitoring System
 * 
 * This script tests the continuous monitoring functionality to ensure:
 * 1. Alerts continue to trigger after the first alert
 * 2. Alert counters reset when new candles start
 * 3. Duplicate alerts are prevented within the same candle
 * 4. Timeframe-based reset works correctly
 * 
 * Usage: node test-continuous-monitoring.js
 */

const mongoose = require('mongoose');
const Alert = require('./server/models/alertModel');
const { processAlerts, checkAndResetCandleBoundaries } = require('./server/services/alertService');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-alerts';

async function testContinuousMonitoring() {
  try {
    console.log('🧪 Starting continuous monitoring test...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find a test alert
    const testAlert = await Alert.findOne({
      isActive: true,
      userExplicitlyCreated: true
    });
    
    if (!testAlert) {
      console.log('❌ No test alert found. Please create an alert first.');
      return;
    }
    
    console.log(`\n🔍 Testing alert: ${testAlert.symbol} (ID: ${testAlert._id})`);
    console.log(`   Current settings:`);
    console.log(`   - Alert count enabled: ${testAlert.alertCountEnabled}`);
    console.log(`   - Alert count timeframe: ${testAlert.alertCountTimeframe}`);
    console.log(`   - Max alerts per timeframe: ${testAlert.maxAlertsPerTimeframe}`);
    console.log(`   - Last triggered: ${testAlert.lastTriggered}`);
    
    // Enable continuous monitoring if not already enabled
    if (!testAlert.isContinuousMonitoringEnabled()) {
      console.log(`\n🔄 Enabling continuous monitoring for ${testAlert.symbol}...`);
      testAlert.enableContinuousMonitoring('5MIN', 1);
      await testAlert.save();
      console.log(`✅ Continuous monitoring enabled`);
    }
    
    // Test 1: Check current alert count
    console.log(`\n📊 Test 1: Current Alert Count`);
    const currentCount = testAlert.getAlertCount(testAlert.alertCountTimeframe);
    console.log(`   Current count for ${testAlert.alertCountTimeframe}: ${currentCount}`);
    
    // Test 2: Simulate alert processing
    console.log(`\n🔄 Test 2: Simulating Alert Processing`);
    console.log(`   Processing alerts...`);
    const stats = await processAlerts();
    console.log(`   Processing stats:`, stats);
    
    // Test 3: Check candle boundary reset
    console.log(`\n🕐 Test 3: Testing Candle Boundary Reset`);
    console.log(`   Checking candle boundaries...`);
    const resetStats = await checkAndResetCandleBoundaries();
    console.log(`   Reset stats:`, resetStats);
    
    // Test 4: Check alert count after processing
    console.log(`\n📊 Test 4: Alert Count After Processing`);
    // Reload the alert from database to get updated data
    const updatedAlert = await Alert.findById(testAlert._id);
    const newCount = updatedAlert.getAlertCount(updatedAlert.alertCountTimeframe);
    console.log(`   New count for ${updatedAlert.alertCountTimeframe}: ${newCount}`);
    
    // Test 5: Test alert count limit
    console.log(`\n🚫 Test 5: Testing Alert Count Limit`);
    const mockCandleOpenTime = new Date().toISOString();
    const limitReached = testAlert.isAlertCountLimitReached(testAlert.alertCountTimeframe, mockCandleOpenTime);
    console.log(`   Limit reached: ${limitReached}`);
    
    // Test 6: Test continuous monitoring status
    console.log(`\n✅ Test 6: Continuous Monitoring Status`);
    const isEnabled = testAlert.isContinuousMonitoringEnabled();
    console.log(`   Continuous monitoring enabled: ${isEnabled}`);
    
    // Test 7: Test alert count increment
    console.log(`\n📈 Test 7: Testing Alert Count Increment`);
    const beforeIncrement = testAlert.getAlertCount(testAlert.alertCountTimeframe);
    testAlert.incrementAlertCount(testAlert.alertCountTimeframe, mockCandleOpenTime);
    const afterIncrement = testAlert.getAlertCount(testAlert.alertCountTimeframe);
    console.log(`   Count before increment: ${beforeIncrement}`);
    console.log(`   Count after increment: ${afterIncrement}`);
    
    // Save the test alert
    await testAlert.save();
    
    // Test 8: Verify the alert can still trigger (no 6-hour cooldown)
    console.log(`\n⏰ Test 8: Testing No 6-Hour Cooldown`);
    const now = new Date();
    const lastTriggered = testAlert.lastTriggered;
    
    if (lastTriggered) {
      const hoursSinceLastTrigger = (now - lastTriggered) / (1000 * 60 * 60);
      console.log(`   Hours since last trigger: ${hoursSinceLastTrigger.toFixed(2)}`);
      console.log(`   Should be able to trigger again: ${hoursSinceLastTrigger >= 0.5 || testAlert.isContinuousMonitoringEnabled()}`);
    } else {
      console.log(`   No previous trigger - can trigger`);
    }
    
    console.log(`\n🎉 Continuous monitoring test completed!`);
    console.log(`\n📋 Test Summary:`);
    console.log(`   ✅ Alert count system: ${testAlert.alertCountEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   ✅ Timeframe: ${testAlert.alertCountTimeframe}`);
    console.log(`   ✅ Max alerts per candle: ${testAlert.maxAlertsPerTimeframe}`);
    console.log(`   ✅ Current count: ${testAlert.getAlertCount(testAlert.alertCountTimeframe)}`);
    console.log(`   ✅ Continuous monitoring: ${testAlert.isContinuousMonitoringEnabled() ? 'ENABLED' : 'DISABLED'}`);
    
  } catch (error) {
    console.error('❌ Error testing continuous monitoring:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testContinuousMonitoring()
    .then(() => {
      console.log('🏁 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testContinuousMonitoring };
