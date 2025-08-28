const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/userModel');
const connectDB = require('../config/db');

// Load environment variables
dotenv.config({ path: '../../.env' });

// Function to create an admin user
const createAdmin = async (username, password) => {
  try {
    // Connect to the database
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ isAdmin: true });
    
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log(`Username: ${existingAdmin.username}`);
      process.exit(0);
    }

    // Create new admin user
    const adminUser = await User.create({
      username,
      password,
      isAdmin: true
    });

    console.log('Admin user created successfully!');
    console.log(`Username: ${adminUser.username}`);
    console.log('You can now log in with these credentials.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Check command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: node createAdminUser.js <username> <password>');
  process.exit(1);
}

// Extract username and password
const [username, password] = args;

// Create the admin user
createAdmin(username, password);
