# Binance API Integration for Alert System

This document provides guidance on how to integrate the Binance API with the alert system for real-time data in production.

## Prerequisites

- Binance API Key and Secret (create at https://www.binance.com/en/my/settings/api-management)
- Node.js 14+ environment
- `node-binance-api` package installed

## Installation

```bash
npm install node-binance-api --save
```

## Basic Setup

Create a `binanceService.js` file in the services directory:

```javascript
// server/services/binanceService.js
const Binance = require('node-binance-api');

// Initialize Binance client
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET,
  useServerTime: true,
  recvWindow: 60000, // Increase if you're getting timestamp errors
});

module.exports = binance;
```

Update your `.env` file with:

```
BINANCE_API_KEY=your_api_key_here
BINANCE_API_SECRET=your_api_secret_here
```

## Implementing Data Fetching Functions

Replace the mock functions in `alertService.js` with real Binance API calls:

### Fetch Candle Data

```javascript
/**
 * Fetch candle data for a specific symbol and timeframe
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - Candle timeframe
 * @returns {Promise<Object>} Candle data object
 */
async function fetchCandleData(symbol, timeframe) {
  try {
    // Convert timeframe to Binance format
    const interval = convertTimeframeFormat(timeframe);
    
    // Get candles
    const candles = await binance.candlesticks(symbol, interval, (error, ticks) => {
      if (error) throw new Error(error.message);
      return ticks;
    }, { limit: 2 }); // Get current and previous candle
    
    if (!candles || candles.length < 2) {
      throw new Error('Not enough candle data available');
    }
    
    // Current candle (last complete candle)
    const current = candles[candles.length - 2];
    // Previous candle
    const previous = candles[candles.length - 3] || null;
    
    const result = {};
    
    // Format current candle
    result[timeframe] = {
      open: parseFloat(current[1]),
      high: parseFloat(current[2]),
      low: parseFloat(current[3]),
      close: parseFloat(current[4]),
      volume: parseFloat(current[5])
    };
    
    // Format previous candle if available
    if (previous) {
      result[`${timeframe}_previous`] = {
        open: parseFloat(previous[1]),
        high: parseFloat(previous[2]),
        low: parseFloat(previous[3]),
        close: parseFloat(previous[4]),
        volume: parseFloat(previous[5])
      };
    }
    
    return result;
  } catch (error) {
    console.error(`Error fetching candle data for ${symbol}:`, error);
    return null;
  }
}
```

### Fetch RSI Data

```javascript
/**
 * Fetch RSI data for a specific symbol, timeframe and period
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - RSI timeframe
 * @param {number} period - RSI period 
 * @returns {Promise<Object>} RSI data object
 */
async function fetchRsiData(symbol, timeframe, period) {
  try {
    const interval = convertTimeframeFormat(timeframe);
    
    // Get candles for RSI calculation
    const candles = await binance.candlesticks(symbol, interval, (error, ticks) => {
      if (error) throw new Error(error.message);
      return ticks;
    }, { limit: period + 2 }); // Need period+2 candles to calculate current and previous RSI
    
    if (!candles || candles.length < period + 2) {
      throw new Error('Not enough data to calculate RSI');
    }
    
    // Extract close prices
    const closePrices = candles.map(candle => parseFloat(candle[4]));
    
    // Calculate RSI for current and previous period
    const currentRsi = calculateRSI(closePrices.slice(1), period);
    const previousRsi = calculateRSI(closePrices.slice(0, -1), period);
    
    const result = {};
    result[timeframe] = currentRsi;
    result[`${timeframe}_previous`] = previousRsi;
    
    return result;
  } catch (error) {
    console.error(`Error fetching RSI data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate RSI value from an array of close prices
 * @param {Array<number>} prices - Array of close prices
 * @param {number} period - RSI period
 * @returns {number} RSI value
 */
function calculateRSI(prices, period) {
  if (prices.length <= period) {
    throw new Error('Not enough price data to calculate RSI');
  }
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change; // Make loss a positive number
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate subsequent values
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let currentGain = 0;
    let currentLoss = 0;
    
    if (change >= 0) {
      currentGain = change;
    } else {
      currentLoss = -change;
    }
    
    // Use Wilder's smoothing method
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
  }
  
  // Calculate RS and RSI
  if (avgLoss === 0) {
    return 100; // No losses, RSI is 100
  }
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
```

### Fetch EMA Data

```javascript
/**
 * Fetch EMA data for a specific symbol, timeframe and periods
 * @param {string} symbol - Trading pair symbol
 * @param {string} timeframe - EMA timeframe
 * @param {Array<number>} periods - Array of periods to fetch
 * @returns {Promise<Object>} EMA data object
 */
async function fetchEmaData(symbol, timeframe, periods) {
  try {
    // Find the longest period needed
    const maxPeriod = Math.max(...periods);
    const interval = convertTimeframeFormat(timeframe);
    
    // We need 3x the longest period to calculate EMAs accurately
    const limit = maxPeriod * 3;
    
    // Get candles for EMA calculation
    const candles = await binance.candlesticks(symbol, interval, (error, ticks) => {
      if (error) throw new Error(error.message);
      return ticks;
    }, { limit });
    
    if (!candles || candles.length < maxPeriod) {
      throw new Error('Not enough data to calculate EMAs');
    }
    
    // Extract close prices (from oldest to newest)
    const closePrices = candles.map(candle => parseFloat(candle[4]));
    
    const result = {
      [timeframe]: {},
      [`${timeframe}_previous`]: {}
    };
    
    // Calculate EMAs for each requested period
    periods.forEach(period => {
      // Current EMA (using all prices)
      result[timeframe][period] = calculateEMA(closePrices, period);
      
      // Previous EMA (excluding the last price)
      result[`${timeframe}_previous`][period] = calculateEMA(closePrices.slice(0, -1), period);
    });
    
    return result;
  } catch (error) {
    console.error(`Error fetching EMA data for ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate EMA value from an array of prices
 * @param {Array<number>} prices - Array of prices
 * @param {number} period - EMA period
 * @returns {number} EMA value
 */
function calculateEMA(prices, period) {
  if (prices.length < period) {
    throw new Error('Not enough price data to calculate EMA');
  }
  
  // Calculate initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let ema = sum / period;
  
  // Calculate multiplier
  const multiplier = 2 / (period + 1);
  
  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}
```

### Fetch Volume History

```javascript
/**
 * Fetch volume history for a specific symbol
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Array<number>>} Array of historical volume values
 */
async function fetchVolumeHistory(symbol) {
  try {
    // Get recent candles to extract volume data
    const interval = '1h'; // Use 1-hour candles
    const limit = 24; // Get last 24 hours of volume data
    
    const candles = await binance.candlesticks(symbol, interval, (error, ticks) => {
      if (error) throw new Error(error.message);
      return ticks;
    }, { limit });
    
    if (!candles || candles.length === 0) {
      throw new Error('No volume data available');
    }
    
    // Extract volume values
    return candles.map(candle => parseFloat(candle[5]));
  } catch (error) {
    console.error(`Error fetching volume history for ${symbol}:`, error);
    return [];
  }
}
```

### Fetch Market Data

```javascript
/**
 * Fetch market data for a specific symbol
 * @param {string} symbol - Trading pair symbol
 * @returns {Promise<Object>} Market data object
 */
async function fetchMarketData(symbol) {
  try {
    // Get 24hr ticker data
    const ticker = await binance.prevDay(symbol);
    
    if (!ticker) {
      throw new Error('Could not fetch ticker data');
    }
    
    // Determine if the market is spot or futures
    const exchangeInfo = await binance.exchangeInfo();
    let market = 'SPOT';
    
    // Check if the symbol is in the futures market
    // Note: This requires additional API calls to the futures API
    // This is a simplified approach
    if (symbol.endsWith('PERP') || symbol.includes('_')) {
      market = 'FUTURES';
    }
    
    // Extract trading pair base
    let tradingPair = 'OTHER';
    if (symbol.endsWith('USDT')) tradingPair = 'USDT';
    else if (symbol.endsWith('BTC')) tradingPair = 'BTC';
    else if (symbol.endsWith('ETH')) tradingPair = 'ETH';
    else if (symbol.endsWith('BUSD')) tradingPair = 'BUSD';
    else if (symbol.endsWith('USDC')) tradingPair = 'USDC';
    
    return {
      market,
      exchange: 'BINANCE',
      tradingPair,
      dailyVolume: parseFloat(ticker.quoteVolume), // Volume in quote currency (e.g., USDT)
      priceChangePercent24h: parseFloat(ticker.priceChangePercent)
    };
  } catch (error) {
    console.error(`Error fetching market data for ${symbol}:`, error);
    return null;
  }
}
```

### Helper Function for Timeframe Conversion

```javascript
/**
 * Convert internal timeframe format to Binance API format
 * @param {string} timeframe - Internal timeframe format
 * @returns {string} Binance API timeframe format
 */
function convertTimeframeFormat(timeframe) {
  const mapping = {
    '5MIN': '5m',
    '15MIN': '15m',
    '1HR': '1h',
    '4HR': '4h',
    '12HR': '12h',
    'D': '1d',
    'W': '1w'
  };
  
  return mapping[timeframe] || '1h'; // Default to 1h if not found
}
```

## Rate Limiting Considerations

Binance enforces strict rate limits. Consider implementing:

1. Request queuing to avoid hitting rate limits
2. Caching frequently accessed data
3. Websocket connections for real-time updates

Example rate limit handler:

```javascript
const RateLimiter = require('limiter').RateLimiter;

// 1200 requests per minute (Binance's default weight limit)
const limiter = new RateLimiter(1200, 'minute');

async function rateLimitedRequest(requestFn) {
  return new Promise((resolve, reject) => {
    limiter.removeTokens(1, (err, remainingRequests) => {
      if (err) {
        reject(err);
        return;
      }
      
      try {
        const result = requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Usage example:
async function getRateLimitedCandleData(symbol, interval) {
  return rateLimitedRequest(() => {
    return binance.candlesticks(symbol, interval);
  });
}
```

## WebSocket Implementation for Real-Time Updates

For production environments, consider using WebSockets for real-time data instead of REST API polling:

```javascript
// Initialize Binance WebSocket
binance.websockets.chart(symbol, interval, (chart) => {
  // Process chart data
  const lastCandle = chart[symbol].slice(-1)[0];
  
  // Update your data stores
  updateCryptoData(symbol, {
    price: parseFloat(lastCandle.close),
    volume: parseFloat(lastCandle.volume)
  });
  
  // Process alerts that depend on this symbol
  processSymbolAlerts(symbol);
});
```

## Error Handling

Implement robust error handling and retry mechanisms:

```javascript
async function fetchWithRetry(fetchFunction, maxRetries = 3, delay = 1000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fetchFunction();
    } catch (error) {
      retries++;
      console.warn(`Attempt ${retries}/${maxRetries} failed for ${fetchFunction.name}: ${error.message}`);
      
      if (retries === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
    }
  }
}
```

## Security Considerations

1. **Never expose API keys**: Keep all keys in environment variables, never in code
2. **Use IP restrictions**: In Binance API management, restrict API access to your server IP
3. **Use Read-only APIs**: If you're only reading data, don't request trade permissions
4. **Implement API key rotation**: Regularly rotate API keys (e.g., every 30-90 days)

## Testing Your Integration

Create a simple test script:

```javascript
// test-binance.js
require('dotenv').config();
const binance = require('./services/binanceService');

async function testBinanceConnection() {
  try {
    // Test connection
    const ping = await binance.ping();
    console.log('Binance connection successful:', ping);
    
    // Get BTC/USDT price
    const ticker = await binance.prices('BTCUSDT');
    console.log('BTC/USDT price:', ticker.BTCUSDT);
    
    // Get recent candles
    const candles = await binance.candlesticks('BTCUSDT', '1h', (error, ticks) => {
      if (error) throw error;
      return ticks;
    }, { limit: 5 });
    console.log('Recent candles:', candles);
    
    return 'All tests passed!';
  } catch (error) {
    console.error('Binance connection test failed:', error);
    throw error;
  }
}

testBinanceConnection()
  .then(console.log)
  .catch(console.error);
```

Run with:

```bash
node test-binance.js
```
