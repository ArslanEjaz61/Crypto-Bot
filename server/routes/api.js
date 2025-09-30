const express = require('express');
const router = express.Router();

// Import individual route modules
const alertRoutes = require('./alertRoutes');
const cryptoRoutes = require('./cryptoRoutes');
const authRoutes = require('./authRoutes');
const triggeredAlertsRoutes = require('./triggeredAlerts');
const indicatorRoutes = require('./indicatorRoutes');

// Mount all routes under /api
router.use('/alerts', alertRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/auth', authRoutes);
router.use('/triggered-alerts', triggeredAlertsRoutes);
router.use('/indicators', indicatorRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'API is running'
  });
});

module.exports = router;
