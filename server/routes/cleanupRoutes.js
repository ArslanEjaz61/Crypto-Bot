const express = require('express');
const router = express.Router();
const {
  cleanupOldTriggeredAlerts,
  disableAllExistingAlerts,
  cleanupAllTriggeredAlerts,
  getCleanupStats
} = require('../utils/alertCleanup');

// @route   POST /api/cleanup/triggered-alerts
// @desc    Manually clean up old triggered alerts (24+ hours)
// @access  Public
router.post('/triggered-alerts', async (req, res) => {
  try {
    const cleaned = await cleanupOldTriggeredAlerts();
    res.json({
      success: true,
      message: `Cleaned up ${cleaned} old triggered alerts`,
      deletedCount: cleaned
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cleaning up triggered alerts',
      error: error.message
    });
  }
});

// @route   POST /api/cleanup/all-triggered-alerts
// @desc    Manually clean up ALL triggered alerts
// @access  Public
router.post('/all-triggered-alerts', async (req, res) => {
  try {
    const cleaned = await cleanupAllTriggeredAlerts();
    res.json({
      success: true,
      message: `Cleaned up all ${cleaned} triggered alerts`,
      deletedCount: cleaned
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cleaning up all triggered alerts',
      error: error.message
    });
  }
});

// @route   POST /api/cleanup/disable-alerts
// @desc    Disable all existing alerts
// @access  Public
router.post('/disable-alerts', async (req, res) => {
  try {
    const disabled = await disableAllExistingAlerts();
    res.json({
      success: true,
      message: `Disabled ${disabled} existing alerts`,
      disabledCount: disabled
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disabling alerts',
      error: error.message
    });
  }
});

// @route   GET /api/cleanup/stats
// @desc    Get cleanup statistics
// @access  Public
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCleanupStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting cleanup stats',
      error: error.message
    });
  }
});

module.exports = router;
