/**
 * Pairs Service - Fast pairs loading with Redis caching
 * 
 * This service fetches all Binance USDT pairs once and caches them in Redis.
 * Refreshes the cache every 5 minutes to keep data fresh.
 * Provides instant pairs loading for the dashboard.
 */

const axios = require('axios');
const redis = require('redis');

class PairsService {
  constructor() {
    this.redisClient = null;
    this.isInitialized = false;
    this.refreshInterval = null;
    this.isRefreshing = false;
  }

  /**
   * Initialize Redis connection
   */
  async initRedis() {
    try {
      if (!this.redisClient) {
        this.redisClient = redis.createClient({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
          },
        });

        this.redisClient.on('error', (err) => {
          console.log('⚠️ Redis connection error in PairsService:', err.message);
        });

        await this.redisClient.connect();
        console.log('✅ PairsService connected to Redis');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Redis in PairsService:', error.message);
      this.redisClient = null;
      return false;
    }
  }

  /**
   * Fetch all USDT pairs from Binance API
   */
  async fetchBinancePairs() {
    try {
      console.log('📡 Fetching all USDT pairs from Binance...');
      
      const [tickerResponse, exchangeInfoResponse] = await Promise.all([
        axios.get('https://api.binance.com/api/v3/ticker/price', {
          timeout: 30000,
        }),
        axios.get('https://api.binance.com/api/v3/exchangeInfo', {
          timeout: 30000,
        }),
      ]);

      // Filter for USDT pairs only
      const usdtPairs = tickerResponse.data.filter(ticker => 
        ticker.symbol.endsWith('USDT')
      );

      // Get exchange info for filtering
      const exchangeInfoMap = {};
      exchangeInfoResponse.data.symbols.forEach(symbolInfo => {
        if (symbolInfo && symbolInfo.symbol) {
          exchangeInfoMap[symbolInfo.symbol] = {
            isSpotTradingAllowed: symbolInfo.isSpotTradingAllowed,
            quoteAsset: symbolInfo.quoteAsset,
            status: symbolInfo.status,
            baseAsset: symbolInfo.baseAsset,
          };
        }
      });

      // Filter for active USDT spot trading pairs
      const filteredPairs = usdtPairs.filter(ticker => {
        const symbolInfo = exchangeInfoMap[ticker.symbol];
        return symbolInfo && 
               symbolInfo.quoteAsset === 'USDT' &&
               symbolInfo.status === 'TRADING' &&
               symbolInfo.isSpotTradingAllowed === true;
      });

      console.log(`✅ Found ${filteredPairs.length} active USDT pairs`);

      // Transform to our format
      const pairsData = filteredPairs.map(ticker => ({
        symbol: ticker.symbol,
        price: parseFloat(ticker.price),
        name: ticker.symbol.replace('USDT', ''),
        quoteAsset: 'USDT',
        status: 'TRADING',
        isSpotTradingAllowed: true,
        isFavorite: false,
        volume24h: 0,
        priceChangePercent24h: 0,
        lastUpdated: new Date().toISOString(),
      }));

      return {
        pairs: pairsData,
        totalCount: pairsData.length,
        timestamp: new Date().toISOString(),
        source: 'binance_api'
      };

    } catch (error) {
      console.error('❌ Error fetching Binance pairs:', error.message);
      throw error;
    }
  }

  /**
   * Save pairs data to Redis
   */
  async savePairsToRedis(pairsData) {
    try {
      if (!this.redisClient) {
        console.warn('⚠️ Redis client not available, cannot save pairs');
        return false;
      }

      const cacheKey = 'all_pairs';
      const cacheData = {
        ...pairsData,
        cachedAt: new Date().toISOString(),
      };

      await this.redisClient.setEx(cacheKey, 300, JSON.stringify(cacheData)); // 5 minutes TTL
      console.log(`✅ Saved ${pairsData.pairs.length} pairs to Redis cache`);
      return true;
    } catch (error) {
      console.error('❌ Error saving pairs to Redis:', error.message);
      return false;
    }
  }

  /**
   * Get pairs from Redis cache
   */
  async getPairsFromRedis() {
    try {
      if (!this.redisClient) {
        return null;
      }

      const cacheKey = 'all_pairs';
      const cachedData = await this.redisClient.get(cacheKey);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log(`📦 Retrieved ${parsed.pairs.length} pairs from Redis cache`);
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting pairs from Redis:', error.message);
      return null;
    }
  }

  /**
   * Refresh pairs data (fetch from Binance and save to Redis)
   */
  async refreshPairs() {
    if (this.isRefreshing) {
      console.log('⏳ Pairs refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;
    try {
      console.log('🔄 Refreshing pairs data...');
      const pairsData = await this.fetchBinancePairs();
      await this.savePairsToRedis(pairsData);
      console.log('✅ Pairs data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing pairs:', error.message);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('🚀 Initializing PairsService...');
    
    try {
      // Initialize Redis
      const redisConnected = await this.initRedis();
      if (!redisConnected) {
        console.warn('⚠️ Redis not available, PairsService will work without caching');
      }

      // Check if we have cached data
      const cachedData = await this.getPairsFromRedis();
      if (!cachedData) {
        console.log('📡 No cached data found, fetching initial pairs...');
        await this.refreshPairs();
      } else {
        console.log('✅ Using existing cached pairs data');
      }

      // Set up automatic refresh every 5 minutes
      this.refreshInterval = setInterval(() => {
        this.refreshPairs();
      }, 5 * 60 * 1000); // 5 minutes

      this.isInitialized = true;
      console.log('✅ PairsService initialized successfully');
    } catch (error) {
      console.error('❌ PairsService initialization failed:', error.message);
      // Don't fail completely, just log the error
      this.isInitialized = true;
    }
  }

  /**
   * Get pairs data (from cache or fetch if needed)
   */
  async getPairs() {
    try {
      // Try to get from cache first
      let pairsData = await this.getPairsFromRedis();
      
      if (!pairsData) {
        console.log('📡 No cached data, fetching fresh pairs...');
        pairsData = await this.fetchBinancePairs();
        await this.savePairsToRedis(pairsData);
      }

      return pairsData;
    } catch (error) {
      console.error('❌ Error getting pairs:', error.message);
      
      // Fallback: try to fetch directly from Binance
      try {
        console.log('🔄 Attempting direct Binance fetch as fallback...');
        const fallbackData = await this.fetchBinancePairs();
        return fallbackData;
      } catch (fallbackError) {
        console.error('❌ Fallback fetch also failed:', fallbackError.message);
        throw error; // Throw original error
      }
    }
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }

    this.isInitialized = false;
    console.log('✅ PairsService destroyed');
  }
}

// Create singleton instance
const pairsService = new PairsService();

module.exports = pairsService;
