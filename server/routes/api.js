const express = require('express');
const router = express.Router();

// Import individual route modules
const alertRoutes = require('./alertRoutes');
const instantAlertRoutes = require('./instantAlertRoutes');
const cryptoRoutes = require('./cryptoRoutes');
const authRoutes = require('./authRoutes');
const triggeredAlertsRoutes = require('./triggeredAlerts');
const indicatorRoutes = require('./indicatorRoutes');
const telegramRoutes = require('./telegramRoutes');
const notificationRoutes = require('./notificationRoutes');
const fastPairsRoutes = require('./fastPairsRoutes');
const instantPairsRoutes = require('./instantPairsRoutes');
const cleanupRoutes = require('./cleanupRoutes');

// Mount all routes under /api
router.use('/alerts', alertRoutes);
router.use('/alerts', instantAlertRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/auth', authRoutes);
router.use('/triggered-alerts', triggeredAlertsRoutes);
router.use('/indicators', indicatorRoutes);
router.use('/telegram', telegramRoutes);
router.use('/notifications', notificationRoutes);
router.use('/pairs', fastPairsRoutes);
router.use('/pairs', instantPairsRoutes);
router.use('/cleanup', cleanupRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'API is running'
  });
});

module.exports = router;
