const mongoose = require("mongoose");

// Enhanced MongoDB connection with better error handling and reconnection
const connectDB = async () => {
  try {
    // Connection options for better reliability
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain a minimum of 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connection established");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);

    // Don't exit the process in production - let the app continue with fallback
    if (process.env.NODE_ENV === "production") {
      console.log(
        "⚠️ Running in production mode - continuing without MongoDB connection"
      );
      return false;
    } else {
      console.log(
        "💥 Development mode - exiting due to MongoDB connection failure"
      );
      process.exit(1);
    }
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
