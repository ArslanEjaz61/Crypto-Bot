/**
 * Instant Alert Controller
 * 
 * Provides instant response for alert creation:
 * 1. Validates input and queues job immediately
 * 2. Returns success response instantly
 * 3. Background processing handles heavy work
 * 4. WebSocket provides real-time progress updates
 */

const { redisPublisher } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');

/**
 * Create alerts instantly (non-blocking)
 * @route POST /api/alerts/instant
 * @access Public
 */
const createAlertsInstantly = async (req, res) => {
  try {
    console.log('⚡ Instant alert creation request received');
    
    const {
      pairs, // Array of {symbol, price} objects
      conditions, // Alert conditions
      userId,
      sessionId,
      deleteExisting = true
    } = req.body;

    // Validate input
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pairs array is required and must not be empty'
      });
    }

    if (!conditions) {
      return res.status(400).json({
        success: false,
        error: 'Alert conditions are required'
      });
    }

    // Generate unique job ID
    const jobId = uuidv4();
    
    // Create job payload
    const job = {
      jobId,
      pairs,
      conditions,
      userId: userId || 'anonymous',
      sessionId: sessionId || 'default',
      deleteExisting,
      createdAt: new Date().toISOString(),
      totalPairs: pairs.length
    };

    // Queue the job in Redis
    await redisPublisher.publish('alert-jobs', JSON.stringify(job));
    
    console.log(`📋 Job ${jobId} queued for ${pairs.length} pairs`);

    // Return instant success response
    res.json({
      success: true,
      message: 'Alerts are being generated, you will be notified shortly',
      jobId,
      totalPairs: pairs.length,
      estimatedTime: Math.ceil(pairs.length / 50) * 2, // Rough estimate in seconds
      status: 'queued',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Instant alert creation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to queue alert creation job',
      message: error.message
    });
  }
};

/**
 * Create single alert instantly
 * @route POST /api/alerts/instant/single
 * @access Public
 */
const createSingleAlertInstantly = async (req, res) => {
  try {
    console.log('⚡ Single alert creation request');
    
    const {
      symbol,
      direction = '>',
      targetType = 'percentage',
      targetValue = 1,
      changePercentValue = 0,
      minDailyVolume = 0,
      alertCountEnabled = false,
      alertCountTimeframe = '5MIN',
      maxAlertsPerTimeframe = 1,
      comment = '',
      email = 'user@example.com',
      market = 'ALL',
      exchange = 'BINANCE',
      tradingPair = 'USDT'
    } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required'
      });
    }

    // Check if symbol exists
    const crypto = await Crypto.findOne({ symbol });
    if (!crypto) {
      return res.status(400).json({
        success: false,
        error: 'Invalid crypto symbol'
      });
    }

    // Create alert data
    const alertData = {
      symbol,
      direction,
      targetType,
      targetValue,
      currentPrice: crypto.price || 0,
      basePrice: crypto.price || 0,
      trackingMode: 'current',
      intervalMinutes: 0,
      alertTime: new Date().toISOString(),
      comment: comment || `Alert for ${symbol}`,
      email,
      userExplicitlyCreated: true,
      
      // Alert conditions
      changePercentValue,
      minDailyVolume,
      alertCountEnabled,
      alertCountTimeframe,
      maxAlertsPerTimeframe,
      
      // Market filters
      market,
      exchange,
      tradingPair
    };

    // Create alert
    const alert = new Alert(alertData);
    const createdAlert = await alert.save();

    // Sync to Redis
    const { syncAlertsFromDB } = require('../config/redis');
    await syncAlertsFromDB();

    console.log(`✅ Single alert created for ${symbol}`);

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert: createdAlert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Single alert creation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
      message: error.message
    });
  }
};

/**
 * Get job status
 * @route GET /api/alerts/job/:jobId/status
 * @access Public
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const alertJobProcessor = require('../services/alertJobProcessor');
    const status = alertJobProcessor.getJobStatus(jobId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or completed'
      });
    }

    res.json({
      success: true,
      jobId,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get job status error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error.message
    });
  }
};

/**
 * Get processor statistics
 * @route GET /api/alerts/processor/stats
 * @access Public
 */
const getProcessorStats = async (req, res) => {
  try {
    const alertJobProcessor = require('../services/alertJobProcessor');
    const stats = alertJobProcessor.getStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get processor stats error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get processor stats',
      message: error.message
    });
  }
};

/**
 * Cancel a job
 * @route POST /api/alerts/job/:jobId/cancel
 * @access Public
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Note: In a production system, you'd implement proper job cancellation
    // For now, we'll just return a success response
    console.log(`🚫 Job ${jobId} cancellation requested`);
    
    res.json({
      success: true,
      message: 'Job cancellation requested',
      jobId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cancel job error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
      message: error.message
    });
  }
};

/**
 * Get available pairs for alert creation
 * @route GET /api/alerts/pairs/available
 * @access Public
 */
const getAvailablePairs = async (req, res) => {
  try {
    const { limit = 1000, minVolume = 0 } = req.query;
    
    // Get pairs from database or Redis cache
    const pairs = await Crypto.find({
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true,
      ...(minVolume > 0 && { volume24h: { $gte: minVolume } })
    })
    .select('symbol name price volume24h priceChangePercent24h')
    .limit(parseInt(limit))
    .lean();

    res.json({
      success: true,
      pairs,
      totalCount: pairs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get available pairs error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get available pairs',
      message: error.message
    });
  }
};

module.exports = {
  createAlertsInstantly,
  createSingleAlertInstantly,
  getJobStatus,
  getProcessorStats,
  cancelJob,
  getAvailablePairs
};
