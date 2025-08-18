import React, { useEffect, useCallback, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box } from '@mui/material';

// Components
import Header from './components/Header';
import AlertTabs from './components/AlertTabs';
import { useAlert } from './context/AlertContext';
import { useCrypto } from './context/CryptoContext';
import SocketProvider from './context/SocketContext';
import Notification from './components/Notification';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3875d7',
    },
    secondary: {
      main: '#9acd32',
    },
    background: {
      default: '#262e33',
      paper: '#1c252b',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
    success: {
      main: '#9acd32',
    },
    error: {
      main: '#ff4500',
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
  const { loadAlerts, loading: alertsLoading } = useAlert();
  const { loadCryptos, loading: cryptosLoading } = useCrypto();
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
    
    try {
      setIsDataLoading(true);
      console.log('Loading initial application data...');
      
      // Load data with slight delay between calls to reduce server load
      await loadAlerts(1, 20, force);
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
    
    // Initial data load
    loadInitialData();
    
    // Setup periodic data refresh (every 5 minutes)
    const refreshInterval = setInterval(() => {
      loadInitialData(true); // Force refresh
    }, 5 * 60 * 1000);
    
    // Cleanup function
    return () => {
      controller.abort();
      clearInterval(refreshInterval);
    };
  }, [loadInitialData]); // Depend on memoized function

  return (
    <SocketProvider>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <Container component="main" maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
            <AlertTabs />
          </Container>
          <Notification />
        </Box>
      </ThemeProvider>
    </SocketProvider>
  );
}

export default App;
