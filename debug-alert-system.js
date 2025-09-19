#!/usr/bin/env node

/**
 * COMPREHENSIVE ALERT SYSTEM DEBUGGING SCRIPT
 * 
 * This script will help debug the alert generation system step by step:
 * 1. Check if alerts are being created in the database
 * 2. Verify favorite pairs are being set correctly
 * 3. Test alert condition evaluation
 * 4. Check cron job execution
 * 5. Test the complete alert pipeline
 */

const mongoose = require('mongoose');
const axios = require('axios');

// Import models
const Alert = require('./server/models/alertModel');
const Crypto = require('./server/models/cryptoModel');
const TriggeredAlert = require('./server/models/TriggeredAlert');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
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

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'yellow');
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

async function checkDatabaseConnection() {
  logSection('DATABASE CONNECTION CHECK');
  
  try {
    const db = mongoose.connection;
    log(`Database: ${db.name}`, 'blue');
    log(`Host: ${db.host}`, 'blue');
    log(`Port: ${db.port}`, 'blue');
    log(`Ready State: ${db.readyState}`, 'blue');
    
    // Check collections
    const collections = await db.db.listCollections().toArray();
    log(`Collections: ${collections.map(c => c.name).join(', ')}`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Database connection error: ${error.message}`, 'red');
    return false;
  }
}

async function checkAlertsInDatabase() {
  logSection('ALERTS IN DATABASE');
  
  try {
    const totalAlerts = await Alert.countDocuments();
    const activeAlerts = await Alert.countDocuments({ isActive: true });
    const userCreatedAlerts = await Alert.countDocuments({ userExplicitlyCreated: true });
    
    log(`Total alerts: ${totalAlerts}`, 'blue');
    log(`Active alerts: ${activeAlerts}`, 'blue');
    log(`User-created alerts: ${userCreatedAlerts}`, 'blue');
    
    if (totalAlerts > 0) {
      const recentAlerts = await Alert.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('symbol targetValue targetType isActive userExplicitlyCreated createdAt');
      
      log('\nRecent alerts:', 'blue');
      recentAlerts.forEach((alert, index) => {
        log(`  ${index + 1}. ${alert.symbol} - ${alert.targetType} ${alert.targetValue} - Active: ${alert.isActive} - User Created: ${alert.userExplicitlyCreated} - ${alert.createdAt}`, 'blue');
      });
    }
    
    return { totalAlerts, activeAlerts, userCreatedAlerts };
  } catch (error) {
    log(`❌ Error checking alerts: ${error.message}`, 'red');
    return null;
  }
}

async function checkFavoritePairs() {
  logSection('FAVORITE PAIRS CHECK');
  
  try {
    const favoriteCryptos = await Crypto.find({ isFavorite: true });
    const favoriteSymbols = favoriteCryptos.map(crypto => crypto.symbol);
    
    log(`Total favorite pairs: ${favoriteSymbols.length}`, 'blue');
    log(`Favorite symbols: ${favoriteSymbols.join(', ')}`, 'blue');
    
    if (favoriteSymbols.length === 0) {
      log('⚠️  WARNING: No favorite pairs found! This will prevent alerts from being processed.', 'yellow');
      log('   To fix this, add some pairs to favorites in the frontend.', 'yellow');
    }
    
    return favoriteSymbols;
  } catch (error) {
    log(`❌ Error checking favorite pairs: ${error.message}`, 'red');
    return [];
  }
}

async function checkTriggeredAlerts() {
  logSection('TRIGGERED ALERTS CHECK');
  
  try {
    const totalTriggered = await TriggeredAlert.countDocuments();
    const recentTriggered = await TriggeredAlert.find()
      .sort({ triggeredAt: -1 })
      .limit(5)
      .select('symbol conditionMet triggeredAt');
    
    log(`Total triggered alerts: ${totalTriggered}`, 'blue');
    
    if (recentTriggered.length > 0) {
      log('\nRecent triggered alerts:', 'blue');
      recentTriggered.forEach((alert, index) => {
        log(`  ${index + 1}. ${alert.symbol} - ${alert.conditionMet} - ${alert.triggeredAt}`, 'blue');
      });
    } else {
      log('No triggered alerts found', 'yellow');
    }
    
    return totalTriggered;
  } catch (error) {
    log(`❌ Error checking triggered alerts: ${error.message}`, 'red');
    return 0;
  }
}

async function testAlertConditionEvaluation() {
  logSection('ALERT CONDITION EVALUATION TEST');
  
  try {
    // Get a sample alert
    const sampleAlert = await Alert.findOne({ isActive: true, userExplicitlyCreated: true });
    
    if (!sampleAlert) {
      log('❌ No active user-created alerts found to test', 'red');
      return false;
    }
    
    log(`Testing alert: ${sampleAlert.symbol}`, 'blue');
    log(`Target type: ${sampleAlert.targetType}`, 'blue');
    log(`Target value: ${sampleAlert.targetValue}`, 'blue');
    log(`Base price: ${sampleAlert.basePrice}`, 'blue');
    
    // Get current price data
    const crypto = await Crypto.findOne({ symbol: sampleAlert.symbol });
    if (!crypto) {
      log(`❌ No crypto data found for ${sampleAlert.symbol}`, 'red');
      return false;
    }
    
    log(`Current price: ${crypto.price}`, 'blue');
    
    // Calculate percentage change
    const percentageChange = ((crypto.price - sampleAlert.basePrice) / sampleAlert.basePrice) * 100;
    log(`Percentage change: ${percentageChange.toFixed(4)}%`, 'blue');
    
    // Test condition evaluation
    const testData = {
      currentPrice: crypto.price,
      currentVolume: crypto.volume24h || 0,
      previousPrice: sampleAlert.basePrice,
      previousVolume: 0,
      candle: {},
      rsi: {},
      emaData: {},
      volumeHistory: [],
      marketData: {
        market: 'SPOT',
        exchange: 'BINANCE',
        tradingPair: 'USDT',
        dailyVolume: crypto.volume24h || 0
      }
    };
    
    const shouldTrigger = sampleAlert.checkConditions(testData);
    log(`Should trigger: ${shouldTrigger}`, shouldTrigger ? 'green' : 'red');
    
    return shouldTrigger;
  } catch (error) {
    log(`❌ Error testing alert condition: ${error.message}`, 'red');
    return false;
  }
}

async function testCronJobExecution() {
  logSection('CRON JOB EXECUTION TEST');
  
  try {
    // Check if the server is running
    const response = await axios.get(`${API_BASE_URL}/api/crypto`, { timeout: 5000 });
    log('✅ Server is running and responding', 'green');
    
    // Check if cron jobs are working by looking at recent crypto updates
    const recentCrypto = await Crypto.findOne().sort({ lastUpdated: -1 });
    if (recentCrypto) {
      const lastUpdate = new Date(recentCrypto.lastUpdated);
      const now = new Date();
      const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);
      
      log(`Last crypto update: ${lastUpdate.toISOString()}`, 'blue');
      log(`Minutes since update: ${minutesSinceUpdate.toFixed(2)}`, 'blue');
      
      if (minutesSinceUpdate > 5) {
        log('⚠️  WARNING: Crypto data is stale. Cron jobs might not be running.', 'yellow');
      } else {
        log('✅ Crypto data is fresh. Cron jobs appear to be working.', 'green');
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Error testing cron job execution: ${error.message}`, 'red');
    return false;
  }
}

