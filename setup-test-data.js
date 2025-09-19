#!/usr/bin/env node

/**
 * SETUP TEST DATA FOR ALERT DEBUGGING
 * 
 * This script will:
 * 1. Add some pairs to favorites
 * 2. Create a test alert
 * 3. Set up test data for debugging
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

async function setupTestData() {
  log('🔧 Setting up test data...', 'blue');
  
  try {
    // 1. Add some pairs to favorites
    const testSymbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'SOLUSDT'];
    
    for (const symbol of testSymbols) {
      await Crypto.findOneAndUpdate(
        { symbol },
        { 
          symbol,
          price: 50000, // Default price
          volume24h: 1000000,
          priceChangePercent24h: 0,
          isFavorite: true,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      log(`✅ Added ${symbol} to favorites`, 'green');
    }
    
    // 2. Create a test alert
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
    log(`   Target: ${savedAlert.targetValue}% change`, 'blue');
    log(`   Base price: ${savedAlert.basePrice}`, 'blue');
    
    // 3. Verify setup
    const favoriteCount = await Crypto.countDocuments({ isFavorite: true });
    const alertCount = await Alert.countDocuments({ isActive: true, userExplicitlyCreated: true });
    
    log(`\n📊 Test data setup complete:`, 'bright');
    log(`   Favorite pairs: ${favoriteCount}`, 'blue');
    log(`   Active user-created alerts: ${alertCount}`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Error setting up test data: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Setting up test data for alert debugging...', 'bright');
  
  try {
    await connectToDatabase();
    const success = await setupTestData();
    
    if (success) {
      log('\n✅ Test data setup completed successfully!', 'green');
      log('\n📋 Next steps:', 'bright');
      log('1. Run the debug script: node debug-alert-system.js', 'blue');
      log('2. Check the server logs for alert processing', 'blue');
      log('3. Monitor the console for real-time alert processing logs', 'blue');
    } else {
      log('\n❌ Test data setup failed. Check the errors above.', 'red');
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

module.exports = { setupTestData };
