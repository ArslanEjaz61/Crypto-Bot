const Alert = require('../models/alertModel');
const Crypto = require('../models/cryptoModel');

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Public
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({}).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new alert
// @route   POST /api/alerts
// @access  Public
const createAlert = async (req, res) => {
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
      comment,
      email
    } = req.body;

    // Check if the symbol exists
    const crypto = await Crypto.findOne({ symbol });
    if (!crypto) {
      return res.status(400).json({ message: 'Invalid crypto symbol' });
    }

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
      email
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
      email
    } = req.body;

    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    // Update the alert fields
    if (symbol) alert.symbol = symbol;
    if (direction) alert.direction = direction;
    if (targetType) alert.targetType = targetType;
    if (targetValue) alert.targetValue = targetValue;
    if (trackingMode) alert.trackingMode = trackingMode;
    if (intervalMinutes && trackingMode === 'interval') alert.intervalMinutes = intervalMinutes;
    if (volumeChangeRequired !== undefined) alert.volumeChangeRequired = volumeChangeRequired;
    if (alertTime) alert.alertTime = alertTime;
    if (isActive !== undefined) alert.isActive = isActive;
    if (comment !== undefined) alert.comment = comment;
    if (email) alert.email = email;

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
