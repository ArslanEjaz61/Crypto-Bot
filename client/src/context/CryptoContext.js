import React, { createContext, useContext, useReducer, useCallback } from 'react';
import axios from 'axios';

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
  lastFetch: null
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
        loading: false 
      };
    case 'ADD_CRYPTOS_BATCH':
      const combinedCryptos = [...state.cryptos, ...action.payload.cryptos];
      return {
        ...state,
        cryptos: combinedCryptos,
        filteredCryptos: filterCryptos(combinedCryptos, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false
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

  // Load all cryptos with pagination and caching to prevent redundant API requests
  const loadCryptos = useCallback(async (page = 1, limit = 50, forceRefresh = false) => {
    try {
      // Check if we've recently fetched this page and have it cached
      const now = new Date().getTime();
      const shouldUseCachedData = !forceRefresh && 
                                state.lastFetch && 
                                (now - state.lastFetch < 3 * 60 * 1000) && // 3 minute cache
                                page === state.pagination.page &&
                                state.cryptos.length > 0;
      
      if (shouldUseCachedData) {
        console.log('Using cached crypto data');
        return {
          total: state.pagination.total,
          hasMore: state.pagination.hasMore
        };
      }
      
      dispatch({ type: 'CRYPTO_REQUEST' });
      
      // Use pagination parameters to limit the number of cryptos loaded at once
      const { data } = await axios.get('/api/crypto', {
        params: { page, limit }
      });
      
      if (page === 1) {
        // First page - replace existing cryptos
        dispatch({ 
          type: 'GET_CRYPTOS', 
          payload: {
            cryptos: data,
            pagination: {
              page,
              limit,
              total: data.total || data.length,
              hasMore: data.hasMore || (data.length === limit)
            },
            timestamp: now
          }
        });
      } else {
        // Additional pages - append to existing cryptos
        dispatch({ 
          type: 'ADD_CRYPTOS_BATCH', 
          payload: {
            cryptos: data,
            pagination: {
              page,
              limit,
              total: data.total || data.length,
              hasMore: data.hasMore || (data.length === limit)
            },
            timestamp: now
          }
        });
      }
      
      // Return total count and whether there are more pages
      return {
        total: data.total || data.length,
        hasMore: data.hasMore || (data.length === limit)
      };
    } catch (error) {
      dispatch({
        type: 'CRYPTO_FAIL',
        payload: error.response?.data?.message || 'Failed to load crypto data',
      });
      return { total: 0, hasMore: false };
    }
  }, [state.cryptos.length, state.lastFetch, state.pagination.hasMore, state.pagination.page, state.pagination.total]);

  // Update filter
  const updateFilter = useCallback((filterUpdate) => {
    dispatch({ type: 'UPDATE_FILTER', payload: filterUpdate });
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (symbol) => {
    try {
      const crypto = state.cryptos.find((c) => c.symbol === symbol);
      const newStatus = !crypto.isFavorite;
      
      await axios.put(`/api/crypto/${symbol}/favorite`);
      
      dispatch({ 
        type: 'TOGGLE_FAVORITE', 
        payload: { symbol, isFavorite: newStatus } 
      });
    } catch (error) {
      dispatch({
        type: 'CRYPTO_FAIL',
        payload: error.response?.data?.message || 'Failed to update favorite status',
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
      const { data } = await axios.get(`/api/crypto/${symbol}/rsi`, {
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

  return (
    <CryptoContext.Provider
      value={{
        ...state,
        loadCryptos,
        updateFilter,
        toggleFavorite,
        getRSI,
        clearRSICache
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
};

// Custom hook
export const useCrypto = () => useContext(CryptoContext);
