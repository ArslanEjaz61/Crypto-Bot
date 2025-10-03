#!/usr/bin/env node

/**
 * Alert System Diagnostic Tool
 * 
 * Checks the complete alert system:
 * 1. Binance WebSocket connection
 * 2. Redis price updates
 * 3. Alert worker status
 * 4. Alert conditions
 * 5. WebSocket broadcasting
 */

const axios = require('axios');
const { createClient } = require('redis');

class AlertSystemDiagnostic {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    this.redisClient = null;
    this.results = [];
  }

  async runDiagnostic() {
    console.log('🔍 === ALERT SYSTEM DIAGNOSTIC ===');
    console.log('====================================');
    
    try {
      // Test 1: System Health
      await this.testSystemHealth();
      
      // Test 2: Redis Connection
      await this.testRedisConnection();
      
      // Test 3: Price Data in Redis
      await this.testPriceData();
      
      // Test 4: Alert Worker Status
      await this.testAlertWorker();
      
      // Test 5: Alert Conditions
      await this.testAlertConditions();
      
      // Test 6: WebSocket Broadcasting
      await this.testWebSocketBroadcasting();
      
      // Print results
      this.printResults();
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error.message);
    } finally {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
    }
  }

  async testSystemHealth() {
    console.log('🔍 Test 1: System Health...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`);
      
      if (response.status === 200) {
        this.addResult('System Health', true, 'API is responding');
      } else {
        this.addResult('System Health', false, `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('System Health', false, error.message);
    }
  }

  async testRedisConnection() {
    console.log('🔍 Test 2: Redis Connection...');
    
    try {
      this.redisClient = createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      });
      
      await this.redisClient.connect();
      await this.redisClient.ping();
      
      this.addResult('Redis Connection', true, 'Connected successfully');
    } catch (error) {
      this.addResult('Redis Connection', false, error.message);
    }
  }

  async testPriceData() {
    console.log('🔍 Test 3: Price Data in Redis...');
    
    try {
      if (!this.redisClient) {
        this.addResult('Price Data', false, 'Redis not connected');
        return;
      }
      
      // Check if price data exists
      const priceKeys = await this.redisClient.keys('price:*');
      const priceHashKeys = await this.redisClient.keys('prices:*');
      
      if (priceKeys.length > 0 || priceHashKeys.length > 0) {
        this.addResult('Price Data', true, `Found ${priceKeys.length + priceHashKeys.length} price entries`);
        
        // Check specific symbols
        const btcPrice = await this.redisClient.get('price:BTCUSDT');
        if (btcPrice) {
          this.addResult('BTC Price', true, `BTCUSDT: $${btcPrice}`);
        } else {
          this.addResult('BTC Price', false, 'BTCUSDT price not found');
        }
      } else {
        this.addResult('Price Data', false, 'No price data found in Redis');
      }
    } catch (error) {
      this.addResult('Price Data', false, error.message);
    }
  }

  async testAlertWorker() {
    console.log('🔍 Test 4: Alert Worker Status...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/alerts/processor/stats`);
      
      if (response.data.success) {
        const stats = response.data.stats;
        this.addResult('Alert Worker', true, `Running: ${stats.isRunning}, Jobs: ${stats.jobsProcessed}`);
      } else {
        this.addResult('Alert Worker', false, 'Worker not responding');
      }
    } catch (error) {
      this.addResult('Alert Worker', false, error.message);
    }
  }

  async testAlertConditions() {
    console.log('🔍 Test 5: Alert Conditions...');
    
    try {
      // Test condition checking endpoint
      const response = await axios.post(`${this.baseUrl}/api/crypto/BTCUSDT/check-conditions`, {
        filters: {
          minDailyVolume: 1000000,
          changePercent: { '1HR': true },
          percentageValue: 5
        }
      });
      
      if (response.data.meetsConditions !== undefined) {
        this.addResult('Alert Conditions', true, `Conditions check: ${response.data.meetsConditions}`);
      } else {
        this.addResult('Alert Conditions', false, 'Invalid response format');
      }
    } catch (error) {
      this.addResult('Alert Conditions', false, error.message);
    }
  }

  async testWebSocketBroadcasting() {
    console.log('🔍 Test 6: WebSocket Broadcasting...');
    
    try {
      // Check if WebSocket server is running
      const response = await axios.get(`${this.baseUrl}/api/health`);
      
      if (response.status === 200) {
        this.addResult('WebSocket Server', true, 'Server is running');
        
        // Test WebSocket connection
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:5000');
        
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            this.addResult('WebSocket Connection', false, 'Connection timeout');
            resolve();
          }, 5000);
          
          ws.on('open', () => {
            clearTimeout(timeout);
            this.addResult('WebSocket Connection', true, 'Connected successfully');
            ws.close();
            resolve();
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            this.addResult('WebSocket Connection', false, error.message);
            resolve();
          });
        });
      } else {
        this.addResult('WebSocket Server', false, 'Server not responding');
      }
    } catch (error) {
      this.addResult('WebSocket Broadcasting', false, error.message);
    }
  }

  addResult(testName, passed, message) {
    this.results.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${message}`);
  }

  printResults() {
    console.log('\n📊 === DIAGNOSTIC RESULTS ===');
    console.log('=============================');
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`📈 Success Rate: ${successRate}% (${passed}/${total})`);
    console.log('=============================');
    
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    });
    
    console.log('=============================');
    
    if (passed === total) {
      console.log('🎉 All systems are working correctly!');
      console.log('✅ Alert system should be triggering alerts');
    } else {
      console.log('⚠️  Some systems have issues. Check the failed tests above.');
      console.log('🔧 Common fixes:');
      console.log('  • Make sure Redis is running: redis-server');
      console.log('  • Check if Binance WebSocket is connected');
      console.log('  • Verify alert worker is running');
      console.log('  • Check WebSocket server status');
    }
    
    console.log('=============================\n');
  }
}

// Run diagnostic
const diagnostic = new AlertSystemDiagnostic();
diagnostic.runDiagnostic().catch(console.error);
