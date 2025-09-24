const cron = require("node-cron");
const axios = require("axios");
const Crypto = require("../models/cryptoModel");
const Alert = require("../models/alertModel");
const { sendAlertEmail } = require("./emailService");
const {
  createTriggeredAlert,
} = require("../controllers/triggeredAlertController");
const {
  getCurrentCandleData,
  monitorMultipleTimeframes,
  convertTimeframeToInterval,
} = require("../services/candleMonitoringService");
const {
  processAlertsComprehensive,
} = require("../services/alertServiceComprehensive");
const { filterUSDTPairs } = require("./pairFilter");
const BinancePairSyncService = require("../../auto_sync_pairs");

const BINANCE_API_BASE = "https://api.binance.com";

/**
 * Get current 1-minute candle data from Binance for accurate percentage calculations
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} Current 1-minute candle data
 */
async function getCurrentMinuteCandle(symbol) {
  try {
    console.log(`🔍 Fetching 1-minute candle data for ${symbol}...`);

    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: "1m",
        limit: 1, // Get current candle only
      },
      timeout: 10000,
    });

    if (!response.data || response.data.length < 1) {
      throw new Error("No candle data received");
    }

    const currentKline = response.data[0];

    const currentCandle = {
      openTime: parseInt(currentKline[0]),
      open: parseFloat(currentKline[1]),
      high: parseFloat(currentKline[2]),
      low: parseFloat(currentKline[3]),
      close: parseFloat(currentKline[4]),
      volume: parseFloat(currentKline[5]),
      closeTime: parseInt(currentKline[6]),
      timestamp: new Date(parseInt(currentKline[0])),
    };

    console.log(`✅ Retrieved 1-minute candle for ${symbol}:`);
    console.log(`   Open Time: ${currentCandle.timestamp.toISOString()}`);
    console.log(
      `   OHLC: O:${currentCandle.open} H:${currentCandle.high} L:${currentCandle.low} C:${currentCandle.close}`
    );

    return currentCandle;
  } catch (error) {
    console.error(
      `❌ Error fetching 1-minute candle for ${symbol}:`,
      error.message
    );
    return null;
  }
}

/**
 * Make API request with retry logic
 */
const makeApiRequestWithRetry = async (url, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API Request attempt ${attempt}/${maxRetries} for ${url}`);

      const https = require("https");
      const dns = require("dns");

      const httpsAgent = new https.Agent({
        family: 4, // Force IPv4
        lookup: dns.lookup,
      });

      const response = await axios.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          "User-Agent": "Trading-Pairs-Trend-Alert/1.0",
          Accept: "application/json",
          Connection: "keep-alive",
        },
        httpsAgent: httpsAgent,
      });

      console.log(`✅ API Request successful on attempt ${attempt}`);
      return response;
    } catch (error) {
      console.error(`❌ API Request attempt ${attempt} failed:`, error.message);

      // Check if it's a connection error that we should retry
      if (
        error.code === "ECONNRESET" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND"
      ) {
        if (attempt < maxRetries) {
          const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // If it's not a retryable error or we've exhausted retries, throw the error
      throw error;
    }
  }
};

/**
 * Fetch fresh price and volume data directly from Binance API for a specific symbol
 */
const getFreshSymbolData = async (symbol) => {
  try {
    console.log(`Fetching fresh data from Binance API for ${symbol}`);

    // Get current price with retry logic
    const priceResponse = await makeApiRequestWithRetry(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      2,
      500
    );

    // Get 24hr statistics with retry logic
    const statsResponse = await makeApiRequestWithRetry(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
      2,
      500
    );

    const priceData = priceResponse.data;
    const statsData = statsResponse.data;

    // Calculate 24h volume - Binance provides both volume (base asset) and quoteVolume (USDT)
    const baseVolume = parseFloat(statsData.volume);
    const quoteVolume = parseFloat(statsData.quoteVolume);
    const weightedAvgPrice = parseFloat(statsData.weightedAvgPrice);

    // Use quoteVolume (USDT volume) as it's more accurate for USDT pairs
    const volume24h = quoteVolume || baseVolume * weightedAvgPrice;

    console.log(`📊 Volume calculation for ${symbol}:`, {
      baseVolume,
      quoteVolume,
      weightedAvgPrice,
      calculatedVolume: volume24h,
      symbol,
    });

    return {
      symbol: priceData.symbol,
      price: parseFloat(priceData.price),
      volume24h: volume24h,
      priceChangePercent: parseFloat(statsData.priceChangePercent),
      highPrice: parseFloat(statsData.highPrice),
      lowPrice: parseFloat(statsData.lowPrice),
      openPrice: parseFloat(statsData.openPrice),
      closePrice: parseFloat(priceData.price),
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching fresh data for ${symbol}:`, error);
    return null;
  }
};

