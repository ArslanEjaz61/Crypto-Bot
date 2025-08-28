import React, { useEffect, useCallback, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Components
import Header from './components/Header';
import { useAlert } from './context/AlertContext';
import { useCrypto } from './context/CryptoContext';
import SocketProvider from './context/SocketContext';
import Notification from './components/Notification';
import Dashboard from './components/Dashboard';
import { FilterProvider } from './context/FilterContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0066FF',
    },
    secondary: {
      main: '#9acd32',
    },
    background: {
      default: '#0A0E17',  // Dark background matching the image
      paper: '#0A0E17',    // Same dark background for paper components
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#94A3B8', // Light gray text for secondary content
    },
    success: {
      main: '#10B981',     // Green color for positive changes
    },
    error: {
      main: '#EF4444',     // Red color for negative changes
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
  },
});

function App() {
  const { loadAlerts } = useAlert();
  const { loadCryptos } = useCrypto();
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Memoized function to load initial data
  const loadInitialData = useCallback(async (force = false) => {
    // Prevent multiple simultaneous data loading requests
    if (isDataLoading) return;
    
    // Check if data was loaded recently
    const now = new Date().getTime();
    const lastLoadTime = parseInt(localStorage.getItem('lastDataLoadTime') || '0');
    const hasLoadedData = localStorage.getItem('initialDataLoaded');
    const dataExpired = now - lastLoadTime > 5 * 60 * 1000; // 5 minute expiration
    
    // Skip loading if data was loaded recently unless forced
    if (hasLoadedData && !dataExpired && !force) {
      console.log('Using recently loaded data');
      return;
    }
    
    console.log(`Loading data with force=${force}, dataExpired=${dataExpired}`);
    
    try {
      setIsDataLoading(true);
      console.log('Loading initial application data...');
      
      // Load data with slight delay between calls to reduce server load
      console.log('Loading alerts from API...');
      const alertResult = await loadAlerts(1, 100, force);
      console.log('Alert loading result:', alertResult);
      
      console.log('Loading cryptos from API...');
      await loadCryptos(1, 50, force);
      
      // Mark data as loaded and store timestamp
      localStorage.setItem('initialDataLoaded', 'true');
      localStorage.setItem('lastDataLoadTime', now.toString());
      
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsDataLoading(false);
    }
  }, [loadAlerts, loadCryptos, isDataLoading]);

  // Effect to load data on component mount
  useEffect(() => {
    // Create an AbortController for cleanup
    const controller = new AbortController();
    
    console.log('App mounted, loading initial data...');
    // Initial data load
    loadInitialData(true); // Force refresh on initial load
    
    // Setup periodic data refresh (every 2 minutes)
    const refreshInterval = setInterval(() => {
      console.log('Running scheduled data refresh...');
      loadInitialData(true); // Force refresh
    }, 2 * 60 * 1000); // Reduced to 2 minutes for testing
    
    // Cleanup function
    return () => {
      controller.abort();
      clearInterval(refreshInterval);
    };
  }, [loadInitialData]); // Depend on memoized function

  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <FilterProvider>
              <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={
                      <>
                        <Header />
                        <Box component="main" sx={{ flexGrow: 1 }}>
                          <Dashboard />
                        </Box>
                        <Notification />
                      </>
                    } />
                  </Route>
                  
                  {/* Redirect root to dashboard (protected) */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Catch all other routes */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Box>
            </FilterProvider>
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
