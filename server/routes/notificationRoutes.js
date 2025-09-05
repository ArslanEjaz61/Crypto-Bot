const express = require('express');
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount
} = require('../controllers/notificationController');

const router = express.Router();

// Debug middleware to log all requests to notification routes
router.use((req, res, next) => {
  console.log(`[NOTIFICATION ROUTE] ${req.method} ${req.originalUrl}`);
  console.log('[NOTIFICATION ROUTE] Query params:', req.query);
  console.log('[NOTIFICATION ROUTE] Headers:', req.headers);
  console.log('[NOTIFICATION ROUTE] IP:', req.ip);
  next();
});

// @route   GET /api/notifications
// @desc    Get all notifications (with pagination and filters)
// @access  Public
router.get('/', (req, res, next) => {
  console.log('[NOTIFICATION ROUTE] GET / handler called');
  console.log('[NOTIFICATION ROUTE] Attempting to fetch notifications with params:', req.query);
  
  // Add a response interceptor to log the response
  const originalJson = res.json;
  res.json = function(body) {
    console.log('[NOTIFICATION ROUTE] Response data:', 
      body ? { 
        totalNotifications: body.totalNotifications,
        unreadCount: body.unreadCount,
        notificationsCount: body.notifications?.length
      } : 'No data');
    return originalJson.call(this, body);
  };
  
  getNotifications(req, res, next);
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Public
router.get('/unread-count', getUnreadCount);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Public
router.put('/read-all', markAllNotificationsAsRead);

// @route   PUT /api/notifications/:id/read
// @desc    Mark specific notification as read
// @access  Public
router.put('/:id/read', markNotificationAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete specific notification
// @access  Public
router.delete('/:id', deleteNotification);

// @route   DELETE /api/notifications
// @desc    Delete all notifications
// @access  Public
router.delete('/', deleteAllNotifications);

module.exports = router;
