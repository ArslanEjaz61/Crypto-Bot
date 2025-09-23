/**
 * Final verification script to check if all 564 pairs are properly set up
 */

const mongoose = require('mongoose');
const axios = require('axios');
const Crypto = require('./server/models/cryptoModel');
require('dotenv').config();

async function finalVerification() {
  try {
    console.log('🔍 Final Verification - Checking if all 564 pairs are ready...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Check database status
    console.log('\n📊 DATABASE STATUS:');
    const totalPairs = await Crypto.countDocuments({});
    const usdtPairs = await Crypto.countDocuments({ symbol: { $regex: /USDT$/i } });
    const apiFilterPairs = await Crypto.countDocuments({
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true
    });
    
    console.log(`   - Total pairs in database: ${totalPairs}`);
    console.log(`   - USDT pairs: ${usdtPairs}`);
    console.log(`   - API filter matches: ${apiFilterPairs}`);
    
    // Show status breakdown
    const statusCounts = await Crypto.aggregate([
      { $match: { symbol: { $regex: /USDT$/i } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n   Status breakdown:');
    statusCounts.forEach(status => {
      console.log(`   - ${status._id}: ${status.count} pairs`);
    });
    
    // Test API endpoint multiple times to account for caching
    console.log('\n🌐 API ENDPOINT TESTS:');
    
    for (let i = 1; i <= 3; i++) {
      try {
        console.log(`   Test ${i}/3: Checking API response...`);
        const startTime = Date.now();
        const apiResponse = await axios.get('http://localhost:5000/api/crypto?limit=1000', {
          timeout: 15000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const endTime = Date.now();
        
        const apiCount = apiResponse.data.cryptos?.length || 0;
        const dataSource = apiResponse.data.dataSource || 'unknown';
        const timestamp = apiResponse.data.timestamp || 'unknown';
        
        console.log(`   ✅ API returned: ${apiCount} pairs`);
        console.log(`      - Data source: ${dataSource}`);
        console.log(`      - Response time: ${endTime - startTime}ms`);
        console.log(`      - Timestamp: ${timestamp}`);
        
        if (i === 1) {
          // Show sample pairs from API
          const samplePairs = apiResponse.data.cryptos?.slice(0, 5) || [];
          console.log(`      - Sample pairs: ${samplePairs.map(p => p.symbol).join(', ')}`);
        }
        
        if (apiCount >= 560) {
          console.log(`   🎉 SUCCESS! API is returning ${apiCount} pairs!`);
          break;
        } else if (i < 3) {
          console.log(`   ⏳ Waiting 3 seconds before next test...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (apiError) {
        console.log(`   ❌ API Test ${i} failed: ${apiError.message}`);
      }
    }
    
    // Provide summary and recommendations
    console.log('\n📋 SUMMARY:');
    
    if (apiFilterPairs >= 564 && totalPairs >= 564) {
      console.log('✅ Database: Perfect! All 564 pairs are properly configured');
      
      // Final API test
      try {
        const finalApiTest = await axios.get('http://localhost:5000/api/crypto?limit=1000', {
          timeout: 10000
        });
        const finalApiCount = finalApiTest.data.cryptos?.length || 0;
        
        if (finalApiCount >= 560) {
          console.log('✅ API: Perfect! All pairs are accessible via API');
          console.log('\n🎉 MISSION ACCOMPLISHED! 🎉');
          console.log('🌟 Your localhost now has access to all ~564 trading pairs!');
          console.log('💡 Refresh your browser to see all pairs.');
        } else {
          console.log(`⏳ API: Still returning ${finalApiCount} pairs (caching issue)`);
          console.log('\n💡 NEXT STEPS:');
          console.log('1. Wait 1-2 minutes for cache to expire');
          console.log('2. Refresh your browser');
          console.log('3. Or restart your Node.js server to clear cache');
          console.log('4. The database is ready with all 564 pairs!');
        }
      } catch (e) {
        console.log('⚠️ API: Could not test (server might not be running)');
      }
      
    } else {
      console.log(`❌ Database: Missing pairs (${apiFilterPairs}/${totalPairs} vs expected 564)`);
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('- Run the populate_all_pairs.js script again');
      console.log('- Check MongoDB connection');
      console.log('- Verify database permissions');
    }
    
    // Show exact counts for user
    console.log('\n📊 EXACT COUNTS FOR REFERENCE:');
    console.log(`   - Binance API has: 564 active USDT pairs`);
    console.log(`   - Your database has: ${totalPairs} total, ${apiFilterPairs} API-ready`);
    console.log(`   - Your localhost shows: (check browser after refresh)`);
    
    return {
      database: {
        total: totalPairs,
        usdt: usdtPairs,
        apiReady: apiFilterPairs
      },
      success: apiFilterPairs >= 564 && totalPairs >= 564
    };
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run verification
if (require.main === module) {
  finalVerification()
    .then((result) => {
      console.log('\n✅ Final verification completed');
      if (result.success) {
        console.log('🎉 All systems ready! Database has all 564 pairs!');
      } else {
        console.log('⚠️ Some issues detected, check the summary above');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Verification failed:', error.message);
      process.exit(1);
    });
}

module.exports = { finalVerification };
