const Crypto = require("../models/cryptoModel");
const axios = require("axios");
const { filterUSDTPairs } = require("../utils/pairFilter");
const mongoose = require("mongoose");

// Helper function to ensure MongoDB connection
const ensureMongoConnection = async () => {
  if (mongoose.connection.readyState !== 1) {
    console.log("⚠️ MongoDB not connected, attempting to reconnect...");
    
    try {
      const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/binance-alerts";
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log("✅ MongoDB reconnected successfully");
      return true;
    } catch (reconnectError) {
      console.error("❌ Failed to reconnect to MongoDB:", reconnectError.message);
      return false;
    }
  }
  return true;
};

// Simple in-memory cache for API responses
const apiCache = {
  data: {},
  timestamps: {},
  locks: {},
};
// Cache configuration from environment variables or defaults
const CACHE_TTL = parseInt(process.env.API_CACHE_TTL || "60000"); // Cache TTL in milliseconds (1 minute)
const MIN_REFRESH_INTERVAL = parseInt(
  process.env.API_MIN_REFRESH_INTERVAL || "30000"
); // Minimum time between refresh attempts (30 seconds)
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || "5000"); // Timeout for API responses

// Configure axios defaults for Binance API
const https = require("https");
const dns = require("dns");

// Create custom agent that forces IPv4
const httpsAgent = new https.Agent({
  family: 4, // Force IPv4
  lookup: dns.lookup,
});

const binanceAPI = axios.create({
  baseURL: "https://api.binance.com",
  timeout: 15000, // Increased timeout for reliability
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "BinanceAlertsApp/1.0",
    "X-MBX-APIKEY": process.env.BINANCE_API_KEY || "",
  },
  httpsAgent: httpsAgent, // Use custom agent
});

// Helper function to get cached data or fetch fresh data
const getCachedOrFresh = async (cacheKey, fetchFunction) => {
  const now = Date.now();
  const lastUpdate = apiCache.timestamps[cacheKey] || 0;
  const isLocked = apiCache.locks[cacheKey] || false;

  // If we have cached data that's still fresh, return it
  if (apiCache.data[cacheKey] && now - lastUpdate < CACHE_TTL) {
    console.log(
      `Using cached data for ${cacheKey}, age: ${(now - lastUpdate) / 1000}s`
    );
    return apiCache.data[cacheKey];
  }

  // If another request is already in progress for this cache key, wait for it
  if (isLocked) {
    console.log(
      `API request for ${cacheKey} is already in progress, waiting...`
    );
    // Wait a bit and check cache again (another request is fetching fresh data)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return getCachedOrFresh(cacheKey, fetchFunction);
  }

  // If we recently tried to update this cache key, use the stale data
  // to prevent too many requests
  if (now - lastUpdate < MIN_REFRESH_INTERVAL) {
    console.log(
      `Using slightly stale data for ${cacheKey}, throttling refresh`
    );
    return apiCache.data[cacheKey];
  }

  try {
    // Set lock to prevent parallel requests for same resource
    apiCache.locks[cacheKey] = true;

    // Fetch fresh data
    console.log(`Fetching fresh data for ${cacheKey}`);
    const result = await fetchFunction();

    // Update cache
    apiCache.data[cacheKey] = result;
    apiCache.timestamps[cacheKey] = Date.now();

    return result;
  } catch (error) {
    console.error(`Error fetching ${cacheKey}:`, error.message);
    // Return existing data even if stale, or throw if none exists
    if (apiCache.data[cacheKey]) {
      console.log(`Returning stale data for ${cacheKey} after fetch error`);
      return apiCache.data[cacheKey];
    }
    throw error;
  } finally {
    // Always release the lock
    apiCache.locks[cacheKey] = false;
  }
};

