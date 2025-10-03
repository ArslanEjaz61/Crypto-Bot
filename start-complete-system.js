#!/usr/bin/env node

/**
 * Complete System Startup Script
 * 
 * This script starts everything in the correct order:
 * 1. Backend Server (with integrated real-time system)
 * 2. Frontend (if needed)
 * 
 * Usage: node start-complete-system.js
 */

const { spawn } = require('child_process');
const path = require('path');

class CompleteSystemStarter {
  constructor() {
    this.processes = [];
    this.isShuttingDown = false;
  }

  /**
   * Start the complete system
   */
  async start() {
    console.log('🚀 Starting Complete Real-time Alert System...');
    console.log('==============================================');
    
    try {
      // Start backend server (includes real-time system)
      console.log('📡 Starting Backend Server with Real-time System...');
      await this.startBackendServer();
      
      console.log('✅ Complete system started successfully!');
      console.log('==============================================');
      console.log('🌐 Access your application:');
      console.log('  • Frontend: http://localhost:5000');
      console.log('  • API: http://localhost:5000/api');
      console.log('  • Health: http://localhost:5000/api/health');
      console.log('==============================================');
      console.log('📊 Real-time features:');
      console.log('  • Instant pairs loading');
      console.log('  • Live price updates');
      console.log('  • Real-time alert triggering');
      console.log('  • WebSocket integration');
      console.log('==============================================');
      
    } catch (error) {
      console.error('❌ Failed to start system:', error.message);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Start backend server
   */
  async startBackendServer() {
    return new Promise((resolve, reject) => {
      const serverProcess = spawn('node', ['server/index.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      serverProcess.on('error', (error) => {
        console.error('❌ Backend server error:', error.message);
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`❌ Backend server exited with code ${code}`);
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      this.processes.push({
        name: 'Backend Server',
        process: serverProcess
      });

      // Wait a moment for server to start
      setTimeout(() => {
        console.log('✅ Backend server started');
        resolve();
      }, 3000);
    });
  }

  /**
   * Start frontend (optional)
   */
  async startFrontend() {
    return new Promise((resolve, reject) => {
      console.log('🎨 Starting Frontend...');
      
      const frontendProcess = spawn('npm', ['start'], {
        stdio: 'inherit',
        cwd: path.join(process.cwd(), 'client'),
        shell: true
      });

      frontendProcess.on('error', (error) => {
        console.error('❌ Frontend error:', error.message);
        reject(error);
      });

      frontendProcess.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          console.error(`❌ Frontend exited with code ${code}`);
        }
      });

      this.processes.push({
        name: 'Frontend',
        process: frontendProcess
      });

      setTimeout(() => {
        console.log('✅ Frontend started');
        resolve();
      }, 5000);
    });
  }

  /**
   * Gracefully shutdown all processes
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('\n🛑 Shutting down complete system...');
    
    for (const { name, process } of this.processes) {
      try {
        console.log(`🛑 Stopping ${name}...`);
        process.kill('SIGTERM');
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);
        
      } catch (error) {
        console.error(`❌ Error stopping ${name}:`, error.message);
      }
    }
    
    console.log('✅ Complete system stopped');
  }
}

// Create and start the system
const starter = new CompleteSystemStarter();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await starter.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await starter.shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await starter.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await starter.shutdown();
  process.exit(1);
});

// Start the system
starter.start().catch(async (error) => {
  console.error('❌ Failed to start system:', error);
  await starter.shutdown();
  process.exit(1);
});

module.exports = starter;
