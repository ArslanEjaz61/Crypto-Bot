const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find user by username
  const user = await User.findOne({ username });

  // Check if user exists and password matches
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid username or password');
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  
  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Create admin user (for initial setup only)
// @route   POST /api/auth/create-admin
// @access  Public (should be secured in production)
const createAdminUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  
  // Check if admin user already exists
  const adminExists = await User.findOne({ isAdmin: true });
  
  if (adminExists) {
    res.status(400);
    throw new Error('Admin user already exists');
  }
  
  // Create admin user
  const user = await User.create({
    username,
    password,
    isAdmin: true,
  });
  
  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  loginUser,
  getUserProfile,
  createAdminUser,
};