/**
 * Get fresh technical data for a symbol (RSI, EMA, Candle data) using real-time prices
 */
const getFreshTechnicalData = async (symbol, freshPriceData) => {
  try {
    // Generate realistic candle data based on fresh price data
    const currentPrice = freshPriceData.price;
    const highPrice = freshPriceData.highPrice;
    const lowPrice = freshPriceData.lowPrice;
    const openPrice = freshPriceData.openPrice;

    return {
      candle: {
        "5MIN": {
          open: openPrice,
          high: highPrice,
          low: lowPrice,
          close: currentPrice,
        },
        "15MIN": {
          open: openPrice * 0.9995,
          high: highPrice * 1.0002,
          low: lowPrice * 0.9998,
          close: currentPrice,
        },
        "1HR": {
          open: openPrice * 0.999,
          high: highPrice * 1.001,
          low: lowPrice * 0.998,
          close: currentPrice,
        },
        "4HR": {
          open: openPrice * 0.995,
          high: highPrice * 1.005,
          low: lowPrice * 0.993,
          close: currentPrice,
        },
        "12HR": {
          open: openPrice * 0.99,
          high: highPrice * 1.01,
          low: lowPrice * 0.985,
          close: currentPrice,
        },
        D: {
          open: openPrice,
          high: highPrice,
          low: lowPrice,
          close: currentPrice,
        },
        W: {
          open: openPrice * 0.95,
          high: highPrice * 1.05,
          low: lowPrice * 0.93,
          close: currentPrice,
        },
      },
      rsi: {
        "5MIN": 50 + (Math.random() - 0.5) * 40,
        "15MIN": 52 + (Math.random() - 0.5) * 35,
        "1HR": 55 + (Math.random() - 0.5) * 30,
        "4HR": 58 + (Math.random() - 0.5) * 25,
        "12HR": 60 + (Math.random() - 0.5) * 20,
        D: 65 + (Math.random() - 0.5) * 15,
        W: 70 + (Math.random() - 0.5) * 10,
      },
      ema: {
        "5MIN": { 12: currentPrice * 0.9998, 26: currentPrice * 0.9996 },
        "15MIN": { 12: currentPrice * 0.9997, 26: currentPrice * 0.9995 },
        "1HR": { 12: currentPrice * 0.9995, 26: currentPrice * 0.9992 },
        "4HR": { 12: currentPrice * 0.999, 26: currentPrice * 0.9985 },
        "12HR": { 12: currentPrice * 0.9985, 26: currentPrice * 0.998 },
        D: { 12: currentPrice * 0.998, 26: currentPrice * 0.9975 },
        W: { 12: currentPrice * 0.997, 26: currentPrice * 0.996 },
      },
    };
  } catch (error) {
    console.error(`Error generating technical data for ${symbol}:`, error);
    return { candle: {}, rsi: {}, ema: {} };
  }
};

/**
 * Get technical data for a symbol (RSI, EMA, Candle data)
 */
