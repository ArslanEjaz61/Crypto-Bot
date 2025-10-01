const express = require("express");
const router = express.Router();
const {
  loginUser,
  getUserProfile,
  registerUser,
  createAdminUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post("/register", registerUser);

// @route   POST /api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post("/login", loginUser);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, getUserProfile);

// @route   POST /api/auth/create-admin
// @desc    Create admin user (for initial setup only)
// @access  Public (should be secured in production)
router.post("/create-admin", createAdminUser);

module.exports = router;
