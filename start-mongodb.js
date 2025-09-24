// Script to start MongoDB if not running
const { spawn } = require("child_process");
const net = require("net");

// Function to check if MongoDB is running
function checkMongoDB(callback) {
  const client = new net.Socket();

  client.setTimeout(1000);

  client.on("connect", () => {
    client.destroy();
    callback(true);
  });

  client.on("timeout", () => {
    client.destroy();
    callback(false);
  });

  client.on("error", () => {
    callback(false);
  });

  client.connect(27017, "localhost");
}

// Check if MongoDB is running
checkMongoDB((isRunning) => {
  if (isRunning) {
    console.log("✅ MongoDB is already running on port 27017");
  } else {
    console.log("❌ MongoDB is not running. Please start MongoDB manually:");
    console.log("   Windows: net start MongoDB");
    console.log("   Linux/Mac: sudo systemctl start mongod");
    console.log("   Or install MongoDB if not installed");
    console.log("");
    console.log(
      "   You can also use MongoDB Atlas (cloud) by updating MONGO_URI in .env"
    );
  }
});