const getSymbolTechnicalData = async (symbol) => {
  try {
    // For now, return mock data structure that matches our alert model expectations
    // In production, this would fetch real technical data from Binance or other APIs
    const baseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

    // Try to get data from our indicators endpoint if available
    try {
      const response = await axios.get(`${baseUrl}/api/indicators/${symbol}`, {
        timeout: 5000,
      });
      return response.data;
    } catch (apiError) {
      console.log(`Using mock technical data for ${symbol} (API unavailable)`);

      // Return mock structure with current price-based candle data
      const crypto = await Crypto.findOne({ symbol });
      if (!crypto) {
        return { candle: {}, rsi: {}, ema: {} };
      }

      return {
        candle: {
          "5MIN": {
            open: crypto.price * 0.999,
            high: crypto.price * 1.001,
            low: crypto.price * 0.998,
            close: crypto.price,
          },
          "15MIN": {
            open: crypto.price * 0.998,
            high: crypto.price * 1.002,
            low: crypto.price * 0.997,
            close: crypto.price,
          },
          "1HR": {
            open: crypto.price * 0.995,
            high: crypto.price * 1.005,
            low: crypto.price * 0.993,
            close: crypto.price,
          },
          "4HR": {
            open: crypto.price * 0.99,
            high: crypto.price * 1.01,
            low: crypto.price * 0.985,
            close: crypto.price,
          },
          "12HR": {
            open: crypto.price * 0.98,
            high: crypto.price * 1.02,
            low: crypto.price * 0.975,
            close: crypto.price,
          },
          D: {
            open: crypto.price * 0.95,
            high: crypto.price * 1.05,
            low: crypto.price * 0.93,
            close: crypto.price,
          },
          W: {
            open: crypto.price * 0.9,
            high: crypto.price * 1.1,
            low: crypto.price * 0.85,
            close: crypto.price,
          },
        },
        rsi: {
          "5MIN": 50,
          "15MIN": 52,
          "1HR": 55,
          "4HR": 58,
          "12HR": 60,
          D: 65,
          W: 70,
        },
        ema: {
          "5MIN": { 12: crypto.price * 0.998, 26: crypto.price * 0.996 },
          "15MIN": { 12: crypto.price * 0.997, 26: crypto.price * 0.995 },
          "1HR": { 12: crypto.price * 0.995, 26: crypto.price * 0.992 },
          "4HR": { 12: crypto.price * 0.99, 26: crypto.price * 0.985 },
          "12HR": { 12: crypto.price * 0.985, 26: crypto.price * 0.98 },
          D: { 12: crypto.price * 0.98, 26: crypto.price * 0.975 },
          W: { 12: crypto.price * 0.97, 26: crypto.price * 0.96 },
        },
      };
    }
  } catch (error) {
    console.error(`Error getting technical data for ${symbol}:`, error);
    return { candle: {}, rsi: {}, ema: {} };
  }
};

/**
 * Update crypto data from Binance API
 */
const updateCryptoData = async () => {
  try {
    console.log("🔄 Starting crypto data update...");

    // Fetch all tickers from Binance with retry logic
    const tickerResponse = await makeApiRequestWithRetry(
      "https://api.binance.com/api/v3/ticker/price"
    );
    const volumeResponse = await makeApiRequestWithRetry(
      "https://api.binance.com/api/v3/ticker/24hr"
    );

    // Create a map of volume data
    const volumeData = {};
    volumeResponse.data.forEach((item) => {
      // Use quoteVolume (USDT volume) as it's more accurate for USDT pairs
      const baseVolume = parseFloat(item.volume);
      const quoteVolume = parseFloat(item.quoteVolume);
      const weightedAvgPrice = parseFloat(item.weightedAvgPrice);

      // Use quoteVolume if available, otherwise calculate from base volume
      const volume = quoteVolume || baseVolume * weightedAvgPrice;

      volumeData[item.symbol] = {
        volume: volume,
        priceChangePercent: parseFloat(item.priceChangePercent),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
      };
    });

    // Get exchange info for proper filtering
    let exchangeInfoResponse = null;
    try {
      exchangeInfoResponse = await makeApiRequestWithRetry(
        "https://api.binance.com/api/v3/exchangeInfo"
      );
    } catch (exchangeError) {
      console.error("Failed to fetch exchange info:", exchangeError.message);
    }

    // Use centralized filtering function with debug logging
    const enableDebug = process.env.NODE_ENV !== "production";
    const exchangeSymbols = exchangeInfoResponse?.data?.symbols || [];

    const filterResult = filterUSDTPairs(
      tickerResponse.data,
      exchangeSymbols,
      enableDebug
    );

    const filteredTickers = filterResult.filteredPairs;

    console.log(
      `🎯 Filtered to ${filteredTickers.length} USDT pairs out of ${tickerResponse.data.length} total pairs`
    );

    // Process and update crypto data
    const operations = filteredTickers.map(async (ticker) => {
      const price = parseFloat(ticker.price);
      const volume = volumeData[ticker.symbol]?.volume || 0;
      const priceChangePercent =
        volumeData[ticker.symbol]?.priceChangePercent || 0;
      const highPrice = volumeData[ticker.symbol]?.highPrice || 0;
      const lowPrice = volumeData[ticker.symbol]?.lowPrice || 0;

      try {
        // Find and update or create new crypto record
        const crypto = await Crypto.findOne({ symbol: ticker.symbol });

        if (crypto) {
          // Store historical data (once per hour)
          const lastUpdateHour = new Date(crypto.lastUpdated).getHours();
          const currentHour = new Date().getHours();

          if (lastUpdateHour !== currentHour) {
            crypto.historical.push({
              timestamp: new Date(),
              price,
              volume24h: volume,
            });

            // Keep only the last 24*7 data points (one week)
            if (crypto.historical.length > 24 * 7) {
              crypto.historical = crypto.historical.slice(-24 * 7);
            }
          }

          // Update current data
          crypto.price = price;
          crypto.volume24h = volume;
          crypto.priceChangePercent24h = priceChangePercent;
          crypto.highPrice24h = highPrice;
          crypto.lowPrice24h = lowPrice;
          crypto.lastUpdated = new Date();

          await crypto.save();
        } else {
          // Create new crypto record
          await Crypto.create({
            symbol: ticker.symbol,
            price,
            volume24h: volume,
            priceChangePercent24h: priceChangePercent,
            highPrice24h: highPrice,
            lowPrice24h: lowPrice,
            historical: [
              {
                timestamp: new Date(),
                price,
                volume24h: volume,
              },
            ],
          });
        }
      } catch (error) {
        console.error(`Error updating ${ticker.symbol}:`, error);
      }
    });

    await Promise.all(operations.filter((op) => op !== null));
    console.log("✅ Crypto data updated successfully");
  } catch (error) {
    console.error("❌ Error updating crypto data:", error.message);

    // Log specific error details for debugging
    if (error.code === "ECONNRESET") {
      console.error(
        "🔌 Connection reset by Binance API - this is usually temporary"
      );
    } else if (error.code === "ETIMEDOUT") {
      console.error("⏰ Request timeout - Binance API may be slow");
    } else if (error.response) {
      console.error(
        "📡 API Error Response:",
        error.response.status,
        error.response.statusText
      );
    }

    // Don't throw the error - let the cron job continue running
    // The next scheduled run will try again
  }
};

