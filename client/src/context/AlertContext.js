import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import axios from "axios";
import { useUltraFastAlerts } from "../hooks/useUltraFastAlerts";
import dailyCleanup from "../utils/dailyCleanup";

// Configure axios
axios.defaults.baseURL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";
axios.defaults.headers.common["Content-Type"] = "application/json";

// Initial state
const initialState = {
  alerts: [],
  loading: false,
  error: null,
  filteredAlerts: [],
  filter: {
    status: "all",
    type: "all",
    symbol: "",
    sort: "createdAt",
    order: "desc",
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  lastFetch: null,
};

// Create Context
const AlertContext = createContext();

// Define Reducer
const alertReducer = (state, action) => {
  switch (action.type) {
    case "ALERT_REQUEST":
      return { ...state, loading: true };
    case "ALERT_SUCCESS":
      return { ...state, loading: false, success: true };
    case "ALERT_FAIL":
      return { ...state, loading: false, error: action.payload };
    case "ALERT_RESET":
      return { ...state, error: null, success: false, message: "" };
    case "SET_MESSAGE":
      return { ...state, message: action.payload };
    case "GET_ALERTS":
      console.log("GET_ALERTS reducer with payload:", action.payload);
      return {
        ...state,
        alerts: action.payload.alerts,
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
      };
    case "ADD_ALERTS_BATCH":
      console.log("ADD_ALERTS_BATCH reducer with payload:", action.payload);
      return {
        ...state,
        alerts: [...state.alerts, ...action.payload.alerts],
        pagination: action.payload.pagination,
        lastFetch: action.payload.timestamp,
        loading: false,
      };
    case "ADD_ALERT":
      console.log("ADD_ALERT reducer with payload:", action.payload);
      return {
        ...state,
        alerts: [action.payload, ...state.alerts],
        loading: false,
        success: true,
      };
    case "UPDATE_ALERT":
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert._id === action.payload._id ? action.payload : alert
        ),
        loading: false,
        success: true,
      };
    case "DELETE_ALERT":
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert._id !== action.payload),
        loading: false,
        success: true,
      };
    case "DELETE_ALERTS_BY_SYMBOL":
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert.symbol !== action.payload),
        loading: false,
        success: true,
      };
    default:
      return state;
  }
};

