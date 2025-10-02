const express = require("express");
const router = express.Router();
const {
  getCryptoList,
  getCryptoBySymbol,
  updateFavoriteStatus,
  batchUpdateFavorites,
  calculateRSI,
  getChartData,
  checkAlertConditions,
} = require("../controllers/cryptoController");

// Fast crypto controller (uses Redis/WebSocket)
const {
  getFastCryptoList,
  getFastCryptoPrice,
  syncPricesFromRedis,
} = require("../controllers/fastCryptoController");

// @route   GET api/crypto/fast
// @desc    Get all crypto pairs (FAST - uses Redis/WebSocket)
// @access  Public
router.get("/fast", getFastCryptoList);

// @route   GET api/crypto/fast/:symbol
// @desc    Get single crypto price (FAST - uses Redis)
// @access  Public
router.get("/fast/:symbol", getFastCryptoPrice);

// @route   POST api/crypto/sync-redis
// @desc    Sync prices from Redis to Database
// @access  Public
router.post("/sync-redis", syncPricesFromRedis);

// @route   GET api/crypto
// @desc    Get all crypto pairs (slower - uses database)
// @access  Public
router.get("/", getCryptoList);

// @route   GET api/crypto/:symbol
// @desc    Get crypto by symbol
// @access  Public
router.get("/:symbol", getCryptoBySymbol);

// @route   PUT api/crypto/:symbol/favorite
// @desc    Toggle favorite status for a crypto pair
// @access  Public
router.put("/:symbol/favorite", updateFavoriteStatus);

// @route   PUT api/crypto/favorites/batch
// @desc    Batch update favorite status for multiple crypto pairs
// @access  Public
router.put("/favorites/batch", batchUpdateFavorites);

// @route   GET api/crypto/:symbol/rsi
// @desc    Calculate RSI for a specific crypto pair
// @access  Public
router.get("/:symbol/rsi", calculateRSI);

// @route   GET api/crypto/:symbol/chart
// @desc    Get chart data for a specific crypto pair
// @access  Public
router.get("/:symbol/chart", getChartData);

// @route   POST api/crypto/:symbol/check-conditions
// @desc    Check if coin meets filter conditions for alerts
// @access  Public
router.post("/:symbol/check-conditions", checkAlertConditions);

module.exports = router;