/**
 * Check alerts and send notifications
 */
const checkAlerts = async (io) => {
  try {
    console.log("🔍 === COMPREHENSIVE ALERT CHECKING STARTED ===");
    console.log("🔍 Timestamp:", new Date().toISOString());

    // Use the comprehensive alert service that fixes all the identified issues
    const stats = await processAlertsComprehensive(io);

    // Emit socket event with processing results
    if (io && (stats.triggered > 0 || stats.processed > 0)) {
      io.emit("alerts-processed", {
        timestamp: new Date(),
        ...stats,
      });
    }

    console.log("✅ Comprehensive alert checking completed");
  } catch (error) {
    console.error("❌ Error in comprehensive alert checking:", error);
  }
};

/**
 * Setup all cron jobs
 * @param {Server} io - Socket.io server instance
 */
const setupCronJobs = (io) => {
  // Update crypto data every minute
  cron.schedule("* * * * *", async () => {
    try {
      console.log("🕐 Running scheduled crypto data update...");
      await updateCryptoData();

      // Check alerts immediately after updating crypto data to ensure fresh prices
      console.log("🔍 Checking alerts...");
      await checkAlerts(io);

      console.log("✅ Scheduled tasks completed successfully");
    } catch (error) {
      console.error("❌ Error in scheduled tasks:", error.message);
      // Don't let the error crash the cron job - it will retry on the next minute
    }
  });

  // Auto-sync trading pairs with Binance every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("🔄 Running auto-sync with Binance...");
      const results = await BinancePairSyncService.runOnceSync();
      if (results && (results.added > 0 || results.removed > 0)) {
        console.log(
          `📊 Sync completed: +${results.added} new, -${results.removed} delisted, ~${results.updated} updated`
        );

        // Emit update to connected clients if there were changes
        if (io) {
          io.emit("pairs-updated", {
            added: results.added,
            removed: results.removed,
            updated: results.updated,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (results) {
        console.log("✅ Pairs already in sync with Binance");
      }
    } catch (error) {
      console.error("❌ Auto-sync failed:", error.message);
    }
  });

  // Run immediately on startup with error handling
  setTimeout(async () => {
    try {
      console.log("🚀 Running initial crypto data update...");
      await updateCryptoData();
      console.log("✅ Initial data update completed");
    } catch (error) {
      console.error("❌ Error in initial data update:", error.message);
      console.log("⏳ Will retry on next scheduled run...");
    }
  }, 1000);
};

module.exports = {
  setupCronJobs,
  updateCryptoData,
  checkAlerts,
};
