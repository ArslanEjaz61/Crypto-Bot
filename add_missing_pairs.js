/**
 * Script to add all 146 missing trading pairs to your database
 * This will update your system from 418 pairs to 564 pairs
 */

const mongoose = require('mongoose');
const axios = require('axios');
const Crypto = require('./server/models/cryptoModel');
const { filterUSDTPairs } = require('./server/utils/pairFilter');
require('dotenv').config();

/**
 * Fetch data for missing pairs from Binance API
 */
async function fetchMissingPairsData(missingPairs) {
  try {
    console.log(`🔍 Fetching data for ${missingPairs.length} missing pairs from Binance...`);
    
    // Fetch current prices for all symbols
    const tickerResponse = await axios.get('https://api.binance.com/api/v3/ticker/price', {
      timeout: 30000
    });
    
    // Fetch 24h stats for all symbols  
    const statsResponse = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
      timeout: 30000
    });
    
    // Fetch exchange info
    const exchangeInfoResponse = await axios.get('https://api.binance.com/api/v3/exchangeInfo', {
      timeout: 30000
    });
    
    console.log('✅ Successfully fetched data from Binance API');
    
    // Create maps for quick lookup
    const priceMap = {};
    tickerResponse.data.forEach(ticker => {
      priceMap[ticker.symbol] = parseFloat(ticker.price);
    });
    
    const statsMap = {};
    statsResponse.data.forEach(stat => {
      statsMap[stat.symbol] = {
        priceChangePercent24h: parseFloat(stat.priceChangePercent),
        volume24h: parseFloat(stat.quoteVolume) || parseFloat(stat.volume) * parseFloat(stat.weightedAvgPrice),
        highPrice24h: parseFloat(stat.highPrice),
        lowPrice24h: parseFloat(stat.lowPrice)
      };
    });
    
    const exchangeInfoMap = {};
    exchangeInfoResponse.data.symbols.forEach(symbolInfo => {
      exchangeInfoMap[symbolInfo.symbol] = {
        isSpotTradingAllowed: symbolInfo.isSpotTradingAllowed,
        quoteAsset: symbolInfo.quoteAsset,
        baseAsset: symbolInfo.baseAsset,
        permissions: symbolInfo.permissions || [],
        status: symbolInfo.status
      };
    });
    
    // Prepare data for missing pairs
    const missingPairsData = [];
    
    for (const symbol of missingPairs) {
      const price = priceMap[symbol];
      const stats = statsMap[symbol] || {};
      const exchangeInfo = exchangeInfoMap[symbol] || {};
      
      if (price && exchangeInfo.quoteAsset === 'USDT') {
        missingPairsData.push({
          symbol: symbol,
          price: price,
          priceChangePercent24h: stats.priceChangePercent24h || 0,
          volume24h: stats.volume24h || 0,
          highPrice24h: stats.highPrice24h || price,
          lowPrice24h: stats.lowPrice24h || price,
          isSpotTradingAllowed: exchangeInfo.isSpotTradingAllowed || false,
          quoteAsset: exchangeInfo.quoteAsset || 'USDT',
          baseAsset: exchangeInfo.baseAsset || symbol.replace('USDT', ''),
          permissions: exchangeInfo.permissions || [],
          status: exchangeInfo.status || 'TRADING',
          lastUpdated: new Date(),
          historical: [],
          rsi: null,
          isFavorite: false
        });
      } else {
        console.log(`⚠️ Skipping ${symbol} - missing data or not USDT pair`);
      }
    }
    
    console.log(`📊 Prepared data for ${missingPairsData.length} missing pairs`);
    return missingPairsData;
    
  } catch (error) {
    console.error('❌ Error fetching missing pairs data:', error.message);
    throw error;
  }
}

/**
 * Add missing pairs to database
 */
