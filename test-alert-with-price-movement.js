#!/usr/bin/env node

/**
 * TEST ALERT WITH PRICE MOVEMENT
 * 
 * This script will:
 * 1. Create an alert with a lower base price
 * 2. Update the current price to trigger the alert
 * 3. Test the alert processing
 */

const mongoose = require('mongoose');
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-alerts';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    log('✅ Connected to MongoDB', 'green');
  } catch (error) {
    log(`❌ Failed to connect to MongoDB: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function createAlertWithPriceMovement() {
  log('🔧 Creating alert with price movement simulation...', 'blue');
  
  try {
    // 1. Ensure BTCUSDT is in favorites
    await Crypto.findOneAndUpdate(
      { symbol: 'BTCUSDT' },
      { 
        symbol: 'BTCUSDT',
        price: 50050, // Current price (higher)
        volume24h: 1000000,
        priceChangePercent24h: 0.1,
        isFavorite: true,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    log('✅ Updated BTCUSDT price to 50050', 'green');
    
    // 2. Delete existing test alerts
    await Alert.deleteMany({ comment: 'Test alert for debugging' });
    log('✅ Deleted existing test alerts', 'green');
    
    // 3. Create a new test alert with lower base price
    const testAlert = new Alert({
      symbol: 'BTCUSDT',
      direction: '>',
      targetType: 'percentage',
      targetValue: 0.1, // 0.1% change required
      currentPrice: 50050, // Current price
      basePrice: 50000, // Base price (lower) - this will create 0.1% change
      trackingMode: 'current',
      intervalMinutes: 0,
      alertTime: new Date().toTimeString().slice(0, 5),
      comment: 'Test alert for debugging - 0.1% change',
      email: 'test@example.com',
      userExplicitlyCreated: true,
      isActive: true,
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.1
    });
    
    const savedAlert = await testAlert.save();
    log(`✅ Created test alert with ID: ${savedAlert._id}`, 'green');
    log(`   Symbol: ${savedAlert.symbol}`, 'blue');
    log(`   Current Price: ${savedAlert.currentPrice}`, 'blue');
    log(`   Base Price: ${savedAlert.basePrice}`, 'blue');
    log(`   Target: ${savedAlert.targetValue}% change`, 'blue');
    
    // 4. Calculate expected percentage change
    const expectedChange = ((savedAlert.currentPrice - savedAlert.basePrice) / savedAlert.basePrice) * 100;
    log(`   Expected Change: ${expectedChange.toFixed(4)}%`, 'blue');
    log(`   Required Change: ${savedAlert.targetValue}%`, 'blue');
    log(`   Should Trigger: ${expectedChange >= savedAlert.targetValue ? 'YES' : 'NO'}`, expectedChange >= savedAlert.targetValue ? 'green' : 'red');
    
    return savedAlert;
  } catch (error) {
    log(`❌ Error creating alert with price movement: ${error.message}`, 'red');
    return null;
  }
}

async function testAlertProcessing() {
  log('🔍 Testing alert processing...', 'blue');
  
  try {
    // Import the alert processing function
    const { processAlerts } = require('./server/services/alertService');
    
    log('Running alert processing...', 'blue');
    const stats = await processAlerts();
    
    log(`Processed: ${stats.processed}`, 'blue');
    log(`Triggered: ${stats.triggered}`, 'blue');
    log(`Notifications sent: ${stats.notificationsSent}`, 'blue');
    log(`Errors: ${stats.errors}`, 'blue');
    log(`Skipped: ${stats.skipped}`, 'blue');
    
    if (stats.triggered > 0) {
      log('✅ Alerts were triggered!', 'green');
    } else {
      log('⚠️  No alerts were triggered', 'yellow');
    }
    
    return stats;
  } catch (error) {
    log(`❌ Error testing alert processing: ${error.message}`, 'red');
    return null;
  }
}

async function checkTriggeredAlerts() {
  log('🔍 Checking triggered alerts...', 'blue');
  
  try {
    const TriggeredAlert = require('./server/models/TriggeredAlert');
    const triggeredAlerts = await TriggeredAlert.find()
      .sort({ triggeredAt: -1 })
      .limit(5);
    
    log(`Found ${triggeredAlerts.length} triggered alerts`, 'blue');
    
    if (triggeredAlerts.length > 0) {
      log('Recent triggered alerts:', 'blue');
      triggeredAlerts.forEach((alert, index) => {
        log(`  ${index + 1}. ${alert.symbol} - ${alert.conditionMet} - ${alert.triggeredAt}`, 'blue');
      });
    }
    
    return triggeredAlerts.length;
  } catch (error) {
    log(`❌ Error checking triggered alerts: ${error.message}`, 'red');
    return 0;
  }
}

async function main() {
  log('🚀 Testing alert with price movement...', 'bright');
  
  try {
    await connectToDatabase();
    
    // Create alert with price movement
    const alert = await createAlertWithPriceMovement();
    if (!alert) {
      log('❌ Failed to create alert', 'red');
      return;
    }
    
    // Test alert processing
    const stats = await testAlertProcessing();
    if (!stats) {
      log('❌ Failed to test alert processing', 'red');
      return;
    }
    
    // Check triggered alerts
    const triggeredCount = await checkTriggeredAlerts();
    
    // Summary
    log('\n📊 TEST SUMMARY:', 'bright');
    log(`   Alert created: ${alert ? 'YES' : 'NO'}`, alert ? 'green' : 'red');
    log(`   Alerts processed: ${stats.processed}`, 'blue');
    log(`   Alerts triggered: ${stats.triggered}`, stats.triggered > 0 ? 'green' : 'yellow');
    log(`   Triggered alerts in DB: ${triggeredCount}`, triggeredCount > 0 ? 'green' : 'yellow');
    
    if (stats.triggered > 0 || triggeredCount > 0) {
      log('\n✅ SUCCESS: Alert system is working!', 'green');
    } else {
      log('\n❌ ISSUE: Alert system is not triggering alerts', 'red');
      log('   Check the server logs for detailed debugging information', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log('Disconnected from database', 'blue');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createAlertWithPriceMovement, testAlertProcessing };
