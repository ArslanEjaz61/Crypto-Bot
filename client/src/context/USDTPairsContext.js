import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import { apiCache, getCacheKey } from '../utils/apiCache';

// Initial state for USDT pairs only
const initialState = {
  usdtPairs: [],
  filteredUsdtPairs: [],
  loading: false,
  error: null,
  filter: {
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
const USDTPairsContext = createContext();

// Define Reducer
const usdtPairsReducer = (state, action) => {
  switch (action.type) {
    case 'USDT_REQUEST':
      return { ...state, loading: true };
    case 'USDT_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'GET_USDT_PAIRS':
      return { 
        ...state, 
        usdtPairs: action.payload.pairs,
        filteredUsdtPairs: filterUsdtPairs(action.payload.pairs, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
        usingCachedData: action.payload.usingCachedData || false,
        error: action.payload.usingCachedData ? 'Using cached data. Server connection may be unavailable.' : null
      };
    case 'ADD_USDT_PAIRS_BATCH':
      const combinedPairs = [...state.usdtPairs, ...action.payload.pairs];
      return {
        ...state,
        usdtPairs: combinedPairs,
        filteredUsdtPairs: filterUsdtPairs(combinedPairs, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
        usingCachedData: action.payload.usingCachedData || false
      };
    case 'UPDATE_USDT_FILTER':
      return { 
        ...state, 
        filter: { ...state.filter, ...action.payload },
        filteredUsdtPairs: filterUsdtPairs(state.usdtPairs, { ...state.filter, ...action.payload }),
        pagination: {
          ...state.pagination,
          page: 1 // Reset to first page when filter changes
        }
      };
    case 'TOGGLE_USDT_FAVORITE':
      const updatedPairs = state.usdtPairs.map(pair =>
        pair.symbol === action.payload.symbol
          ? { ...pair, isFavorite: action.payload.isFavorite }
          : pair
      );
      return {
        ...state,
        usdtPairs: updatedPairs,
        filteredUsdtPairs: filterUsdtPairs(updatedPairs, state.filter)
      };
    case 'UPDATE_USDT_PAIR_DATA':
      const updatedPairsData = state.usdtPairs.map(pair =>
        pair.symbol === action.payload.symbol
          ? { ...pair, ...action.payload.data }
          : pair
      );
      return {
        ...state,
        usdtPairs: updatedPairsData,
        filteredUsdtPairs: filterUsdtPairs(updatedPairsData, state.filter)
      };
    default:
      return state;
  }
};

// Helper function to filter USDT pairs specifically
const filterUsdtPairs = (pairs, filter) => {
  console.log('Filtering USDT pairs with filter:', filter);
  
  return pairs.filter((pair) => {
    // Ensure it's a USDT pair
    if (!pair.symbol.includes('USDT')) {
      return false;
    }
    
    // Filter by favorites
    if (filter.favorites && !pair.isFavorite) {
      return false;
    }
    
    // Filter by minimum volume
    if (filter.minVolume > 0 && pair.volume24h < filter.minVolume) {
      return false;
    }
    
    // Filter by search
    if (filter.search && !pair.symbol.toLowerCase().includes(filter.search.toLowerCase())) {
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
export const USDTPairsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(usdtPairsReducer, initialState);

  // Load USDT pairs from API
  const loadUsdtPairs = useCallback(async (page = 1, limit = 50, forceRefresh = false) => {
    const cacheKey = getCacheKey('usdt-pairs', { page, limit });
    
    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        console.log('Using cached USDT pairs data');
        dispatch({
          type: 'GET_USDT_PAIRS',
          payload: {
            pairs: cachedData.pairs,
            pagination: cachedData.pagination,
            timestamp: cachedData.timestamp,
            usingCachedData: true
          }
        });
        return cachedData.pagination;
      }
    }

    dispatch({ type: 'USDT_REQUEST' });

    try {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = baseUrl ? `${baseUrl}/api/crypto` : `/api/crypto`;
      
      console.log(`Fetching USDT pairs from: ${endpoint}`);
      
      const { data } = await axios.get(endpoint, {
        params: { page, limit }
      });
      
      // Filter only USDT pairs from the response
      const usdtPairs = data.cryptos.filter(crypto => crypto.symbol.includes('USDT'));
      
      const responseData = {
        pairs: usdtPairs,
        pagination: {
          ...data.pagination,
          total: usdtPairs.length
        },
        timestamp: Date.now()
      };
      
      // Cache for 2 minutes
      apiCache.set(cacheKey, responseData, 2 * 60 * 1000);
      
      dispatch({
        type: page === 1 ? 'GET_USDT_PAIRS' : 'ADD_USDT_PAIRS_BATCH',
        payload: responseData
      });
      
      console.log(`Loaded ${usdtPairs.length} USDT pairs`);
      
      return {
        total: usdtPairs.length,
        hasMore: usdtPairs.length === limit,
        error: false
      };
    } catch (error) {
      console.error('Error loading USDT pairs:', error);
      dispatch({ type: 'USDT_FAIL', payload: error.message });
      
      return { total: 0, hasMore: false, error: true };
    }
  }, [dispatch]);

  // Update filter for USDT pairs
  const updateUsdtFilter = useCallback((filterUpdate) => {
    dispatch({ type: 'UPDATE_USDT_FILTER', payload: filterUpdate });
  }, []);

  // Toggle favorite status for USDT pair
  const toggleUsdtFavorite = useCallback(async (symbol) => {
    try {
      const pair = state.usdtPairs.find((p) => p.symbol === symbol);
      if (!pair) {
        console.error(`Could not find USDT pair with symbol ${symbol}`);
        return;
      }
      const newStatus = !pair.isFavorite;
      
      console.log(`Toggling favorite status for USDT pair ${symbol} to ${newStatus}`);
      
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const endpoint = baseUrl ? `${baseUrl}/api/crypto/${symbol}/favorite` : `/api/crypto/${symbol}/favorite`;
      
      await axios.put(endpoint, { isFavorite: newStatus });
      
      dispatch({
        type: 'TOGGLE_USDT_FAVORITE',
        payload: { symbol, isFavorite: newStatus }
      });
      
      console.log(`Successfully updated favorite status for ${symbol}`);
    } catch (error) {
      console.error(`Error toggling favorite for ${symbol}:`, error);
    }
  }, [state.usdtPairs]);

  // Update specific USDT pair data
  const updateUsdtPairData = useCallback((symbol, data) => {
    dispatch({
      type: 'UPDATE_USDT_PAIR_DATA',
      payload: { symbol, data }
    });
  }, []);

  // Get USDT pair by symbol
  const getUsdtPair = useCallback((symbol) => {
    return state.usdtPairs.find(pair => pair.symbol === symbol);
  }, [state.usdtPairs]);

  // Get USDT pairs by search term
  const searchUsdtPairs = useCallback((searchTerm) => {
    if (!searchTerm) return state.filteredUsdtPairs;
    
    return state.filteredUsdtPairs.filter(pair =>
      pair.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.filteredUsdtPairs]);

  // Clear cache
  const clearUsdtCache = useCallback(() => {
    apiCache.clear();
  }, []);

  // Memoized values for better performance
  const memoizedUsdtPairs = useMemo(() => state.usdtPairs, [state.usdtPairs]);
  const memoizedFilteredUsdtPairs = useMemo(() => state.filteredUsdtPairs, [state.filteredUsdtPairs]);
  const memoizedLoading = useMemo(() => state.loading, [state.loading]);
  const memoizedError = useMemo(() => state.error, [state.error]);

  return (
    <USDTPairsContext.Provider
      value={useMemo(() => ({
        usdtPairs: memoizedUsdtPairs,
        filteredUsdtPairs: memoizedFilteredUsdtPairs,
        loading: memoizedLoading,
        error: memoizedError,
        filter: state.filter,
        pagination: state.pagination,
        lastFetch: state.lastFetch,
        usingCachedData: state.usingCachedData,
        loadUsdtPairs,
        updateUsdtFilter,
        toggleUsdtFavorite,
        updateUsdtPairData,
        getUsdtPair,
        searchUsdtPairs,
        clearUsdtCache
      }), [
        memoizedUsdtPairs, 
        memoizedFilteredUsdtPairs, 
        memoizedLoading, 
        memoizedError, 
        state.filter, 
        state.pagination, 
        state.lastFetch, 
        state.usingCachedData,
        loadUsdtPairs,
        updateUsdtFilter,
        toggleUsdtFavorite,
        updateUsdtPairData,
        getUsdtPair,
        searchUsdtPairs,
        clearUsdtCache
      ])}
    >
      {children}
    </USDTPairsContext.Provider>
  );
};

// Custom hook
export const useUsdtPairs = () => useContext(USDTPairsContext);

// Auto-refresh provider for USDT pairs
export const USDTAutoRefreshProvider = ({ children }) => {
  const { loadUsdtPairs } = useUsdtPairs();
  const refreshInProgress = React.useRef(false);
  const refreshInterval = 120000; // 2 minutes for USDT pairs
  
  const handleRefresh = React.useCallback(async () => {
    if (refreshInProgress.current) {
      console.log('USDT pairs refresh already in progress, skipping...');
      return;
    }
    
    refreshInProgress.current = true;
    
    try {
      console.log('Auto-refreshing USDT pairs...');
      await loadUsdtPairs(1, 50, false); // Don't force refresh, use cache if available
      console.log('USDT pairs auto-refresh completed');
    } catch (error) {
      console.error('Error during USDT pairs auto-refresh:', error);
    } finally {
      refreshInProgress.current = false;
    }
  }, [loadUsdtPairs]);
  
  React.useEffect(() => {
    // Initial load
    handleRefresh();
    
    // Set up interval
    const interval = setInterval(handleRefresh, refreshInterval);
    
    return () => {
      clearInterval(interval);
      refreshInProgress.current = false;
    };
  }, [handleRefresh, refreshInterval]);
  
  return <>{children}</>;
};
