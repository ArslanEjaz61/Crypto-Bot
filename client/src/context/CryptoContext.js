import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { apiCache, getCacheKey } from "../utils/apiCache";

// Initial state
const initialState = {
  cryptos: [],
  filteredCryptos: [],
  loading: false,
  error: null,
  filter: {
    market: "all",
    favorites: false,
    minVolume: 0,
    search: "",
    sort: "symbol",
    order: "asc",
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true,
  },
  lastFetch: null,
  usingCachedData: false,
};

// Create Context
const CryptoContext = createContext();

// Define Reducer
const cryptoReducer = (state, action) => {
  switch (action.type) {
    case "CRYPTO_REQUEST":
      return { ...state, loading: true };
    case "CRYPTO_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "GET_CRYPTOS":
      return {
        ...state,
        cryptos: action.payload.cryptos,
        filteredCryptos: filterCryptos(action.payload.cryptos, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
        usingCachedData: action.payload.usingCachedData || false,
        error: action.payload.usingCachedData
          ? "Using cached data. Server connection may be unavailable."
          : null,
      };
    case "ADD_CRYPTOS_BATCH":
      const combinedCryptos = [...state.cryptos, ...action.payload.cryptos];
      return {
        ...state,
        cryptos: combinedCryptos,
        filteredCryptos: filterCryptos(combinedCryptos, state.filter),
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
        usingCachedData:
          action.payload.usingCachedData || state.usingCachedData,
      };
    case "UPDATE_FILTER":
      return {
        ...state,
        filter: { ...state.filter, ...action.payload },
        filteredCryptos: filterCryptos(state.cryptos, {
          ...state.filter,
          ...action.payload,
        }),
        pagination: {
          ...state.pagination,
          page: 1, // Reset to first page when filter changes
        },
      };
    case "TOGGLE_FAVORITE":
      const updatedCryptos = state.cryptos.map((crypto) =>
        crypto.symbol === action.payload.symbol
          ? { ...crypto, isFavorite: action.payload.isFavorite }
          : crypto
      );
      return {
        ...state,
        cryptos: updatedCryptos,
        filteredCryptos: filterCryptos(updatedCryptos, state.filter),
      };
    default:
      return state;
  }
};

// Helper function to filter cryptos
const filterCryptos = (cryptos, filter) => {
  console.log("Filtering cryptos with filter:", filter);

  return cryptos
    .filter((crypto) => {
      // Filter by favorites
      if (filter.favorites && !crypto.isFavorite) {
        return false;
      }

      // Filter by minimum volume
      if (filter.minVolume > 0 && crypto.volume24h < filter.minVolume) {
        return false;
      }

      // Filter by search
      if (
        filter.search &&
        !crypto.symbol.toLowerCase().includes(filter.search.toLowerCase())
      ) {
        return false;
      }

      // PRIORITY 1: Filter by trading pair (USDT, USDC, USD, etc.) - This takes precedence
      if (filter.pair && Object.values(filter.pair).some(Boolean)) {
        let pairMatches = false;

        // console.log(`Checking pair filter for ${crypto.symbol}:`, filter.pair);

        // Check if USDT filter is enabled - PROPER BINANCE API FILTERING
        if (filter.pair.USDT === true) {
          // Use Binance API logic: check quoteAsset is USDT
          const isUsdtPair =
            crypto.quoteAsset === "USDT" ||
            (crypto.symbol && crypto.symbol.endsWith("USDT"));

          if (isUsdtPair) {
            pairMatches = true;
            console.log(
              `${crypto.symbol} matches USDT filter (quoteAsset: ${crypto.quoteAsset})`
            );
          } else {
            console.log(
              `${crypto.symbol} excluded - not USDT pair (quoteAsset: ${crypto.quoteAsset})`
            );
          }
        }

        // Check if USDC filter is enabled
        if (filter.pair.USDC === true) {
          if (crypto.symbol.endsWith("USDC")) {
            pairMatches = true;
            // console.log(`${crypto.symbol} matches USDC filter`);
          }
        }

        // Check if USD filter is enabled (but not USDT or USDC)
        if (filter.pair.USD === true) {
          if (
            crypto.symbol.endsWith("USD") &&
            !crypto.symbol.endsWith("USDT") &&
            !crypto.symbol.endsWith("USDC")
          ) {
            pairMatches = true;
            // console.log(`${crypto.symbol} matches USD filter`);
          }
        }

        // If any pair filter is active but symbol doesn't match, exclude it
        if (!pairMatches) {
          // console.log(`${crypto.symbol} excluded by pair filter`);
          return false;
        }
      }

      // PRIORITY 2: Filter by market type (SPOT, FUTURES, etc.) - Only if no pair filter is active
      if (filter.market && Object.values(filter.market).some(Boolean)) {
        let marketMatches = false;

        // Check if SPOT filter is enabled
        if (filter.market.SPOT === true) {
          // Use Binance API logic: check permissions or isSpotTradingAllowed
          const isSpotAllowed =
            crypto.isSpotTradingAllowed === true ||
            (crypto.permissions && crypto.permissions.includes("SPOT")) ||
            (crypto.permissionSets &&
              crypto.permissionSets.some((set) => set.includes("SPOT"))) ||
            // Fallback: if no specific futures indicators
            (!crypto.symbol.includes("PERP") &&
              !crypto.symbol.includes("FUTURES"));

          if (isSpotAllowed) {
            marketMatches = true;
            console.log(
              `${crypto.symbol} matches SPOT filter (isSpotTradingAllowed: ${crypto.isSpotTradingAllowed})`
            );
          } else {
            console.log(`${crypto.symbol} excluded - not spot trading allowed`);
          }
        }

        // Check if FUTURES filter is enabled
        if (filter.market.FUTURES === true) {
          if (
            crypto.symbol.includes("PERP") ||
            crypto.symbol.includes("FUTURES")
          ) {
            marketMatches = true;
            // console.log(`${crypto.symbol} matches FUTURES filter`);
          }
        }

        // If any market filter is active but symbol doesn't match, exclude it
        if (!marketMatches) {
          // console.log(`${crypto.symbol} excluded by market filter`);
          return false;
        }
      }

      // FALLBACK: Old market filter for backward compatibility (only if no new filters active)
      if (
        !filter.pair &&
        !filter.market &&
        filter.market !== "all" &&
        typeof filter.market === "string"
      ) {
        if (!crypto.symbol.endsWith(filter.market)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by specified field
      if (a[filter.sort] < b[filter.sort])
        return filter.order === "asc" ? -1 : 1;
      if (a[filter.sort] > b[filter.sort])
        return filter.order === "asc" ? 1 : -1;
      return 0;
    });
};

// Create Provider
export const CryptoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cryptoReducer, initialState);

  // Optimized request handling with caching
  const loadCryptos = useCallback(
    async (
      page = 1,
      limit = 50,
      forceRefresh = false,
      silentLoading = false,
      spotOnly = true,
      usdtOnly = true
    ) => {
      // Only dispatch loading state if not in silent mode
      if (!silentLoading) {
        dispatch({ type: "CRYPTO_REQUEST" });
      }

      // Check cache first unless forced refresh
      const cacheKey = getCacheKey.cryptos(page, limit, spotOnly, usdtOnly);
      if (!forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          console.log("Using cached crypto data");
          dispatch({
            type: "GET_CRYPTOS",
            payload: {
              ...cachedData,
              timestamp: Date.now(),
            },
          });
          return cachedData.pagination;
        }
      }

      console.log("Making API request for fresh data...");

      try {
        // Get baseUrl and construct proper API URL
        const baseUrl = process.env.REACT_APP_API_URL || "";
        const endpoint = `${baseUrl}/api/crypto`;

        console.log(
          `Fetching from: ${endpoint} with spotOnly=${spotOnly}, usdtOnly=${usdtOnly}`
        );

        // Minimal axios configuration
        const { data } = await axios.get(endpoint, {
          params: { page, limit, spotOnly, usdtOnly },
        });

        console.log(
          `Success! Received ${data.cryptos ? data.cryptos.length : 0} items`
        );

        const cryptosArray = data.cryptos || [];
        const paginationInfo = data.pagination || {
          total: cryptosArray.length,
        };

        const payload = {
          cryptos: cryptosArray,
          pagination: {
            page,
            limit,
            total: paginationInfo.total,
            hasMore: paginationInfo.hasMore || cryptosArray.length === limit,
          },
          timestamp: Date.now(),
        };

        // Cache the result for 2 minutes
        apiCache.set(cacheKey, payload, 2 * 60 * 1000);

        // Use ADD_CRYPTOS_BATCH for pagination (page > 1) to append to existing list
        // Use GET_CRYPTOS for initial load (page 1) to replace the list
        dispatch({
          type: page > 1 ? "ADD_CRYPTOS_BATCH" : "GET_CRYPTOS",
          payload,
        });

        return {
          total: paginationInfo.total,
          hasMore: paginationInfo.hasMore || cryptosArray.length === limit,
        };
      } catch (error) {
        console.error("API request failed:", error);

        dispatch({
          type: "CRYPTO_FAIL",
          payload: `Failed to load data: ${error.message}`,
        });

        return { total: 0, hasMore: false, error: true };
      }
    },
    [dispatch]
  );

  // Update filter
  const updateFilter = useCallback((filterUpdate) => {
    dispatch({ type: "UPDATE_FILTER", payload: filterUpdate });
  }, []);

  // Memoized cryptos for better performance
  const memoizedCryptos = useMemo(() => state.cryptos, [state.cryptos]);
  const memoizedFilteredCryptos = useMemo(
    () => state.filteredCryptos,
    [state.filteredCryptos]
  );
  const memoizedLoading = useMemo(() => state.loading, [state.loading]);
  const memoizedError = useMemo(() => state.error, [state.error]);

  // Create alert from current filter conditions
  const createAlertFromFilters = useCallback(async (symbol, filters) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || "";
      const alertEndpoint = baseUrl ? `${baseUrl}/api/alerts` : `/api/alerts`;

      // Convert filter conditions to alert payload
      const alertData = {
        symbol: symbol,
        direction: ">", // Default direction
        targetType: "percentage",
        targetValue:
          filters.percentageValue !== undefined
            ? parseFloat(filters.percentageValue)
            : 0,
        trackingMode: "current",
        intervalMinutes: 0,
        volumeChangeRequired: 0,
        alertTime: new Date(),
        comment: `Auto-created alert from favorite for ${symbol}`,
        email: " kainat.tasadaq3@gmail.com", // Could be populated from user preferences

        // Change percentage conditions
        changePercentTimeframe: filters.changePercent
          ? Object.keys(filters.changePercent).find(
              (tf) => filters.changePercent[tf]
            )
          : null,
        changePercentValue:
          filters.percentageValue !== undefined
            ? parseFloat(filters.percentageValue)
            : 0,

        // Candle conditions
        candleTimeframe: filters.candle
          ? Object.keys(filters.candle).find((tf) => filters.candle[tf])
          : null,
        candleCondition: (() => {
          const condition = filters.candleCondition || "NONE";
          // Map frontend values to backend enum values
          const conditionMap = {
            "Candle Above Open": "ABOVE_OPEN",
            "Candle Below Open": "BELOW_OPEN",
            "Green Candle": "GREEN_CANDLE",
            "Red Candle": "RED_CANDLE",
            "Bullish Hammer": "BULLISH_HAMMER",
            "Bearish Hammer": "BEARISH_HAMMER",
            Doji: "DOJI",
            "Long Upper Wick": "LONG_UPPER_WICK",
            "Long Lower Wick": "LONG_LOWER_WICK",
            None: "NONE",
          };
          return conditionMap[condition] || "NONE";
        })(),

        // RSI conditions
        rsiEnabled:
          filters.rsiRange &&
          Object.keys(filters.rsiRange).some((tf) => filters.rsiRange[tf]),
        rsiTimeframe: filters.rsiRange
          ? Object.keys(filters.rsiRange).find((tf) => filters.rsiRange[tf])
          : null,
        rsiPeriod: parseInt(filters.rsiPeriod) || 0,
        rsiCondition: filters.rsiCondition || "NONE",
        rsiLevel: parseInt(filters.rsiLevel) || 0,

        // EMA conditions
        emaEnabled:
          filters.ema && Object.keys(filters.ema).some((tf) => filters.ema[tf]),
        emaTimeframe: filters.ema
          ? Object.keys(filters.ema).find((tf) => filters.ema[tf])
          : null,
        emaFastPeriod: parseInt(filters.emaFast) || 0,
        emaSlowPeriod: parseInt(filters.emaSlow) || 0,
        emaCondition: (() => {
          const condition = filters.emaCondition;
          if (!condition) return "NONE";
          if (condition === "Fast Above Slow") return "ABOVE";
          if (condition === "Fast Below Slow") return "BELOW";
          if (condition === "Fast Crossing Up") return "CROSSING_UP";
          if (condition === "Fast Crossing Down") return "CROSSING_DOWN";
          return "NONE";
        })(),
      };

      console.log("Creating alert with data:", alertData);

      const response = await axios.post(alertEndpoint, alertData);
      console.log("Alert created successfully:", response.data);
    } catch (error) {
      console.error("Error creating alert from filters:", error);
      if (error.response) {
        console.error("Server response:", error.response.data);
      }
    }
  }, []);

  // Delete auto-created alerts for a symbol
  const deleteAutoCreatedAlerts = useCallback(async (symbol) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || "";
      const alertsEndpoint = baseUrl ? `${baseUrl}/api/alerts` : `/api/alerts`;

      // Get all alerts for this symbol
      const response = await axios.get(`${alertsEndpoint}?symbol=${symbol}`);
      const alerts = response.data;

      // Find auto-created alerts (those with specific comment pattern)
      const autoCreatedAlerts = alerts.filter(
        (alert) =>
          alert.comment &&
          alert.comment.includes("Auto-created alert from favorite")
      );

      // Delete each auto-created alert
      for (const alert of autoCreatedAlerts) {
        try {
          await axios.delete(`${alertsEndpoint}/${alert._id}`);
          console.log(`Deleted auto-created alert ${alert._id} for ${symbol}`);
        } catch (deleteError) {
          console.error(`Error deleting alert ${alert._id}:`, deleteError);
        }
      }

      console.log(
        `Deleted ${autoCreatedAlerts.length} auto-created alerts for ${symbol}`
      );
    } catch (error) {
      console.error(`Error fetching/deleting alerts for ${symbol}:`, error);
      // Don't throw error here as we don't want to prevent favorite removal
    }
  }, []);

  // Optimized favorite management with Map-based state and optimistic updates
  const [favoritesMap, setFavoritesMap] = useState(new Map());
  const [pendingOperations, setPendingOperations] = useState(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem("crypto_favorites");
    if (savedFavorites) {
      try {
        const favoritesArray = JSON.parse(savedFavorites);
        const favoritesMap = new Map(
          favoritesArray.map((symbol) => [symbol, true])
        );
        setFavoritesMap(favoritesMap);
        console.log(
          "Loaded favorites from localStorage:",
          Array.from(favoritesMap.keys())
        );
      } catch (error) {
        console.error("Error loading favorites from localStorage:", error);
      }
    }
  }, []);

  // Save favorites to localStorage whenever favoritesMap changes
  useEffect(() => {
    const favoritesArray = Array.from(favoritesMap.keys());
    localStorage.setItem("crypto_favorites", JSON.stringify(favoritesArray));
  }, [favoritesMap]);

  // Sync favoritesMap with cryptos data
  useEffect(() => {
    if (state.cryptos && state.cryptos.length > 0) {
      const newFavoritesMap = new Map();
      state.cryptos.forEach((crypto) => {
        if (crypto.isFavorite) {
          newFavoritesMap.set(crypto.symbol, true);
        }
      });
      setFavoritesMap((prev) => {
        // Merge with existing favorites from localStorage
        const merged = new Map(prev);
        newFavoritesMap.forEach((value, key) => {
          merged.set(key, value);
        });
        return merged;
      });
    }
  }, [state.cryptos]);

  // Optimized single favorite toggle with optimistic updates
  const toggleFavorite = useCallback(
    async (symbol, filterConditions = null, createAlertCallback = null) => {
      try {
        const crypto = state.cryptos.find((c) => c.symbol === symbol);
        if (!crypto) {
          console.error(`Could not find crypto with symbol ${symbol}`);
          return;
        }

        const currentStatus = favoritesMap.get(symbol) || false;
        const newStatus = !currentStatus;

        console.log(`Toggling favorite status for ${symbol} to ${newStatus}`);

        // Optimistic update - update UI immediately
        setFavoritesMap((prev) => {
          const newMap = new Map(prev);
          if (newStatus) {
            newMap.set(symbol, true);
          } else {
            newMap.delete(symbol);
          }
          return newMap;
        });

        // Mark as pending operation
        setPendingOperations((prev) => new Set([...prev, symbol]));

        // Use baseUrl to ensure we have the correct API endpoint
        const baseUrl = process.env.REACT_APP_API_URL || "";
        const endpoint = baseUrl
          ? `${baseUrl}/api/crypto/${symbol}/favorite`
          : `/api/crypto/${symbol}/favorite`;

        await axios.put(endpoint, { isFavorite: newStatus });

        // Remove from pending operations
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });

        // Update state after successful API call
        dispatch({
          type: "TOGGLE_FAVORITE",
          payload: { symbol, isFavorite: newStatus },
        });

        // If adding to favorites and we have a callback function, use it for alert creation
        if (newStatus && createAlertCallback) {
          console.log(`Creating alert for ${symbol} using FilterSidebar logic`);
          await createAlertCallback(symbol);
        }
        // Fallback to old method if no callback provided but filter conditions exist
        else if (newStatus && filterConditions) {
          console.log(
            `Creating alert for ${symbol} with filter conditions:`,
            filterConditions
          );
          await createAlertFromFilters(symbol, filterConditions);
        }

        // If removing from favorites, delete any auto-created alerts for this symbol
        if (!newStatus) {
          console.log(
            `Removing from favorites: deleting auto-created alerts for ${symbol}`
          );
          await deleteAutoCreatedAlerts(symbol);
        }
      } catch (error) {
        console.error(`Error toggling favorite for ${symbol}:`, error);

        // Revert optimistic update on error
        setFavoritesMap((prev) => {
          const newMap = new Map(prev);
          const originalStatus =
            state.cryptos.find((c) => c.symbol === symbol)?.isFavorite || false;
          if (originalStatus) {
            newMap.set(symbol, true);
          } else {
            newMap.delete(symbol);
          }
          return newMap;
        });

        // Remove from pending operations
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });

        let errorMessage = "Failed to update favorite status";

        if (error.response) {
          errorMessage =
            error.response.data?.message ||
            `Server error: ${error.response.status}`;
        } else if (error.request) {
          errorMessage =
            "No response received from server. Please check your connection.";
        } else {
          errorMessage = error.message || "An unexpected error occurred";
        }

        dispatch({
          type: "CRYPTO_FAIL",
          payload: errorMessage,
        });
      }
    },
    [
      favoritesMap,
      state.cryptos,
      dispatch,
      createAlertFromFilters,
      deleteAutoCreatedAlerts,
    ]
  );

  // Batch toggle favorites for better performance
  const batchToggleFavorites = useCallback(
    async (operations) => {
      try {
        console.log("Batch toggling favorites:", operations);

        // Optimistic updates
        setFavoritesMap((prev) => {
          const newMap = new Map(prev);
          operations.forEach(({ symbol, action }) => {
            if (action === "add") {
              newMap.set(symbol, true);
            } else if (action === "remove") {
              newMap.delete(symbol);
            } else if (action === "toggle") {
              const currentStatus = newMap.get(symbol) || false;
              if (currentStatus) {
                newMap.delete(symbol);
              } else {
                newMap.set(symbol, true);
              }
            }
          });
          return newMap;
        });

        // Mark all as pending
        const symbols = operations.map((op) => op.symbol);
        setPendingOperations((prev) => new Set([...prev, ...symbols]));

        // Batch API call
        const baseUrl = process.env.REACT_APP_API_URL || "";
        const endpoint = baseUrl
          ? `${baseUrl}/api/crypto/favorites/batch`
          : `/api/crypto/favorites/batch`;

        const response = await axios.put(endpoint, { operations });

        // Remove from pending operations
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          symbols.forEach((symbol) => newSet.delete(symbol));
          return newSet;
        });

        // Update state for each successful operation
        response.data.results.forEach(({ symbol, isFavorite }) => {
          dispatch({
            type: "TOGGLE_FAVORITE",
            payload: { symbol, isFavorite },
          });
        });

        console.log("Batch favorites update completed:", response.data);

        return response.data;
      } catch (error) {
        console.error("Error in batch toggle favorites:", error);

        // Revert optimistic updates on error
        setFavoritesMap((prev) => {
          const newMap = new Map(prev);
          operations.forEach(({ symbol }) => {
            const originalStatus =
              state.cryptos.find((c) => c.symbol === symbol)?.isFavorite ||
              false;
            if (originalStatus) {
              newMap.set(symbol, true);
            } else {
              newMap.delete(symbol);
            }
          });
          return newMap;
        });

        // Remove from pending operations
        setPendingOperations((prev) => {
          const newSet = new Set(prev);
          operations.forEach((op) => newSet.delete(op.symbol));
          return newSet;
        });

        throw error;
      }
    },
    [state.cryptos, dispatch]
  );

  // Check if a symbol is favorite (O(1) lookup)
  const isFavorite = useCallback(
    (symbol) => {
      return favoritesMap.get(symbol) || false;
    },
    [favoritesMap]
  );

  // Get all favorite symbols
  const getFavoriteSymbols = useCallback(() => {
    return Array.from(favoritesMap.keys());
  }, [favoritesMap]);

  // Check if operation is pending
  const isOperationPending = useCallback(
    (symbol) => {
      return pendingOperations.has(symbol);
    },
    [pendingOperations]
  );

  // RSI cache now handled by apiCache utility

  // Get RSI data for a symbol with improved caching
  const getRSI = useCallback(async (symbol, period = 14, timeframe = "1h") => {
    // Create a cache key using symbol, period and timeframe
    const cacheKey = getCacheKey.rsi(symbol, period, timeframe);

    // Check cache first
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`Using cached RSI data for ${symbol} (${timeframe})`);
      return cachedData;
    }

    // If not in cache or cache expired, fetch from API
    try {
      console.log(`Fetching RSI data for ${symbol} (${timeframe})`);
      // Use baseUrl to ensure we have the correct API endpoint
      const baseUrl = process.env.REACT_APP_API_URL || "";
      const endpoint = baseUrl
        ? `${baseUrl}/api/crypto/${symbol}/rsi`
        : `/api/crypto/${symbol}/rsi`;

      const { data } = await axios.get(endpoint, {
        params: { period, timeframe },
      });

      // Store in cache for 3 minutes
      apiCache.set(cacheKey, data, 3 * 60 * 1000);

      return data;
    } catch (error) {
      console.error(`Failed to fetch RSI for ${symbol} (${timeframe}):`, error);
      throw error;
    }
  }, []);

  // Clear cache when needed
  const clearCache = useCallback(() => {
    apiCache.clear();
  }, []);

  // Check alert conditions for a symbol with direct API call
  const checkAlertConditions = useCallback(async (symbol, filters) => {
    try {
      console.log(`Making direct API call to check conditions for ${symbol}`);
      // Use baseUrl to ensure we have the correct API endpoint
      const baseUrl = process.env.REACT_APP_API_URL || "";
      const endpoint = baseUrl
        ? `${baseUrl}/api/crypto/${symbol}/check-conditions`
        : `/api/crypto/${symbol}/check-conditions`;

      const { data } = await axios.post(endpoint, {
        filters,
        forceRefresh: true, // Always force fresh data when checking conditions
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
      value={useMemo(
        () => ({
          cryptos: memoizedCryptos,
          filteredCryptos: memoizedFilteredCryptos,
          loading: memoizedLoading,
          error: memoizedError,
          filter: state.filter,
          pagination: state.pagination,
          lastFetch: state.lastFetch,
          usingCachedData: state.usingCachedData,
          loadCryptos,
          updateFilter,
          toggleFavorite,
          batchToggleFavorites,
          isFavorite,
          getFavoriteSymbols,
          isOperationPending,
          getRSI,
          clearCache,
          checkAlertConditions,
        }),
        [
          memoizedCryptos,
          memoizedFilteredCryptos,
          memoizedLoading,
          memoizedError,
          state.filter,
          state.pagination,
          state.lastFetch,
          state.usingCachedData,
          loadCryptos,
          updateFilter,
          toggleFavorite,
          batchToggleFavorites,
          isFavorite,
          getFavoriteSymbols,
          isOperationPending,
          getRSI,
          clearCache,
          checkAlertConditions,
        ]
      )}
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
      console.log("Skipping refresh as another refresh is already in progress");
      return;
    }

    refreshInProgress.current = true;
    console.log("Auto-refresh: Fetching latest crypto data");

    try {
      await loadCryptos(1, 50, true, true); // Use silent loading for background refreshes
      console.log("Auto-refresh completed successfully");
    } catch (error) {
      console.error("Auto-refresh failed:", error);
      // Continue silently - don't break the UI
    } finally {
      refreshInProgress.current = false;
    }
  }, [loadCryptos]);

  useEffect(() => {
    console.log("Setting up auto-refresh");

    // Initial load
    handleRefresh().catch((err) => {
      console.error("Error during initial auto-refresh load:", err);
    });

    // Set up timer for regular refreshes
    const timer = setInterval(() => {
      handleRefresh().catch((err) => {
        console.error("Error during scheduled auto-refresh:", err);
      });
    }, refreshInterval);

    // Clean up the timer when unmounting
    return () => {
      console.log("Cleaning up auto-refresh timer");
      clearInterval(timer);
    };
  }, [handleRefresh]);

  return <>{children}</>;
};