async function createTestAlert() {
  logSection('CREATE TEST ALERT');
  
  try {
    // First, ensure we have a favorite pair
    const favoriteCrypto = await Crypto.findOne({ isFavorite: true });
    if (!favoriteCrypto) {
      // Set BTCUSDT as favorite for testing
      await Crypto.findOneAndUpdate(
        { symbol: 'BTCUSDT' },
        { isFavorite: true },
        { upsert: true, new: true }
      );
      log('✅ Set BTCUSDT as favorite for testing', 'green');
    }
    
    // Create a test alert
    const testAlert = new Alert({
      symbol: 'BTCUSDT',
      direction: '>',
      targetType: 'percentage',
      targetValue: 0.1, // Very small percentage to trigger easily
      currentPrice: 50000,
      basePrice: 50000,
      trackingMode: 'current',
      intervalMinutes: 0,
      alertTime: new Date().toTimeString().slice(0, 5),
      comment: 'Test alert for debugging',
      email: 'test@example.com',
      userExplicitlyCreated: true,
      isActive: true,
      changePercentTimeframe: '1MIN',
      changePercentValue: 0.1
    });
    
    const savedAlert = await testAlert.save();
    log(`✅ Created test alert with ID: ${savedAlert._id}`, 'green');
    log(`   Symbol: ${savedAlert.symbol}`, 'blue');
    log(`   Target: ${savedAlert.targetValue}% change`, 'blue');
    log(`   Base price: ${savedAlert.basePrice}`, 'blue');
    
    return savedAlert;
  } catch (error) {
    log(`❌ Error creating test alert: ${error.message}`, 'red');
    return null;
  }
}

