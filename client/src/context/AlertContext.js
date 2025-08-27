import React, { createContext, useContext, useReducer, useCallback } from 'react';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

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
      console.log('Loading alerts with params:', { page, limit, forceRefresh });
      // Check if we've recently fetched this page and have it cached
      const now = new Date().getTime();
      const shouldUseCachedData = !forceRefresh && 
                                state.lastFetch && 
                                (now - state.lastFetch < 2 * 60 * 1000) && // 2 minute cache
                                page === state.pagination.page &&
                                state.alerts.length > 0;
      
      if (shouldUseCachedData) {
        console.log('Using cached alerts data', state.alerts);
        return {
          total: state.pagination.total,
          hasMore: state.pagination.hasMore
        };
      }
      
      dispatch({ type: 'ALERT_REQUEST' });
      console.log('Making API call to fetch alerts');
      
      // Use pagination parameters to limit the number of alerts loaded at once
      const response = await axios.get('/api/alerts', {
        params: { page, limit }
      });
      console.log('Alerts API response:', response);
      
      // The server returns the alerts directly in the data property
      // Make sure we're handling the response correctly
      let alertsData = response.data;
      console.log('Parsed alerts data:', alertsData);
      
      // If the data isn't an array, handle the error
      if (!Array.isArray(alertsData)) {
        console.error('Expected array of alerts but got:', typeof alertsData);
        alertsData = [];
      }
      
      if (page === 1) {
        // First page - replace existing alerts
        console.log('Dispatching GET_ALERTS with data:', alertsData);
        dispatch({ 
          type: 'GET_ALERTS', 
          payload: {
            alerts: alertsData,
            pagination: {
              page,
              limit,
              total: alertsData.length,
              hasMore: alertsData.length === limit
            },
            timestamp: now
          }
        });
        // Check state after update
        setTimeout(() => {
          console.log('State after loading alerts:', state.alerts);
        }, 100);
      } else {
        // Additional pages - append to existing alerts
        dispatch({ 
          type: 'ADD_ALERTS_BATCH', 
          payload: {
            alerts: alertsData,
            pagination: {
              page,
              limit,
              total: alertsData.length,
              hasMore: alertsData.length === limit
            },
            timestamp: now
          }
        });
      }
      
      // Return total count and whether there are more pages
      return {
        total: alertsData.length,
        hasMore: alertsData.length === limit
      };
    } catch (error) {
      dispatch({
        type: 'ALERT_FAIL',
        payload: error.response?.data?.message || 'Failed to load alerts',
      });
      return { total: 0, hasMore: false };
    }
  }, [state.alerts, state.lastFetch, state.pagination.hasMore, state.pagination.page, state.pagination.total]);

  // Create new alert
  const createAlert = async (alertData) => {
    try {
      console.log('Creating alert with data:', alertData);
      dispatch({ type: 'ALERT_REQUEST' });
      const response = await axios.post('/api/alerts', alertData);
      console.log('Create alert API response:', response);
      const { data } = response;
      
      // Log the alert before adding to state
      console.log('Alert to be added to state:', data);
      dispatch({ type: 'ADD_ALERT', payload: data });
      dispatch({ type: 'SET_MESSAGE', payload: 'Alert created successfully' });
      
      // Log state after update
      setTimeout(() => {
        console.log('Alert state after creation:', state.alerts);
      }, 100);
      
      return data;
    } catch (error) {
      console.error('Error creating alert:', error);
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
