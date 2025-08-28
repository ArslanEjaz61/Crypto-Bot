const express = require('express');
const router = express.Router();
const { 
  loginUser, 
  getUserProfile, 
  createAdminUser 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/create-admin', createAdminUser);

module.exports = router;
