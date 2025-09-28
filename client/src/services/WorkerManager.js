/**
 * Web Worker Manager for Background Processing
 * Manages multiple workers for optimal performance
 */

class WorkerManager {
  constructor() {
    this.workers = [];
    this.workerPool = [];
    this.taskQueue = [];
    this.activeRequests = new Map();
    this.requestId = 0;
    
    // Configuration
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.workerScript = '/alert-worker.js';
    this.taskTimeout = 10000; // 10 seconds
    
    // Performance metrics
    this.metrics = {
      tasksCompleted: 0,
      tasksErrored: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      workersActive: 0,
      queueSize: 0
    };
    
    this.initialize();
  }

  /**
   * Initialize worker pool
   */
  async initialize() {
    console.log(`🚀 Initializing worker pool with ${this.maxWorkers} workers`);
    
    try {
      // Create worker pool
      for (let i = 0; i < this.maxWorkers; i++) {
        await this.createWorker(i);
      }
      
      console.log(`✅ Worker pool initialized: ${this.workers.length} workers ready`);
      
      // Start queue processing
      this.startQueueProcessing();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to initialize worker pool:', error);
      throw error;
    }
  }

  /**
   * Create a new worker
   */
  async createWorker(id) {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(this.workerScript);
        
        worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
        worker.onerror = (error) => this.handleWorkerError(worker, error);
        
        worker.id = id;
        worker.busy = false;
        worker.tasksProcessed = 0;
        worker.errors = 0;
        
        // Wait for ready signal
        const readyHandler = (e) => {
          if (e.data.type === 'READY') {
            worker.removeEventListener('message', readyHandler);
            this.workers.push(worker);
            this.workerPool.push(worker);
            console.log(`✅ Worker ${id} initialized and ready`);
            resolve(worker);
          }
        };
        
        worker.addEventListener('message', readyHandler);
        
        // Timeout for worker initialization
        setTimeout(() => {
          worker.removeEventListener('message', readyHandler);
          reject(new Error(`Worker ${id} initialization timeout`));
        }, 5000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(worker, e) {
    const { type, id, result, error, processingTime } = e.data;
    
    switch (type) {
      case 'RESULT':
        this.handleTaskResult(worker, id, result, processingTime);
        break;
        
      case 'ERROR':
        this.handleTaskError(worker, id, error);
        break;
        
      case 'WARNING':
        console.warn(`⚠️ Worker ${worker.id}: ${e.data.message}`);
        break;
        
      case 'INFO':
        console.log(`ℹ️ Worker ${worker.id}: ${e.data.message}`);
        break;
        
      default:
        console.log(`📨 Worker ${worker.id} message:`, e.data);
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.error(`❌ Worker ${worker.id} error:`, error);
    worker.errors++;
    
    // If worker has too many errors, replace it
    if (worker.errors > 5) {
      this.replaceWorker(worker);
    }
  }

  /**
   * Handle task completion
   */
  handleTaskResult(worker, requestId, result, processingTime) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;
    
    // Clear timeout
    if (request.timeout) {
      clearTimeout(request.timeout);
    }
    
    // Update metrics
    this.updateMetrics(processingTime, false);
    worker.tasksProcessed++;
    
    // Mark worker as available
    worker.busy = false;
    this.workerPool.push(worker);
    
    // Resolve the promise
    request.resolve(result);
    
    // Cleanup
    this.activeRequests.delete(requestId);
    
    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle task error
   */
  handleTaskError(worker, requestId, error) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;
    
    // Clear timeout
    if (request.timeout) {
      clearTimeout(request.timeout);
    }
    
    // Update metrics
    this.updateMetrics(0, true);
    worker.errors++;
    
    // Mark worker as available
    worker.busy = false;
    this.workerPool.push(worker);
    
    // Reject the promise
    request.reject(new Error(error));
    
    // Cleanup
    this.activeRequests.delete(requestId);
    
    // Process next task in queue
    this.processQueue();
  }

  /**
   * Execute task with automatic worker selection
   */
  async executeTask(type, data, priority = 0) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      
      const request = {
        id: requestId,
        type,
        data,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      // Add to queue or process immediately
      if (this.workerPool.length > 0) {
        this.processTask(request);
      } else {
        this.addToQueue(request);
      }
    });
  }

  /**
   * Process task immediately
   */
  processTask(request) {
    const worker = this.workerPool.shift();
    if (!worker) {
      this.addToQueue(request);
      return;
    }
    
    worker.busy = true;
    this.activeRequests.set(request.id, request);
    
    // Set timeout
    request.timeout = setTimeout(() => {
      this.handleTaskTimeout(request.id);
    }, this.taskTimeout);
    
    // Send task to worker
    worker.postMessage({
      id: request.id,
      type: request.type,
      data: request.data
    });
  }

  /**
   * Add task to queue
   */
  addToQueue(request) {
    // Insert based on priority (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (request.priority > this.taskQueue[i].priority) {
        this.taskQueue.splice(i, 0, request);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.taskQueue.push(request);
    }
    
