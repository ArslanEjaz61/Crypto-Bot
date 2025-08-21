const express = require('express');
const router = express.Router();
const { 
  getCryptoList, 
  getCryptoBySymbol, 
  updateFavoriteStatus,
  calculateRSI,
  getChartData,
  checkAlertConditions
} = require('../controllers/cryptoController');

// @route   GET api/crypto
// @desc    Get all crypto pairs
// @access  Public
router.get('/', getCryptoList);

// @route   GET api/crypto/:symbol
// @desc    Get crypto by symbol
// @access  Public
router.get('/:symbol', getCryptoBySymbol);

// @route   PUT api/crypto/:symbol/favorite
// @desc    Toggle favorite status for a crypto pair
// @access  Public
router.put('/:symbol/favorite', updateFavoriteStatus);

// @route   GET api/crypto/:symbol/rsi
// @desc    Calculate RSI for a specific crypto pair
// @access  Public
router.get('/:symbol/rsi', calculateRSI);

// @route   GET api/crypto/:symbol/chart
// @desc    Get chart data for a specific crypto pair
// @access  Public
router.get('/:symbol/chart', getChartData);

// @route   POST api/crypto/:symbol/check-conditions
// @desc    Check if coin meets filter conditions for alerts
// @access  Public
router.post('/:symbol/check-conditions', checkAlertConditions);

module.exports = router;
