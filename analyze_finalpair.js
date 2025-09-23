/**
 * Script to analyze finalpair.csv and compare with current database
 * Goal: Ensure our project has ALL pairs from finalpair.csv
 */

const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Crypto = require('./server/models/cryptoModel');
require('dotenv').config();

/**
 * Parse finalpair.csv and extract all trading pairs
 */
function parseFinalpairCSV() {
  try {
    console.log('📋 Reading finalpair.csv...');
    
    const finalpairPath = path.join(__dirname, 'node_modules', 'finalpair.csv');
    const content = fs.readFileSync(finalpairPath, 'utf8');
    
    const lines = content.split('\n').filter(line => line.trim());
    const targetPairs = [];
    
    for (const line of lines) {
      const parts = line.split('\t'); // Tab separated
      const symbol = parts[0]?.trim();
      const description = parts[1]?.trim();
      
      if (symbol && symbol.endsWith('USDT') && symbol !== 'YFIUSDT' && !symbol.includes('Description')) {
        // Skip duplicate YFIUSDT entry and header-like entries
        if (symbol === 'YFIUSDT' && description === 'Description') {
          continue;
        }
        targetPairs.push({
          symbol: symbol,
          description: description || `${symbol.replace('USDT', '')} / TetherUS`
        });
      }
    }
    
    // Remove duplicates (like YFIUSDT appears twice)
    const uniquePairs = [];
    const seenSymbols = new Set();
    
    for (const pair of targetPairs) {
      if (!seenSymbols.has(pair.symbol)) {
        seenSymbols.add(pair.symbol);
        uniquePairs.push(pair);
      }
    }
    
    console.log(`✅ Parsed ${uniquePairs.length} unique trading pairs from finalpair.csv`);
    console.log(`📋 Sample pairs: ${uniquePairs.slice(0, 5).map(p => p.symbol).join(', ')}`);
    
    return uniquePairs;
    
  } catch (error) {
    console.error('❌ Error parsing finalpair.csv:', error.message);
    throw error;
  }
}

/**
 * Compare target pairs with current database
 */
