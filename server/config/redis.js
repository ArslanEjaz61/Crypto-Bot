const Redis = require('ioredis');

/**
 * Redis Configuration for Real-time Alert System
 * 
 * This module provides Redis connections for:
 * 1. Price data storage (latest prices from Binance)
 * 2. Pub/Sub for price updates
 * 3. Alert storage (symbol-wise organization)
 */

// Create Redis client for general operations (storing prices, alerts)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`⏳ Redis reconnection attempt ${times}, waiting ${delay}ms...`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

// Create separate Redis client for publishing
const redisPublisher = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Create separate Redis client for subscribing
const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Redis connection event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis Client connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Client ready');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client error:', err.message);
});

redisClient.on('close', () => {
  console.log('⚠️ Redis Client connection closed');
});

redisPublisher.on('connect', () => {
  console.log('✅ Redis Publisher connected');
});

redisPublisher.on('error', (err) => {
  console.error('❌ Redis Publisher error:', err.message);
});

redisSubscriber.on('connect', () => {
  console.log('✅ Redis Subscriber connected');
});

redisSubscriber.on('error', (err) => {
  console.error('❌ Redis Subscriber error:', err.message);
});

/**
 * Enhanced Redis Keys Structure for Real-time Alert System:
 * 
 * 1. Price Data:
 *    - price:{SYMBOL} -> Latest price as string
 *    - prices:hash -> Hash of all latest prices (faster bulk retrieval)
 *    - price:data:{SYMBOL} -> Complete price data (price, volume, high, low, open, change%)
 * 
 * 2. Alert Data:
 *    - alerts:{SYMBOL} -> Set of alert IDs for that symbol
 *    - alert:{ALERT_ID} -> Hash of alert data
 *    - alert:conditions:{SYMBOL} -> Cached condition results
 * 
 * 3. Pairs Data (Instant Loading):
 *    - pairs:usdt -> All USDT pairs with complete data
 *    - pairs:cache:timestamp -> Cache timestamp for invalidation
 *    - pairs:volume:top -> Top volume pairs for quick access
 * 
 * 4. Alert Count Tracking:
 *    - alert:count:{SYMBOL}:{TIMEFRAME} -> Current alert count
 *    - alert:count:reset:{TIMEFRAME} -> Last reset timestamp
 * 
 * 5. Pub/Sub Channels:
 *    - prices -> Price updates channel
 *    - alerts -> Triggered alerts channel
 *    - alert-updates -> Alert CRUD operations channel
 *    - pairs:updates -> Pairs data updates
 *    - conditions:updates -> Condition check results
 */

/**
 * Helper functions for price operations
 */
