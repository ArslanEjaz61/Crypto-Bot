/**
 * Fast Pairs Controller - Instant pairs loading from Redis cache
 * 
 * This controller provides instant pairs loading by using cached data from Redis.
 * Falls back to database if Redis is not available.
 */

const pairsService = require('../services/pairsService');
const Crypto = require('../models/cryptoModel');

/**
 * Get all pairs (FAST - uses Redis cache)
 * @route GET /api/pairs/fast
 * @access Public
 */
const getFastPairs = async (req, res) => {
  try {
    console.log('⚡ Fast pairs request received');
    
    const startTime = Date.now();
    
    // Get pairs from cache service
    const pairsData = await pairsService.getPairs();
    
    const responseTime = Date.now() - startTime;
    
    console.log(`⚡ Retrieved ${pairsData.pairs.length} pairs in ${responseTime}ms`);
    console.log(`📊 Data source: ${pairsData.source}`);
    
    // Set cache headers for browser caching
    res.set({
      'Cache-Control': 'public, max-age=60', // 1 minute browser cache
      'X-Response-Time': `${responseTime}ms`,
      'X-Data-Source': pairsData.source || 'unknown',
      'X-Pairs-Count': pairsData.pairs.length.toString()
    });

    res.json({
      cryptos: pairsData.pairs,
      totalCount: pairsData.totalCount,
      timestamp: pairsData.timestamp,
      dataSource: pairsData.source,
      responseTime: `${responseTime}ms`,
      cached: true
    });

  } catch (error) {
    console.error('❌ Fast pairs error:', error.message);
    
    // Fallback to database if Redis fails
    try {
      console.log('🔄 Falling back to database...');
      
      const cryptos = await Crypto.find({
        quoteAsset: "USDT",
        status: "TRADING",
        isSpotTradingAllowed: true,
      })
        .select("symbol name price volume24h priceChangePercent24h isFavorite")
        .sort({ symbol: 1 })
        .lean();

      res.json({
        cryptos,
        totalCount: cryptos.length,
        timestamp: new Date().toISOString(),
        dataSource: "database_fallback",
        responseTime: ">1000ms",
        cached: false
      });

    } catch (dbError) {
      console.error('❌ Database fallback failed:', dbError.message);
      res.status(500).json({
        error: "Failed to fetch pairs",
        message: error.message,
        fallbackError: dbError.message
      });
    }
  }
};

/**
 * Get pairs by symbol (FAST - uses Redis cache)
 * @route GET /api/pairs/fast/:symbol
 * @access Public
 */
const getFastPairBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`⚡ Fast pair request for ${symbol}`);
    
    // Get all pairs from cache
    const pairsData = await pairsService.getPairs();
    
    // Find the specific pair
    const pair = pairsData.pairs.find(p => 
      p.symbol === symbol.toUpperCase()
    );
    
    if (!pair) {
      return res.status(404).json({
        error: "Pair not found",
        symbol: symbol.toUpperCase()
      });
    }

    res.json({
      ...pair,
      dataSource: "redis_cache",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Fast pair error:', error.message);
    res.status(500).json({
      error: "Failed to fetch pair",
      message: error.message
    });
  }
};

/**
 * Refresh pairs cache manually
 * @route POST /api/pairs/refresh
 * @access Public
 */
const refreshPairsCache = async (req, res) => {
  try {
    console.log('🔄 Manual pairs cache refresh requested');
    
    await pairsService.refreshPairs();
    
    res.json({
      success: true,
      message: "Pairs cache refreshed successfully",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Manual refresh error:', error.message);
    res.status(500).json({
      error: "Failed to refresh pairs cache",
      message: error.message
    });
  }
};

/**
 * Get pairs cache status
 * @route GET /api/pairs/status
 * @access Public
 */
const getPairsStatus = async (req, res) => {
  try {
    const cachedData = await pairsService.getPairsFromRedis();
    
    res.json({
      hasCache: !!cachedData,
      pairsCount: cachedData ? cachedData.pairs.length : 0,
      lastUpdated: cachedData ? cachedData.cachedAt : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Pairs status error:', error.message);
    res.status(500).json({
      error: "Failed to get pairs status",
      message: error.message
    });
  }
};

module.exports = {
  getFastPairs,
  getFastPairBySymbol,
  refreshPairsCache,
  getPairsStatus
};
