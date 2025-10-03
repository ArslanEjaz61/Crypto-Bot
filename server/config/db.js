const mongoose = require("mongoose");

// Enhanced MongoDB connection with better error handling and reconnection
const connectDB = async () => {
  try {
    // Set default MongoDB URI if not provided
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/binance-alerts";
    
    console.log(`🔗 Attempting to connect to MongoDB...`);
    console.log(`📍 Connection string: ${mongoURI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected - attempting to reconnect...");
      // Attempt to reconnect after a short delay
      setTimeout(async () => {
        try {
          await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
          });
          console.log("✅ MongoDB reconnected after disconnection");
        } catch (error) {
          console.error("❌ Failed to reconnect to MongoDB:", error.message);
        }
      }, 5000); // Wait 5 seconds before attempting reconnection
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });

    return true;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.error(`💡 Make sure MongoDB is running on your system`);
    console.error(`💡 You can start MongoDB with: net start MongoDB (Windows) or sudo systemctl start mongod (Linux)`);
    console.error(`💡 Or use MongoDB Atlas (cloud) by setting MONGO_URI environment variable`);

    // Don't exit the process - let the app continue with fallback
    console.log("⚠️ Continuing without MongoDB connection - some features may not work");
    return false;
  }
};

// Function to check if MongoDB is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Function to wait for connection
const waitForConnection = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    if (isConnected()) {
      return true;
    }
    console.log(
      `Waiting for MongoDB connection... (attempt ${i + 1}/${maxAttempts})`
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
};

module.exports = { connectDB, isConnected, waitForConnection };
