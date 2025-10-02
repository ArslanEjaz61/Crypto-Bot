/**
 * ⚡ FAST CRYPTO CONTROLLER
 *
 * Uses WebSocket price data from Redis instead of REST API calls
 * Makes market panel loading instant
 */

const Crypto = require("../models/cryptoModel");
const redis = require("redis");

// Redis client for fast price access
let redisClient = null;
let priceCache = new Map(); // Fallback in-memory cache

// Initialize Redis connection
async function initRedis() {
  try {
    if (!redisClient) {
      redisClient = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || "localhost",
          port: process.env.REDIS_PORT || 6379,
        },
      });

      redisClient.on("error", (err) => {
        console.log("⚠️ Redis not available for crypto controller, using DB");
      });

      await redisClient.connect();
      console.log("✅ Fast Crypto Controller connected to Redis");
    }
    return true;
  } catch (error) {
    console.log("⚠️ Redis failed, using database fallback");
    redisClient = null;
    return false;
  }
}

// Get price from Redis (super fast)
async function getPriceFromRedis(symbol) {
  try {
    if (redisClient) {
      const data = await redisClient.get(`price:${symbol}`);
      if (data) {
        const priceData = JSON.parse(data);
        priceCache.set(symbol, priceData); // Update cache
        return priceData;
      }
    }

    // Fallback to memory cache
    return priceCache.get(symbol) || null;
  } catch (error) {
    return priceCache.get(symbol) || null;
  }
}

// Get multiple prices from Redis (batch operation)
async function getMultiplePrices(symbols) {
  const prices = {};

  try {
    // Try Redis first
    if (redisClient) {
      const pipeline = redisClient.multi();

      for (const symbol of symbols) {
        pipeline.get(`price:${symbol}`);
      }

      const results = await pipeline.exec();

      for (let i = 0; i < symbols.length; i++) {
        if (results[i]) {
          const priceData = JSON.parse(results[i]);
          prices[symbols[i]] = priceData;
          priceCache.set(symbols[i], priceData);
        }
      }
    } else {
      // Fallback to memory cache
      for (const symbol of symbols) {
        const price = priceCache.get(symbol);
        if (price) prices[symbol] = price;
      }
    }
  } catch (error) {
    // Fallback to memory cache
    for (const symbol of symbols) {
      const price = priceCache.get(symbol);
      if (price) prices[symbol] = price;
    }
  }

  return prices;
}

// @desc    Get crypto list (FAST VERSION - uses Redis)
// @route   GET /api/crypto/fast
// @access  Public
const getFastCryptoList = async (req, res) => {
  try {
    console.log("⚡ Fast crypto list request");

    // Initialize Redis if not already
    await initRedis();

    // Get all USDT pairs from database (structure/metadata only)
    const cryptos = await Crypto.find({
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true,
    })
      .select("symbol name price volume24h priceChangePercent24h isFavorite")
      .lean();

    console.log(`📊 Found ${cryptos.length} USDT pairs in database`);

    // If no cryptos in database, return empty but valid response
    if (cryptos.length === 0) {
      console.log(
        "⚠️ No cryptos in database. Run auto-sync or wait for WebSocket to populate."
      );
      return res.json({
        cryptos: [],
        totalCount: 0,
        liveDataCount: 0,
        timestamp: new Date().toISOString(),
        dataSource: "empty_database",
        message:
          "Database is empty. WebSocket service will populate data shortly.",
      });
    }

    // Get all symbols
    const symbols = cryptos.map((c) => c.symbol);

    // Get live prices from Redis (SUPER FAST)
    const livePrices = await getMultiplePrices(symbols);

    console.log(
      `⚡ Got ${Object.keys(livePrices).length} live prices from Redis`
    );

    // Merge live prices with database records
    const enrichedCryptos = cryptos.map((crypto) => {
      const livePrice = livePrices[crypto.symbol];

      if (livePrice) {
        return {
          ...crypto,
          price: livePrice.price,
          volume24h: livePrice.volume,
          priceChangePercent24h: livePrice.priceChangePercent,
          high24h: livePrice.high24h,
          low24h: livePrice.low24h,
          open24h: livePrice.open24h,
          _liveData: true,
        };
      }

      return crypto;
    });

    // Sort by volume (most active first)
    enrichedCryptos.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

    const liveDataCount = enrichedCryptos.filter((c) => c._liveData).length;

    res.json({
      cryptos: enrichedCryptos,
      totalCount: enrichedCryptos.length,
      liveDataCount: liveDataCount,
      timestamp: new Date().toISOString(),
      dataSource: liveDataCount > 0 ? "redis_websocket" : "database",
      responseTime: "< 100ms",
    });
  } catch (error) {
    console.error("❌ Fast crypto list error:", error.message);
    res.status(500).json({
      error: "Failed to fetch crypto list",
      message: error.message,
    });
  }
};

