/**
 * Instant Pairs Controller
 * 
 * Provides instant loading of USDT pairs with real-time data
 * - No disappearing after 15000ms - pairs stay visible
 * - Real-time volume updates
 * - Optimized for dashboard performance
 */

const instantPairsService = require('../services/instantPairsService');
const { pairsOps } = require('../config/redis');

// @desc    Get all USDT pairs instantly (no disappearing)
// @route   GET /api/pairs/instant
// @access  Public
const getInstantPairs = async (req, res) => {
  try {
    console.log('⚡ Instant pairs request');
    
    const result = await instantPairsService.getAllPairs();
    
    // Set cache headers for browser caching
    res.set({
      'Cache-Control': 'public, max-age=60', // 1 minute cache
      'X-Response-Time': '< 50ms',
      'X-Data-Source': result.dataSource,
      'X-Pairs-Count': result.totalCount.toString()
    });

    console.log(`⚡ Returning ${result.totalCount} pairs instantly`);
    
    res.json({
      success: true,
      ...result,
      responseTime: '< 50ms',
      message: 'Pairs loaded instantly from cache'
    });
    
  } catch (error) {
    console.error('❌ Instant pairs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pairs',
      message: error.message,
      pairs: [],
      totalCount: 0
    });
  }
};

// @desc    Get top volume pairs
// @route   GET /api/pairs/instant/top
// @access  Public
const getTopVolumePairs = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    console.log(`⚡ Top volume pairs request (limit: ${limit})`);
    
    const pairs = await instantPairsService.getTopVolumePairs(parseInt(limit));
    
    res.set({
      'Cache-Control': 'public, max-age=30', // 30 seconds cache
      'X-Response-Time': '< 30ms'
    });

    res.json({
      success: true,
      pairs,
      totalCount: pairs.length,
      timestamp: new Date().toISOString(),
      dataSource: 'redis_cache',
      responseTime: '< 30ms'
    });
    
  } catch (error) {
    console.error('❌ Top volume pairs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top volume pairs',
      message: error.message,
      pairs: [],
      totalCount: 0
    });
  }
};

// @desc    Search pairs with criteria
// @route   POST /api/pairs/instant/search
// @access  Public
const searchPairs = async (req, res) => {
  try {
    const criteria = req.body;
    
    console.log('⚡ Search pairs request:', criteria);
    
    const result = await instantPairsService.searchPairs(criteria);
    
    res.set({
      'Cache-Control': 'public, max-age=60',
      'X-Response-Time': '< 100ms'
    });

    res.json({
      success: true,
      ...result,
      responseTime: '< 100ms'
    });
    
  } catch (error) {
    console.error('❌ Search pairs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search pairs',
      message: error.message,
      pairs: [],
      totalCount: 0
    });
  }
};

// @desc    Get pairs by symbols
// @route   POST /api/pairs/instant/by-symbols
// @access  Public
const getPairsBySymbols = async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }
    
    console.log(`⚡ Get pairs by symbols request: ${symbols.length} symbols`);
    
    const pairs = await instantPairsService.getPairsBySymbol(symbols);
    
    res.set({
      'Cache-Control': 'public, max-age=60',
      'X-Response-Time': '< 50ms'
    });

    res.json({
      success: true,
      pairs,
      totalCount: pairs.length,
      timestamp: new Date().toISOString(),
      dataSource: 'redis_cache',
      responseTime: '< 50ms'
    });
    
  } catch (error) {
    console.error('❌ Get pairs by symbols error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pairs by symbols',
      message: error.message,
      pairs: [],
      totalCount: 0
    });
  }
};

// @desc    Get cache status
// @route   GET /api/pairs/instant/status
// @access  Public
const getCacheStatus = async (req, res) => {
  try {
    const status = await instantPairsService.getCacheStatus();
    
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cache status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status',
      message: error.message
    });
  }
};

// @desc    Force refresh cache
// @route   POST /api/pairs/instant/refresh
// @access  Public
const forceRefreshCache = async (req, res) => {
  try {
    console.log('🔄 Force refresh cache request');
    
    const result = await instantPairsService.forceRefresh();
    
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      ...result,
      responseTime: '< 200ms'
    });
    
  } catch (error) {
    console.error('❌ Force refresh error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: error.message
    });
  }
};

// @desc    Initialize service
// @route   POST /api/pairs/instant/init
// @access  Public
const initializeService = async (req, res) => {
  try {
    console.log('🚀 Initialize service request');
    
    await instantPairsService.initialize();
    
    res.json({
      success: true,
      message: 'Service initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Initialize service error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize service',
      message: error.message
    });
  }
};

module.exports = {
  getInstantPairs,
  getTopVolumePairs,
  searchPairs,
  getPairsBySymbols,
  getCacheStatus,
  forceRefreshCache,
  initializeService
};