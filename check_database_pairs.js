/**
 * Script to check how many trading pairs are actually stored in the database
 * This will help us understand the discrepancy between API (564) and localhost (418)
 */

const mongoose = require('mongoose');
const Crypto = require('./server/models/cryptoModel');
require('dotenv').config();

async function checkDatabasePairs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📍 Database: ${mongoUri}`);
    
    // Query 1: Total count of all crypto pairs in database
    const totalCount = await Crypto.countDocuments({});
    console.log(`\n📊 TOTAL PAIRS IN DATABASE: ${totalCount}`);
    
    // Query 2: Count of USDT pairs in database
    const usdtCount = await Crypto.countDocuments({
      symbol: { $regex: /USDT$/i }
    });
    console.log(`📊 USDT PAIRS IN DATABASE: ${usdtCount}`);
    
    // Query 3: Count with the exact filter used by the application
    const activeUsdtCount = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: "TRADING", 
      isSpotTradingAllowed: true
    });
    console.log(`📊 ACTIVE USDT TRADING PAIRS (app filter): ${activeUsdtCount}`);
    
    // Query 4: Count with less strict filter (what might be showing on localhost)
    const relaxedCount = await Crypto.countDocuments({
      $or: [
        { quoteAsset: "USDT" },
        { symbol: { $regex: /USDT$/i } }
      ]
    });
    console.log(`📊 RELAXED USDT FILTER: ${relaxedCount}`);
    
    // Query 5: Get some sample pairs to see what's in the database
    console.log('\n📋 SAMPLE PAIRS IN DATABASE:');
    const samplePairs = await Crypto.find({
      quoteAsset: "USDT",
      status: "TRADING", 
      isSpotTradingAllowed: true
    }).limit(20).select('symbol quoteAsset status isSpotTradingAllowed').lean();
    
    samplePairs.forEach((pair, index) => {
      console.log(`   ${index + 1}. ${pair.symbol} (quoteAsset: ${pair.quoteAsset}, status: ${pair.status}, spotAllowed: ${pair.isSpotTradingAllowed})`);
    });
    
    // Query 6: Check if there are pairs with missing fields
    const missingQuoteAsset = await Crypto.countDocuments({
      symbol: { $regex: /USDT$/i },
      $or: [
        { quoteAsset: { $exists: false } },
        { quoteAsset: "" },
        { quoteAsset: null }
      ]
    });
    console.log(`\n🔍 USDT PAIRS WITH MISSING QUOTE ASSET: ${missingQuoteAsset}`);
    
    const missingStatus = await Crypto.countDocuments({
      symbol: { $regex: /USDT$/i },
      $or: [
        { status: { $exists: false } },
        { status: "" },
        { status: null }
      ]
    });
    console.log(`🔍 USDT PAIRS WITH MISSING STATUS: ${missingStatus}`);
    
    const missingSpotFlag = await Crypto.countDocuments({
      symbol: { $regex: /USDT$/i },
      $or: [
        { isSpotTradingAllowed: { $exists: false } },
        { isSpotTradingAllowed: false }
      ]
    });
    console.log(`🔍 USDT PAIRS WITH SPOT TRADING DISABLED/MISSING: ${missingSpotFlag}`);
    
    // Query 7: Get all unique statuses to see what's in the database
    const uniqueStatuses = await Crypto.distinct('status', { symbol: { $regex: /USDT$/i } });
    console.log(`\n📊 UNIQUE STATUSES IN DATABASE: ${uniqueStatuses.join(', ')}`);
    
    // Query 8: Get count by status for USDT pairs
    console.log('\n📊 USDT PAIRS BY STATUS:');
    const statusCounts = await Crypto.aggregate([
      { $match: { symbol: { $regex: /USDT$/i } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statusCounts.forEach(status => {
      console.log(`   ${status._id || 'null/empty'}: ${status.count} pairs`);
    });
    
    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log(`   API returned: 564 pairs`);
    console.log(`   Database total: ${totalCount} pairs`);
    console.log(`   Database USDT: ${usdtCount} pairs`);
    console.log(`   Database filtered (app logic): ${activeUsdtCount} pairs`);
    console.log(`   Localhost shows: 418 pairs`);
    console.log(`   Difference (API vs DB filtered): ${564 - activeUsdtCount}`);
    console.log(`   Difference (API vs Localhost): ${564 - 418}`);
    console.log(`   Difference (DB filtered vs Localhost): ${activeUsdtCount - 418}`);
    
    if (activeUsdtCount === 418) {
      console.log('\n✅ MATCH FOUND: Database filtered count matches localhost (418)');
      console.log('   The difference is between API (564) and database (418)');
      console.log('   This means the database might not be fully updated with latest Binance pairs');
    } else {
      console.log('\n❓ NO DIRECT MATCH: Need to investigate further');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the check
if (require.main === module) {
  checkDatabasePairs()
    .then(() => {
      console.log('\n✅ Database check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Database check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkDatabasePairs };
