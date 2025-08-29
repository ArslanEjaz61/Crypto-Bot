import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import axios from 'axios';
import { setLocalStorageWithExpiry, getLocalStorageWithExpiry, clearExpiredLocalStorage } from './CryptoUtils';

// Initial state
const initialState = {
  cryptos: [],
  filteredCryptos: [],
  loading: false,
  error: null,
  filter: {
    market: 'all',
    favorites: false,
    minVolume: 0,
    search: '',
    sort: 'symbol',
    order: 'asc',
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true
  },
  lastFetch: null,
  usingCachedData: false
};

// Create Context
const CryptoContext = createContext();

// Define Reducer
const cryptoReducer = (state, action) => {
  switch (action.type) {
    case 'CRYPTO_REQUEST':
      return { ...state, loading: true };
    case 'CRYPTO_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'GET_CRYPTOS':
      return { 
        ...state, 
        cryptos: action.payload.cryptos,
        filteredCryptos: filterCryptos(action.payload.cryptos, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
        usingCachedData: action.payload.usingCachedData || false,
        error: action.payload.usingCachedData ? 'Using cached data. Server connection may be unavailable.' : null
      };
    case 'ADD_CRYPTOS_BATCH':
      const combinedCryptos = [...state.cryptos, ...action.payload.cryptos];
      return {
        ...state,
        cryptos: combinedCryptos,
        filteredCryptos: filterCryptos(combinedCryptos, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
        usingCachedData: action.payload.usingCachedData || state.usingCachedData
      };
    case 'UPDATE_FILTER':
      return { 
        ...state, 
        filter: { ...state.filter, ...action.payload },
        filteredCryptos: filterCryptos(state.cryptos, { ...state.filter, ...action.payload }),
        pagination: {
          ...state.pagination,
          page: 1 // Reset to first page when filter changes
        }
      };
    case 'TOGGLE_FAVORITE':
      const updatedCryptos = state.cryptos.map((crypto) =>
        crypto.symbol === action.payload.symbol 
          ? { ...crypto, isFavorite: action.payload.isFavorite } 
          : crypto
      );
      return {
        ...state,
        cryptos: updatedCryptos,
        filteredCryptos: filterCryptos(updatedCryptos, state.filter)
      };
    default:
      return state;
  }
};

// Helper function to filter cryptos
const filterCryptos = (cryptos, filter) => {
  return cryptos.filter((crypto) => {
    // Filter by market
    if (filter.market !== 'all' && !crypto.symbol.endsWith(filter.market)) {
      return false;
    }
    
    // Filter by favorites
    if (filter.favorites && !crypto.isFavorite) {
      return false;
    }
    
    // Filter by minimum volume
    if (filter.minVolume > 0 && crypto.volume24h < filter.minVolume) {
      return false;
    }
    
    // Filter by search
    if (filter.search && !crypto.symbol.toLowerCase().includes(filter.search.toLowerCase())) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by specified field
    if (a[filter.sort] < b[filter.sort]) return filter.order === 'asc' ? -1 : 1;
    if (a[filter.sort] > b[filter.sort]) return filter.order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Create Provider
export const CryptoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cryptoReducer, initialState);

  // Load all cryptos with pagination, caching, and robust retry mechanism to prevent request cancellations
  // Added silentLoading parameter to prevent showing loading state during background refreshes
  const loadCryptos = useCallback(async (page = 1, limit = 50, forceRefresh = true, silentLoading = false) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds between retries
    const REQUEST_TIMEOUT = 15000; // 15 second timeout, increased from 10s
    
    // Function to delay execution
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    // Cache key for localStorage backup
    const CACHE_KEY = 'crypto_data_cache';
    const now = new Date().getTime();
    
    // Attempt request with retries
    let retries = 0;
    let lastError = null;
    
    // Only dispatch loading state if not in silent mode
    if (!silentLoading) {
      dispatch({ type: 'CRYPTO_REQUEST' });
    }
    console.log('Initiating crypto data fetch with retry mechanism...');
    
    while (retries < MAX_RETRIES) {
      // Create a controller for this attempt
      const controller = new AbortController();
      let timeoutId = null;
      
      try {
        // Set timeout for request
        timeoutId = setTimeout(() => {
          console.log(`Request timeout after ${REQUEST_TIMEOUT}ms, aborting...`);
          controller.abort();
        }, REQUEST_TIMEOUT);
        
        // Use a more robust axios configuration
        const axiosConfig = {
          params: { page, limit },
          signal: controller.signal,
          timeout: REQUEST_TIMEOUT,
          withCredentials: false, // Helps with CORS issues
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        };
        
        console.log(`Attempt ${retries + 1}/${MAX_RETRIES} to fetch crypto data...`);
        
        try {
          // Get baseUrl and construct proper API URL with query parameters for force refresh
          const baseUrl = process.env.REACT_APP_API_URL || '';
          const skipRefreshParam = forceRefresh ? '' : '?skipRefresh=true';
          const endpoint = baseUrl ? `${baseUrl}/api/crypto${skipRefreshParam}` : `/api/crypto${skipRefreshParam}`;
          
          console.log(`Attempting to fetch crypto data from: ${endpoint}`);
          
          const { data } = await axios.get(endpoint, axiosConfig);
          
          // Clear timeout if request succeeded
          if (timeoutId) clearTimeout(timeoutId);
          
          console.log(`Success! Crypto data received: ${data.cryptos ? data.cryptos.length : 0} items`);
          
          // Store successful response in localStorage as backup
          setLocalStorageWithExpiry(CACHE_KEY, {
            data: data,
            timestamp: now
          }, 5 * 60 * 1000); // 5 minute expiry
          
          if (page === 1) {
            // First page - replace existing cryptos
            const cryptosArray = data.cryptos || [];
            const paginationInfo = data.pagination || { total: cryptosArray.length };
            
            dispatch({ 
              type: 'GET_CRYPTOS', 
              payload: {
                cryptos: cryptosArray,
                pagination: {
                  page,
                  limit,
                  total: paginationInfo.total,
                  hasMore: paginationInfo.hasMore || (cryptosArray.length === limit)
                },
                timestamp: now
              }
            });
          } else {
            // Additional pages - append to existing cryptos
            const cryptosArray = data.cryptos || [];
            const paginationInfo = data.pagination || { total: cryptosArray.length };
            
            dispatch({ 
              type: 'ADD_CRYPTOS_BATCH', 
              payload: {
                cryptos: cryptosArray,
                pagination: {
                  page,
                  limit,
                  total: paginationInfo.total,
                  hasMore: paginationInfo.hasMore || (cryptosArray.length === limit)
                },
                timestamp: now
              }
            });
          }
          
          // Return total count and whether there are more pages
          const cryptosArray = data.cryptos || [];
          const paginationInfo = data.pagination || { total: cryptosArray.length };
          
          return {
            total: paginationInfo.total,
            hasMore: paginationInfo.hasMore || (cryptosArray.length === limit)
          };
        } catch (requestError) {
          if (timeoutId) clearTimeout(timeoutId);
          throw requestError;
        }
      } catch (error) {
        // Clear timeout to prevent double rejection
        if (timeoutId) clearTimeout(timeoutId);
        
        console.error(`Error fetching crypto data:`, error);
        console.log('Error details:', { 
          message: error.message, 
          code: error.code,
          isAxiosError: error.isAxiosError || false,
          response: error.response ? `Status: ${error.response.status}` : 'No response'
        });
        
        // Increment retries
        retries++;
        
        // Store the last error
        lastError = error;
        
        // If we've exhausted retries, check for cached data before giving up
        if (retries >= MAX_RETRIES) {
          console.log(`All ${MAX_RETRIES} attempts failed, checking for cached data...`);
          
          const cachedData = getLocalStorageWithExpiry(CACHE_KEY);
          
          if (cachedData) {
            console.log(`Found cached data from ${new Date(cachedData.timestamp).toLocaleTimeString()}, using as fallback`);
            
            // Use cached data as fallback
            const cryptosArray = cachedData.data.cryptos || [];
            const paginationInfo = cachedData.data.pagination || { total: cryptosArray.length };
            
            if (silentLoading) {
              // Silent loading - don't show loading state
              dispatch({ 
                type: 'GET_CRYPTOS',
                payload: {
                  cryptos: cryptosArray,
                  pagination: {
                    page: paginationInfo.page || 1,
                    limit: paginationInfo.limit || cryptosArray.length,
                    total: paginationInfo.total || cryptosArray.length,
                    hasMore: false
                  },
                  timestamp: cachedData.timestamp
                }
              });
            }
            
            return {
              cryptos: cryptosArray,
              pagination: paginationInfo,
              fromCache: true
            };
          }
          
          // If no cached data, return empty array and show error
          if (!silentLoading) {
            console.log('No cached data available. Showing empty state...');
            
            // Dispatch empty array with error flag
            dispatch({ 
              type: 'GET_CRYPTOS',
              payload: {
                cryptos: [],
                pagination: { page: 1, limit: 0, total: 0, hasMore: false },
                timestamp: Date.now(),
                error: 'No data available. Server connection may be down.'
              }
            });
            
            return {
              cryptos: [],
              pagination: { page: 1, limit: 0, total: 0 },
              error: true
            };
          }
        } else if (retries < MAX_RETRIES) {
          console.log(`Retrying in ${RETRY_DELAY}ms...`);
          await delay(RETRY_DELAY);
        } else {
          // All retries failed and no cached data
          console.error('All retry attempts failed. No cached data available. Last error:', lastError);
          
          // Set error state if not silent loading
          if (!silentLoading) {
            dispatch({ 
              type: 'CRYPTOS_ERROR', 
              payload: lastError ? `Server error: ${lastError.message}` : 'Failed to load cryptocurrency data' 
            });
          }
          
          throw lastError || new Error('Failed to load cryptocurrency data');
        }
      }
    }
    
    // Format detailed error message for user
    let errorMessage = 'Failed to load crypto data after multiple attempts';
    
    if (lastError) {
      if (lastError.name === 'AbortError') {
        errorMessage = 'API requests timed out repeatedly. The server might be down or experiencing high load.';
      } else if (lastError.code === 'ECONNABORTED') {
        errorMessage = 'Connection repeatedly aborted. Please check your internet connection.';
      } else if (lastError.response) {
        // Server responded with error status
        errorMessage = `Server error (${lastError.response.status}): ${lastError.response.data?.message || 'Unknown error'}`;
      } else if (lastError.request) {
        // Request made but no response received
        errorMessage = 'No response from server. Please check if the server is running.';
      } else if (lastError.message && lastError.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and ensure the server is running.';
      }
    }
    
    dispatch({
      type: 'CRYPTO_FAIL',
      payload: errorMessage,
    });
    
    return { total: 0, hasMore: false };
  }, [dispatch]);


  // Update filter
  const updateFilter = useCallback((filterUpdate) => {
    dispatch({ type: 'UPDATE_FILTER', payload: filterUpdate });
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (symbol) => {
    try {
      const crypto = state.cryptos.find((c) => c.symbol === symbol);
      if (!crypto) {
        console.error(`Could not find crypto with symbol ${symbol}`);
        return;
      }
      const newStatus = !crypto.isFavorite;
      
      console.log(`Toggling favorite status for ${symbol} to ${newStatus}`);
      
      // Use baseUrl to ensure we have the correct API endpoint
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = baseUrl ? `${baseUrl}/api/crypto/${symbol}/favorite` : `/api/crypto/${symbol}/favorite`;
      
      await axios.put(endpoint, { isFavorite: newStatus });
      
      // Immediately update the UI state without waiting for a full data refresh
      dispatch({ 
        type: 'TOGGLE_FAVORITE', 
        payload: { symbol, isFavorite: newStatus } 
      });
    } catch (error) {
      console.error(`Error toggling favorite for ${symbol}:`, error);
      let errorMessage = 'Failed to update favorite status';
      
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response received from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred';
      }
      
      dispatch({
        type: 'CRYPTO_FAIL',
        payload: errorMessage,
      });
    }
  }, [state.cryptos, dispatch]);

  // Cache for RSI data to prevent redundant API calls
  const rsiCache = React.useRef({});
  
  // Get RSI data for a symbol with support for multiple timeframes
  const getRSI = useCallback(async (symbol, period = 14, timeframe = '1h') => {
    // Create a cache key using symbol, period and timeframe
    const cacheKey = `${symbol}_${period}_${timeframe}`;
    
    // Check if we have cached data that's less than 5 minutes old
    if (rsiCache.current[cacheKey]) {
      const cachedData = rsiCache.current[cacheKey];
      const now = new Date().getTime();
      const cacheTime = cachedData.timestamp;
      
      // Cache valid for 5 minutes
      if (now - cacheTime < 5 * 60 * 1000) {
        console.log(`Using cached RSI data for ${symbol} (${timeframe})`);
        return cachedData.data;
      }
    }
    
    // If not in cache or cache expired, fetch from API
    try {
      console.log(`Fetching RSI data for ${symbol} (${timeframe})`);
      // Use baseUrl to ensure we have the correct API endpoint
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = baseUrl ? `${baseUrl}/api/crypto/${symbol}/rsi` : `/api/crypto/${symbol}/rsi`;
      
      const { data } = await axios.get(endpoint, {
        params: { period, timeframe }
      });
      
      // Store in cache with timestamp
      rsiCache.current[cacheKey] = {
        data,
        timestamp: new Date().getTime()
      };
      
      return data;
    } catch (error) {
      console.error(`Failed to fetch RSI for ${symbol} (${timeframe}):`, error);
      throw error;
    }
  }, []);
  
  // Clear RSI cache when it gets too large
  const clearRSICache = useCallback(() => {
    rsiCache.current = {};
  }, []);

  // Check alert conditions for a symbol with direct API call
  const checkAlertConditions = useCallback(async (symbol, filters) => {
    try {
      console.log(`Making direct API call to check conditions for ${symbol}`);
      // Use baseUrl to ensure we have the correct API endpoint
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = baseUrl ? `${baseUrl}/api/crypto/${symbol}/check-conditions` : `/api/crypto/${symbol}/check-conditions`;
      
      const { data } = await axios.post(endpoint, { 
        filters, 
        forceRefresh: true // Always force fresh data when checking conditions
      });
      console.log(`Received condition check results for ${symbol}:`, data);
      return data;
    } catch (error) {
      console.error(`Error checking conditions for ${symbol}:`, error);
      return { meetsConditions: false, conditions: {} };
    }
  }, []);

  return (
    <CryptoContext.Provider
      value={{
        ...state,
        loadCryptos,
        updateFilter,
        toggleFavorite,
        getRSI,
        clearRSICache,
        checkAlertConditions
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
};

// Custom hook
export const useCrypto = () => useContext(CryptoContext);

// Auto-refresh data with improved reliability
export const AutoRefreshProvider = ({ children }) => {
  const { loadCryptos } = useCrypto();
  const refreshInProgress = React.useRef(false);
  const refreshAttempts = React.useRef(0);
  const maxConsecutiveFailures = 3;
  const backoffMultiplier = 1.5;
  const initialRefreshInterval = 60000; // Start with 1 minute
  const [refreshInterval, setRefreshInterval] = React.useState(initialRefreshInterval);
  
  // Function to handle refresh with error tracking
  const handleRefresh = React.useCallback(async () => {
    // Skip if a refresh is already in progress to avoid overlapping requests
    if (refreshInProgress.current) {
      console.log('Skipping refresh as another refresh is already in progress');
      return;
    }
    
    refreshInProgress.current = true;
    console.log(`Auto-refresh: Fetching latest crypto data (interval: ${refreshInterval}ms)`);
    
    try {
      await loadCryptos(1, 50, true, true); // Use silent loading for background refreshes
      // Reset on success
      refreshAttempts.current = 0;
      setRefreshInterval(initialRefreshInterval);
      console.log('Auto-refresh completed successfully');
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      refreshAttempts.current++;
      
      // If we've had multiple consecutive failures, increase the interval
      if (refreshAttempts.current >= maxConsecutiveFailures) {
        const newInterval = Math.min(refreshInterval * backoffMultiplier, 300000); // Max 5 minutes
        console.log(`Backing off refresh interval to ${newInterval}ms due to consecutive failures`);
        setRefreshInterval(newInterval);
      }
    } finally {
      refreshInProgress.current = false;
    }
  }, [loadCryptos, refreshInterval, initialRefreshInterval]);
  
  useEffect(() => {
    console.log(`Setting up auto-refresh at interval: ${refreshInterval}ms`);
    
    // Initial load
    handleRefresh().catch(err => {
      console.error('Error during initial auto-refresh load:', err);
    });
    
    // Set up timer for regular refreshes
    const timer = setInterval(() => {
      console.log('Auto-refresh timer triggered');
      handleRefresh().catch(err => {
        console.error('Error during scheduled auto-refresh:', err);
      });
    }, refreshInterval);
    
    // Clean up the timer when unmounting
    return () => {
      console.log('Cleaning up auto-refresh timer');
      clearInterval(timer);
    };
  }, [handleRefresh, refreshInterval]);
  
  return <>{children}</>;
};