// Add a retry mechanism for API calls
const fetchWithRetry = async (apiCall, retries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`API call attempt ${attempt + 1}/${retries}`);
      return await apiCall();
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      lastError = error;

      // Only delay and retry if this wasn't the last attempt
      if (attempt < retries - 1) {
        // Exponential backoff with jitter
        const backoffDelay =
          delay * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4);
        console.log(`Retrying in ${backoffDelay.toFixed(0)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
  console.log("hello");
  // If we get here, all retries failed
  throw lastError;
};

// Handle API errors consistently
const handleAPIError = (error, res, errorMessage) => {
  console.error(errorMessage, error);

  if (error.response) {
    // The request was made and the server responded with an error status
    console.error("Binance API error response:", error.response.data);
    return res.status(error.response.status).json({
      message: errorMessage,
      details: error.response.data,
    });
  } else if (error.request) {
    // The request was made but no response was received
    console.error("Binance API no response received - using fallback data");
    return res.status(503).json({
      message: "Service unavailable: Could not connect to Binance API",
      details: errorMessage,
      fallback: true,
    });
  } else {
    // Something happened in setting up the request that triggered an error
    console.error("Unexpected error during API request:", error.message);
    return res.status(500).json({
      message: "Internal server error when connecting to Binance API",
      details: errorMessage,
    });
  }
};

// Fallback data when Binance API is not accessible
const getFallbackChartData = (symbol, timeframe = "1h", limit = 100) => {
  const now = Date.now();
  const intervalMs =
    {
      "1m": 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
    }[timeframe] || 60 * 60 * 1000;

  const fallbackData = [];
  let basePrice = 50000; // Default base price

  // Adjust base price based on symbol
  if (symbol.includes("BTC")) basePrice = 45000;
  else if (symbol.includes("ETH")) basePrice = 3000;
  else if (symbol.includes("ADA")) basePrice = 0.5;
  else if (symbol.includes("DOT")) basePrice = 7;
  else if (symbol.includes("LINK")) basePrice = 15;

  for (let i = limit - 1; i >= 0; i--) {
    const time = Math.floor((now - i * intervalMs) / 1000);
    const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
    const price = basePrice * (1 + priceVariation);

    fallbackData.push({
      time: time,
      open: price * 0.999,
      high: price * 1.001,
      low: price * 0.998,
      close: price,
      volume: Math.random() * 1000000,
    });
  }

  return fallbackData;
};

// Calculate RSI function
const calculateRSIValue = (prices, period = 14) => {
  if (prices.length < period + 1) {
    return null;
  }

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map((change) => (change > 0 ? change : 0));
  const losses = changes.map((change) => (change < 0 ? Math.abs(change) : 0));

  // Calculate initial average gain and loss
  let avgGain =
    gains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  // Calculate RSI using Wilder's smoothing method
  const rsiValues = [];
  rsiValues.push(100 - 100 / (1 + avgGain / (avgLoss || 0.01)));

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsiValues.push(100 - 100 / (1 + avgGain / (avgLoss || 0.01)));
  }

  return rsiValues[rsiValues.length - 1];
};

// Function to refresh all crypto data at once from Binance API
const refreshCryptoData = async (req = {}) => {
  try {
    console.log(
      "Starting Binance API data refresh with caching and throttling"
    );

    // Initialize responses to null
    let tickerResponse = null;
    let statsResponse = null;

    // Use caching system for ticker prices
    try {
      tickerResponse = await getCachedOrFresh("ticker_prices", async () => {
        // Use retry mechanism within the cache refresh function
        return await fetchWithRetry(() =>
          binanceAPI.get("/api/v3/ticker/price")
        );
      });
      console.log("Successfully retrieved ticker prices data");
    } catch (tickerError) {
      console.error("Failed to fetch ticker prices:", tickerError.message);
      // Continue with partial update if we already have data in DB
    }

    // Use caching system for 24hr stats
    try {
      statsResponse = await getCachedOrFresh("ticker_24hr", async () => {
        // Use retry mechanism within the cache refresh function
        return await fetchWithRetry(() =>
          binanceAPI.get("/api/v3/ticker/24hr")
        );
      });
      console.log("Successfully retrieved 24hr stats data");
    } catch (statsError) {
      console.error("Failed to fetch 24hr stats:", statsError.message);
      // Continue with partial update if possible
    }

    // Use caching system for exchange info to get spot trading permissions
    let exchangeInfoResponse = null;
    try {
      exchangeInfoResponse = await getCachedOrFresh(
        "exchange_info",
        async () => {
          // Use retry mechanism within the cache refresh function
          return await fetchWithRetry(() =>
            binanceAPI.get("/api/v3/exchangeInfo")
          );
        }
      );
      console.log("Successfully retrieved exchange info data");
    } catch (exchangeError) {
      console.error("Failed to fetch exchange info:", exchangeError.message);
      // Continue with partial update if possible
    }

    // Check if we have at least ticker data to proceed
    if (
      !tickerResponse ||
      !tickerResponse.data ||
      !Array.isArray(tickerResponse.data)
    ) {
      console.error(
        "No valid ticker data available, cannot proceed with refresh"
      );
      return 0;
    }

    // Create a map for stats if available, otherwise use empty map
    const statsMap = {};
    if (
      statsResponse &&
      statsResponse.data &&
      Array.isArray(statsResponse.data)
    ) {
      statsResponse.data.forEach((item) => {
        try {
          statsMap[item.symbol] = {
            volume:
              parseFloat(item.volume || 0) *
              parseFloat(item.weightedAvgPrice || 0),
            priceChangePercent: parseFloat(item.priceChangePercent || 0),
          };
        } catch (parseError) {
          console.error(
            `Error parsing stats for ${item.symbol}:`,
            parseError.message
          );
          // Skip this item but continue processing others
        }
      });
    } else {
      console.warn(
        "Stats data unavailable or invalid format - proceeding with price-only updates"
      );
    }

    // Create a map for exchange info if available, otherwise use empty map
    const exchangeInfoMap = {};
    if (
      exchangeInfoResponse &&
      exchangeInfoResponse.data &&
      exchangeInfoResponse.data.symbols &&
      Array.isArray(exchangeInfoResponse.data.symbols)
    ) {
      exchangeInfoResponse.data.symbols.forEach((symbolInfo) => {
        try {
          exchangeInfoMap[symbolInfo.symbol] = {
            isSpotTradingAllowed: symbolInfo.isSpotTradingAllowed || false,
            quoteAsset: symbolInfo.quoteAsset || "",
            baseAsset: symbolInfo.baseAsset || "",
            permissions: symbolInfo.permissions || [],
            status: symbolInfo.status || "TRADING",
          };
        } catch (parseError) {
          console.error(
            `Error parsing exchange info for ${symbolInfo.symbol}:`,
            parseError.message
          );
          // Skip this item but continue processing others
        }
      });
      console.log(
        `Processed exchange info for ${
          Object.keys(exchangeInfoMap).length
        } symbols`
      );
    } else {
      console.warn(
        "Exchange info unavailable or invalid format - proceeding without spot trading data"
      );
    }

    // Update database with batch operations
    let operations = [];

    try {
      // Use centralized filtering function with debug logging
      const enableDebug = process.env.NODE_ENV !== "production";
      const exchangeSymbols = exchangeInfoResponse?.data?.symbols || [];

      const filterResult = filterUSDTPairs(
        tickerResponse.data,
        exchangeSymbols,
        enableDebug
      );

      const filteredPairs = filterResult.filteredPairs;

      console.log(
        `🎯 Filtered to ${filteredPairs.length} USDT pairs out of ${tickerResponse.data.length} total pairs`
      );

      // Sort alphabetically
      const sortedPairs = filteredPairs.sort((a, b) =>
        a.symbol.localeCompare(b.symbol)
      );

      operations = sortedPairs
        .map((ticker) => {
          try {
            const stats = statsMap[ticker.symbol] || {
              volume: 0,
              priceChangePercent: 0,
            };
            const exchangeInfo = exchangeInfoMap[ticker.symbol] || {
              isSpotTradingAllowed: false,
              quoteAsset: "",
              baseAsset: "",
              permissions: [],
              status: "TRADING",
            };

            return {
              updateOne: {
                filter: { symbol: ticker.symbol },
                update: {
                  $set: {
                    price: parseFloat(ticker.price || 0),
                    volume24h: stats.volume,
                    priceChangePercent24h: stats.priceChangePercent,
                    isSpotTradingAllowed: exchangeInfo.isSpotTradingAllowed,
                    quoteAsset: exchangeInfo.quoteAsset,
                    baseAsset: exchangeInfo.baseAsset,
                    permissions: exchangeInfo.permissions,
                    status: exchangeInfo.status,
                    lastUpdated: new Date(),
                  },
                },
                upsert: true,
              },
            };
          } catch (mapError) {
            console.error(
              `Error processing ticker ${ticker.symbol}:`,
              mapError.message
            );
            return null; // Skip this item on error
          }
        })
        .filter((op) => op !== null); // Remove nulls from errors
    } catch (processError) {
      console.error("Error processing ticker data:", processError.message);
    }

    if (operations.length > 0) {
      try {
        await Crypto.bulkWrite(operations);
        console.log(`Updated ${operations.length} crypto records`);
        return operations.length;
      } catch (dbError) {
        console.error("Error writing to database:", dbError.message);
        throw dbError; // Database errors should still be thrown
      }
    } else {
      console.warn("No valid operations to perform on database");
      return 0;
    }
  } catch (updateError) {
    console.error("Error refreshing crypto data:", updateError);

    // Log detailed error information for debugging
    if (updateError.response) {
      console.error(
        "Binance API error response:",
        updateError.response.status,
        updateError.response.data
      );
    } else if (updateError.request) {
      console.error("No response received from Binance API");
    } else {
      console.error(
        "Error setting up request to Binance API:",
        updateError.message
      );
    }
    throw updateError;
  }
};

// @desc    Get all crypto pairs
// @route   GET /api/crypto
// @access  Public
const getCryptoList = async (req, res) => {
  try {
    console.log("API Request: Getting crypto pairs (optimized)");

    // Check MongoDB connection first
    const isConnected = await ensureMongoConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: "Database temporarily unavailable",
        message: "Please try again in a few moments",
        retryAfter: 30
      });
    }

    // Parse parameters - DEFAULT TO ACTIVE USDT PAIRS ONLY
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Build query filter for active USDT pairs only
    let query = {
      quoteAsset: "USDT", // Only USDT pairs
      status: "TRADING", // Only active/trading pairs
      isSpotTradingAllowed: true, // Only spot trading pairs
    };

    console.log("Filtering for active USDT spot trading pairs only");

    // For MarketPanel requests (large limit), return cached data immediately
    if (limit >= 1000) {
      console.log("Large request detected - returning cached data immediately");

      const cryptos = await Crypto.find(query).sort({ symbol: 1 }).lean(); // Use lean() for better performance

      console.log(`Fast response: ${cryptos.length} cryptos from database`);

      // Start background refresh for next time (fire and forget)
      setImmediate(() => {
        refreshCryptoData(req).catch((err) => {
          console.error("Background refresh failed:", err.message);
        });
      });

      return res.json({
        cryptos,
        totalCount: cryptos.length,
        timestamp: new Date().toISOString(),
        dataSource: "database_cached",
      });
    }

    // For smaller requests, return cached data immediately (no API calls)
    console.log("Small request - returning cached data immediately");

    const skip = (page - 1) * limit;
    const cryptos = await Crypto.find(query)
      .select("symbol price volume24h priceChangePercent24h isFavorite")
      .sort({ volume24h: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Crypto.countDocuments(query);

    console.log(
      `Returning ${cryptos.length} crypto pairs (page ${page}, total: ${total})`
    );

    // Start background refresh (fire and forget with timeout)
    const refreshPromise = refreshCryptoData(req).catch((err) => {
      console.error("Background refresh failed:", err.message);
    });

    // Set a timeout for the background refresh
    setTimeout(() => {
      console.log("Background refresh timeout reached");
    }, 15000); // 15 second timeout

    // Send response immediately from database
    res.json({
      cryptos,
      total,
      page,
      limit,
      timestamp: new Date().toISOString(),
      dataSource: "database_cached",
      message: "Cached data returned immediately",
    });
  } catch (error) {
    console.error("Error in getCryptoList:", error);
    res.status(500).json({
      message: "Error fetching crypto list",
      error: error.message,
    });
  }
};

// @desc    Get crypto by symbol
// @route   GET /api/crypto/:symbol
// @access  Public
const getCryptoBySymbol = async (req, res) => {
  try {
    // Check MongoDB connection first
    const isConnected = await ensureMongoConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: "Database temporarily unavailable",
        message: "Please try again in a few moments",
        retryAfter: 30
      });
    }

    const crypto = await Crypto.findOne({ symbol: req.params.symbol });

    if (!crypto) {
      return res.status(404).json({ message: "Crypto not found" });
    }

    res.json(crypto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Toggle favorite status for a crypto pair
// @route   PUT /api/crypto/:symbol/favorite
// @access  Public
const updateFavoriteStatus = async (req, res) => {
  try {
    // Check MongoDB connection first
    const isConnected = await ensureMongoConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: "Database temporarily unavailable",
        message: "Please try again in a few moments",
        retryAfter: 30
      });
    }

    const crypto = await Crypto.findOne({ symbol: req.params.symbol });

    if (!crypto) {
      return res.status(404).json({ message: "Crypto not found" });
    }

    // Use the isFavorite value from the request body instead of toggling
    const { isFavorite } = req.body;
    if (typeof isFavorite !== "boolean") {
      return res
        .status(400)
        .json({ message: "isFavorite must be a boolean value" });
    }

    crypto.isFavorite = isFavorite;
    await crypto.save();

    console.log(
      `Updated favorite status for ${req.params.symbol} to ${isFavorite}`
    );
    res.json(crypto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Batch update favorite status for multiple crypto pairs
// @route   PUT /api/crypto/favorites/batch
// @access  Public
const batchUpdateFavorites = async (req, res) => {
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ message: "Operations array is required" });
    }

    const results = [];
    const errors = [];

    // Process each operation
    for (const operation of operations) {
      try {
        const { symbol, action } = operation;

        if (!symbol || !action) {
          errors.push({ symbol, error: "Symbol and action are required" });
          continue;
        }

        const crypto = await Crypto.findOne({ symbol });

        if (!crypto) {
          errors.push({ symbol, error: "Crypto not found" });
          continue;
        }

        // Update favorite status based on action
        if (action === "add" || action === "toggle") {
          crypto.isFavorite = action === "add" ? true : !crypto.isFavorite;
        } else if (action === "remove") {
          crypto.isFavorite = false;
        } else {
          errors.push({
            symbol,
            error: "Invalid action. Use add, remove, or toggle",
          });
          continue;
        }

        await crypto.save();
        results.push({ symbol, isFavorite: crypto.isFavorite });
      } catch (error) {
        errors.push({ symbol: operation.symbol, error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      summary: {
        total: operations.length,
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error) {
    console.error("Batch favorites update error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Calculate RSI for a specific crypto pair
// @route   GET /api/crypto/:symbol/rsi
// @access  Public
const calculateRSI = async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const period = parseInt(req.query.period) || 14;

    console.log(`Fetching RSI data for ${symbol} with period ${period}`);

    // Fetch historical data from Binance with retry mechanism
    console.log(`Fetching RSI data for ${symbol} with retry mechanism`);
    const response = await fetchWithRetry(() =>
      binanceAPI.get("/api/v3/klines", {
        params: {
          symbol,
          interval: "1h",
          limit: period + 10, // Get a few extra candles for calculation
        },
      })
    );
    console.log(`Successfully fetched RSI data for ${symbol}`);

    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ message: "Historical data not found" });
    }

    // Extract closing prices
    const closingPrices = response.data.map((candle) => parseFloat(candle[4]));

    // Calculate RSI
    const rsiValue = calculateRSIValue(closingPrices, period);

    // Update the crypto record with the calculated RSI
    const crypto = await Crypto.findOne({ symbol });
    if (crypto) {
      crypto.rsi = rsiValue;
      await crypto.save();
    }

    res.json({ symbol, rsi: rsiValue });
  } catch (error) {
    handleAPIError(
      error,
      res,
      `Error calculating RSI for ${req.params.symbol}`
    );
  }
};

// @desc    Get chart data for a specific crypto pair
// @route   GET /api/crypto/:symbol/chart
// @access  Public
const getChartData = async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const timeframe = req.query.timeframe || "1h";
    const limit = parseInt(req.query.limit) || 100;

    console.log(
      `Fetching chart data for ${symbol} with timeframe ${timeframe}`
    );

    // Map timeframe to Binance interval
    const binanceTimeframeMap = {
      "5m": "5m",
      "15m": "15m",
      "1h": "1h",
      "4h": "4h",
      "1d": "1d",
      "1w": "1w",
    };

    const interval = binanceTimeframeMap[timeframe] || "1h";

    // Try to fetch klines/candlestick data from Binance with retry
    console.log(`Fetching chart data for ${symbol} with retry mechanism`);
    try {
      const response = await fetchWithRetry(() =>
        binanceAPI.get("/api/v3/klines", {
          params: {
            symbol,
            interval,
            limit,
          },
        })
      );
      console.log(`Successfully fetched chart data for ${symbol}`);

      if (!response.data || response.data.length === 0) {
        throw new Error("No data received from Binance API");
      }

      // Transform data to format needed by lightweight-charts
      const chartData = response.data.map((candle) => ({
        time: candle[0] / 1000, // Convert to seconds for lightweight-charts
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
      }));

      res.json(chartData);
    } catch (apiError) {
      console.warn(
        `⚠️ Binance API failed for ${symbol}, using fallback data:`,
        apiError.message
      );

      // Use fallback data when API fails
      const fallbackData = getFallbackChartData(symbol, timeframe, limit);

      res.json({
        ...fallbackData,
        _fallback: true,
        _message: "Using fallback data due to API connectivity issues",
      });
    }
  } catch (error) {
    console.error(`❌ Chart data error for ${symbol}:`, error);
    res.status(500).json({
      message: "Error fetching chart data",
      error: error.message,
    });
  }
};

// @desc    Check if coin meets filter conditions for alerts
// @route   POST /api/crypto/:symbol/check-conditions
// @access  Public
const checkAlertConditions = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { filters, forceRefresh } = req.body;

    // Clean up filters for logging (remove null values)
    const cleanFilters = {};
    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== null &&
        !(
          typeof filters[key] === "object" &&
          Object.values(filters[key] || {}).every(
            (v) => v === null || v === false || v === 0
          )
        )
      ) {
        cleanFilters[key] = filters[key];
      }
    });

    console.log(
      `Checking alert conditions for ${symbol}${
        Object.keys(cleanFilters).length > 0
          ? " with filters:"
          : " (no active filters)"
      }`,
      Object.keys(cleanFilters).length > 0 ? cleanFilters : ""
    );

    // If forceRefresh is true, get the latest data from Binance
    let crypto = await Crypto.findOne({ symbol });
    if (!crypto) {
      return res.status(404).json({ message: "Crypto not found" });
    }

    if (forceRefresh) {
      console.log(
        `Force refreshing data for ${symbol} before checking conditions`
      );
      try {
        // Fetch latest price
        const priceResponse = await fetchWithRetry(() =>
          binanceAPI.get(`/api/v3/ticker/price?symbol=${symbol}`)
        );

        // Fetch 24hr stats
        const statsResponse = await fetchWithRetry(() =>
          binanceAPI.get(`/api/v3/ticker/24hr?symbol=${symbol}`)
        );

        if (priceResponse.data && statsResponse.data) {
          // Update crypto with latest data
          const price = parseFloat(priceResponse.data.price);
          const stats = statsResponse.data;
          const volume24h =
            parseFloat(stats.volume) * parseFloat(stats.weightedAvgPrice);
          const priceChangePercent24h = parseFloat(stats.priceChangePercent);

          // Update in memory and database
          crypto.price = price;
          crypto.volume24h = volume24h;
          crypto.priceChangePercent24h = priceChangePercent24h;
          crypto.lastUpdated = new Date();

          await crypto.save();
          console.log(
            `Updated ${symbol} with fresh data before condition check`
          );
        }
      } catch (error) {
        console.error(`Error refreshing data for ${symbol}:`, error);
        // Continue with potentially stale data rather than failing
      }
    }

    let results = {
      symbol,
      meetsConditions: false,
      conditions: {},
    };

    // Get current data
    const price = crypto.price;
    const volume24h = crypto.volume24h || 0;
    const priceChangePercent24h = crypto.priceChangePercent24h || 0;

    // Check Min Daily Volume condition
    if (filters.minDailyVolume && filters.minDailyVolume > 0) {
      results.conditions.minDailyVolume = {
        actual: volume24h,
        threshold: filters.minDailyVolume,
        pass: volume24h >= filters.minDailyVolume,
      };
      results.meetsConditions = results.conditions.minDailyVolume.pass;
    }

    // Check Change % condition
    if (
      filters.change &&
      filters.change.timeframe &&
      filters.change.percentage > 0
    ) {
      const targetChange = Math.abs(filters.change.percentage);
      const actualChange = Math.abs(priceChangePercent24h);
      results.conditions.priceChange = {
        actual: actualChange,
        threshold: targetChange,
        timeframe: filters.change.timeframe,
        pass: actualChange >= targetChange,
      };
      if (!results.meetsConditions)
        results.meetsConditions = results.conditions.priceChange.pass;
    }

    // Get RSI if needed
    let rsi = crypto.rsi || null;
    if (filters.rsi && filters.rsi.level > 0) {
      try {
        console.log(`Fetching klines data for RSI calculation for ${symbol}`);
        // Fetch historical data for RSI calculation with retry
        console.log(
          `Fetching klines data for RSI calculation for ${symbol} with retry mechanism`
        );
        const klinesResponse = await fetchWithRetry(() =>
          binanceAPI.get("/api/v3/klines", {
            params: {
              symbol,
              interval: "1h",
              limit: 25, // Get enough candles for RSI(14)
            },
          })
        );
        console.log(
          `Successfully fetched klines data for RSI calculation for ${symbol}`
        );

        if (klinesResponse.data && klinesResponse.data.length > 0) {
          // Calculate RSI
          const closingPrices = klinesResponse.data.map((candle) =>
            parseFloat(candle[4])
          );
          rsi = calculateRSIValue(closingPrices, 14);

          // Update crypto record
          crypto.rsi = rsi;
          await crypto.save();
          console.log(`Updated RSI for ${symbol}: ${rsi}`);
        }
      } catch (rsiError) {
        console.error("Error calculating RSI:", rsiError);

        // Log detailed error information for debugging
        if (rsiError.response) {
          console.error(
            `Binance API error response for ${symbol} RSI:`,
            rsiError.response.status,
            rsiError.response.data
          );
        } else if (rsiError.request) {
          console.error(
            `No response received from Binance API for ${symbol} RSI`
          );
        } else {
          console.error(
            `Error setting up request to Binance API for ${symbol} RSI:`,
            rsiError.message
          );
        }

        // Try to find the most recent RSI value from database if available
        console.log(
          `Using most recent RSI value from database for ${symbol} if available`
        );
        // Continue with null RSI rather than failing completely
      }
    }

    // Check price change
    if (filters.priceChangePercent) {
      const threshold = parseFloat(filters.priceChangePercent);
      results.conditions.priceChange = {
        actual: priceChangePercent24h,
        threshold: threshold,
        pass: priceChangePercent24h >= threshold,
      };
    }

    // Check volume
    if (filters.minVolume) {
      const threshold = parseFloat(filters.minVolume) * 1000000; // Convert to million
      results.conditions.volume = {
        actual: volume24h,
        threshold: threshold,
        pass: volume24h >= threshold,
      };
    }

    // Check RSI condition if configured
    if (filters.rsi && filters.rsi.level > 0 && rsi !== null) {
      const threshold = filters.rsi.level;
      const condition = filters.rsi.condition;
      let rsiPass = false;

      if (condition === "ABOVE") {
        rsiPass = rsi >= threshold;
      } else if (condition === "BELOW") {
        rsiPass = rsi <= threshold;
      }

      results.conditions.rsi = {
        actual: rsi,
        threshold: threshold,
        condition: condition,
        pass: rsiPass,
      };

      if (!results.meetsConditions)
        results.meetsConditions = results.conditions.rsi.pass;
    }

    // Check Alert Count condition (timeframe-based frequency)
    if (filters.alertCount && filters.alertCount.enabled) {
      results.conditions.alertCount = {
        timeframe: filters.alertCount.timeframe,
        enabled: true,
        pass: true, // Always pass for now, can add frequency logic later
      };
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.toString() });
  }
};
module.exports = {
  getCryptoList,
  getCryptoBySymbol,
  updateFavoriteStatus,
  batchUpdateFavorites,
  calculateRSI,
  getChartData,
  checkAlertConditions,
};