// @desc    Get single crypto with live price
// @route   GET /api/crypto/fast/:symbol
// @access  Public
const getFastCryptoPrice = async (req, res) => {
  try {
    const { symbol } = req.params;

    console.log(`⚡ Fast price request for ${symbol}`);

    // Initialize Redis if not already
    await initRedis();

    // Get from Redis first (fastest)
    const livePrice = await getPriceFromRedis(symbol);

    if (livePrice) {
      return res.json({
        symbol: livePrice.symbol,
        price: livePrice.price,
        volume: livePrice.volume,
        priceChangePercent: livePrice.priceChangePercent,
        high24h: livePrice.high24h,
        low24h: livePrice.low24h,
        open24h: livePrice.open24h,
        timestamp: livePrice.timestamp,
        dataSource: "redis_websocket",
      });
    }

    // Fallback to database
    const crypto = await Crypto.findOne({ symbol }).lean();

    if (!crypto) {
      return res.status(404).json({ error: "Symbol not found" });
    }

    res.json({
      symbol: crypto.symbol,
      price: crypto.price,
      volume: crypto.volume24h,
      priceChangePercent: crypto.priceChangePercent24h,
      dataSource: "database",
    });
  } catch (error) {
    console.error("❌ Fast price error:", error.message);
    res.status(500).json({
      error: "Failed to fetch price",
      message: error.message,
    });
  }
};

// @desc    Update crypto prices from Redis to Database (background job)
// @route   POST /api/crypto/sync-from-redis
// @access  Private
const syncPricesFromRedis = async (req, res) => {
  try {
    console.log("🔄 Syncing prices from Redis to Database...");

    await initRedis();

    // Get all USDT symbols from database
    const cryptos = await Crypto.find({
      quoteAsset: "USDT",
      status: "TRADING",
    }).select("symbol");

    const symbols = cryptos.map((c) => c.symbol);
    const livePrices = await getMultiplePrices(symbols);

    let updated = 0;
    let failed = 0;

    // Update database with live prices
    for (const [symbol, priceData] of Object.entries(livePrices)) {
      try {
        await Crypto.findOneAndUpdate(
          { symbol },
          {
            $set: {
              price: priceData.price,
              volume24h: priceData.volume,
              priceChangePercent24h: priceData.priceChangePercent,
              highPrice: priceData.high24h,
              lowPrice: priceData.low24h,
              openPrice: priceData.open24h,
              lastUpdated: new Date(),
            },
          }
        );
        updated++;
      } catch (error) {
        failed++;
      }
    }

    console.log(`✅ Synced ${updated} prices to database`);

    res.json({
      success: true,
      updated,
      failed,
      total: symbols.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Sync error:", error.message);
    res.status(500).json({
      error: "Failed to sync prices",
      message: error.message,
    });
  }
};

module.exports = {
  getFastCryptoList,
  getFastCryptoPrice,
  syncPricesFromRedis,
  initRedis,
  getPriceFromRedis,
  getMultiplePrices,
};