    this.metrics.queueSize = this.taskQueue.length;
  }

  /**
   * Process queue
   */
  processQueue() {
    while (this.taskQueue.length > 0 && this.workerPool.length > 0) {
      const request = this.taskQueue.shift();
      this.processTask(request);
    }
    
    this.metrics.queueSize = this.taskQueue.length;
  }

  /**
   * Start queue processing
   */
  startQueueProcessing() {
    setInterval(() => {
      this.processQueue();
    }, 100); // Process queue every 100ms
  }

  /**
   * Handle task timeout
   */
  handleTaskTimeout(requestId) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;
    
    console.warn(`⚠️ Task timeout: ${request.type} (${requestId})`);
    
    // Find and reset the worker
    const worker = this.workers.find(w => w.busy);
    if (worker) {
      worker.busy = false;
      this.workerPool.push(worker);
    }
    
    // Reject the promise
    request.reject(new Error('Task timeout'));
    
    // Cleanup
    this.activeRequests.delete(requestId);
    this.updateMetrics(0, true);
  }

  /**
   * Replace a problematic worker
   */
  async replaceWorker(oldWorker) {
    console.log(`🔄 Replacing worker ${oldWorker.id}`);
    
    try {
      // Remove old worker
      const index = this.workers.indexOf(oldWorker);
      if (index > -1) {
        this.workers.splice(index, 1);
      }
      
      const poolIndex = this.workerPool.indexOf(oldWorker);
      if (poolIndex > -1) {
        this.workerPool.splice(poolIndex, 1);
      }
      
      // Terminate old worker
      oldWorker.terminate();
      
      // Create new worker
      await this.createWorker(oldWorker.id);
      
      console.log(`✅ Worker ${oldWorker.id} replaced successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to replace worker ${oldWorker.id}:`, error);
    }
  }

  /**
   * Batch execute multiple tasks
   */
  async executeBatch(tasks, priority = 0) {
    const batchId = `batch_${++this.requestId}`;
    
    try {
      // Split tasks among available workers
      const results = await Promise.all(
        tasks.map((task, index) => 
          this.executeTask('BATCH_PROCESS', {
            tasks: [{ ...task, id: `${batchId}_${index}` }]
          }, priority)
        )
      );
      
      return results.flat();
      
    } catch (error) {
      console.error(`❌ Batch execution failed:`, error);
      throw error;
    }
  }

  /**
   * Calculate RSI using worker
   */
  async calculateRSI(symbol, prices, period = 14) {
    return this.executeTask('CALCULATE_RSI', {
      symbol,
      prices,
      period
    }, 1); // High priority for real-time calculations
  }

  /**
   * Calculate EMA using worker
   */
  async calculateEMA(symbol, prices, period) {
    return this.executeTask('CALCULATE_EMA', {
      symbol,
      prices,
      period
    }, 1);
  }

  /**
   * Analyze volume using worker
   */
  async analyzeVolume(volumeData, lookbackPeriod = 20) {
    return this.executeTask('ANALYZE_VOLUME', {
      volumeData,
      lookbackPeriod
    }, 1);
  }

  /**
   * Detect price patterns using worker
   */
  async detectPatterns(ohlcData) {
    return this.executeTask('DETECT_PATTERNS', {
      ohlcData
    }, 1);
  }

  /**
   * Evaluate alert condition using worker
   */
  async evaluateCondition(conditionType, conditionData) {
    return this.executeTask('EVALUATE_CONDITION', {
      conditionType,
      ...conditionData
    }, 2); // Highest priority for alert evaluation
  }

  /**
   * Update performance metrics
   */
  updateMetrics(processingTime, isError) {
    if (isError) {
      this.metrics.tasksErrored++;
    } else {
      this.metrics.tasksCompleted++;
      this.metrics.totalProcessingTime += processingTime;
      this.metrics.averageProcessingTime = 
        this.metrics.totalProcessingTime / this.metrics.tasksCompleted;
    }
    
    this.metrics.workersActive = this.workers.filter(w => w.busy).length;
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const metrics = this.getMetrics();
      
      console.log('📊 Worker Manager Performance:', {
        tasksCompleted: metrics.tasksCompleted,
        tasksErrored: metrics.tasksErrored,
        averageProcessingTime: `${metrics.averageProcessingTime.toFixed(2)}ms`,
        workersActive: metrics.workersActive,
        queueSize: metrics.queueSize,
        workerUtilization: `${((metrics.workersActive / this.maxWorkers) * 100).toFixed(1)}%`
      });
      
      // Reset counters for next interval
      this.metrics.tasksCompleted = 0;
      this.metrics.tasksErrored = 0;
      this.metrics.totalProcessingTime = 0;
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalWorkers: this.workers.length,
      availableWorkers: this.workerPool.length,
      workerUtilization: (this.metrics.workersActive / this.maxWorkers) * 100
    };
  }

  /**
   * Get worker status
   */
  getWorkerStatus() {
    return this.workers.map(worker => ({
      id: worker.id,
      busy: worker.busy,
      tasksProcessed: worker.tasksProcessed,
      errors: worker.errors
    }));
  }

  /**
   * Clear all worker caches
   */
  async clearCaches() {
    const promises = this.workers.map(worker => 
      this.executeTask('CLEAR_CACHE', {}, 0)
    );
    
    try {
      await Promise.all(promises);
      console.log('✅ All worker caches cleared');
    } catch (error) {
      console.error('❌ Failed to clear worker caches:', error);
    }
  }

  /**
   * Destroy worker manager
   */
  destroy() {
    // Clear all active requests
    this.activeRequests.forEach(request => {
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      request.reject(new Error('Worker manager destroyed'));
    });
    
    // Terminate all workers
    this.workers.forEach(worker => {
      worker.terminate();
    });
    
    // Clear data structures
    this.workers = [];
    this.workerPool = [];
    this.taskQueue = [];
    this.activeRequests.clear();
    
    console.log('🧹 Worker manager destroyed');
  }
}

// Singleton instance
export const workerManager = new WorkerManager();
export default WorkerManager;
