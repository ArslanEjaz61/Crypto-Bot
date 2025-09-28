/**
 * Simple Daily Cleanup Utility
 * Automatically clears triggered alerts history at 12:00 AM (midnight)
 */

class DailyCleanup {
  constructor() {
    this.cleanupTimer = null;
    this.dailyInterval = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the daily cleanup timer
   */
  init() {
    if (this.isInitialized) return;
    
    console.log('🕛 Initializing daily cleanup at 12:00 AM');
    this.scheduleNextCleanup();
    this.isInitialized = true;
  }

  /**
   * Calculate time until next midnight (12:00 AM)
   */
  getTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    
    return midnight - now;
  }

  /**
   * Schedule the next cleanup at midnight
   */
  scheduleNextCleanup() {
    // Clear existing timers
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    if (this.dailyInterval) clearInterval(this.dailyInterval);

    const timeUntilMidnight = this.getTimeUntilMidnight();
    const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log(`⏰ Next cleanup in: ${hours}h ${minutes}m`);

    // Set timer for next midnight
    this.cleanupTimer = setTimeout(() => {
      this.performCleanup();
      
      // Set daily recurring interval (24 hours)
      this.dailyInterval = setInterval(() => {
        this.performCleanup();
      }, 24 * 60 * 60 * 1000);
      
    }, timeUntilMidnight);
  }

  /**
   * Perform the cleanup
   */
  performCleanup() {
    try {
      console.log('🧹 Performing daily cleanup at:', new Date().toLocaleString());
      
      // Clear localStorage triggered alerts history
      localStorage.removeItem('triggered_alerts_history');
      
      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('dailyHistoryCleanup', {
        detail: { timestamp: new Date() }
      }));
      
      console.log('✅ Daily cleanup completed');
      
    } catch (error) {
      console.error('❌ Daily cleanup failed:', error);
    }
  }

  /**
   * Get time remaining until next cleanup (for display)
   */
  getTimeRemaining() {
    const timeUntil = this.getTimeUntilMidnight();
    const hours = Math.floor(timeUntil / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntil % (1000 * 60)) / 1000);
    
    return {
      hours,
      minutes,
      seconds,
      formatted: `${hours}h ${minutes}m ${seconds}s`
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    if (this.dailyInterval) clearInterval(this.dailyInterval);
    this.isInitialized = false;
  }
}

// Create singleton instance
const dailyCleanup = new DailyCleanup();

export default dailyCleanup;