async function testAlertProcessing() {
  logSection('TEST ALERT PROCESSING');
  
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

async function generateDebugReport() {
  logSection('DEBUG REPORT SUMMARY');
  
  const report = {
    timestamp: new Date().toISOString(),
    database: {},
    alerts: {},
    favorites: {},
    triggered: {},
    cronJobs: {},
    testAlert: {},
    processing: {}
  };
  
  // Database status
  report.database.connected = mongoose.connection.readyState === 1;
  
  // Alerts status
  const alertStats = await checkAlertsInDatabase();
  if (alertStats) {
    report.alerts = alertStats;
  }
  
  // Favorites status
  const favorites = await checkFavoritePairs();
  report.favorites.count = favorites.length;
  report.favorites.symbols = favorites;
  
  // Triggered alerts status
  const triggeredCount = await checkTriggeredAlerts();
  report.triggered.count = triggeredCount;
  
  // Cron jobs status
  const cronWorking = await testCronJobExecution();
  report.cronJobs.working = cronWorking;
  
  // Test alert creation
  const testAlert = await createTestAlert();
  if (testAlert) {
    report.testAlert.created = true;
    report.testAlert.id = testAlert._id;
    report.testAlert.symbol = testAlert.symbol;
  }
  
  // Test processing
  const processingStats = await testAlertProcessing();
  if (processingStats) {
    report.processing = processingStats;
  }
  
  log('\n📊 DEBUG REPORT:', 'bright');
  log(JSON.stringify(report, null, 2), 'blue');
  
  // Recommendations
  log('\n🔧 RECOMMENDATIONS:', 'bright');
  
  if (report.favorites.count === 0) {
    log('1. Add some pairs to favorites in the frontend', 'yellow');
  }
  
  if (report.alerts.userCreatedAlerts === 0) {
    log('2. Create some alerts using the frontend', 'yellow');
  }
  
  if (!report.cronJobs.working) {
    log('3. Check if the server is running and cron jobs are initialized', 'yellow');
  }
  
  if (report.processing.triggered === 0 && report.alerts.activeAlerts > 0) {
    log('4. Check alert condition evaluation logic', 'yellow');
  }
  
  return report;
}

async function main() {
  log('🚀 Starting Alert System Debugging...', 'bright');
  
  try {
    await connectToDatabase();
    
    const report = await generateDebugReport();
    
    log('\n✅ Debugging complete!', 'green');
    log('Check the recommendations above to fix any issues.', 'blue');
    
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

module.exports = {
  connectToDatabase,
  checkDatabaseConnection,
  checkAlertsInDatabase,
  checkFavoritePairs,
  checkTriggeredAlerts,
  testAlertConditionEvaluation,
  testCronJobExecution,
  createTestAlert,
  testAlertProcessing,
  generateDebugReport
};
