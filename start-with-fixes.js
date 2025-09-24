// Enhanced startup script with fixes for common issues
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const SERVER_PREFIX = `${colors.blue}[SERVER]${colors.reset}`;
const CLIENT_PREFIX = `${colors.green}[CLIENT]${colors.reset}`;
const SCRIPT_PREFIX = `${colors.yellow}[SCRIPT]${colors.reset}`;

// Check if MongoDB is running
function checkMongoDB() {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(1000);

    client.on("connect", () => {
      client.destroy();
      resolve(true);
    });

    client.on("timeout", () => {
      client.destroy();
      resolve(false);
    });

    client.on("error", () => {
      resolve(false);
    });

    client.connect(27017, "localhost");
  });
}

// Check if port is in use
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(false);
    });

    server.listen(port);
  });
}

// Create .env file if it doesn't exist
function createEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    console.log(
      `${SCRIPT_PREFIX} ${colors.yellow}Creating .env file...${colors.reset}`
    );
    const envContent = `# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/binance-alerts

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Configuration
API_MIN_REFRESH_INTERVAL=30000
API_TIMEOUT=5000
`;
    fs.writeFileSync(envPath, envContent);
    console.log(
      `${SCRIPT_PREFIX} ${colors.green}.env file created successfully${colors.reset}`
    );
  }
}

// Start server
async function startServer() {
  console.log(`${SCRIPT_PREFIX} Starting server...`);

  const portInUse = await checkPortInUse(5000);
  if (portInUse) {
    console.log(
      `${SCRIPT_PREFIX} ${colors.red}Warning: Port 5000 is already in use${colors.reset}`
    );
  }

  const server = spawn("node", ["index.js"], {
    cwd: __dirname,
    stdio: "pipe",
    shell: true,
    env: { ...process.env, NODE_ENV: "development" },
  });

  server.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => console.log(`${SERVER_PREFIX} ${line}`));
  });

  server.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) =>
      console.log(`${SERVER_PREFIX} ${colors.red}${line}${colors.reset}`)
    );
  });

  server.on("close", (code) => {
    if (code !== 0) {
      console.log(
        `${SERVER_PREFIX} ${colors.red}Server process exited with code ${code}${colors.reset}`
      );
    }
  });

  return server;
}

// Start client
async function startClient() {
  console.log(`${SCRIPT_PREFIX} Starting client...`);

  const portInUse = await checkPortInUse(3000);
  if (portInUse) {
    console.log(
      `${SCRIPT_PREFIX} ${colors.red}Warning: Port 3000 is already in use${colors.reset}`
    );
  }

  const client = spawn("npm", ["start"], {
    cwd: path.join(__dirname, "client"),
    stdio: "pipe",
    shell: true,
    env: { ...process.env, BROWSER: "none" }, // Prevent auto-opening browser
  });

  client.stdout.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) => console.log(`${CLIENT_PREFIX} ${line}`));
  });

  client.stderr.on("data", (data) => {
    const lines = data.toString().trim().split("\n");
    lines.forEach((line) =>
      console.log(`${CLIENT_PREFIX} ${colors.red}${line}${colors.reset}`)
    );
  });

  client.on("close", (code) => {
    if (code !== 0) {
      console.log(
        `${CLIENT_PREFIX} ${colors.red}Client process exited with code ${code}${colors.reset}`
      );
    }
  });

  return client;
}

// Main function
async function start() {
  console.log(
    `${SCRIPT_PREFIX} ${colors.cyan}==== Binance Alerts App Startup (Enhanced) ====${colors.reset}`
  );

  // Check MongoDB
  const mongoRunning = await checkMongoDB();
  if (!mongoRunning) {
    console.log(
      `${SCRIPT_PREFIX} ${colors.red}❌ MongoDB is not running!${colors.reset}`
    );
    console.log(
      `${SCRIPT_PREFIX} ${colors.yellow}Please start MongoDB:${colors.reset}`
    );
    console.log(`${SCRIPT_PREFIX}   Windows: net start MongoDB`);
    console.log(`${SCRIPT_PREFIX}   Linux/Mac: sudo systemctl start mongod`);
    console.log(
      `${SCRIPT_PREFIX}   Or use MongoDB Atlas (cloud) by updating MONGO_URI in .env`
    );
    console.log("");
    console.log(
      `${SCRIPT_PREFIX} ${colors.yellow}Continuing anyway - app will use fallback data...${colors.reset}`
    );
  } else {
    console.log(
      `${SCRIPT_PREFIX} ${colors.green}✅ MongoDB is running${colors.reset}`
    );
  }

  // Create .env file if needed
  createEnvFile();

  // Start server
  const serverProcess = await startServer();

  // Wait before starting client
  setTimeout(async () => {
    const clientProcess = await startClient();
  }, 3000);

  // Handle exit
  process.on("SIGINT", () => {
    console.log(`${SCRIPT_PREFIX} Shutting down...`);
    process.exit();
  });
}

// Start the application
start().catch(console.error);
