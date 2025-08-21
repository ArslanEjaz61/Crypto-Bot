// Utility functions for CryptoContext

/**
 * Store data in localStorage with expiration time
 * @param {string} key - The storage key
 * @param {any} value - The data to store
 * @param {number} ttl - Time to live in milliseconds
 */
export const setLocalStorageWithExpiry = (key, value, ttl) => {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * Get data from localStorage with expiry check
 * @param {string} key - The storage key
 * @returns {any|null} - The stored value or null if expired/not found
 */
export const getLocalStorageWithExpiry = (key) => {
  try {
    const itemStr = localStorage.getItem(key);
    
    // If item doesn't exist, return null
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    const now = new Date();
    
    // Compare the expiry time of the item with the current time
    if (now.getTime() > item.expiry) {
      // If the item is expired, delete it and return null
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

/**
 * Clear expired items from localStorage
 */
export const clearExpiredLocalStorage = () => {
  try {
    const now = new Date().getTime();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('crypto_cache_')) {
        const itemStr = localStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          if (now > item.expiry) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning localStorage:', error);
  }
};
