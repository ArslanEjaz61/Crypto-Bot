const Crypto = require("../models/cryptoModel");
const axios = require("axios");

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
const binanceAPI = axios.create({
  baseURL: "https://api.binance.com",
  timeout: 15000, // Increased timeout for reliability
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "BinanceAlertsApp/1.0",
    "X-MBX-APIKEY": process.env.BINANCE_API_KEY || "",
  },
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
    console.error("Binance API no response received");
    return res.status(503).json({
      message: "Service unavailable: Could not connect to Binance API",
      details: errorMessage,
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

    // Update database with batch operations
    let operations = [];

    try {
      // Filter trading pairs based on spot filter parameter
      const spotOnly = req.query.spotOnly === "true";

      let filteredPairs = tickerResponse.data;

      if (spotOnly) {
        // Filter for Binance spot trading pairs only (exclude futures, margin, etc.)
        filteredPairs = tickerResponse.data.filter((ticker) => {
          if (!ticker || !ticker.symbol) return false;

          // Include only USDT, BUSD, and BTC spot pairs
          const validQuotes = ["USDT", "BUSD", "BTC", "ETH", "BNB"];
          const hasValidQuote = validQuotes.some((quote) =>
            ticker.symbol.endsWith(quote)
          );

          // Exclude futures and margin trading pairs
          const excludePatterns = ["_PERP", "UP", "DOWN", "BULL", "BEAR"];
          const isExcluded = excludePatterns.some((pattern) =>
            ticker.symbol.includes(pattern)
          );

          return hasValidQuote && !isExcluded;
        });
      } else {
        // Include all pairs, just filter out invalid ones
        filteredPairs = tickerResponse.data.filter(
          (ticker) => ticker && ticker.symbol
        );
      }

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
            return {
              updateOne: {
                filter: { symbol: ticker.symbol },
                update: {
                  $set: {
                    price: parseFloat(ticker.price || 0),
                    volume24h: stats.volume,
                    priceChangePercent24h: stats.priceChangePercent,
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

    // Parse parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const spotOnly = req.query.spotOnly === "true";
    const usdtOnly = req.query.usdtOnly === "true";

    // Build query filter based on parameters
    let query = {};

    console.log(`Filtering: spotOnly=${spotOnly}, usdtOnly=${usdtOnly}`);

    // Apply filters based on parameters
    if (usdtOnly && spotOnly) {
      // Both filters: USDT pairs in Spot market only
      query.symbol = { $regex: /USDT$/ };
      // Note: Spot filtering would need market type field in schema
      console.log("Filtering for USDT Spot pairs only");
    } else if (usdtOnly && !spotOnly) {
      // USDT only (all markets): USDT, BUSD, futures, etc.
      query.symbol = { $regex: /USDT$/ };
      console.log("Filtering for USDT pairs (all markets)");
    } else if (!usdtOnly && spotOnly) {
      // Spot only (all quote assets): USDT, BTC, ETH, BNB pairs in spot
      // Since we don't have market type in schema, we'll filter out futures symbols
      query.symbol = {
        $not: { $regex: /(PERP|_\d{6}|UP|DOWN)$/ }, // Exclude futures and leveraged tokens
      };
      console.log("Filtering for Spot pairs (all quote assets)");
    } else {
      // No filters: return all pairs (spot, futures, leveraged tokens, etc.)
      console.log("No filters applied - returning all pairs");
    }

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

    // For smaller requests, use normal flow with timeout
    let responseSent = false;

    const responseTimeout = setTimeout(() => {
      if (!responseSent) {
        console.log("Response timeout - sending database data");
        sendResponse();
      }
    }, 2000); // Reduced timeout for better UX

    const sendResponse = async () => {
      if (responseSent) return;
      responseSent = true;
      clearTimeout(responseTimeout);

      const cryptos = await Crypto.find(query).sort({ symbol: 1 }).lean();

      console.log(
        `Returning ${cryptos.length} cryptos with query:`,
        JSON.stringify(query)
      );

      res.json({
        cryptos,
        totalCount: cryptos.length,
        timestamp: new Date().toISOString(),
        dataSource: "database",
      });
    };

    // Start background refresh
    refreshCryptoData(req).catch((err) => {
      console.error("Background refresh failed:", err.message);
    });

    // Send response immediately from database
    await sendResponse();
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

    // Fetch klines/candlestick data from Binance with retry
    console.log(`Fetching chart data for ${symbol} with retry mechanism`);
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
      return res.status(404).json({ message: "Chart data not found" });
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
  } catch (error) {
    handleAPIError(
      error,
      res,
      `Error with chart data for ${req.params.symbol}`
    );
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
