/**
 * Auto-Sync Monitoring Dashboard
 * Monitor and control the Binance pair synchronization service
 */

const mongoose = require('mongoose');
const axios = require('axios');
const Crypto = require('./server/models/cryptoModel');
const BinancePairSyncService = require('./auto_sync_pairs');
require('dotenv').config();

class AutoSyncMonitor {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/binance-alerts';
  }

  /**
   * Show current sync status
   */
  async showStatus() {
    try {
      await mongoose.connect(this.mongoUri);
      
      console.log('📊 AUTO-SYNC STATUS DASHBOARD');
      console.log('============================\n');
      
      // Database statistics
      const totalPairs = await Crypto.countDocuments({});
      const usdtPairs = await Crypto.countDocuments({ symbol: { $regex: /USDT$/i } });
      const activePairs = await Crypto.countDocuments({
        quoteAsset: "USDT",
        status: { $in: ["TRADING", "BREAK"] },
        isSpotTradingAllowed: true
      });
      
      console.log('💾 DATABASE STATUS:');
      console.log(`   Total pairs: ${totalPairs}`);
      console.log(`   USDT pairs: ${usdtPairs}`);
      console.log(`   Active pairs: ${activePairs}`);
      
      // Last update timestamps
      const recentlyUpdated = await Crypto.find({})
        .sort({ lastUpdated: -1 })
        .limit(1)
        .select('symbol lastUpdated');
        
      if (recentlyUpdated.length > 0) {
        const lastUpdate = recentlyUpdated[0].lastUpdated;
        const minutesAgo = Math.round((new Date() - lastUpdate) / (1000 * 60));
        console.log(`   Last update: ${minutesAgo} minutes ago (${recentlyUpdated[0].symbol})`);
      }
      
      // Test API endpoint
      console.log('\n🌐 API ENDPOINT STATUS:');
      try {
        const startTime = Date.now();
        const response = await axios.get('http://localhost:5000/api/crypto?limit=10', {
          timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        console.log(`   Status: ✅ ONLINE`);
        console.log(`   Response time: ${responseTime}ms`);
        console.log(`   Pairs returned: ${response.data.cryptos?.length || 0}`);
        console.log(`   Data source: ${response.data.dataSource || 'unknown'}`);
      } catch (apiError) {
        console.log(`   Status: ❌ OFFLINE`);
        console.log(`   Error: ${apiError.message}`);
      }
      
      // Sync recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      if (activePairs < 500) {
        console.log(`   ⚠️  Low pair count (${activePairs}) - consider running sync`);
      } else {
        console.log(`   ✅ Good pair count (${activePairs})`);
      }
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.error('❌ Status check failed:', error.message);
    }
  }

  /**
   * Run manual sync
   */
  async runManualSync() {
    try {
      console.log('🔄 MANUAL SYNC INITIATED');
      console.log('=======================\n');
      
      const results = await BinancePairSyncService.runOnceSync();
      
      if (results) {
        console.log('\n✅ MANUAL SYNC COMPLETED');
        console.log(`   Added: ${results.added} pairs`);
        console.log(`   Removed: ${results.removed} pairs`);
        console.log(`   Updated: ${results.updated} pairs`);
        console.log(`   Errors: ${results.errors || 0}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Manual sync failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Show sync history
   */
  async showHistory() {
    try {
      await mongoose.connect(this.mongoUri);
      
      console.log('📈 SYNC HISTORY');
      console.log('===============\n');
      
      // Get pairs added in last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPairs = await Crypto.find({
        createdAt: { $gte: yesterday }
      }).select('symbol createdAt').sort({ createdAt: -1 }).limit(20);
      
      if (recentPairs.length > 0) {
        console.log(`📅 PAIRS ADDED IN LAST 24 HOURS (${recentPairs.length}):`);
        recentPairs.forEach((pair, index) => {
          const hoursAgo = Math.round((new Date() - pair.createdAt) / (1000 * 60 * 60));
          console.log(`   ${index + 1}. ${pair.symbol} (${hoursAgo}h ago)`);
        });
      } else {
        console.log('📅 NO PAIRS ADDED IN LAST 24 HOURS');
      }
      
      // Show update frequency
      const updateStats = await Crypto.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d %H:00",
                date: "$lastUpdated"
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 10 }
      ]);
      
      if (updateStats.length > 0) {
        console.log('\n🕐 UPDATE ACTIVITY (last 10 hours):');
        updateStats.forEach((stat, index) => {
          console.log(`   ${stat._id}: ${stat.count} pairs updated`);
        });
      }
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.error('❌ History check failed:', error.message);
    }
  }

  /**
   * Test sync service
   */
  async testSync() {
    try {
      console.log('🧪 TESTING SYNC SERVICE');
      console.log('======================\n');
      
      // Test Binance API connectivity
      console.log('1. Testing Binance API...');
      const binanceTest = await axios.get('https://api.binance.com/api/v3/ping', {
        timeout: 5000
      });
      console.log('   ✅ Binance API is reachable');
      
      // Test database connectivity
      console.log('2. Testing database...');
      await mongoose.connect(this.mongoUri);
      console.log('   ✅ Database connection successful');
      
      // Test sync service
      console.log('3. Testing sync service...');
      const testService = new BinancePairSyncService();
      console.log('   ✅ Sync service initialized');
      
      console.log('\n🎉 ALL TESTS PASSED - Sync service is ready!');
      
      await mongoose.disconnect();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Command line interface
async function main() {
  const monitor = new AutoSyncMonitor();
  const command = process.argv[2] || 'status';
  
  switch (command.toLowerCase()) {
    case 'status':
      await monitor.showStatus();
      break;
      
    case 'sync':
      await monitor.runManualSync();
      break;
      
    case 'history':
      await monitor.showHistory();
      break;
      
    case 'test':
      await monitor.testSync();
      break;
      
    case 'help':
      console.log('🔍 AUTO-SYNC MONITOR COMMANDS:');
      console.log('=============================');
      console.log('');
      console.log('node monitor_autosync.js status   - Show current status');
      console.log('node monitor_autosync.js sync     - Run manual sync');
      console.log('node monitor_autosync.js history  - Show sync history');
      console.log('node monitor_autosync.js test     - Test sync service');
      console.log('node monitor_autosync.js help     - Show this help');
      console.log('');
      break;
      
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('💡 Use "help" to see available commands');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Monitor failed:', error.message);
    process.exit(1);
  });
}

module.exports = AutoSyncMonitor;
