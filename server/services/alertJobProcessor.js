/**
 * Alert Job Processor Service
 * 
 * Handles background processing of alert creation jobs:
 * 1. Processes alert creation jobs from Redis queue
 * 2. Sends progress updates via WebSocket
 * 3. Handles bulk alert creation asynchronously
 * 4. Provides real-time feedback to frontend
 */

const { redisClient, redisPublisher } = require('../config/redis');
const Alert = require('../models/alertModel');
const { disableAllExistingAlerts } = require('../utils/alertCleanup');

class AlertJobProcessor {
  constructor() {
    this.isRunning = false;
    this.processingJobs = new Map(); // Track active jobs
    this.stats = {
      jobsProcessed: 0,
      alertsCreated: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  /**
   * Start the job processor
   */
  async start() {
    console.log('🚀 Starting Alert Job Processor...');
    
    try {
      // Subscribe to alert job queue
      await this.subscribeToJobQueue();
      
      this.isRunning = true;
      console.log('✅ Alert Job Processor started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start Alert Job Processor:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe to Redis job queue
   */
  async subscribeToJobQueue() {
    try {
      // Subscribe to alert job queue
      await redisClient.subscribe('alert-jobs', (err, count) => {
        if (err) {
          console.error('❌ Error subscribing to alert-jobs:', err.message);
          return;
        }
        console.log(`✅ Subscribed to alert-jobs channel`);
      });

      redisClient.on('message', async (channel, message) => {
        if (channel === 'alert-jobs') {
          await this.processJob(message);
        }
      });
      
    } catch (error) {
      console.error('❌ Error subscribing to job queue:', error.message);
      throw error;
    }
  }

  /**
   * Process a single job
   */
  async processJob(message) {
    try {
      const job = JSON.parse(message);
      console.log(`📋 Processing job: ${job.jobId}`);
      
      // Track job processing
      this.processingJobs.set(job.jobId, {
        status: 'processing',
        startTime: Date.now(),
        progress: 0,
        totalPairs: job.pairs.length
      });
      
      // Send initial progress update
      await this.sendProgressUpdate(job.jobId, {
        status: 'started',
        message: 'Starting alert creation process...',
        progress: 0,
        totalPairs: job.pairs.length
      });
      
      // Process the job
      await this.executeJob(job);
      
    } catch (error) {
      console.error('❌ Error processing job:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Execute the alert creation job
   */
  async executeJob(job) {
    const { jobId, pairs, conditions, userId, sessionId } = job;
    
    try {
      // Step 1: Delete existing alerts (if requested)
      if (conditions.deleteExisting) {
        await this.sendProgressUpdate(jobId, {
          status: 'deleting',
          message: 'Deleting existing alerts...',
          progress: 10
        });
        
        const deletedCount = await disableAllExistingAlerts();
        console.log(`🗑️ Deleted ${deletedCount} existing alerts`);
      }
      
      // Step 2: Create new alerts in batches
      await this.sendProgressUpdate(jobId, {
        status: 'creating',
        message: 'Creating new alerts...',
        progress: 20
      });
      
      const batchSize = 50; // Process 50 pairs at a time
      let createdCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < pairs.length; i += batchSize) {
        const batch = pairs.slice(i, i + batchSize);
        
        // Process batch
        const batchResults = await this.createBatchAlerts(batch, conditions);
        createdCount += batchResults.created;
        errorCount += batchResults.errors;
        
        // Calculate progress
        const progress = Math.min(20 + ((i + batch.length) / pairs.length) * 70, 90);
        
        // Send progress update
        await this.sendProgressUpdate(jobId, {
          status: 'creating',
          message: `Created ${createdCount} alerts, ${errorCount} errors`,
          progress: Math.round(progress),
          currentBatch: i + batch.length,
          totalPairs: pairs.length,
          createdCount,
          errorCount
        });
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Step 3: Finalize
      await this.sendProgressUpdate(jobId, {
        status: 'finalizing',
        message: 'Finalizing alert creation...',
        progress: 95
      });
      
      // Sync to Redis
      const { syncAlertsFromDB } = require('../config/redis');
      await syncAlertsFromDB();
      
      // Send completion update
      await this.sendProgressUpdate(jobId, {
        status: 'completed',
        message: `Successfully created ${createdCount} alerts`,
        progress: 100,
        totalCreated: createdCount,
        totalErrors: errorCount,
        completedAt: new Date().toISOString()
      });
      
      // Clean up job tracking
      this.processingJobs.delete(jobId);
      this.stats.jobsProcessed++;
      this.stats.alertsCreated += createdCount;
      
      console.log(`✅ Job ${jobId} completed: ${createdCount} alerts created, ${errorCount} errors`);
      
    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error.message);
      
      // Send error update
      await this.sendProgressUpdate(jobId, {
        status: 'error',
        message: `Job failed: ${error.message}`,
        progress: 0,
        error: error.message
      });
      
      this.stats.errors++;
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Create alerts for a batch of pairs
   */
  async createBatchAlerts(pairs, conditions) {
    const results = { created: 0, errors: 0 };
    
    for (const pair of pairs) {
      try {
        const alertData = {
          symbol: pair.symbol,
          direction: conditions.direction || '>',
          targetType: conditions.targetType || 'percentage',
          targetValue: conditions.targetValue || 1,
          currentPrice: pair.price || 0,
          basePrice: pair.price || 0,
          trackingMode: 'current',
          intervalMinutes: 0,
          alertTime: new Date().toISOString(),
          comment: conditions.comment || `Auto-created alert for ${pair.symbol}`,
          email: conditions.email || 'user@example.com',
          userExplicitlyCreated: true,
          
          // Alert conditions
          changePercentValue: conditions.changePercentValue || 0,
          minDailyVolume: conditions.minDailyVolume || 0,
          alertCountEnabled: conditions.alertCountEnabled || false,
          alertCountTimeframe: conditions.alertCountTimeframe || '5MIN',
          maxAlertsPerTimeframe: conditions.maxAlertsPerTimeframe || 1,
          
          // Market filters
          market: conditions.market || 'ALL',
          exchange: conditions.exchange || 'BINANCE',
          tradingPair: conditions.tradingPair || 'USDT'
        };
        
        const alert = new Alert(alertData);
        await alert.save();
        results.created++;
        
      } catch (error) {
        console.error(`❌ Error creating alert for ${pair.symbol}:`, error.message);
        results.errors++;
      }
    }
    
    return results;
  }

  /**
   * Send progress update via WebSocket
   */
  async sendProgressUpdate(jobId, update) {
    try {
      const message = {
        type: 'alert-job-progress',
        jobId,
        ...update,
        timestamp: new Date().toISOString()
      };
      
      // Publish to Redis for WebSocket distribution
      await redisPublisher.publish('alert-job-updates', JSON.stringify(message));
      
      console.log(`📊 Job ${jobId} progress: ${update.progress}% - ${update.message}`);
      
    } catch (error) {
      console.error('❌ Error sending progress update:', error.message);
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    return this.processingJobs.get(jobId) || null;
  }

  /**
   * Get processor statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      activeJobs: this.processingJobs.size,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Stop the processor
   */
  async stop() {
    console.log('🛑 Stopping Alert Job Processor...');
    this.isRunning = false;
    
    try {
      await redisClient.unsubscribe();
      console.log('✅ Alert Job Processor stopped');
    } catch (error) {
      console.error('❌ Error stopping processor:', error.message);
    }
  }
}

// Create singleton instance
const alertJobProcessor = new AlertJobProcessor();

module.exports = alertJobProcessor;
