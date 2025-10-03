const express = require('express');
const router = express.Router();
const {
  createAlertsInstantly,
  createSingleAlertInstantly,
  getJobStatus,
  getProcessorStats,
  cancelJob,
  getAvailablePairs
} = require('../controllers/instantAlertController');

// @route   POST /api/alerts/instant
// @desc    Create multiple alerts instantly (non-blocking)
// @access  Public
router.post('/instant', createAlertsInstantly);

// @route   POST /api/alerts/instant/single
// @desc    Create single alert instantly
// @access  Public
router.post('/instant/single', createSingleAlertInstantly);

// @route   GET /api/alerts/job/:jobId/status
// @desc    Get job status
// @access  Public
router.get('/job/:jobId/status', getJobStatus);

// @route   GET /api/alerts/processor/stats
// @desc    Get processor statistics
// @access  Public
router.get('/processor/stats', getProcessorStats);

// @route   POST /api/alerts/job/:jobId/cancel
// @desc    Cancel a job
// @access  Public
router.post('/job/:jobId/cancel', cancelJob);

// @route   GET /api/alerts/pairs/available
// @desc    Get available pairs for alert creation
// @access  Public
router.get('/pairs/available', getAvailablePairs);

// @route   GET /api/alerts/instant/health
// @desc    Health check for instant alert system
// @access  Public
router.get('/instant/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'instant-alert-system',
    timestamp: new Date().toISOString(),
    message: 'Instant alert system is running'
  });
});

module.exports = router;
