const express = require('express');
const router = express.Router();
const {
  getFastPairs,
  getFastPairBySymbol,
  refreshPairsCache,
  getPairsStatus
} = require('../controllers/fastPairsController');

// @route   GET /api/pairs/fast
// @desc    Get all pairs (FAST - uses Redis cache)
// @access  Public
router.get('/fast', getFastPairs);

// @route   GET /api/pairs/fast/:symbol
// @desc    Get single pair (FAST - uses Redis cache)
// @access  Public
router.get('/fast/:symbol', getFastPairBySymbol);

// @route   POST /api/pairs/refresh
// @desc    Manually refresh pairs cache
// @access  Public
router.post('/refresh', refreshPairsCache);

// @route   GET /api/pairs/status
// @desc    Get pairs cache status
// @access  Public
router.get('/status', getPairsStatus);

// @route   GET /api/pairs/health
// @desc    Simple health check for pairs service
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pairs-service',
    timestamp: new Date().toISOString(),
    message: 'Pairs service is running'
  });
});

module.exports = router;
