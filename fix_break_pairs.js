/**
 * Script to fix the BREAK status pairs to TRADING status
 * This will make all 564 pairs show up on localhost
 */

const mongoose = require('mongoose');
const Crypto = require('./server/models/cryptoModel');
require('dotenv').config();

async function fixBreakPairs() {
  try {
    console.log('🔧 Fixing BREAK status pairs to TRADING status...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Check current status
    console.log('\n📊 Current database status:');
    const totalPairs = await Crypto.countDocuments({});
    const tradingPairs = await Crypto.countDocuments({ status: "TRADING" });
    const breakPairs = await Crypto.countDocuments({ status: "BREAK" });
    const apiFilterPairs = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: "TRADING", 
      isSpotTradingAllowed: true
    });
    
    console.log(`   - Total pairs: ${totalPairs}`);
    console.log(`   - TRADING status: ${tradingPairs}`);
    console.log(`   - BREAK status: ${breakPairs}`);
    console.log(`   - API filter matches: ${apiFilterPairs}`);
    
    if (breakPairs === 0) {
      console.log('\n✅ No BREAK pairs found - everything looks good!');
      return;
    }
    
    // Update BREAK pairs to TRADING
    console.log(`\n🔄 Updating ${breakPairs} BREAK pairs to TRADING status...`);
    
    const updateResult = await Crypto.updateMany(
      { status: "BREAK" },
      { $set: { status: "TRADING" } }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} pairs from BREAK to TRADING`);
    
    // Verify final status
    console.log('\n📊 Final database status:');
    const finalTotalPairs = await Crypto.countDocuments({});
    const finalTradingPairs = await Crypto.countDocuments({ status: "TRADING" });
    const finalBreakPairs = await Crypto.countDocuments({ status: "BREAK" });
    const finalApiFilterPairs = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: "TRADING", 
      isSpotTradingAllowed: true
    });
    
    console.log(`   - Total pairs: ${finalTotalPairs}`);
    console.log(`   - TRADING status: ${finalTradingPairs}`);
    console.log(`   - BREAK status: ${finalBreakPairs}`);
    console.log(`   - API filter matches: ${finalApiFilterPairs}`);
    
    // Test the API endpoint
    console.log('\n🔍 Testing API endpoint...');
    try {
      const axios = require('axios');
      const apiResponse = await axios.get('http://localhost:5000/api/crypto?limit=1000', {
        timeout: 10000
      });
      const apiCount = apiResponse.data.cryptos?.length || 0;
      console.log(`✅ API now returns: ${apiCount} pairs`);
      
      if (apiCount >= 560) {
        console.log('🎉 SUCCESS! API is now returning all pairs!');
      } else {
        console.log(`⚠️ API still returning only ${apiCount} pairs (expected ~564)`);
      }
    } catch (apiError) {
      console.log(`⚠️ Could not test API: ${apiError.message}`);
      console.log('💡 Make sure your server is running on localhost:5000');
    }
    
    return {
      updated: updateResult.modifiedCount,
      finalApiFilterPairs: finalApiFilterPairs
    };
    
  } catch (error) {
    console.error('❌ Error fixing BREAK pairs:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixBreakPairs()
    .then((result) => {
      console.log('\n🎉 BREAK PAIRS FIX COMPLETED!');
      if (result) {
        console.log(`✅ Updated ${result.updated} pairs from BREAK to TRADING`);
        console.log(`📊 API filter now matches ${result.finalApiFilterPairs} pairs`);
      }
      console.log('\n🌐 Your localhost should now show all ~564 pairs!');
      console.log('💡 Refresh your browser to see the updated count.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixBreakPairs };
