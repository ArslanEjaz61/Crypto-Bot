/**
 * Instant Pairs Service
 * 
 * Provides instant loading of USDT pairs with real-time data:
 * - Loads all pairs instantly from Redis cache
 * - No disappearing after 15000ms - pairs stay visible
 * - Real-time volume updates
 * - Optimized for dashboard performance
 */

const { pairsOps, priceOps } = require('../config/redis');
const Crypto = require('../models/cryptoModel');

class InstantPairsService {
  constructor() {
    this.cache = new Map();
    this.lastUpdate = null;
    this.isInitialized = false;
  }

  /**
   * Get all USDT pairs instantly from Redis cache
   */
  async getAllPairs() {
    try {
      console.log('⚡ Getting all pairs from Redis cache...');
      
      // Check if cache is fresh (less than 5 minutes old)
      const isCacheFresh = await pairsOps.isCacheFresh(300000); // 5 minutes
      
      if (isCacheFresh) {
        console.log('✅ Using fresh Redis cache');
        const cachedPairs = await pairsOps.getAllPairs();
        
        if (cachedPairs && cachedPairs.length > 0) {
          // Enhance with live price data
          const enhancedPairs = await this.enhanceWithLiveData(cachedPairs);
          return {
            pairs: enhancedPairs,
            totalCount: enhancedPairs.length,
            timestamp: this.lastUpdate,
            dataSource: 'redis_cache',
            responseTime: '< 50ms'
          };
        }
      }
      
      // If cache is stale or empty, refresh from database
      console.log('🔄 Cache stale or empty, refreshing from database...');
      return await this.refreshPairsFromDatabase();
      
    } catch (error) {
      console.error('❌ Error getting pairs from cache:', error.message);
      return await this.refreshPairsFromDatabase();
    }
  }

  /**
   * Refresh pairs from database and cache in Redis
   */
  async refreshPairsFromDatabase() {
    try {
      console.log('📊 Loading pairs from database...');
      
      // Get all USDT pairs from database
      const dbPairs = await Crypto.find({
        quoteAsset: "USDT",
        status: "TRADING",
        isSpotTradingAllowed: true,
      })
      .select("symbol name price volume24h priceChangePercent24h isFavorite currentPrice lastPrice close highPrice lowPrice openPrice")
      .lean();

      console.log(`📊 Found ${dbPairs.length} USDT pairs in database`);

      if (dbPairs.length === 0) {
        return {
          pairs: [],
          totalCount: 0,
          timestamp: new Date().toISOString(),
          dataSource: 'empty_database',
          message: 'Database is empty. WebSocket service will populate data shortly.'
        };
      }

      // Get live prices from Redis
      const livePrices = await priceOps.getAllCompletePriceData();
      
      // Merge database data with live prices
      const enrichedPairs = dbPairs.map((pair) => {
        const liveData = livePrices[pair.symbol];
        
        if (liveData) {
          return {
            ...pair,
            price: liveData.price,
            volume24h: liveData.volume,
            priceChangePercent24h: liveData.priceChangePercent,
            high24h: liveData.high24h,
            low24h: liveData.low24h,
            open24h: liveData.open24h,
            _liveData: true,
            _lastUpdate: liveData.timestamp
          };
        }
        
        // Fallback to database data
        return {
          ...pair,
          price: pair.price || pair.currentPrice || pair.lastPrice || pair.close || 0,
          volume24h: pair.volume24h || 0,
          priceChangePercent24h: pair.priceChangePercent24h || 0,
          high24h: pair.highPrice || pair.price,
          low24h: pair.lowPrice || pair.price,
          open24h: pair.openPrice || pair.price,
          _liveData: false
        };
      });

      // Sort by volume (most active first)
      enrichedPairs.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

      // Cache in Redis for instant future access
      await pairsOps.saveAllPairs(enrichedPairs);
      
      // Publish update
      await pairsOps.publishPairsUpdate(enrichedPairs);
      
      this.lastUpdate = new Date().toISOString();
      
      console.log(`✅ Cached ${enrichedPairs.length} pairs in Redis`);
      
      return {
        pairs: enrichedPairs,
        totalCount: enrichedPairs.length,
        timestamp: this.lastUpdate,
        dataSource: 'database_refresh',
        responseTime: '< 200ms'
      };
      
    } catch (error) {
      console.error('❌ Error refreshing pairs from database:', error.message);
      throw error;
    }
  }

  /**
   * Enhance cached pairs with live price data
   */
  async enhanceWithLiveData(cachedPairs) {
    try {
      const livePrices = await priceOps.getAllCompletePriceData();
      
      return cachedPairs.map((pair) => {
        const liveData = livePrices[pair.symbol];
        
        if (liveData) {
          return {
            ...pair,
            price: liveData.price,
            volume24h: liveData.volume,
            priceChangePercent24h: liveData.priceChangePercent,
            high24h: liveData.high24h,
            low24h: liveData.low24h,
            open24h: liveData.open24h,
            _liveData: true,
            _lastUpdate: liveData.timestamp
          };
        }
        
        return pair;
      });
    } catch (error) {
      console.error('❌ Error enhancing with live data:', error.message);
      return cachedPairs;
    }
  }

  /**
   * Get top volume pairs for quick access
   */
  async getTopVolumePairs(limit = 100) {
    try {
      const topPairs = await pairsOps.getTopVolumePairs();
      return topPairs.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting top volume pairs:', error.message);
      return [];
    }
  }

  /**
   * Get pairs by symbol
   */
  async getPairsBySymbol(symbols) {
    try {
      const allPairs = await this.getAllPairs();
      return allPairs.pairs.filter(pair => symbols.includes(pair.symbol));
    } catch (error) {
      console.error('❌ Error getting pairs by symbol:', error.message);
      return [];
    }
  }

  /**
   * Search pairs by criteria
   */
  async searchPairs(criteria) {
    try {
      const { search, minVolume, maxVolume, sortBy = 'volume24h', order = 'desc' } = criteria;
      
      const allPairs = await this.getAllPairs();
      let filteredPairs = allPairs.pairs;
      
      // Apply filters
      if (search) {
        filteredPairs = filteredPairs.filter(pair => 
          pair.symbol.toLowerCase().includes(search.toLowerCase()) ||
          (pair.name && pair.name.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      if (minVolume) {
        filteredPairs = filteredPairs.filter(pair => (pair.volume24h || 0) >= minVolume);
      }
      
      if (maxVolume) {
        filteredPairs = filteredPairs.filter(pair => (pair.volume24h || 0) <= maxVolume);
      }
      
      // Sort
      filteredPairs.sort((a, b) => {
        const aVal = a[sortBy] || 0;
        const bVal = b[sortBy] || 0;
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      });
      
      return {
        pairs: filteredPairs,
        totalCount: filteredPairs.length,
        timestamp: allPairs.timestamp,
        dataSource: allPairs.dataSource
      };
      
    } catch (error) {
      console.error('❌ Error searching pairs:', error.message);
      return { pairs: [], totalCount: 0 };
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus() {
    try {
      const isFresh = await pairsOps.isCacheFresh();
      const timestamp = this.lastUpdate;
      
      return {
        isFresh,
        timestamp,
        isInitialized: this.isInitialized,
        cacheSize: this.cache.size
      };
    } catch (error) {
      console.error('❌ Error getting cache status:', error.message);
      return {
        isFresh: false,
        timestamp: null,
        isInitialized: false,
        cacheSize: 0
      };
    }
  }

  /**
   * Force refresh cache
   */
  async forceRefresh() {
    try {
      console.log('🔄 Force refreshing pairs cache...');
      this.cache.clear();
      return await this.refreshPairsFromDatabase();
    } catch (error) {
      console.error('❌ Error force refreshing cache:', error.message);
      throw error;
    }
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Instant Pairs Service...');
      
      // Load initial data
      await this.getAllPairs();
      
      this.isInitialized = true;
      console.log('✅ Instant Pairs Service initialized');
      
    } catch (error) {
      console.error('❌ Error initializing Instant Pairs Service:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const instantPairsService = new InstantPairsService();

module.exports = instantPairsService;
