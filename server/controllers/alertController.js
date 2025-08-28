const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Public
const getAlerts = async (req, res) => {
  try {
    console.log('Getting all alerts');
    const alerts = await Alert.find({}).sort({ createdAt: -1 });
    console.log(`Found ${alerts.length} alerts`);
    res.json(alerts);
  } catch (error) {
    console.error('Error in getAlerts:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new alert
// @route   POST /api/alerts
// @access  Public
const createAlert = async (req, res) => {
  try {
    console.log('Creating new alert with body:', req.body);
    const {
      symbol,
      direction,
      targetType,
      targetValue,
      trackingMode,
      intervalMinutes,
      volumeChangeRequired,
      alertTime,
      comment,
      email,
      // Candle section
      candleTimeframe,
      candleCondition,
      // RSI section
      rsiEnabled,
      rsiTimeframe,
      rsiPeriod,
      rsiCondition,
      rsiLevel,
      // EMA section
      emaEnabled,
      emaTimeframe,
      emaFastPeriod,
      emaSlowPeriod,
      emaCondition,
      // Volume Spike section
      volumeEnabled,
      volumeSpikeMultiplier,
      // Market filters
      market,
      exchange,
      tradingPair,
      minDailyVolume
    } = req.body;

    if (!symbol) {
      console.error('Missing symbol in request body');
      return res.status(400).json({ message: 'Symbol is required' });
    }

    // Check if the symbol exists
    const crypto = await Crypto.findOne({ symbol });
    if (!crypto) {
      console.error(`Invalid crypto symbol: ${symbol}`);
      return res.status(400).json({ message: 'Invalid crypto symbol' });
    }

    console.log(`Found crypto ${symbol} with price ${crypto.price}`);
    const currentPrice = crypto.price;

    const alert = new Alert({
      symbol,
      direction,
      targetType,
      targetValue,
      currentPrice,
      trackingMode,
      intervalMinutes: trackingMode === 'interval' ? intervalMinutes : 0,
      volumeChangeRequired: volumeChangeRequired || 0,
      alertTime,
      comment,
      email,
      // Candle section
      candleTimeframe: candleTimeframe || '1HR',
      candleCondition: candleCondition || 'NONE',
      // RSI section
      rsiEnabled: Boolean(rsiEnabled),
      rsiTimeframe: rsiTimeframe || '1HR',
      rsiPeriod: parseInt(rsiPeriod) || 14,
      rsiCondition: rsiCondition || 'NONE',
      rsiLevel: parseInt(rsiLevel) || 70,
      // EMA section
      emaEnabled: Boolean(emaEnabled),
      emaTimeframe: emaTimeframe || '1HR',
      emaFastPeriod: parseInt(emaFastPeriod) || 12,
      emaSlowPeriod: parseInt(emaSlowPeriod) || 26,
      emaCondition: emaCondition || 'NONE',
      // Volume Spike section
      volumeEnabled: Boolean(volumeEnabled),
      volumeSpikeMultiplier: parseFloat(volumeSpikeMultiplier) || 2.0,
      // Market filters
      market: market || 'ALL',
      exchange: exchange || 'ALL',
      tradingPair: tradingPair || 'ALL',
      minDailyVolume: parseFloat(minDailyVolume) || 0
    });

    const createdAlert = await alert.save();
    
    // Emit event to socket.io for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-created', createdAlert);
    }

    res.status(201).json(createdAlert);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get alert by ID
// @route   GET /api/alerts/:id
// @access  Public
const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update an alert
// @route   PUT /api/alerts/:id
// @access  Public
const updateAlert = async (req, res) => {
  try {
    const {
      symbol,
      direction,
      targetType,
      targetValue,
      trackingMode,
      intervalMinutes,
      volumeChangeRequired,
      alertTime,
      isActive,
      comment,
      email,
      // Candle section
      candleTimeframe,
      candleCondition,
      // RSI section
      rsiEnabled,
      rsiTimeframe,
      rsiPeriod,
      rsiCondition,
      rsiLevel,
      // EMA section
      emaEnabled,
      emaTimeframe,
      emaFastPeriod,
      emaSlowPeriod,
      emaCondition,
      // Volume Spike section
      volumeEnabled,
      volumeSpikeMultiplier,
      // Market filters
      market,
      exchange,
      tradingPair,
      minDailyVolume
    } = req.body;

    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Update the alert fields
    if (symbol) alert.symbol = symbol;
    if (direction) alert.direction = direction;
    if (targetType) alert.targetType = targetType;
    if (targetValue !== undefined) alert.targetValue = parseFloat(targetValue);
    if (trackingMode) alert.trackingMode = trackingMode;
    if (intervalMinutes !== undefined && trackingMode === 'interval') alert.intervalMinutes = parseInt(intervalMinutes);
    if (volumeChangeRequired !== undefined) alert.volumeChangeRequired = parseFloat(volumeChangeRequired);
    if (alertTime) alert.alertTime = alertTime;
    if (isActive !== undefined) alert.isActive = isActive;
    if (comment !== undefined) alert.comment = comment;
    if (email) alert.email = email;
    
    // Update Candle section
    if (candleTimeframe) alert.candleTimeframe = candleTimeframe;
    if (candleCondition) alert.candleCondition = candleCondition;
    
    // Update RSI section
    if (rsiEnabled !== undefined) alert.rsiEnabled = Boolean(rsiEnabled);
    if (rsiTimeframe) alert.rsiTimeframe = rsiTimeframe;
    if (rsiPeriod !== undefined) alert.rsiPeriod = parseInt(rsiPeriod);
    if (rsiCondition) alert.rsiCondition = rsiCondition;
    if (rsiLevel !== undefined) alert.rsiLevel = parseInt(rsiLevel);
    
    // Update EMA section
    if (emaEnabled !== undefined) alert.emaEnabled = Boolean(emaEnabled);
    if (emaTimeframe) alert.emaTimeframe = emaTimeframe;
    if (emaFastPeriod !== undefined) alert.emaFastPeriod = parseInt(emaFastPeriod);
    if (emaSlowPeriod !== undefined) alert.emaSlowPeriod = parseInt(emaSlowPeriod);
    if (emaCondition) alert.emaCondition = emaCondition;
    
    // Update Volume Spike section
    if (volumeEnabled !== undefined) alert.volumeEnabled = Boolean(volumeEnabled);
    if (volumeSpikeMultiplier !== undefined) alert.volumeSpikeMultiplier = parseFloat(volumeSpikeMultiplier);
    
    // Update Market filters
    if (market) alert.market = market;
    if (exchange) alert.exchange = exchange;
    if (tradingPair) alert.tradingPair = tradingPair;
    if (minDailyVolume !== undefined) alert.minDailyVolume = parseFloat(minDailyVolume);

    // If symbol changed, update currentPrice
    if (symbol && symbol !== alert.symbol) {
      const crypto = await Crypto.findOne({ symbol });
      if (crypto) {
        alert.currentPrice = crypto.price;
      }
    }

    const updatedAlert = await alert.save();
    
    // Emit event to socket.io for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-updated', updatedAlert);
    }

    res.json(updatedAlert);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete an alert
// @route   DELETE /api/alerts/:id
// @access  Public
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await Alert.deleteOne({ _id: req.params.id });
    
    // Emit event to socket.io for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-deleted', req.params.id);
    }

    res.json({ message: 'Alert removed' });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getAlerts,
  createAlert,
  getAlertById,
  updateAlert,
  deleteAlert
};
