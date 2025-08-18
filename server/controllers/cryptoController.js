const Crypto = require('../models/cryptoModel');
const axios = require('axios');

// Calculate RSI function
const calculateRSIValue = (prices, period = 14) => {
  if (prices.length < period + 1) {
    return null;
  }

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  // Calculate RSI using Wilder's smoothing method
  const rsiValues = [];
  rsiValues.push(100 - (100 / (1 + avgGain / (avgLoss || 0.01))));

  for (let i = period; i < changes.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    rsiValues.push(100 - (100 / (1 + avgGain / (avgLoss || 0.01))));
  }

  return rsiValues[rsiValues.length - 1];
};

// @desc    Get all crypto pairs
// @route   GET /api/crypto
// @access  Public
const getCryptoList = async (req, res) => {
  try {
    const { market, minVolume, favorites, sort, order } = req.query;

    let query = {};
    
    // Filter by market
    if (market && market !== 'all') {
      query.symbol = { $regex: market + '$' };
    }
    
    // Filter by minimum volume
    if (minVolume && !isNaN(minVolume)) {
      query.volume24h = { $gte: Number(minVolume) };
    }
    
    // Filter by favorites
    if (favorites === 'true') {
      query.isFavorite = true;
    }
    
    // Get crypto data
    let cryptoData = await Crypto.find(query);
    
    // Sort data if requested
    if (sort) {
      const sortOrder = order === 'desc' ? -1 : 1;
      cryptoData.sort((a, b) => {
        if (a[sort] < b[sort]) return -1 * sortOrder;
        if (a[sort] > b[sort]) return 1 * sortOrder;
        return 0;
      });
    }
    
    res.json(cryptoData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get crypto by symbol
// @route   GET /api/crypto/:symbol
// @access  Public
const getCryptoBySymbol = async (req, res) => {
  try {
    const crypto = await Crypto.findOne({ symbol: req.params.symbol });
    
    if (!crypto) {
      return res.status(404).json({ message: 'Crypto not found' });
    }
    
    res.json(crypto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Toggle favorite status for a crypto pair
// @route   PUT /api/crypto/:symbol/favorite
// @access  Public
const updateFavoriteStatus = async (req, res) => {
  try {
    const crypto = await Crypto.findOne({ symbol: req.params.symbol });
    
    if (!crypto) {
      return res.status(404).json({ message: 'Crypto not found' });
    }
    
    crypto.isFavorite = !crypto.isFavorite;
    await crypto.save();
    
    res.json(crypto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Calculate RSI for a specific crypto pair
// @route   GET /api/crypto/:symbol/rsi
// @access  Public
const calculateRSI = async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const period = parseInt(req.query.period) || 14;
    
    // Fetch historical data from Binance
    const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
      params: {
        symbol,
        interval: '1h',
        limit: period + 10 // Get a few extra candles for calculation
      }
    });
    
    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ message: 'Historical data not found' });
    }
    
    // Extract closing prices
    const closingPrices = response.data.map(candle => parseFloat(candle[4]));
    
    // Calculate RSI
    const rsiValue = calculateRSIValue(closingPrices, period);
    
    // Update the crypto record with the calculated RSI
    const crypto = await Crypto.findOne({ symbol });
    if (crypto) {
      crypto.rsi = rsiValue;
      await crypto.save();
    }
    
    res.json({ symbol, rsi: rsiValue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getCryptoList,
  getCryptoBySymbol,
  updateFavoriteStatus,
  calculateRSI
};
