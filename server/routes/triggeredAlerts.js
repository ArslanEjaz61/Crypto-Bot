const express = require('express');
const router = express.Router();
const {
  getTriggeredAlerts,
  getTriggeredAlertsBySymbol,
  getTriggeredAlertsSummary,
  updateNotificationStatus,
  acknowledgeTriggeredAlert
} = require('../controllers/triggeredAlertController');

// Get all triggered alerts
router.get('/', getTriggeredAlerts);

// Get triggered alerts summary for dashboard
router.get('/summary', getTriggeredAlertsSummary);

// Get triggered alerts by symbol
router.get('/symbol/:symbol', getTriggeredAlertsBySymbol);

// Update notification status
router.put('/:id/notification', updateNotificationStatus);

// Acknowledge triggered alert
router.put('/:id/acknowledge', acknowledgeTriggeredAlert);

module.exports = router;