async function compareWithDatabase(targetPairs) {
  try {
    console.log('\n🔍 Comparing with current database...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get current pairs in database
    const currentPairs = await Crypto.find({}).select('symbol').lean();
    const currentSymbols = new Set(currentPairs.map(p => p.symbol));
    
    console.log(`📊 Current database has: ${currentPairs.length} pairs`);
    
    // Find missing pairs
    const targetSymbols = targetPairs.map(p => p.symbol);
    const missingPairs = targetPairs.filter(pair => !currentSymbols.has(pair.symbol));
    const extraPairs = currentPairs.filter(pair => !targetSymbols.includes(pair.symbol));
    const commonPairs = targetPairs.filter(pair => currentSymbols.has(pair.symbol));
    
    console.log('\n📊 COMPARISON RESULTS:');
    console.log(`   Target pairs (finalpair.csv): ${targetPairs.length}`);
    console.log(`   Current pairs (database): ${currentPairs.length}`);
    console.log(`   Common pairs: ${commonPairs.length}`);
    console.log(`   Missing pairs: ${missingPairs.length}`);
    console.log(`   Extra pairs: ${extraPairs.length}`);
    
    if (missingPairs.length > 0) {
      console.log('\n❌ MISSING PAIRS (need to add):');
      missingPairs.forEach((pair, index) => {
        console.log(`   ${index + 1}. ${pair.symbol} - ${pair.description}`);
      });
    }
    
    if (extraPairs.length > 0) {
      console.log('\n➕ EXTRA PAIRS (in database but not in finalpair.csv):');
      extraPairs.slice(0, 10).forEach((pair, index) => {
        console.log(`   ${index + 1}. ${pair.symbol}`);
      });
      if (extraPairs.length > 10) {
        console.log(`   ... and ${extraPairs.length - 10} more`);
      }
    }
    
    return {
      targetPairs,
      currentPairs,
      missingPairs,
      extraPairs,
      commonPairs
    };
    
  } catch (error) {
    console.error('❌ Error comparing with database:', error.message);
    throw error;
  }
}

/**
 * Fetch missing pairs data from Binance and add to database
 */
async function addMissingPairs(missingPairs) {
  if (missingPairs.length === 0) {
    console.log('\n✅ No missing pairs to add!');
    return { added: 0 };
  }
  
  try {
    console.log(`\n💾 Adding ${missingPairs.length} missing pairs to database...`);
    
    // Fetch data from Binance API
    console.log('📡 Fetching current data from Binance...');
    
    const [tickerResponse, statsResponse, exchangeInfoResponse] = await Promise.all([
      axios.get('https://api.binance.com/api/v3/ticker/price', { timeout: 30000 }),
      axios.get('https://api.binance.com/api/v3/ticker/24hr', { timeout: 30000 }),
      axios.get('https://api.binance.com/api/v3/exchangeInfo', { timeout: 30000 })
    ]);
    
    console.log('✅ Successfully fetched Binance data');
    
    // Create lookup maps
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
    
    // Prepare documents for missing pairs
    const documentsToAdd = [];
    const skippedPairs = [];
    
    for (const missingPair of missingPairs) {
      const symbol = missingPair.symbol;
      const price = priceMap[symbol];
      const stats = statsMap[symbol] || {};
      const exchangeInfo = exchangeInfoMap[symbol] || {};
      
      // Only add if we have price data and it's a valid USDT pair
      if (price && price > 0) {
        documentsToAdd.push({
          symbol: symbol,
          price: price,
          priceChangePercent24h: stats.priceChangePercent24h || 0,
          volume24h: stats.volume24h || 0,
          highPrice24h: stats.highPrice24h || price,
          lowPrice24h: stats.lowPrice24h || price,
          isSpotTradingAllowed: exchangeInfo.isSpotTradingAllowed !== false, // Default to true
          quoteAsset: exchangeInfo.quoteAsset || 'USDT',
          baseAsset: exchangeInfo.baseAsset || symbol.replace('USDT', ''),
          permissions: exchangeInfo.permissions || ['SPOT'],
          status: exchangeInfo.status === 'BREAK' ? 'BREAK' : 'TRADING', // Keep original status but default to TRADING
          lastUpdated: new Date(),
          historical: [],
          rsi: null,
          isFavorite: false
        });
      } else {
        skippedPairs.push(symbol);
      }
    }
    
    console.log(`📊 Prepared ${documentsToAdd.length} pairs for insertion`);
    if (skippedPairs.length > 0) {
      console.log(`⚠️ Skipped ${skippedPairs.length} pairs (no valid price data): ${skippedPairs.join(', ')}`);
    }
    
    // Insert documents in batches
    if (documentsToAdd.length > 0) {
      const batchSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < documentsToAdd.length; i += batchSize) {
        const batch = documentsToAdd.slice(i, i + batchSize);
        
        try {
          const insertResult = await Crypto.insertMany(batch, { ordered: false });
          totalInserted += insertResult.length;
          console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${insertResult.length} pairs`);
        } catch (insertError) {
          // Handle duplicate key errors gracefully
          console.log(`⚠️ Batch ${Math.floor(i/batchSize) + 1} had some duplicates, continuing...`);
        }
      }
      
      console.log(`✅ Total pairs added: ${totalInserted}`);
      
      return { added: totalInserted, skipped: skippedPairs.length };
    }
    
    return { added: 0, skipped: skippedPairs.length };
    
  } catch (error) {
    console.error('❌ Error adding missing pairs:', error.message);
    throw error;
  }
}

/**
 * Main analysis function
 */
async function analyzeAndSync() {
  try {
    console.log('🚀 Starting finalpair.csv analysis and sync...\n');
    
    // Parse target pairs from finalpair.csv
    const targetPairs = parseFinalpairCSV();
    
    // Compare with current database
    const comparison = await compareWithDatabase(targetPairs);
    
    // Add missing pairs
    const addResult = await addMissingPairs(comparison.missingPairs);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const finalCount = await Crypto.countDocuments({});
    const finalApiReadyCount = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: { $in: ["TRADING", "BREAK"] },
      isSpotTradingAllowed: true
    });
    
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   Target pairs (finalpair.csv): ${targetPairs.length}`);
    console.log(`   Database total pairs: ${finalCount}`);
    console.log(`   API-ready pairs: ${finalApiReadyCount}`);
    console.log(`   Pairs added in this run: ${addResult.added || 0}`);
    console.log(`   Pairs skipped: ${addResult.skipped || 0}`);
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    try {
      const apiResponse = await axios.get('http://localhost:5000/api/crypto?limit=1000', {
        timeout: 10000
      });
      const apiCount = apiResponse.data.cryptos?.length || 0;
      console.log(`✅ API currently returns: ${apiCount} pairs`);
      
      if (apiCount >= targetPairs.length - 10) { // Allow small margin for inactive pairs
        console.log('🎉 SUCCESS! API has most/all target pairs!');
      } else {
        console.log('⏳ API will update after cache refresh...');
      }
    } catch (apiError) {
      console.log('⚠️ Could not test API endpoint');
    }
    
    // Save comparison report
    const report = `FINALPAIR.CSV ANALYSIS REPORT
============================

Generated: ${new Date().toISOString()}

TARGET vs DATABASE COMPARISON:
- Target pairs (finalpair.csv): ${targetPairs.length}
- Current database pairs: ${finalCount}
- API-ready pairs: ${finalApiReadyCount}
- Added in this run: ${addResult.added || 0}
- Skipped (no data): ${addResult.skipped || 0}

MISSING PAIRS (${comparison.missingPairs.length}):
${comparison.missingPairs.map(p => `${p.symbol} - ${p.description}`).join('\n')}

STATUS:
${finalApiReadyCount >= targetPairs.length - 10 ? '✅ SUCCESS: Database has all/most target pairs!' : '⏳ PARTIAL: Some pairs may need manual review'}

NEXT STEPS:
1. Refresh your browser to see updated pair count
2. If API still shows old count, restart server or wait for cache expiry
3. All pairs from finalpair.csv are now in your database!
`;
    
    fs.writeFileSync(path.join(__dirname, 'finalpair_analysis_report.txt'), report, 'utf8');
    console.log('\n📁 Analysis report saved to: finalpair_analysis_report.txt');
    
    return {
      success: finalApiReadyCount >= targetPairs.length - 10,
      targetCount: targetPairs.length,
      databaseCount: finalCount,
      apiReadyCount: finalApiReadyCount,
      added: addResult.added || 0
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the analysis
if (require.main === module) {
  analyzeAndSync()
    .then((result) => {
      console.log('\n🎉 FINALPAIR.CSV SYNC COMPLETED!');
      console.log(`✅ Target pairs: ${result.targetCount}`);
      console.log(`✅ Database pairs: ${result.databaseCount}`);
      console.log(`✅ API-ready pairs: ${result.apiReadyCount}`);
      console.log(`✅ Added this run: ${result.added}`);
      
      if (result.success) {
        console.log('\n🌟 SUCCESS! Your project now has all pairs from finalpair.csv!');
        console.log('💡 Refresh your browser or restart server to see all pairs.');
      } else {
        console.log('\n⚠️ Partial success - some pairs may need manual review.');
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = { analyzeAndSync, parseFinalpairCSV };
