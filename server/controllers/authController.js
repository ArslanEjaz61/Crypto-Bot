const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  console.log('🔐 Login attempt - Request body:', req.body);
  console.log('🔐 Login attempt - Headers:', req.headers);
  
  // Get username and password from request body
  const { username, password } = req.body || {};

  // Validate required fields
  if (!username || !password) {
    console.log('❌ Missing credentials:', { username: !!username, password: !!password });
    return res.status(400).json({
      message: 'Missing credentials',
      error: 'Please provide both username and password'
    });
  }

  // Check MongoDB connection before querying
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    console.log('❌ MongoDB not connected, attempting to reconnect...');
    try {
      const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/binance-alerts";
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log('✅ MongoDB reconnected successfully');
    } catch (reconnectError) {
      console.error('❌ Failed to reconnect to MongoDB:', reconnectError.message);
      return res.status(503).json({
        message: 'Database temporarily unavailable',
        error: 'Please try again in a few moments'
      });
    }
  }

  // Find user by username
  const user = await User.findOne({ username });
  console.log('🔍 User found:', !!user);
  console.log('🔍 Username searched:', username);

  // Check if user exists and password matches
  if (user && (await user.matchPassword(password))) {
    console.log('✅ Login successful for user:', user.username);
    res.json({
      _id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
    });
  } else {
    console.log('❌ Login failed - User exists:', !!user);
    if (user) {
      console.log('❌ Password match test:', await user.matchPassword(password));
    }
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

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  console.log('📝 User registration attempt - Request body:', req.body);
  
  // Check if request body exists and has required fields
  if (!req.body) {
    return res.status(400).json({
      message: 'Request body is missing',
      error: 'Please send JSON data with username and password'
    });
  }

  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({
      message: 'Missing required fields',
      error: 'Please provide both username and password'
    });
  }

  // Check MongoDB connection before querying
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    console.log('❌ MongoDB not connected, attempting to reconnect...');
    try {
      const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/alerts";
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log('✅ MongoDB reconnected successfully');
    } catch (reconnectError) {
      console.error('❌ Failed to reconnect to MongoDB:', reconnectError.message);
      return res.status(503).json({
        message: 'Database temporarily unavailable',
        error: 'Please try again in a few moments'
      });
    }
  }

  // Check if user already exists
  const userExists = await User.findOne({ username });
  
  if (userExists) {
    console.log('❌ User already exists:', username);
    return res.status(400).json({
      message: 'User already exists',
      error: 'Please choose a different username'
    });
  }
  
  // Create new user (password will be automatically hashed by the model)
  const user = await User.create({
    username,
    password,
    isAdmin: false, // Regular user, not admin
  });
  
  if (user) {
    console.log('✅ User created successfully:', user.username);
    res.status(201).json({
      _id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
      message: 'User registered successfully'
    });
  } else {
    console.log('❌ Failed to create user');
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Create admin user (for initial setup only)
// @route   POST /api/auth/create-admin
// @access  Public (should be secured in production)
const createAdminUser = asyncHandler(async (req, res) => {
  // Check if request body exists and has required fields
  if (!req.body) {
    return res.status(400).json({
      message: 'Request body is missing',
      error: 'Please send JSON data with username and password'
    });
  }

  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({
      message: 'Missing required fields',
      error: 'Please provide both username and password'
    });
  }
  
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
    expiresIn: '1d',
  });
};

module.exports = {
  loginUser,
  getUserProfile,
  registerUser,
  createAdminUser,
};
