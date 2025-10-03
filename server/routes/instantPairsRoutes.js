const express = require('express');
const router = express.Router();
const {
  getInstantPairs,
  getTopVolumePairs,
  searchPairs,
  getPairsBySymbols,
  getCacheStatus,
  forceRefreshCache,
  initializeService
} = require('../controllers/instantPairsController');

// @route   GET /api/pairs/instant
// @desc    Get all USDT pairs instantly (no disappearing)
// @access  Public
router.get('/', getInstantPairs);

// @route   GET /api/pairs/instant/top
// @desc    Get top volume pairs
// @access  Public
router.get('/top', getTopVolumePairs);

// @route   POST /api/pairs/instant/search
// @desc    Search pairs with criteria
// @access  Public
router.post('/search', searchPairs);

// @route   POST /api/pairs/instant/by-symbols
// @desc    Get pairs by symbols
// @access  Public
router.post('/by-symbols', getPairsBySymbols);

// @route   GET /api/pairs/instant/status
// @desc    Get cache status
// @access  Public
router.get('/status', getCacheStatus);

// @route   POST /api/pairs/instant/refresh
// @desc    Force refresh cache
// @access  Public
router.post('/refresh', forceRefreshCache);

// @route   POST /api/pairs/instant/init
// @desc    Initialize service
// @access  Public
router.post('/init', initializeService);

// @route   GET /api/pairs/instant/health
// @desc    Health check
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'instant-pairs-service',
    timestamp: new Date().toISOString(),
    message: 'Instant pairs service is running'
  });
});

module.exports = router;