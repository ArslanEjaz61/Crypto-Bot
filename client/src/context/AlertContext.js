import React, { createContext, useContext, useReducer, useCallback } from 'react';
import axios from 'axios';

// Initial state
const initialState = {
  alerts: [],
  loading: false,
  error: null,
  filteredAlerts: [],
  filter: {
    status: 'all',
    type: 'all',
    symbol: '',
    sort: 'createdAt',
    order: 'desc',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true
  },
  lastFetch: null
};

// Create Context
const AlertContext = createContext();

// Define Reducer
const alertReducer = (state, action) => {
  switch (action.type) {
    case 'ALERT_REQUEST':
      return { ...state, loading: true };
    case 'ALERT_SUCCESS':
      return { ...state, loading: false, success: true };
    case 'ALERT_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'ALERT_RESET':
      return { ...state, error: null, success: false, message: '' };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'GET_ALERTS':
      return { 
        ...state, 
        alerts: action.payload.alerts, 
        pagination: action.payload.pagination, 
        lastFetch: action.payload.timestamp, 
        loading: false 
      };
    case 'ADD_ALERTS_BATCH':
      return { 
        ...state, 
        alerts: [...state.alerts, ...action.payload.alerts], 
        pagination: action.payload.pagination, 
        lastFetch: action.payload.timestamp, 
        loading: false 
      };
    case 'ADD_ALERT':
      return { ...state, alerts: [action.payload, ...state.alerts], loading: false, success: true };
    case 'UPDATE_ALERT':
      return {
        ...state,
        alerts: state.alerts.map((alert) =>
          alert._id === action.payload._id ? action.payload : alert
        ),
        loading: false,
        success: true,
      };
    case 'DELETE_ALERT':
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert._id !== action.payload),
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

  // Load alerts with caching and optimization
  const loadAlerts = useCallback(async (page = 1, limit = 20, forceRefresh = false) => {
    try {
      // Check if we've recently fetched this page and have it cached
      const now = new Date().getTime();
      const shouldUseCachedData = !forceRefresh && 
                                state.lastFetch && 
                                (now - state.lastFetch < 2 * 60 * 1000) && // 2 minute cache
                                page === state.pagination.page &&
                                state.alerts.length > 0;
      
      if (shouldUseCachedData) {
        console.log('Using cached alerts data');
        return {
          total: state.pagination.total,
          hasMore: state.pagination.hasMore
        };
      }
      
      dispatch({ type: 'ALERT_REQUEST' });
      
      // Use pagination parameters to limit the number of alerts loaded at once
      const { data } = await axios.get('/api/alerts', {
        params: { page, limit }
      });
      
      if (page === 1) {
        // First page - replace existing alerts
        dispatch({ 
          type: 'GET_ALERTS', 
          payload: {
            alerts: data,
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
        // Additional pages - append to existing alerts
        dispatch({ 
          type: 'ADD_ALERTS_BATCH', 
          payload: {
            alerts: data,
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
        type: 'ALERT_FAIL',
        payload: error.response?.data?.message || 'Failed to load alerts',
      });
      return { total: 0, hasMore: false };
    }
  }, [state.alerts.length, state.lastFetch, state.pagination.hasMore, state.pagination.page, state.pagination.total]);

  // Create new alert
  const createAlert = async (alertData) => {
    try {
      dispatch({ type: 'ALERT_REQUEST' });
      const { data } = await axios.post('/api/alerts', alertData);
      dispatch({ type: 'ADD_ALERT', payload: data });
      dispatch({ type: 'SET_MESSAGE', payload: 'Alert created successfully' });
      return data;
    } catch (error) {
      dispatch({
        type: 'ALERT_FAIL',
        payload: error.response?.data?.message || 'Failed to create alert',
      });
      throw error;
    }
  };

  // Update alert
  const updateAlert = async (id, alertData) => {
    try {
      dispatch({ type: 'ALERT_REQUEST' });
      const { data } = await axios.put(`/api/alerts/${id}`, alertData);
      dispatch({ type: 'UPDATE_ALERT', payload: data });
      dispatch({ type: 'SET_MESSAGE', payload: 'Alert updated successfully' });
      return data;
    } catch (error) {
      dispatch({
        type: 'ALERT_FAIL',
        payload: error.response?.data?.message || 'Failed to update alert',
      });
      throw error;
    }
  };

  // Delete alert
  const deleteAlert = async (id) => {
    try {
      dispatch({ type: 'ALERT_REQUEST' });
      await axios.delete(`/api/alerts/${id}`);
      dispatch({ type: 'DELETE_ALERT', payload: id });
      dispatch({ type: 'SET_MESSAGE', payload: 'Alert deleted successfully' });
    } catch (error) {
      dispatch({
        type: 'ALERT_FAIL',
        payload: error.response?.data?.message || 'Failed to delete alert',
      });
      throw error;
    }
  };

  // Reset alert state
  const resetAlertState = () => {
    dispatch({ type: 'ALERT_RESET' });
  };

  return (
    <AlertContext.Provider
      value={{
        ...state,
        loadAlerts,
        createAlert,
        updateAlert,
        deleteAlert,
        resetAlertState,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};

// Custom hook
export const useAlert = () => useContext(AlertContext);
