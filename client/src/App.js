import React, { useState, useEffect, Suspense } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Fade,
  Skeleton,
  LinearProgress,
} from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Components - Lazy loaded for better performance
import Header from "./components/Header";
import { useAlert } from "./context/AlertContext";
import { useCrypto } from "./context/CryptoContext";
import LazyComponentLoader from "./components/LazyComponentLoader";
import { FilterProvider } from "./context/FilterContext";
import { SelectedPairsProvider } from "./context/SelectedPairsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { useCallback } from "react";

// Lazy load heavy components
const Dashboard = React.lazy(() => import("./components/Dashboard"));
const Login = React.lazy(() => import("./components/Login"));
const Notification = React.lazy(() => import("./components/Notification"));

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#0066FF",
    },
    secondary: {
      main: "#9acd32",
    },
    background: {
      default: "#0A0E17", // Dark background matching the image
      paper: "#0A0E17", // Same dark background for paper components
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#94A3B8", // Light gray text for secondary content
    },
    success: {
      main: "#10B981", // Green color for positive changes
    },
    error: {
      main: "#EF4444", // Red color for negative changes
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
          textTransform: "none",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        },
      },
    },
  },
});

function App() {
  const { loadAlerts } = useAlert();
  const { loadCryptos } = useCrypto();
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Memoized function to load initial data
  const loadInitialData = useCallback(
    async (force = false) => {
      // Check if data was loaded recently
      const now = new Date().getTime();
      const lastLoadTime = parseInt(
        localStorage.getItem("lastDataLoadTime") || "0"
      );
      const hasLoadedData = localStorage.getItem("initialDataLoaded");
      const dataExpired = now - lastLoadTime > 10 * 60 * 1000; // 10 minute expiration

      // Skip loading if data was loaded recently unless forced
      if (hasLoadedData && !dataExpired && !force) {
        console.log("Using recently loaded data");
        return;
      }

      console.log(
        `Loading data with force=${force}, dataExpired=${dataExpired}`
      );

      try {
        setIsDataLoading(true);
        setLoading(true);
        console.log("Loading initial application data...");

        // Load data with slight delay between calls to reduce server load
        console.log("Loading alerts from API...");
        const alertResult = await loadAlerts(1, 100, force);
        console.log("Alert loading result:", alertResult);

        console.log("Loading cryptos from API...");
        await loadCryptos(1, 50, force);

        // Mark data as loaded and store timestamp
        localStorage.setItem("initialDataLoaded", "true");
        localStorage.setItem("lastDataLoadTime", now.toString());

        console.log("Initial data loaded successfully");
      } catch (error) {
        console.error("Failed to load initial data:", error);
      } finally {
        setIsDataLoading(false);
        setLoading(false);
      }
    },
    [loadAlerts, loadCryptos]
  ); // Removed isDataLoading from dependencies

  // Effect to load data on component mount
  useEffect(() => {
    // Create an AbortController for cleanup
    const controller = new AbortController();

    console.log("App mounted, loading initial data...");
    // Initial data load with delay to avoid blocking UI
    setTimeout(() => {
      loadInitialData(true); // Force refresh on initial load
    }, 100);

    // Setup periodic data refresh (every 10 minutes)
    const refreshInterval = setInterval(() => {
      console.log("Running scheduled data refresh...");
      loadInitialData(false); // Don't force refresh for background updates
    }, 10 * 60 * 1000); // 10 minutes for better performance

    // Cleanup function
    return () => {
      controller.abort();
      clearInterval(refreshInterval);
    };
  }, []); // Empty dependency array - only run on mount

  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <FilterProvider>
            <SelectedPairsProvider>
              {loading && (
                <Fade in={loading}>
                  <Box
                    sx={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                    }}
                  >
                    <LinearProgress color="primary" sx={{ height: 3 }} />
                  </Box>
                </Fade>
              )}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "100vh",
                  width: "100%",
                  maxWidth: "100%",
                  overflow: "auto",
                  position: "relative",
                  boxSizing: "border-box",
                  // Custom scrollbar styling for main page scroll
                  "&::-webkit-scrollbar": {
                    width: "12px",
                    height: "12px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "#1a1a1a",
                    borderRadius: "6px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#4f80ff",
                    borderRadius: "6px",
                    "&:hover": {
                      background: "#3b6ae8",
                    },
                  },
                  "&::-webkit-scrollbar-corner": {
                    background: "#1a1a1a",
                  },
                }}
              >
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <LazyComponentLoader height={400}>
                        <Login />
                      </LazyComponentLoader>
                    }
                  />

                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="/dashboard"
                      element={
                        <>
                          <Header />
                          <Box
                            component="main"
                            sx={{
                              flexGrow: 1,
                              display: "flex",
                              flexDirection: "column",
                              minHeight: "calc(100vh - 64px)",
                              m: 0,
                              p: 0,
                              width: "100%",
                              maxWidth: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            <LazyComponentLoader height={600}>
                              <Dashboard />
                            </LazyComponentLoader>
                          </Box>
                          <LazyComponentLoader height={100}>
                            <Notification />
                          </LazyComponentLoader>
                        </>
                      }
                    />
                  </Route>

                  {/* Redirect root to dashboard (protected) */}
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />

                  {/* Catch all other routes */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Box>
            </SelectedPairsProvider>
          </FilterProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
