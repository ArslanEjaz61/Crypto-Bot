/**
 * AUTOMATIC BINANCE PAIR SYNCHRONIZATION SERVICE
 *
 * This service automatically:
 * 1. Adds new pairs when they're listed on Binance
 * 2. Removes pairs when they're delisted from Binance
 * 3. Updates existing pairs with latest data
 * 4. Runs continuously to keep your project in sync
 */

const mongoose = require("mongoose");
const axios = require("axios");
const Crypto = require("./server/models/cryptoModel");
const { filterUSDTPairs } = require("./server/utils/pairFilter");
require("dotenv").config();

class BinancePairSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    this.mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/binance-alerts";
  }

  /**
   * Start the automatic synchronization service
   */
  async start() {
    try {
      console.log("🚀 Starting Binance Pair Auto-Sync Service...\n");

      // Connect to MongoDB
      await mongoose.connect(this.mongoUri);
      console.log("✅ Connected to MongoDB");

      // Run initial sync
      await this.performSync();

      // Set up recurring sync
      this.isRunning = true;
      this.syncInterval = setInterval(async () => {
        if (this.isRunning) {
          console.log("\n⏰ Running scheduled sync...");
          await this.performSync();
        }
      }, this.SYNC_INTERVAL_MS);

      console.log(
        `\n🔄 Auto-sync service started - will check every ${
          this.SYNC_INTERVAL_MS / 1000 / 60
        } minutes`
      );
      console.log("💡 Press Ctrl+C to stop the service");

      // Keep the process alive
      process.on("SIGINT", () => this.stop());
      process.on("SIGTERM", () => this.stop());
    } catch (error) {
      console.error("❌ Failed to start sync service:", error.message);
      throw error;
    }
  }

  /**
   * Stop the synchronization service
   */
  async stop() {
    console.log("\n🛑 Stopping Binance Pair Auto-Sync Service...");

    this.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    console.log("👋 Auto-sync service stopped");

    process.exit(0);
  }

  /**
   * Perform a complete synchronization
   */
  async performSync() {
    try {
      const startTime = new Date();
      console.log(`\n📡 === SYNC STARTED: ${startTime.toISOString()} ===`);

      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        console.log("⚠️ MongoDB not connected, skipping sync");
        return { error: "MongoDB not connected" };
      }

      // Fetch current Binance data
      const binanceData = await this.fetchBinanceData();
      if (!binanceData) {
        console.log("❌ Failed to fetch Binance data, skipping sync");
        return;
      }

      // Get current database pairs
      const databasePairs = await this.getDatabasePairs();

      // Analyze differences
      const analysis = this.analyzeDifferences(
        binanceData.pairs,
        databasePairs
      );

      // Apply changes
      const results = await this.applyChanges(analysis, binanceData);

      // Report results
      this.reportSyncResults(results, startTime);

      return results;
    } catch (error) {
      console.error("❌ Sync failed:", error.message);
      return { error: error.message };
    }
  }

  /**
   * Fetch current trading pairs from Binance API with memory optimization
   */
  async fetchBinanceData() {
    let tickerResponse = null;
    let statsResponse = null;
    let exchangeInfoResponse = null;

    try {
      console.log("📡 Fetching latest data from Binance...");

      const [tickerResponse, statsResponse, exchangeInfoResponse] =
        await Promise.all([
          axios.get("https://api.binance.com/api/v3/ticker/price", {
            timeout: 30000,
          }),
          axios.get("https://api.binance.com/api/v3/ticker/24hr", {
            timeout: 30000,
          }),
          axios.get("https://api.binance.com/api/v3/exchangeInfo", {
            timeout: 30000,
          }),
        ]);

      // Filter to get valid USDT pairs
      const filterResult = filterUSDTPairs(
        tickerResponse.data,
        exchangeInfoResponse.data.symbols,
        false // Disable debug for cleaner output
      );

      // Create lookup maps for quick access - only for filtered pairs
      const statsMap = {};
      const exchangeInfoMap = {};

      // Only process stats for filtered pairs to save memory
      const filteredSymbols = new Set(
        filterResult.filteredPairs.map((pair) => pair.symbol)
      );

      statsResponse.data.forEach((stat) => {
        if (filteredSymbols.has(stat.symbol)) {
          statsMap[stat.symbol] = {
            priceChangePercent24h: parseFloat(stat.priceChangePercent),
            volume24h:
              parseFloat(stat.quoteVolume) ||
              parseFloat(stat.volume) * parseFloat(stat.weightedAvgPrice),
            highPrice24h: parseFloat(stat.highPrice),
            lowPrice24h: parseFloat(stat.lowPrice),
          };
        }
      });

      exchangeInfoResponse.data.symbols.forEach((symbolInfo) => {
        if (filteredSymbols.has(symbolInfo.symbol)) {
          exchangeInfoMap[symbolInfo.symbol] = {
            isSpotTradingAllowed: symbolInfo.isSpotTradingAllowed,
            quoteAsset: symbolInfo.quoteAsset,
            baseAsset: symbolInfo.baseAsset,
            permissions: symbolInfo.permissions || [],
            status: symbolInfo.status,
          };
        }
      });

      // Clear large responses to free memory
      statsResponse = null;
      exchangeInfoResponse = null;

      console.log(
        `✅ Found ${filterResult.filteredPairs.length} active USDT pairs on Binance`
      );

      const result = {
        pairs: filterResult.filteredPairs.map((pair) => pair.symbol),
        tickerData: tickerResponse.data,
        statsMap: statsMap,
        exchangeInfoMap: exchangeInfoMap,
        filterResult: filterResult,
      };

      // Clear ticker response
      tickerResponse = null;

      return result;
    } catch (error) {
      console.error("❌ Error fetching Binance data:", error.message);

      // Clear all variables on error
      tickerResponse = null;
      statsResponse = null;
      exchangeInfoResponse = null;

      return null;
    }
  }

  /**
   * Get current trading pairs from database
   */
  async getDatabasePairs() {
    try {
      const pairs = await Crypto.find({})
        .select("symbol status isSpotTradingAllowed")
        .lean();
      console.log(`📊 Found ${pairs.length} pairs in database`);

      return pairs.map((pair) => ({
        symbol: pair.symbol,
        status: pair.status,
        isSpotTradingAllowed: pair.isSpotTradingAllowed,
      }));
    } catch (error) {
      console.error("❌ Error fetching database pairs:", error.message);
      return [];
    }
  }

  /**
   * Analyze differences between Binance and database
   */
  analyzeDifferences(binancePairs, databasePairs) {
    const binanceSet = new Set(binancePairs);
    const databaseSet = new Set(databasePairs.map((p) => p.symbol));

    const newPairs = binancePairs.filter((symbol) => !databaseSet.has(symbol));
    const delistedPairs = databasePairs.filter(
      (pair) => !binanceSet.has(pair.symbol)
    );
    const existingPairs = databasePairs.filter((pair) =>
      binanceSet.has(pair.symbol)
    );

    console.log("\n🔍 SYNC ANALYSIS:");
    console.log(`   Binance pairs: ${binancePairs.length}`);
    console.log(`   Database pairs: ${databasePairs.length}`);
    console.log(`   New pairs to add: ${newPairs.length}`);
    console.log(`   Pairs to delist: ${delistedPairs.length}`);
    console.log(`   Existing pairs to update: ${existingPairs.length}`);

    if (newPairs.length > 0) {
      console.log(
        `\n🆕 NEW PAIRS:`,
        newPairs.slice(0, 10).join(", ") +
          (newPairs.length > 10 ? ` (+${newPairs.length - 10} more)` : "")
      );
    }

    if (delistedPairs.length > 0) {
      console.log(
        `\n🗑️ DELISTED PAIRS:`,
        delistedPairs
          .map((p) => p.symbol)
          .slice(0, 10)
          .join(", ") +
          (delistedPairs.length > 10
            ? ` (+${delistedPairs.length - 10} more)`
            : "")
      );
    }

    return {
      newPairs,
      delistedPairs,
      existingPairs,
      binancePairs,
      databasePairs,
    };
  }

  /**
   * Apply changes to the database
   */
  async applyChanges(analysis, binanceData) {
    const results = {
      added: 0,
      removed: 0,
      updated: 0,
      errors: 0,
    };

    try {
      // 1. Add new pairs
      if (analysis.newPairs.length > 0) {
        console.log(`\n➕ Adding ${analysis.newPairs.length} new pairs...`);
        const addResult = await this.addNewPairs(
          analysis.newPairs,
          binanceData
        );
        results.added = addResult.added;
        results.errors += addResult.errors;
      }

      // 2. Remove delisted pairs
      if (analysis.delistedPairs.length > 0) {
        console.log(
          `\n➖ Removing ${analysis.delistedPairs.length} delisted pairs...`
        );
        const removeResult = await this.removeDelistedPairs(
          analysis.delistedPairs
        );
        results.removed = removeResult.removed;
        results.errors += removeResult.errors;
      }

      // 3. Update existing pairs
      if (analysis.existingPairs.length > 0) {
        console.log(
          `\n🔄 Updating ${analysis.existingPairs.length} existing pairs...`
        );
        const updateResult = await this.updateExistingPairs(
          analysis.existingPairs,
          binanceData
        );
        results.updated = updateResult.updated;
        results.errors += updateResult.errors;
      }

      return results;
    } catch (error) {
      console.error("❌ Error applying changes:", error.message);
      results.errors++;
      return results;
    }
  }

  /**
   * Add new pairs to database
   */
  async addNewPairs(newPairs, binanceData) {
    const results = { added: 0, errors: 0 };

    try {
      const documentsToAdd = [];

      for (const symbol of newPairs) {
        try {
          const ticker = binanceData.tickerData.find(
            (t) => t.symbol === symbol
          );
          const stats = binanceData.statsMap[symbol] || {};
          const exchangeInfo = binanceData.exchangeInfoMap[symbol] || {};

          if (ticker && parseFloat(ticker.price) > 0) {
            documentsToAdd.push({
              symbol: symbol,
              price: parseFloat(ticker.price),
              priceChangePercent24h: stats.priceChangePercent24h || 0,
              volume24h: stats.volume24h || 0,
              highPrice24h: stats.highPrice24h || parseFloat(ticker.price),
              lowPrice24h: stats.lowPrice24h || parseFloat(ticker.price),
              isSpotTradingAllowed: exchangeInfo.isSpotTradingAllowed !== false,
              quoteAsset: exchangeInfo.quoteAsset || "USDT",
              baseAsset: exchangeInfo.baseAsset || symbol.replace("USDT", ""),
              permissions: exchangeInfo.permissions || ["SPOT"],
              status: exchangeInfo.status === "BREAK" ? "BREAK" : "TRADING",
              lastUpdated: new Date(),
              historical: [],
              rsi: null,
              isFavorite: false,
            });
          }
        } catch (error) {
          console.error(`❌ Error preparing ${symbol}:`, error.message);
          results.errors++;
        }
      }

      if (documentsToAdd.length > 0) {
        const insertResult = await Crypto.insertMany(documentsToAdd, {
          ordered: false,
        });
        results.added = insertResult.length;
        console.log(`✅ Added ${results.added} new pairs successfully`);

        // Log some examples
        if (results.added > 0) {
          const examples = documentsToAdd.slice(0, 3).map((d) => d.symbol);
          console.log(`   Examples: ${examples.join(", ")}`);
        }
      }
    } catch (error) {
      console.error("❌ Error adding new pairs:", error.message);
      results.errors++;
    }

    return results;
  }

  /**
   * Remove delisted pairs from database
   */
  async removeDelistedPairs(delistedPairs) {
    const results = { removed: 0, errors: 0 };

    try {
      const symbolsToRemove = delistedPairs.map((p) => p.symbol);

      if (symbolsToRemove.length > 0) {
        const deleteResult = await Crypto.deleteMany({
          symbol: { $in: symbolsToRemove },
        });

        results.removed = deleteResult.deletedCount;
        console.log(
          `✅ Removed ${results.removed} delisted pairs successfully`
        );

        // Log some examples
        if (results.removed > 0) {
          const examples = symbolsToRemove.slice(0, 3);
          console.log(`   Examples: ${examples.join(", ")}`);
        }
      }
    } catch (error) {
      console.error("❌ Error removing delisted pairs:", error.message);
      results.errors++;
    }

    return results;
  }

  /**
   * Update existing pairs with latest data
   */
  async updateExistingPairs(existingPairs, binanceData) {
    const results = { updated: 0, errors: 0 };

    try {
      const bulkOps = [];

      for (const pair of existingPairs) {
        try {
          const symbol = pair.symbol;
          const ticker = binanceData.tickerData.find(
            (t) => t.symbol === symbol
          );
          const stats = binanceData.statsMap[symbol] || {};
          const exchangeInfo = binanceData.exchangeInfoMap[symbol] || {};

          if (ticker && parseFloat(ticker.price) > 0) {
            bulkOps.push({
              updateOne: {
                filter: { symbol: symbol },
                update: {
                  $set: {
                    price: parseFloat(ticker.price),
                    priceChangePercent24h: stats.priceChangePercent24h || 0,
                    volume24h: stats.volume24h || 0,
                    highPrice24h:
                      stats.highPrice24h || parseFloat(ticker.price),
                    lowPrice24h: stats.lowPrice24h || parseFloat(ticker.price),
                    isSpotTradingAllowed:
                      exchangeInfo.isSpotTradingAllowed !== false,
                    status:
                      exchangeInfo.status === "BREAK" ? "BREAK" : "TRADING",
                    lastUpdated: new Date(),
                  },
                },
              },
            });
          }
        } catch (error) {
          console.error(
            `❌ Error preparing update for ${pair.symbol}:`,
            error.message
          );
          results.errors++;
        }
      }

      if (bulkOps.length > 0) {
        const updateResult = await Crypto.bulkWrite(bulkOps);
        results.updated = updateResult.modifiedCount;
        console.log(
          `✅ Updated ${results.updated} existing pairs successfully`
        );
      }
    } catch (error) {
      console.error("❌ Error updating existing pairs:", error.message);
      results.errors++;
    }

    return results;
  }

  /**
   * Report sync results
   */
  reportSyncResults(results, startTime) {
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`\n📊 === SYNC COMPLETED: ${endTime.toISOString()} ===`);
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log(`➕ New pairs added: ${results.added}`);
    console.log(`➖ Delisted pairs removed: ${results.removed}`);
    console.log(`🔄 Existing pairs updated: ${results.updated}`);
    console.log(`❌ Errors: ${results.errors}`);

    if (results.added > 0 || results.removed > 0) {
      console.log(
        "\n🎉 Your trading pairs list has been synchronized with Binance!"
      );
      console.log("💡 Refresh your browser to see the changes.");
    } else {
      console.log(
        "\n✅ No changes needed - your list is already in sync with Binance."
      );
    }

    console.log(
      `\n⏰ Next sync in ${this.SYNC_INTERVAL_MS / 1000 / 60} minutes...`
    );
  }

  /**
   * Run a one-time sync (for manual execution)
   */
  static async runOnceSync() {
    const service = new BinancePairSyncService();

    try {
      await mongoose.connect(service.mongoUri);
      console.log("✅ Connected to MongoDB");

      const results = await service.performSync();

      await mongoose.disconnect();
      console.log("\n🔌 Disconnected from MongoDB");

      return results;
    } catch (error) {
      console.error("❌ One-time sync failed:", error.message);
      throw error;
    }
  }
}

// Export for use as a service
module.exports = BinancePairSyncService;

// Run as standalone script
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes("--once")) {
    // Run once and exit
    console.log("🔄 Running one-time sync...");
    BinancePairSyncService.runOnceSync()
      .then((results) => {
        console.log("\n✅ One-time sync completed successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("\n💥 One-time sync failed:", error.message);
        process.exit(1);
      });
  } else {
    // Run as continuous service
    const service = new BinancePairSyncService();
    service.start().catch((error) => {
      console.error("💥 Service failed to start:", error.message);
      process.exit(1);
    });
  }
}
