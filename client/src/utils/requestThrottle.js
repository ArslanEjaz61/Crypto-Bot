import { useCallback, useRef } from 'react';

// Debounce hook for API calls
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  
  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Throttle hook for frequent API calls
export const useThrottle = (callback, limit) => {
  const inThrottle = useRef(false);
  
  return useCallback((...args) => {
    if (!inThrottle.current) {
      callback(...args);
      inThrottle.current = true;
      setTimeout(() => {
        inThrottle.current = false;
      }, limit);
    }
  }, [callback, limit]);
};

// Request queue manager to prevent overwhelming the server
class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.running = [];
    this.maxConcurrent = maxConcurrent;
  }

  async add(requestFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFunction, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running.length >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { requestFunction, resolve, reject } = this.queue.shift();
    const request = { requestFunction, resolve, reject };
    this.running.push(request);

    try {
      const result = await requestFunction();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running = this.running.filter(r => r !== request);
      this.process(); // Process next item in queue
    }
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue(2); // Limit to 2 concurrent requests

// Hook to use the request queue
export const useRequestQueue = () => {
  return useCallback((requestFunction) => {
    return requestQueue.add(requestFunction);
  }, []);
};
