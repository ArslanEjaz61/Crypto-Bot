/**
 * ⚡ OPTIMIZED CRON JOBS
 *
 * Uses Redis/WebSocket data instead of Binance API calls
 * Only syncs to database for persistence
 */

const cron = require("node-cron");
const Crypto = require("../models/cryptoModel");
const {
  getMultiplePrices,
  initRedis,
} = require("../controllers/fastCryptoController");

// Track MongoDB connection
let isMongoConnected = true;

/**
 * Update crypto data from Redis (not Binance API)
 * Much faster and no rate limiting
 */
const updateCryptoDataFromRedis = async () => {
  try {
    console.log("🔄 Syncing Redis data to MongoDB...");

    // Initialize Redis
    await initRedis();

    // Get all USDT pairs from database
    const cryptos = await Crypto.find({
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true,
    }).select("symbol");

    if (cryptos.length === 0) {
      console.log("⚠️ No cryptos in database yet");
      return;
    }

    const symbols = cryptos.map((c) => c.symbol);
    console.log(`📊 Found ${symbols.length} symbols to update`);

    // Get live prices from Redis (FAST)
    const livePrices = await getMultiplePrices(symbols);
    const priceCount = Object.keys(livePrices).length;

    console.log(`⚡ Got ${priceCount} live prices from Redis`);

    if (priceCount === 0) {
      console.log("⚠️ No live prices in Redis. Is WebSocket service running?");
      return;
    }

    // Update database with live prices (batch operation)
    let updated = 0;
    let failed = 0;

    const bulkOps = [];

    for (const [symbol, priceData] of Object.entries(livePrices)) {
      bulkOps.push({
        updateOne: {
          filter: { symbol },
          update: {
            $set: {
              price: priceData.price,
              volume24h: priceData.volume,
              priceChangePercent24h: priceData.priceChangePercent,
              highPrice: priceData.high24h,
              lowPrice: priceData.low24h,
              openPrice: priceData.open24h,
              lastUpdated: new Date(),
            },
          },
        },
      });
    }

    // Execute bulk operation
    if (bulkOps.length > 0) {
      const result = await Crypto.bulkWrite(bulkOps);
      updated = result.modifiedCount;
      console.log(`✅ Updated ${updated} cryptos in database`);
    }

    console.log(`📊 Sync complete: ${updated} updated, ${failed} failed`);
  } catch (error) {
    console.error("❌ Error syncing Redis to database:", error.message);
  }
};

/**
 * Setup optimized cron jobs
 * Only syncs Redis data to database, no Binance API calls
 */
const setupOptimizedCronJobs = () => {
  console.log("⚡ Setting up optimized cron jobs...");

  // Sync Redis to Database every 2 minutes
  // (WebSocket updates Redis continuously, we just persist to DB)
  cron.schedule("*/2 * * * *", async () => {
    console.log("⏰ Cron: Syncing Redis to Database");
    await updateCryptoDataFromRedis();
  });

  console.log("✅ Optimized cron jobs configured:");
  console.log("   - Redis → DB sync: Every 2 minutes");
  console.log("   - No Binance API calls (WebSocket handles it)");

  // Initial sync
  setTimeout(() => {
    updateCryptoDataFromRedis().catch((err) => {
      console.error("Initial sync failed:", err.message);
    });
  }, 5000); // Wait 5 seconds for WebSocket to populate Redis
};

module.exports = {
  setupOptimizedCronJobs,
  updateCryptoDataFromRedis,
};