const priceOps = {
  // Save latest price for a symbol
  async savePrice(symbol, price) {
    try {
      await Promise.all([
        redisClient.set(`price:${symbol}`, price.toString()),
        redisClient.hset('prices:hash', symbol, price.toString())
      ]);
      return true;
    } catch (error) {
      console.error(`Error saving price for ${symbol}:`, error.message);
      return false;
    }
  },

  // Get latest price for a symbol
  async getPrice(symbol) {
    try {
      const price = await redisClient.hget('prices:hash', symbol);
      return price ? parseFloat(price) : null;
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error.message);
      return null;
    }
  },

  // Get all latest prices (bulk)
  async getAllPrices() {
    try {
      const prices = await redisClient.hgetall('prices:hash');
      const result = {};
      for (const [symbol, price] of Object.entries(prices)) {
        result[symbol] = parseFloat(price);
      }
      return result;
    } catch (error) {
      console.error('Error getting all prices:', error.message);
      return {};
    }
  },

  // Save complete price data for instant access
  async saveCompletePriceData(symbol, priceData) {
    try {
      const completeData = {
        symbol,
        price: priceData.price,
        volume: priceData.volume || 0,
        high24h: priceData.high || priceData.high24h || priceData.price,
        low24h: priceData.low || priceData.low24h || priceData.price,
        open24h: priceData.open || priceData.open24h || priceData.price,
        priceChange: priceData.priceChange || 0,
        priceChangePercent: priceData.priceChangePercent || 0,
        timestamp: priceData.timestamp || Date.now()
      };

      await redisClient.hset('price:data', symbol, JSON.stringify(completeData));
      return true;
    } catch (error) {
      console.error(`Error saving complete price data for ${symbol}:`, error.message);
      return false;
    }
  },

  // Get complete price data
  async getCompletePriceData(symbol) {
    try {
      const data = await redisClient.hget('price:data', symbol);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting complete price data for ${symbol}:`, error.message);
      return null;
    }
  },

  // Get all complete price data (bulk)
  async getAllCompletePriceData() {
    try {
      const data = await redisClient.hgetall('price:data');
      const result = {};
      for (const [symbol, priceData] of Object.entries(data)) {
        result[symbol] = JSON.parse(priceData);
      }
      return result;
    } catch (error) {
      console.error('Error getting all complete price data:', error.message);
      return {};
    }
  },

  // Publish price update to subscribers
  async publishPriceUpdate(symbol, priceData) {
    try {
      // Save complete data first
      await this.saveCompletePriceData(symbol, priceData);
      
      await redisPublisher.publish('prices', JSON.stringify({
        symbol,
        price: priceData.price,
        timestamp: priceData.timestamp || Date.now(),
        volume: priceData.volume || null,
        priceChange: priceData.priceChange || null,
        priceChangePercent: priceData.priceChangePercent || null,
        high24h: priceData.high || priceData.high24h,
        low24h: priceData.low || priceData.low24h,
        open24h: priceData.open || priceData.open24h,
      }));
      return true;
    } catch (error) {
      console.error(`Error publishing price update for ${symbol}:`, error.message);
      return false;
    }
  }
};

/**
 * Helper functions for alert operations
 */
const alertOps = {
  // Add alert to Redis for a symbol
  async addAlert(symbol, alertData) {
    try {
      const alertId = alertData._id || alertData.id;
      await Promise.all([
        redisClient.sadd(`alerts:${symbol}`, alertId.toString()),
        redisClient.hset(`alert:${alertId}`, {
          id: alertId.toString(),
          symbol: symbol,
          direction: alertData.direction,
          targetType: alertData.targetType,
          targetValue: alertData.targetValue.toString(),
          basePrice: alertData.basePrice?.toString() || alertData.currentPrice?.toString(),
          isActive: alertData.isActive ? '1' : '0',
          data: JSON.stringify(alertData)
        })
      ]);
      
      // Publish alert update
      await redisPublisher.publish('alert-updates', JSON.stringify({
        action: 'add',
        symbol,
        alertId: alertId.toString()
      }));
      
      return true;
    } catch (error) {
      console.error(`Error adding alert for ${symbol}:`, error.message);
      return false;
    }
  },

  // Remove alert from Redis
  async removeAlert(symbol, alertId) {
    try {
      await Promise.all([
        redisClient.srem(`alerts:${symbol}`, alertId.toString()),
        redisClient.del(`alert:${alertId}`)
      ]);
      
      // Publish alert update
      await redisPublisher.publish('alert-updates', JSON.stringify({
        action: 'remove',
        symbol,
        alertId: alertId.toString()
      }));
      
      return true;
    } catch (error) {
      console.error(`Error removing alert ${alertId}:`, error.message);
      return false;
    }
  },

  // Get all alerts for a symbol
  async getAlertsForSymbol(symbol) {
    try {
      const alertIds = await redisClient.smembers(`alerts:${symbol}`);
      const alerts = [];
      
      for (const alertId of alertIds) {
        const alertData = await redisClient.hget(`alert:${alertId}`, 'data');
        if (alertData) {
          alerts.push(JSON.parse(alertData));
        }
      }
      
      return alerts;
    } catch (error) {
      console.error(`Error getting alerts for ${symbol}:`, error.message);
      return [];
    }
  },

  // Get all symbols with alerts
  async getAllAlertSymbols() {
    try {
      const keys = await redisClient.keys('alerts:*');
      return keys.map(key => key.replace('alerts:', ''));
    } catch (error) {
      console.error('Error getting alert symbols:', error.message);
      return [];
    }
  },

  // Publish triggered alert
  async publishTriggeredAlert(alertData) {
    try {
      await redisPublisher.publish('alerts', JSON.stringify({
        ...alertData,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error publishing triggered alert:', error.message);
      return false;
    }
  }
};

/**
 * Helper functions for pairs operations (instant loading)
 */
const pairsOps = {
  // Save all USDT pairs for instant loading
  async saveAllPairs(pairsData) {
    try {
      const timestamp = Date.now();
      
      // Save complete pairs data
      await redisClient.set('pairs:usdt', JSON.stringify(pairsData));
      await redisClient.set('pairs:cache:timestamp', timestamp.toString());
      
      // Save top volume pairs for quick access
      const topVolumePairs = pairsData
        .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
        .slice(0, 100);
      
      await redisClient.set('pairs:volume:top', JSON.stringify(topVolumePairs));
      
      console.log(`✅ Saved ${pairsData.length} pairs to Redis cache`);
      return true;
    } catch (error) {
      console.error('Error saving pairs to Redis:', error.message);
      return false;
    }
  },

  // Get all USDT pairs (instant loading)
  async getAllPairs() {
    try {
      const data = await redisClient.get('pairs:usdt');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pairs from Redis:', error.message);
      return [];
    }
  },

  // Get top volume pairs
  async getTopVolumePairs() {
    try {
      const data = await redisClient.get('pairs:volume:top');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting top volume pairs:', error.message);
      return [];
    }
  },

  // Check if pairs cache is fresh
  async isCacheFresh(maxAgeMs = 300000) { // 5 minutes default
    try {
      const timestamp = await redisClient.get('pairs:cache:timestamp');
      if (!timestamp) return false;
      
      const age = Date.now() - parseInt(timestamp);
      return age < maxAgeMs;
    } catch (error) {
      console.error('Error checking cache freshness:', error.message);
      return false;
    }
  },

  // Publish pairs update
  async publishPairsUpdate(pairsData) {
    try {
      await redisPublisher.publish('pairs:updates', JSON.stringify({
        count: pairsData.length,
        timestamp: Date.now(),
        topPairs: pairsData.slice(0, 10) // First 10 for preview
      }));
      return true;
    } catch (error) {
      console.error('Error publishing pairs update:', error.message);
      return false;
    }
  }
};

/**
 * Helper functions for condition operations
 */
const conditionOps = {
  // Cache condition results
  async cacheConditionResult(symbol, result) {
    try {
      await redisClient.setex(
        `alert:conditions:${symbol}`, 
        300, // 5 minutes TTL
        JSON.stringify(result)
      );
      return true;
    } catch (error) {
      console.error(`Error caching condition result for ${symbol}:`, error.message);
      return false;
    }
  },

  // Get cached condition result
  async getCachedConditionResult(symbol) {
    try {
      const data = await redisClient.get(`alert:conditions:${symbol}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting cached condition result for ${symbol}:`, error.message);
      return null;
    }
  },

  // Publish condition update
  async publishConditionUpdate(symbol, result) {
    try {
      await redisPublisher.publish('conditions:updates', JSON.stringify({
        symbol,
        result,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error(`Error publishing condition update for ${symbol}:`, error.message);
      return false;
    }
  }
};

/**
 * Sync alerts from MongoDB to Redis
 */
async function syncAlertsFromDB() {
  try {
    const Alert = require('../models/alertModel');
    
    // Get all active alerts
    const alerts = await Alert.find({ isActive: true, userExplicitlyCreated: true });
    
    console.log(`🔄 Syncing ${alerts.length} active alerts to Redis...`);
    
    let syncCount = 0;
    for (const alert of alerts) {
      const success = await alertOps.addAlert(alert.symbol, {
        _id: alert._id,
        symbol: alert.symbol,
        direction: alert.direction,
        targetType: alert.targetType,
        targetValue: alert.targetValue,
        basePrice: alert.basePrice,
        currentPrice: alert.currentPrice,
        isActive: alert.isActive,
        // Include full alert data for complex conditions
        candleCondition: alert.candleCondition,
        candleTimeframes: alert.candleTimeframes,
        rsiEnabled: alert.rsiEnabled,
        emaEnabled: alert.emaEnabled,
        alertCountEnabled: alert.alertCountEnabled,
        alertCountTimeframe: alert.alertCountTimeframe,
        maxAlertsPerTimeframe: alert.maxAlertsPerTimeframe,
      });
      
      if (success) syncCount++;
    }
    
    console.log(`✅ Synced ${syncCount}/${alerts.length} alerts to Redis`);
    return syncCount;
  } catch (error) {
    console.error('Error syncing alerts from DB:', error.message);
    return 0;
  }
}

/**
 * Clear all Redis data (useful for reset/debugging)
 */
async function clearAllData() {
  try {
    await redisClient.flushdb();
    console.log('✅ Redis database cleared');
    return true;
  } catch (error) {
    console.error('Error clearing Redis:', error.message);
    return false;
  }
}

module.exports = {
  redisClient,
  redisPublisher,
  redisSubscriber,
  priceOps,
  alertOps,
  pairsOps,
  conditionOps,
  syncAlertsFromDB,
  clearAllData
};

