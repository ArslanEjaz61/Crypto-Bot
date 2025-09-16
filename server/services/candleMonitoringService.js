const axios = require('axios');

/**
 * Candle Monitoring Service
 * Handles real-time candle monitoring for multiple timeframes and conditions
 */

// Binance API configuration
const BINANCE_API_BASE = 'https://api.binance.com';

/**
 * Get real-time kline (candlestick) data from Binance
 * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
 * @param {string} interval - Timeframe interval (e.g., '5m', '15m', '1h', '4h', '12h', '1d', '1w')
 * @param {number} limit - Number of candles to fetch (default: 2 to get current and previous)
 * @returns {Promise<Array>} Array of kline data
 */
const getKlineData = async (symbol, interval, limit = 2) => {
  try {
    const response = await axios.get(`${BINANCE_API_BASE}/api/v3/klines`, {
      params: {
        symbol: symbol,
        interval: interval,
        limit: limit
      },
      timeout: 10000
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid kline data received from Binance');
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching kline data for ${symbol} ${interval}:`, error.message);
    throw error;
  }
};

/**
 * Convert timeframe to Binance interval format
 * @param {string} timeframe - Timeframe in our format (e.g., '5MIN', '1HR', 'D', 'W')
 * @returns {string} Binance interval format (e.g., '5m', '1h', '1d', '1w')
 */
const convertTimeframeToInterval = (timeframe) => {
  const timeframeMap = {
    '5MIN': '5m',
    '15MIN': '15m',
    '1HR': '1h',
    '4HR': '4h',
    '12HR': '12h',
    'D': '1d',
    'W': '1w'
  };
  
  return timeframeMap[timeframe] || '1h';
};

/**
 * Parse kline data into structured candle object
 * @param {Array} klineData - Raw kline data from Binance
 * @returns {Object} Parsed candle data
 */
const parseKlineData = (klineData) => {
  if (!klineData || klineData.length === 0) {
    return null;
  }

  // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
  const [openTime, open, high, low, close, volume, closeTime] = klineData;
  
  return {
    openTime: parseInt(openTime),
    closeTime: parseInt(closeTime),
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume),
    timestamp: new Date(parseInt(openTime))
  };
};

/**
 * Check if a candle condition is met
 * @param {Object} candle - Candle data (open, high, low, close)
 * @param {string} condition - Condition to check
 * @returns {boolean} True if condition is met
 */
const checkCandleCondition = (candle, condition) => {
  if (!candle) return false;

  const { open, high, low, close } = candle;
  const bodySize = Math.abs(close - open);
  const upperWick = high - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low;
  const totalRange = high - low;

  switch (condition) {
    case 'ABOVE_OPEN':
      return close > open;

    case 'BELOW_OPEN':
      return close < open;

    case 'GREEN_CANDLE':
      return close > open;

    case 'RED_CANDLE':
      return close < open;

    case 'DOJI':
      // Open and close are very close (within 0.1% of the range)
      return bodySize <= totalRange * 0.001;

    case 'HAMMER':
      // Generic hammer: small body, long lower wick, short upper wick
      return lowerWick > bodySize * 2 && upperWick < bodySize;

    case 'BULLISH_HAMMER':
      // Small body at top, long lower wick, short upper wick, bullish
      return lowerWick > bodySize * 2 && upperWick < bodySize && close > open;

    case 'BEARISH_HAMMER':
      // Small body at bottom, long upper wick, short lower wick, bearish
      return upperWick > bodySize * 2 && lowerWick < bodySize && close < open;

    case 'LONG_UPPER_WICK':
      // Upper wick is at least 2x the body size
      return upperWick >= bodySize * 2;

    case 'LONG_LOWER_WICK':
      // Lower wick is at least 2x the body size
      return lowerWick >= bodySize * 2;

    default:
      console.warn(`Unknown candle condition: ${condition}`);
      return false;
  }
};

/**
 * Check if a new candle has started (current candle is different from previous)
 * @param {Object} currentCandle - Current candle data
 * @param {Object} previousCandle - Previous candle data
 * @returns {boolean} True if new candle has started
 */
const isNewCandle = (currentCandle, previousCandle) => {
  if (!currentCandle || !previousCandle) return true;
  
  // Compare open times to determine if it's a new candle
  return currentCandle.openTime !== previousCandle.openTime;
};

/**
 * Monitor candle conditions for a specific symbol and timeframe
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Timeframe to monitor
 * @param {string} condition - Candle condition to check
 * @param {Object} previousCandle - Previous candle data for comparison
 * @returns {Promise<Object>} Monitoring result
 */
const monitorCandleCondition = async (symbol, timeframe, condition, previousCandle = null) => {
  try {
    const interval = convertTimeframeToInterval(timeframe);
    
    // Fetch current and previous candle data
    const klineData = await getKlineData(symbol, interval, 2);
    
    if (klineData.length < 1) {
      throw new Error('No kline data received');
    }

    const currentCandle = parseKlineData(klineData[klineData.length - 1]);
    const prevCandle = klineData.length > 1 ? parseKlineData(klineData[klineData.length - 2]) : null;

    // Check if this is a new candle
    const newCandleStarted = isNewCandle(currentCandle, previousCandle);

    // Check if condition is met for current candle
    const conditionMet = checkCandleCondition(currentCandle, condition);

    return {
      symbol,
      timeframe,
      condition,
      currentCandle,
      previousCandle: prevCandle,
      newCandleStarted,
      conditionMet,
      timestamp: new Date(),
      shouldTriggerAlert: conditionMet && newCandleStarted
    };

  } catch (error) {
    console.error(`Error monitoring candle condition for ${symbol} ${timeframe}:`, error.message);
    return {
      symbol,
      timeframe,
      condition,
      error: error.message,
      timestamp: new Date(),
      shouldTriggerAlert: false
    };
  }
};

/**
 * Monitor multiple timeframes for a single symbol and condition
 * @param {string} symbol - Trading pair symbol
 * @param {Array<string>} timeframes - Array of timeframes to monitor
 * @param {string} condition - Candle condition to check
 * @param {Object} previousCandles - Previous candle data for each timeframe
 * @returns {Promise<Array>} Array of monitoring results
 */
const monitorMultipleTimeframes = async (symbol, timeframes, condition, previousCandles = {}) => {
  const results = [];

  for (const timeframe of timeframes) {
    try {
      const result = await monitorCandleCondition(
        symbol, 
        timeframe, 
        condition, 
        previousCandles[timeframe]
      );
      results.push(result);
    } catch (error) {
      console.error(`Error monitoring ${timeframe} for ${symbol}:`, error.message);
      results.push({
        symbol,
        timeframe,
        condition,
        error: error.message,
        timestamp: new Date(),
        shouldTriggerAlert: false
      });
    }
  }

  return results;
};

/**
 * Get current candle data for all specified timeframes
 * @param {string} symbol - Trading pair symbol
 * @param {Array<string>} timeframes - Array of timeframes
 * @returns {Promise<Object>} Object with candle data for each timeframe
 */
const getCurrentCandleData = async (symbol, timeframes) => {
  const candleData = {};

  for (const timeframe of timeframes) {
    try {
      const interval = convertTimeframeToInterval(timeframe);
      const klineData = await getKlineData(symbol, interval, 1);
      
      if (klineData.length > 0) {
        candleData[timeframe] = parseKlineData(klineData[0]);
      }
    } catch (error) {
      console.error(`Error fetching candle data for ${symbol} ${timeframe}:`, error.message);
      candleData[timeframe] = null;
    }
  }

  return candleData;
};

module.exports = {
  getKlineData,
  convertTimeframeToInterval,
  parseKlineData,
  checkCandleCondition,
  isNewCandle,
  monitorCandleCondition,
  monitorMultipleTimeframes,
  getCurrentCandleData
};
