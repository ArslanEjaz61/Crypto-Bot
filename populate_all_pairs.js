/**
 * Script to populate the database with ALL 564 trading pairs properly
 * This will ensure localhost shows all 564 pairs with correct filtering
 */

const mongoose = require('mongoose');
const axios = require('axios');
const Crypto = require('./server/models/cryptoModel');
const { filterUSDTPairs } = require('./server/utils/pairFilter');
require('dotenv').config();

/**
 * Fetch all trading pairs and populate database properly
 */
async function populateAllPairs() {
  try {
    console.log('🚀 Starting complete database population...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data to start fresh
    console.log('\n🗑️ Clearing existing crypto data...');
    const deleteResult = await Crypto.deleteMany({});
    console.log(`✅ Removed ${deleteResult.deletedCount} existing records`);
    
    // Fetch fresh data from Binance API
    console.log('\n📡 Fetching fresh data from Binance API...');
    
    const [tickerResponse, volumeResponse, exchangeInfoResponse] = await Promise.all([
      axios.get('https://api.binance.com/api/v3/ticker/price', { timeout: 30000 }),
      axios.get('https://api.binance.com/api/v3/ticker/24hr', { timeout: 30000 }),
      axios.get('https://api.binance.com/api/v3/exchangeInfo', { timeout: 30000 })
    ]);
    
    console.log('✅ Successfully fetched all data from Binance API');
    
    // Create maps for quick lookup
    const volumeData = {};
    volumeResponse.data.forEach((item) => {
      const baseVolume = parseFloat(item.volume);
      const quoteVolume = parseFloat(item.quoteVolume);
      const weightedAvgPrice = parseFloat(item.weightedAvgPrice);
      
      const volume = quoteVolume || baseVolume * weightedAvgPrice;
      
      volumeData[item.symbol] = {
        volume: volume,
        priceChangePercent: parseFloat(item.priceChangePercent),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
      };
    });
    
    // Create exchange info map
    const exchangeInfoMap = {};
    exchangeInfoResponse.data.symbols.forEach((symbolInfo) => {
      exchangeInfoMap[symbolInfo.symbol] = {
        isSpotTradingAllowed: symbolInfo.isSpotTradingAllowed,
        quoteAsset: symbolInfo.quoteAsset,
        baseAsset: symbolInfo.baseAsset,
        permissions: symbolInfo.permissions || [],
        status: symbolInfo.status,
      };
    });
    
    // Use the same filtering logic as the system
    console.log('\n🔍 Filtering USDT pairs using system logic...');
    const filterResult = filterUSDTPairs(
      tickerResponse.data,
      exchangeInfoResponse.data.symbols,
      true // Enable debug
    );
    
    const filteredPairs = filterResult.filteredPairs;
    console.log(`✅ Filtered to ${filteredPairs.length} valid USDT pairs`);
    
    // Prepare database operations
    console.log('\n💾 Preparing database operations...');
    const operations = [];
    
    for (const ticker of filteredPairs) {
      try {
        const stats = volumeData[ticker.symbol] || {
          volume: 0,
          priceChangePercent: 0,
          highPrice: parseFloat(ticker.price),
          lowPrice: parseFloat(ticker.price)
        };
        
        const exchangeInfo = exchangeInfoMap[ticker.symbol] || {
          isSpotTradingAllowed: true, // Default to true for filtered pairs
          quoteAsset: "USDT",
          baseAsset: ticker.symbol.replace('USDT', ''),
          permissions: [],
          status: "TRADING" // Default to TRADING for filtered pairs
        };
        
        const cryptoDoc = {
          symbol: ticker.symbol,
          price: parseFloat(ticker.price || 0),
          priceChangePercent24h: stats.priceChangePercent || 0,
          volume24h: stats.volume || 0,
          highPrice24h: stats.highPrice || parseFloat(ticker.price || 0),
          lowPrice24h: stats.lowPrice || parseFloat(ticker.price || 0),
          isSpotTradingAllowed: exchangeInfo.isSpotTradingAllowed === true,
          quoteAsset: exchangeInfo.quoteAsset || "USDT",
          baseAsset: exchangeInfo.baseAsset || ticker.symbol.replace('USDT', ''),
          permissions: exchangeInfo.permissions || [],
          status: exchangeInfo.status === 'BREAK' ? 'BREAK' : 'TRADING', // Allow BREAK status
          lastUpdated: new Date(),
          historical: [],
          rsi: null,
          isFavorite: false
        };
        
        operations.push({
          insertOne: {
            document: cryptoDoc
          }
        });
        
      } catch (error) {
        console.error(`❌ Error processing ${ticker.symbol}:`, error.message);
      }
    }
    
    console.log(`📊 Prepared ${operations.length} insert operations`);
    
    // Execute bulk operations
    console.log('\n💽 Inserting all pairs into database...');
    const result = await Crypto.bulkWrite(operations);
    
    console.log('✅ Bulk write completed:');
    console.log(`   - Inserted: ${result.insertedCount} pairs`);
    
    // Verify final counts
    const totalCount = await Crypto.countDocuments({});
    const usdtCount = await Crypto.countDocuments({
      symbol: { $regex: /USDT$/i }
    });
    const activeCount = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: { $in: ["TRADING", "BREAK"] }, // Include both TRADING and BREAK
      isSpotTradingAllowed: true
    });
    
    console.log(`\n📊 FINAL DATABASE VERIFICATION:`);
    console.log(`   - Total pairs inserted: ${totalCount}`);
    console.log(`   - USDT pairs: ${usdtCount}`);
    console.log(`   - Active USDT pairs (TRADING + BREAK): ${activeCount}`);
    
    // Test the API endpoint to see what it returns now
    console.log('\n🔍 Testing API endpoint...');
    try {
      const apiResponse = await axios.get('http://localhost:5000/api/crypto?limit=1000', {
        timeout: 10000
      });
      console.log(`✅ API now returns: ${apiResponse.data.cryptos?.length || 0} pairs`);
    } catch (apiError) {
      console.log(`⚠️ Could not test API (server might not be running): ${apiError.message}`);
    }
    
    // Show breakdown by status
    console.log('\n📊 PAIRS BY STATUS:');
    const statusCounts = await Crypto.aggregate([
      { $match: { symbol: { $regex: /USDT$/i } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    statusCounts.forEach(status => {
      console.log(`   ${status._id}: ${status.count} pairs`);
    });
    
    // Show sample pairs
    console.log('\n📋 SAMPLE PAIRS ADDED:');
    const samplePairs = await Crypto.find({})
      .limit(10)
      .select('symbol price status isSpotTradingAllowed quoteAsset')
      .lean();
      
    samplePairs.forEach((pair, index) => {
      console.log(`   ${index + 1}. ${pair.symbol} - $${pair.price} (${pair.status}, spot: ${pair.isSpotTradingAllowed})`);
    });
    
    return {
      inserted: result.insertedCount,
      total: totalCount,
      active: activeCount
    };
    
  } catch (error) {
    console.error('❌ Error populating database:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  populateAllPairs()
    .then((result) => {
      console.log('\n🎉 DATABASE POPULATION COMPLETED!');
      console.log(`✅ Successfully inserted ${result.inserted} trading pairs`);
      console.log(`📊 Total database pairs: ${result.total}`);
      console.log(`📊 Active USDT pairs: ${result.active}`);
      
      if (result.active >= 500) {
        console.log('\n🌟 SUCCESS! Your localhost should now show ~564 pairs!');
        console.log('💡 Refresh your browser to see all pairs.');
        console.log('🚀 Your system now has the complete set of Binance USDT pairs!');
      } else {
        console.log(`\n⚠️ Warning: Only ${result.active} active pairs (expected ~564)`);
        console.log('🔧 Some pairs might not meet the filtering criteria');
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Database population failed:', error.message);
      console.error('🔧 Check your MongoDB connection and Binance API access.');
      process.exit(1);
    });
}

module.exports = { populateAllPairs };
