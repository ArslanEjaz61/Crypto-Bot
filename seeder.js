#!/usr/bin/env node

/**
 * Database Seeder - Creates a default user
 * Run with: node seeder.js
 */

const mongoose = require('mongoose');
const User = require('./server/models/userModel');

// Default user credentials
const DEFAULT_USER = {
  username: 'admin',
  password: 'admin123',
  isAdmin: true
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeder...\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/alerts";
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Check if user already exists
    console.log(`🔍 Checking if user '${DEFAULT_USER.username}' already exists...`);
    const existingUser = await User.findOne({ username: DEFAULT_USER.username });
    
    if (existingUser) {
      console.log(`⚠️ User '${DEFAULT_USER.username}' already exists!`);
      console.log('📋 Existing user details:');
      console.log(`   ID: ${existingUser._id}`);
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Is Admin: ${existingUser.isAdmin}`);
      console.log(`   Created: ${existingUser.createdAt}`);
      console.log('\n✅ Seeder completed - user already exists');
      return;
    }
    
    // Create the default user
    console.log(`📝 Creating user '${DEFAULT_USER.username}'...`);
    const user = await User.create({
      username: DEFAULT_USER.username,
      password: DEFAULT_USER.password, // Will be automatically hashed by the model
      isAdmin: DEFAULT_USER.isAdmin
    });
    
    console.log('✅ User created successfully!');
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
    
    console.log('\n🎉 Seeder completed successfully!');
    console.log('💡 You can now login to your dashboard with the above credentials');
    
  } catch (error) {
    console.error('\n❌ Seeder failed:', error.message);
    
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

// Run the seeder
seedDatabase();
