const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

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

// Prefix for logs to distinguish between processes
const SERVER_PREFIX = `${colors.blue}[SERVER]${colors.reset}`;
const CLIENT_PREFIX = `${colors.green}[CLIENT]${colors.reset}`;
const SCRIPT_PREFIX = `${colors.yellow}[SCRIPT]${colors.reset}`;

// Function to check if a port is in use
function checkPortInUse(port, callback) {
  const net = require("net");
  const server = net.createServer();

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      callback(true);
    }
  });

  server.once("listening", () => {
    server.close();
    callback(false);
  });

  server.listen(port);
}

// Function to start the server
function startServer() {
  console.log(`${SCRIPT_PREFIX} Starting server...`);

  // Check if port 5000 is in use
  checkPortInUse(5000, (inUse) => {
    if (inUse) {
      console.log(
        `${SCRIPT_PREFIX} ${colors.red}Warning: Port 5000 is already in use. Server may fail to start.${colors.reset}`
      );
      console.log(
        `${SCRIPT_PREFIX} If you encounter issues, please manually stop any processes using port 5000.`
      );
    }

    // Start the server process
    const server = spawn("node", ["index.js"], {
      cwd: __dirname,
      stdio: "pipe",
      shell: true,
    });

    // Handle server output
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
      } else {
        console.log(`${SERVER_PREFIX} Server process exited successfully`);
      }
    });

    server.on("error", (err) => {
      console.log(
        `${SERVER_PREFIX} ${colors.red}Failed to start server: ${err}${colors.reset}`
      );
    });

    return server;
  });
}

// Function to start the client
function startClient() {
  console.log(`${SCRIPT_PREFIX} Starting client...`);

  // Check if port 3000 is in use
  checkPortInUse(3000, (inUse) => {
    if (inUse) {
      console.log(
        `${SCRIPT_PREFIX} ${colors.red}Warning: Port 3000 is already in use. Client may fail to start.${colors.reset}`
      );
      console.log(
        `${SCRIPT_PREFIX} If you encounter issues, please manually stop any processes using port 3000.`
      );
    }

    // Start the client process
    const client = spawn("npm", ["start"], {
      cwd: path.join(__dirname, "client"),
      stdio: "pipe",
      shell: true,
    });

    // Handle client output
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
      } else {
        console.log(`${CLIENT_PREFIX} Client process exited successfully`);
      }
    });

    client.on("error", (err) => {
      console.log(
        `${CLIENT_PREFIX} ${colors.red}Failed to start client: ${err}${colors.reset}`
      );
    });

    return client;
  });
}

// Main function to start both server and client
function start() {
  console.log(
    `${SCRIPT_PREFIX} ${colors.cyan}==== Binance Alerts App Startup ====${colors.reset}`
  );
  console.log(`${SCRIPT_PREFIX} Starting both server and client processes...`);

  // Check if .env file exists, if not create a warning
  if (!fs.existsSync(path.join(__dirname, ".env"))) {
    console.log(
      `${SCRIPT_PREFIX} ${colors.red}Warning: .env file not found at project root!${colors.reset}`
    );
    console.log(
      `${SCRIPT_PREFIX} Make sure you have proper MongoDB connection string in your .env file.`
    );
  }

  // Check if client .env file exists
  if (!fs.existsSync(path.join(__dirname, "client", ".env"))) {
    console.log(
      `${SCRIPT_PREFIX} ${colors.yellow}Creating client .env file with default settings...${colors.reset}`
    );
    fs.writeFileSync(
      path.join(__dirname, "client", ".env"),
      "REACT_APP_API_URL=http://localhost:5000"
    );
    console.log(
      `${SCRIPT_PREFIX} ${colors.green}Client .env file created successfully.${colors.reset}`
    );
  }

  // Start both processes
  const serverProcess = startServer();

  // Wait a bit before starting client to ensure server is up
  setTimeout(() => {
    const clientProcess = startClient();
  }, 2000);

  // Handle exit gracefully
  process.on("SIGINT", () => {
    console.log(`${SCRIPT_PREFIX} Received SIGINT, shutting down processes...`);
    process.exit();
  });

  // Setup command interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(
    `${SCRIPT_PREFIX} ${colors.cyan}Commands: (r)restart, (q)uit${colors.reset}`
  );

  rl.on("line", (input) => {
    if (input === "r" || input === "restart") {
      console.log(`${SCRIPT_PREFIX} Restarting processes...`);
      // In a real implementation, we would kill the existing processes and start new ones
      console.log(
        `${SCRIPT_PREFIX} Please restart the script manually for now.`
      );
    } else if (input === "q" || input === "quit") {
      console.log(`${SCRIPT_PREFIX} Shutting down...`);
      rl.close();
      process.exit(0);
    } else {
      console.log(
        `${SCRIPT_PREFIX} ${colors.cyan}Commands: (r)restart, (q)uit${colors.reset}`
      );
    }
  });
}

// Start the application
start();
