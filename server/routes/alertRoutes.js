const express = require('express');
const router = express.Router();
const { 
  getAlerts, 
  createAlert, 
  updateAlert,
  deleteAlert,
  getAlertById,
  startAllAlerts,
  stopAllAlerts
} = require('../controllers/alertController');

// @route   GET api/alerts
// @desc    Get all alerts
// @access  Public
router.get('/', getAlerts);

// @route   POST api/alerts
// @desc    Create a new alert
// @access  Public
router.post('/', createAlert);

// @route   GET api/alerts/:id
// @desc    Get alert by ID
// @access  Public
router.get('/:id', getAlertById);

// @route   PUT api/alerts/:id
// @desc    Update an alert
// @access  Public
router.put('/:id', updateAlert);

// @route   DELETE api/alerts/:id
// @desc    Delete an alert
// @access  Public
router.delete('/:id', deleteAlert);

// @route   POST api/alerts/start-all
// @desc    Start all alerts
// @access  Public
router.post('/start-all', startAllAlerts);

// @route   POST api/alerts/stop-all
// @desc    Stop all alerts
// @access  Public
router.post('/stop-all', stopAllAlerts);

module.exports = router;
