#!/usr/bin/env node

/**
 * Complete System Startup with Tests
 * 
 * This script starts everything and runs tests automatically:
 * 1. Backend Server (with all real-time systems)
 * 2. Run comprehensive tests
 * 3. Show system status
 * 
 * Usage: node start-complete-system-with-tests.js
 */

const { spawn } = require('child_process');
const path = require('path');

class CompleteSystemWithTests {
  constructor() {
    this.processes = [];
    this.isShuttingDown = false;
    this.testResults = [];
  }

  /**
   * Start the complete system with tests
   */
  async start() {
    console.log('🚀 Starting Complete Real-time Alert System with Tests...');
    console.log('======================================================');
    
    try {
      // Start backend server (includes all real-time systems)
      console.log('📡 Starting Backend Server with All Real-time Systems...');
      await this.startBackendServer();
      
      // Wait for server to be ready
      console.log('⏳ Waiting for server to be ready...');
      await this.waitForServer();
      
      // Run comprehensive tests
      console.log('🧪 Running Comprehensive Tests...');
      await this.runAllTests();
      
      // Show final status
      this.showFinalStatus();
      
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

      // Wait for server to start
      setTimeout(() => {
        console.log('✅ Backend server started with all real-time systems');
        resolve();
      }, 5000);
    });
  }

  /**
   * Wait for server to be ready
   */
  async waitForServer() {
    const axios = require('axios');
    const maxAttempts = 10;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get('http://localhost:5000/api/health');
        if (response.status === 200) {
          console.log('✅ Server is ready and responding');
          return;
        }
      } catch (error) {
        console.log(`⏳ Waiting for server... (attempt ${i + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Server did not become ready within timeout');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Running Real-time System Tests...');
    await this.runTest('test-realtime-system.js', 'Real-time System');
    
    console.log('🧪 Running Instant Alert Tests...');
    await this.runTest('test-instant-alerts.js', 'Instant Alerts');
    
    console.log('🧪 Running System Health Tests...');
    await this.runHealthTests();
  }

  /**
   * Run a specific test
   */
  async runTest(testFile, testName) {
    return new Promise((resolve) => {
      console.log(`🔍 Running ${testName} tests...`);
      
      const testProcess = spawn('node', [testFile], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      testProcess.on('close', (code) => {
        const result = {
          testName,
          success: code === 0,
          output,
          error: errorOutput,
          exitCode: code
        };
        
        this.testResults.push(result);
        
        if (code === 0) {
          console.log(`✅ ${testName} tests passed`);
        } else {
          console.log(`❌ ${testName} tests failed (exit code: ${code})`);
        }
        
        resolve();
      });

      testProcess.on('error', (error) => {
        console.error(`❌ Error running ${testName} tests:`, error.message);
        this.testResults.push({
          testName,
          success: false,
          output: '',
          error: error.message,
          exitCode: 1
        });
        resolve();
      });
    });
  }

  /**
   * Run health tests
   */
  async runHealthTests() {
    const axios = require('axios');
    const baseUrl = 'http://localhost:5000';
    
    const healthTests = [
      { name: 'API Health', url: '/api/health' },
      { name: 'Instant Pairs', url: '/api/pairs/instant' },
      { name: 'Alert Processor', url: '/api/alerts/processor/stats' },
      { name: 'Available Pairs', url: '/api/alerts/pairs/available?limit=10' }
    ];

    for (const test of healthTests) {
      try {
        const response = await axios.get(`${baseUrl}${test.url}`);
        if (response.status === 200) {
          console.log(`✅ ${test.name}: OK`);
          this.testResults.push({
            testName: test.name,
            success: true,
            output: 'Health check passed',
            error: '',
            exitCode: 0
          });
        } else {
          console.log(`❌ ${test.name}: Failed (status ${response.status})`);
          this.testResults.push({
            testName: test.name,
            success: false,
            output: '',
            error: `HTTP ${response.status}`,
            exitCode: 1
          });
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        this.testResults.push({
          testName: test.name,
          success: false,
          output: '',
          error: error.message,
          exitCode: 1
        });
      }
    }
  }

  /**
   * Show final status
   */
  showFinalStatus() {
    console.log('\n📊 === Final System Status ===');
    console.log('==============================');
    
    const passed = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`📈 Test Success Rate: ${successRate}% (${passed}/${total})`);
    console.log('==============================');
    
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.success ? 'PASSED' : 'FAILED'}`);
    });
    
    console.log('==============================');
    
    if (passed === total) {
      console.log('🎉 All systems are working perfectly!');
      console.log('✅ Complete Real-time Alert System is ready');
      console.log('🌐 Access your application:');
      console.log('  • Frontend: http://localhost:5000');
      console.log('  • API: http://localhost:5000/api');
      console.log('  • Health: http://localhost:5000/api/health');
      console.log('==============================');
      console.log('📊 System Features:');
      console.log('  ✅ Instant pairs loading');
      console.log('  ✅ Real-time price updates');
      console.log('  ✅ Instant alert creation');
      console.log('  ✅ Background job processing');
      console.log('  ✅ WebSocket progress updates');
      console.log('  ✅ Real-time alert triggering');
      console.log('==============================');
    } else {
      console.log('⚠️  Some tests failed. Please check the system configuration.');
    }
    
    console.log('==============================\n');
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
const starter = new CompleteSystemWithTests();

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