async function addMissingPairsToDatabase() {
  try {
    console.log('🚀 Starting to add missing pairs to database...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Read missing pairs from the comparison file
    const fs = require('fs');
    const path = require('path');
    
    const missingPairsFile = path.join(__dirname, 'missing_pairs.csv');
    if (!fs.existsSync(missingPairsFile)) {
      throw new Error('missing_pairs.csv not found. Run compare_pairs.js first.');
    }
    
    const missingPairsContent = fs.readFileSync(missingPairsFile, 'utf8');
    const missingPairs = missingPairsContent
      .split('\n')
      .slice(1) // Skip header
      .map(line => line.split(',')[1]) // Get trading pair column
      .filter(pair => pair && pair.trim())
      .map(pair => pair.trim());
    
    console.log(`📋 Found ${missingPairs.length} missing pairs to add`);
    
    // Check current database count
    const currentCount = await Crypto.countDocuments({});
    console.log(`📊 Current database count: ${currentCount} pairs`);
    
    // Fetch data for missing pairs
    const missingPairsData = await fetchMissingPairsData(missingPairs);
    
    if (missingPairsData.length === 0) {
      console.log('❌ No valid missing pairs data to add');
      return;
    }
    
    // Add missing pairs to database using bulk operations
    console.log(`\n💾 Adding ${missingPairsData.length} missing pairs to database...`);
    
    const bulkOps = missingPairsData.map(pairData => ({
      updateOne: {
        filter: { symbol: pairData.symbol },
        update: { $set: pairData },
        upsert: true
      }
    }));
    
    const result = await Crypto.bulkWrite(bulkOps);
    
    console.log('✅ Bulk write completed:');
    console.log(`   - Inserted: ${result.upsertedCount} pairs`);
    console.log(`   - Updated: ${result.modifiedCount} pairs`);
    console.log(`   - Matched: ${result.matchedCount} pairs`);
    
    // Verify final count
    const finalCount = await Crypto.countDocuments({});
    const usdtCount = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true
    });
    
    console.log(`\n📊 FINAL DATABASE COUNTS:`);
    console.log(`   - Total pairs: ${finalCount}`);
    console.log(`   - Active USDT pairs: ${usdtCount}`);
    console.log(`   - Added: ${finalCount - currentCount} new pairs`);
    
    if (usdtCount >= 564) {
      console.log(`\n🎉 SUCCESS! Your database now has ${usdtCount} pairs!`);
      console.log('   Localhost should now show ~564 pairs instead of 418');
    } else {
      console.log(`\n⚠️ Database has ${usdtCount} pairs (expected ~564)`);
      console.log('   Some pairs might not meet the filtering criteria');
    }
    
    // Show sample of added pairs
    console.log('\n📋 Sample of newly added pairs:');
    const sampleNewPairs = await Crypto.find({
      symbol: { $in: missingPairs.slice(0, 10) }
    }).select('symbol price volume24h').lean();
    
    sampleNewPairs.forEach((pair, index) => {
      console.log(`   ${index + 1}. ${pair.symbol} - $${pair.price} (Vol: ${pair.volume24h?.toLocaleString()})`);
    });
    
    return {
      added: result.upsertedCount,
      updated: result.modifiedCount,
      finalCount: finalCount,
      usdtCount: usdtCount
    };
    
  } catch (error) {
    console.error('❌ Error adding missing pairs:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  addMissingPairsToDatabase()
    .then((result) => {
      console.log('\n🎉 MISSION ACCOMPLISHED!');
      console.log(`✅ Added ${result.added} new pairs to database`);
      console.log(`📊 Total pairs now: ${result.finalCount}`);
      console.log(`📊 Active USDT pairs: ${result.usdtCount}`);
      console.log('\n🌐 Your localhost should now show all ~564 pairs!');
      console.log('💡 Refresh your browser to see the updated pair count.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Mission failed:', error.message);
      console.error('🔧 Check your MongoDB connection and try again.');
      process.exit(1);
    });
}

module.exports = { addMissingPairsToDatabase };
