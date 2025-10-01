#!/usr/bin/env node

/**
 * Reset Seeder - Deletes existing user and creates fresh one
 * Run with: node reset-seeder.js
 */

const mongoose = require('mongoose');
const User = require('./server/models/userModel');

// Default user credentials
const DEFAULT_USER = {
  username: 'admin',
  password: 'admin123',
  isAdmin: true
};

async function resetAndSeed() {
  try {
    console.log('🔄 Starting database reset and seeder...\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/alerts";
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Delete existing user if exists
    console.log(`🗑️ Deleting existing user '${DEFAULT_USER.username}' if exists...`);
    const deleteResult = await User.deleteOne({ username: DEFAULT_USER.username });
    
    if (deleteResult.deletedCount > 0) {
      console.log(`✅ Deleted existing user '${DEFAULT_USER.username}'`);
    } else {
      console.log(`ℹ️ No existing user '${DEFAULT_USER.username}' found`);
    }
    
    // Create fresh user
    console.log(`📝 Creating fresh user '${DEFAULT_USER.username}'...`);
    const user = await User.create({
      username: DEFAULT_USER.username,
      password: DEFAULT_USER.password, // Will be automatically hashed by the model
      isAdmin: DEFAULT_USER.isAdmin
    });
    
    console.log('✅ Fresh user created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${DEFAULT_USER.password} (hashed in database)`);
    console.log(`   Is Admin: ${user.isAdmin}`);
    console.log(`   Created: ${user.createdAt}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log(`   Username: ${DEFAULT_USER.username}`);
    console.log(`   Password: ${DEFAULT_USER.password}`);
    console.log(`   Dashboard: http://localhost:5000`);
    
    console.log('\n🎉 Reset and seeder completed successfully!');
    console.log('💡 You can now login to your dashboard with the above credentials');
    
  } catch (error) {
    console.error('\n❌ Reset seeder failed:', error.message);
    
    if (error.code === 11000) {
      console.log('💡 This error usually means the username already exists');
    } else if (error.name === 'MongoNetworkError') {
      console.log('💡 Make sure MongoDB is running on your system');
      console.log('   Windows: net start MongoDB');
      console.log('   Linux: sudo systemctl start mongod');
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the reset seeder
resetAndSeed();