// Create Provider
export const AlertProvider = ({ children }) => {
  const [state, dispatch] = useReducer(alertReducer, initialState);
  
  // Initialize ultra-fast alert system
  const ultraFastAlerts = useUltraFastAlerts();

  // Initialize daily cleanup at 12:00 AM
  useEffect(() => {
    dailyCleanup.init();
    
    // Cleanup on unmount
    return () => {
      dailyCleanup.destroy();
    };
  }, []);

  // Load alerts with caching and optimization
  const loadAlerts = useCallback(
    async (page = 1, limit = 20, forceRefresh = false) => {
      try {
        console.log("Loading alerts with params:", {
          page,
          limit,
          forceRefresh,
        });

        // Set bypassCache to false to allow proper caching
        const bypassCache = false;

        // Check if we've recently fetched this page and have it cached
        const now = new Date().getTime();
        const shouldUseCachedData =
          !forceRefresh &&
          !bypassCache &&
          state.lastFetch &&
          now - state.lastFetch < 2 * 60 * 1000 && // 2 minute cache
          page === state.pagination.page &&
          state.alerts.length > 0;

        if (shouldUseCachedData) {
          console.log("Using cached alerts data", state.alerts);
          return {
            total: state.pagination.total,
            hasMore: state.pagination.hasMore,
          };
        }

        dispatch({ type: "ALERT_REQUEST" });
        console.log("Making API call to fetch alerts");

        // Use pagination parameters to limit the number of alerts loaded at once
        const response = await axios.get("/api/alerts", {
          params: { page, limit },
        });
        console.log("Alerts API response status:", response.status);
        console.log("Alerts API response data type:", typeof response.data);

        // The server returns the alerts directly in the data property
        let alertsData = response.data;
        console.log("Raw alertsData:", alertsData);

        // DEBUGGING - force to array if needed
        if (!Array.isArray(alertsData)) {
          console.warn("Expected array but received:", typeof alertsData);

          // Handle various response formats
          if (
            alertsData &&
            alertsData.alerts &&
            Array.isArray(alertsData.alerts)
          ) {
            console.log("Found nested alerts array, using it");
            alertsData = alertsData.alerts;
          } else if (alertsData && typeof alertsData === "object") {
            // If it's an object with numeric keys, convert to array
            const possibleArray = Object.values(alertsData);
            if (
              possibleArray.length > 0 &&
              typeof possibleArray[0] === "object"
            ) {
              console.log("Converting object to array");
              alertsData = possibleArray;
            } else {
              console.error("Could not convert to array, using empty array");
              alertsData = [];
            }
          } else {
            console.error("Unexpected data format, using empty array");
            alertsData = [];
          }
        }

        console.log("Processed alerts data:", alertsData);
        console.log("Number of alerts:", alertsData.length);

        if (page === 1) {
          // First page - replace existing alerts
          console.log("Dispatching GET_ALERTS with data:", alertsData);
          dispatch({
            type: "GET_ALERTS",
            payload: {
              alerts: alertsData,
              pagination: {
                page,
                limit,
                total: alertsData.length,
                hasMore: alertsData.length === limit,
              },
              timestamp: now,
            },
          });

          // Wait for state update and verify
          setTimeout(() => {
            console.log("Alert context state after loading alerts:", state);
          }, 500); // Increased timeout to give reducer time to update
        } else {
          // Additional pages - append to existing alerts
          console.log("Appending additional alerts data");
          dispatch({
            type: "ADD_ALERTS_BATCH",
            payload: {
              alerts: alertsData,
              pagination: {
                page,
                limit,
                total: state.pagination.total + alertsData.length,
                hasMore: alertsData.length === limit,
              },
              timestamp: now,
            },
          });
        }

        // Return total count and whether there are more pages
        return {
          total: alertsData.length,
          hasMore: alertsData.length === limit,
        };
      } catch (error) {
        dispatch({
          type: "ALERT_FAIL",
          payload: error.response?.data?.message || "Failed to load alerts",
        });
        return { total: 0, hasMore: false };
      }
    },
    [
      state.alerts,
      state.lastFetch,
      state.pagination.hasMore,
      state.pagination.page,
      state.pagination.total,
    ]
  );

  // Create new alert
  const createAlert = async (alertData) => {
    try {
      console.log("Creating alert with data:", alertData);
      dispatch({ type: "ALERT_REQUEST" });
      const response = await axios.post("/api/alerts", alertData);
      console.log("Create alert API response:", response);
      const { data } = response;

      // Log the alert before adding to state
      console.log("Alert to be added to state:", data);
      dispatch({ type: "ADD_ALERT", payload: data });
      dispatch({ type: "SET_MESSAGE", payload: "Alert created successfully" });

      // Log state after update
      setTimeout(() => {
        console.log("Alert state after creation:", state.alerts);
      }, 100);

      return data;
    } catch (error) {
      console.error("Error creating alert:", error);
      dispatch({
        type: "ALERT_FAIL",
        payload: error.response?.data?.message || "Failed to create alert",
      });
      throw error;
    }
  };

  // Update alert
  const updateAlert = async (id, alertData) => {
    try {
      dispatch({ type: "ALERT_REQUEST" });
      const { data } = await axios.put(`/api/alerts/${id}`, alertData);
      dispatch({ type: "UPDATE_ALERT", payload: data });
      dispatch({ type: "SET_MESSAGE", payload: "Alert updated successfully" });
      return data;
    } catch (error) {
      dispatch({
        type: "ALERT_FAIL",
        payload: error.response?.data?.message || "Failed to update alert",
      });
      throw error;
    }
  };

  // Delete alert
  const deleteAlert = async (id) => {
    try {
      dispatch({ type: "ALERT_REQUEST" });
      await axios.delete(`/api/alerts/${id}`);
      dispatch({ type: "DELETE_ALERT", payload: id });
      dispatch({ type: "SET_MESSAGE", payload: "Alert deleted successfully" });
    } catch (error) {
      dispatch({
        type: "ALERT_FAIL",
        payload: error.response?.data?.message || "Failed to delete alert",
      });
      throw error;
    }
  };

  // Delete alerts by symbol
  const deleteAlertsBySymbol = async (symbol) => {
    try {
      dispatch({ type: "ALERT_REQUEST" });
      const response = await axios.delete(`/api/alerts/symbol/${symbol}`);
      const { deletedCount } = response.data;

      // Remove all alerts for this symbol from state
      dispatch({
        type: "DELETE_ALERTS_BY_SYMBOL",
        payload: symbol.toUpperCase(),
      });
      dispatch({
        type: "SET_MESSAGE",
        payload: `${deletedCount} alerts deleted for ${symbol.toUpperCase()}`,
      });

      return { deletedCount, symbol: symbol.toUpperCase() };
    } catch (error) {
      dispatch({
        type: "ALERT_FAIL",
        payload:
          error.response?.data?.message || "Failed to delete alerts by symbol",
      });
      throw error;
    }
  };

  // Reset alert state
  const resetAlertState = () => {
    dispatch({ type: "ALERT_RESET" });
  };

  return (
    <AlertContext.Provider
      value={{
        ...state,
        loadAlerts,
        createAlert,
        updateAlert,
        deleteAlert,
        deleteAlertsBySymbol,
        resetAlertState,
        // Ultra-fast alert system integration
        ultraFastAlerts,
        isUltraFastEnabled: ultraFastAlerts.isInitialized,
        performanceMetrics: ultraFastAlerts.performanceMetrics,
        getPrice: ultraFastAlerts.getPrice,
        subscribeToPrice: ultraFastAlerts.subscribeToPrice,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

// Custom hook
export const useAlert = () => useContext(AlertContext);
