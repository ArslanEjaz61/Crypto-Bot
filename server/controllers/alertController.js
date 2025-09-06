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
    console.log('Creating new alert with body:', JSON.stringify(req.body, null, 2));
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

    // Create base alert object with required fields
    const alertData = {
      symbol,
      direction: direction || '>',
      targetType: targetType || 'percentage',
      // CRITICAL FIX: Ensure targetValue is properly parsed as a float and not defaulted to 0
      targetValue: targetValue !== undefined ? Number(targetValue) : 1,
      currentPrice,
      basePrice: currentPrice, // Store current price as base for future comparisons
      trackingMode: trackingMode || 'current',
      intervalMinutes: trackingMode === 'interval' ? intervalMinutes : 0,
      alertTime,
      comment: comment || `Auto-created alert for ${symbol}`,
      email: email || 'jamyasir0534@gmail.com',
      // Default market filters
      market: market || 'ALL',
      exchange: exchange || 'ALL',
      
      tradingPair: tradingPair || 'ALL',
      minDailyVolume: parseFloat(minDailyVolume) || 0,
      // Default change percentage settings
      changePercentTimeframe: req.body.changePercentTimeframe || '1MIN',
      changePercentValue: req.body.changePercentValue !== undefined ? parseFloat(req.body.changePercentValue) : 1,
      // Default alert count settings
      alertCountTimeframe: req.body.alertCountTimeframe || '5MIN'
    };
    
    // Only add candle conditions if explicitly enabled
    if (candleCondition && candleCondition !== 'NONE') {
      alertData.candleTimeframe = candleTimeframe || '1HR';
      alertData.candleCondition = candleCondition;
    } else {
      alertData.candleCondition = 'NONE';
    }
    
    // Only add RSI conditions if explicitly enabled
    if (rsiEnabled) {
      alertData.rsiEnabled = true;
      alertData.rsiTimeframe = rsiTimeframe || '1HR';
      alertData.rsiPeriod = parseInt(rsiPeriod) || 14;
      alertData.rsiCondition = rsiCondition || 'ABOVE';
      alertData.rsiLevel = parseInt(rsiLevel) || 70;
    } else {
      alertData.rsiEnabled = false;
    }
    
    // Only add EMA conditions if explicitly enabled
    if (emaEnabled) {
      alertData.emaEnabled = true;
      alertData.emaTimeframe = emaTimeframe || '1HR';
      alertData.emaFastPeriod = parseInt(emaFastPeriod) || 12;
      alertData.emaSlowPeriod = parseInt(emaSlowPeriod) || 26;
      alertData.emaCondition = emaCondition || 'ABOVE';
    } else {
      alertData.emaEnabled = false;
    }
    
    // Only add volume spike conditions if explicitly enabled
    if (volumeEnabled) {
      alertData.volumeEnabled = true;
      alertData.volumeSpikeMultiplier = parseFloat(volumeSpikeMultiplier) || 2.0;
    } else {
      alertData.volumeEnabled = false;
    }
    
    console.log('Creating alert with filtered conditions:', alertData);
    const alert = new Alert(alertData);

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

// @desc    Start all alerts
// @route   POST /api/alerts/start-all
// @access  Public
const startAllAlerts = async (req, res) => {
  try {
    console.log('Starting all alerts');
    const result = await Alert.updateMany({}, { isActive: true });
    console.log(`Started ${result.modifiedCount} alerts`);
    
    // Emit event to socket.io for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('alerts-started', { count: result.modifiedCount });
    }
    
    res.json({ 
      message: `${result.modifiedCount} alerts started successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error starting all alerts:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Stop all alerts
// @route   POST /api/alerts/stop-all
// @access  Public
const stopAllAlerts = async (req, res) => {
  try {
    console.log('Stopping all alerts');
    const result = await Alert.updateMany({}, { isActive: false });
    console.log(`Stopped ${result.modifiedCount} alerts`);
    
    // Emit event to socket.io for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('alerts-stopped', { count: result.modifiedCount });
    }
    
    res.json({ 
      message: `${result.modifiedCount} alerts stopped successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error stopping all alerts:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getAlerts,
  createAlert,
  getAlertById,
  updateAlert,
  deleteAlert,
  startAllAlerts,
  stopAllAlerts
};
