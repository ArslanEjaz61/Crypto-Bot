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

  // Ultra-simple request handling - NO cancellation, NO deduplication, NO retries
  const loadCryptos = useCallback(async (page = 1, limit = 50, forceRefresh = true, silentLoading = false) => {
    // Only dispatch loading state if not in silent mode
    if (!silentLoading) {
      dispatch({ type: 'CRYPTO_REQUEST' });
    }
    
    console.log('Making simple API request...');
    
    try {
      // Get baseUrl and construct proper API URL
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = `${baseUrl}/api/crypto`;
      
      console.log(`Fetching from: ${endpoint}`);
      
      // Minimal axios configuration - NO timeout, NO abort signal, NO headers
      const { data } = await axios.get(endpoint, {
        params: { page, limit }
      });
      
      console.log(`Success! Received ${data.cryptos ? data.cryptos.length : 0} items`);
      
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
          timestamp: Date.now()
        }
      });
      
      return {
        total: paginationInfo.total,
        hasMore: paginationInfo.hasMore || (cryptosArray.length === limit)
      };
    } catch (error) {
      console.error('API request failed:', error);
      
      dispatch({ 
        type: 'CRYPTO_FAIL', 
        payload: `Failed to load data: ${error.message}`
      });
      
      return { total: 0, hasMore: false, error: true };
    }
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

  // Auto-refresh data with simplified, reliable handling
export const AutoRefreshProvider = ({ children }) => {
  const { loadCryptos } = useCrypto();
  const refreshInProgress = React.useRef(false);
  const refreshInterval = 90000; // 1.5 minutes - less aggressive
  
  // Function to handle refresh
  const handleRefresh = React.useCallback(async () => {
    // Skip if a refresh is already in progress to avoid overlapping requests
    if (refreshInProgress.current) {
      console.log('Skipping refresh as another refresh is already in progress');
      return;
    }
    
    refreshInProgress.current = true;
    console.log('Auto-refresh: Fetching latest crypto data');
    
    try {
      await loadCryptos(1, 50, true, true); // Use silent loading for background refreshes
      console.log('Auto-refresh completed successfully');
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      // Continue silently - don't break the UI
    } finally {
      refreshInProgress.current = false;
    }
  }, [loadCryptos]);
  
  useEffect(() => {
    console.log('Setting up auto-refresh');
    
    // Initial load
    handleRefresh().catch(err => {
      console.error('Error during initial auto-refresh load:', err);
    });
    
    // Set up timer for regular refreshes
    const timer = setInterval(() => {
      handleRefresh().catch(err => {
        console.error('Error during scheduled auto-refresh:', err);
      });
    }, refreshInterval);
    
    // Clean up the timer when unmounting
    return () => {
      console.log('Cleaning up auto-refresh timer');
      clearInterval(timer);
    };
  }, [handleRefresh]);
  
  return <>{children}</>;
};
