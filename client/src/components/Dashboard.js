import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  Fab,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FilterListIcon from "@mui/icons-material/FilterList";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ListIcon from "@mui/icons-material/List";
import LineChart from "./LineChart.js";
import MarketPanel from "./MarketPanel";
import FilterSidebar from "./FilterSidebar";
import CoinPriceHeader from "./CoinPriceHeader";
import TriggeredAlertsPanel from "./TriggeredAlertsPanel";
import LatestAlertDisplay from "./LatestAlertDisplay";
import { useAlert } from "../context/AlertContext";
import { useSelectedPair } from "../context/SelectedPairContext";
import io from "socket.io-client";

const Dashboard = ({ children }) => {
  const { alerts } = useAlert();
  const { selectedSymbol, selectedTimeframe, selectSymbol, selectTimeframe } =
    useSelectedPair();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  // Keep local state for backward compatibility, but sync with context
  const [selectedCoin, setSelectedCoin] = useState(selectedSymbol);
  const [localTimeframe, setLocalTimeframe] = useState(selectedTimeframe);
  const [lastTriggeredSymbol, setLastTriggeredSymbol] = useState(null);

  // Mobile responsive state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileBottomNav, setMobileBottomNav] = useState(0);
  const [currentMobileView, setCurrentMobileView] = useState("chart"); // 'chart', 'filters', 'market'

  // Reference to FilterSidebar's createAlert function
  const filterSidebarRef = useRef();
  // Reference to MarketPanel's switchToAlertsView function
  const marketPanelRef = useRef();

  // Show triggered alerts instead of regular alerts
  // This section now displays the TriggeredAlertsPanel component

  // Handle creating alert when favorite is clicked
  const handleCreateAlertFromFavorite = (symbol) => {
    console.log("Creating alert for favorited symbol:", symbol);
    // Trigger FilterSidebar's handleCreateAlert with the selected symbol
    if (
      filterSidebarRef.current &&
      filterSidebarRef.current.handleCreateAlert
    ) {
      filterSidebarRef.current.handleCreateAlert(symbol);
    }
  };

  // Log alerts for debugging
  useEffect(() => {
    console.log("Dashboard - Current alerts state:", alerts);
  }, [alerts]);

  // Set default chart symbol and fetch last triggered alert
  useEffect(() => {
    const initializeChart = async () => {
      try {
        // First, fetch the last triggered alert to prioritize it
        const API_URL =
          process.env.REACT_APP_API_URL || "http://localhost:5000";
        const response = await fetch(
          `${API_URL}/api/triggered-alerts?limit=1&sort=createdAt&order=desc`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.triggeredAlerts && data.triggeredAlerts.length > 0) {
            const lastTriggered = data.triggeredAlerts[0];
            console.log("Last triggered alert:", lastTriggered);
            setLastTriggeredSymbol(lastTriggered.symbol);

            // Always show the chart for the latest triggered alert's pair
            console.log(
              "Setting chart to show latest triggered symbol:",
              lastTriggered.symbol
            );
            setSelectedCoin(lastTriggered.symbol);
            selectSymbol(lastTriggered.symbol);
          } else {
            // No triggered alerts yet, use BTCUSDT as default
            console.log(
              "No triggered alerts found, setting BTCUSDT as default"
            );
            setSelectedCoin("BTCUSDT");
            selectSymbol("BTCUSDT");
          }
        } else {
          // API error, use BTCUSDT as fallback
          console.log("API error, using BTCUSDT as fallback");
          setSelectedCoin("BTCUSDT");
          selectSymbol("BTCUSDT");
        }
      } catch (error) {
        console.error("Error initializing chart:", error);
        // Fallback to BTCUSDT if there's an error
        setSelectedCoin("BTCUSDT");
        selectSymbol("BTCUSDT");
      }
    };

    initializeChart();
  }, []);

  // Set up socket connection to listen for new triggered alerts
  useEffect(() => {
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const socket = io(API_URL);

    // Listen for new triggered alerts
    socket.on("triggered-alert-created", (data) => {
      console.log("📡 Dashboard received new triggered alert:", data);

      if (data.triggeredAlert && data.triggeredAlert.symbol) {
        setLastTriggeredSymbol(data.triggeredAlert.symbol);

        // Automatically switch chart to show the newly triggered symbol
        setSelectedCoin(data.triggeredAlert.symbol);
        selectSymbol(data.triggeredAlert.symbol);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectSymbol]);

  // Handle coin selection from market panel
  const handleCoinSelect = (symbol) => {
    // Ensure symbol is a string, not an object
    const symbolStr =
      typeof symbol === "object"
        ? symbol.symbol || "BTCUSDT" // Extract symbol property if it's an object
        : String(symbol); // Convert to string otherwise

    console.log(`Dashboard: Coin selected from market panel: ${symbolStr}`);
    setSelectedCoin(symbolStr);
    selectSymbol(symbolStr); // Update global context
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    console.log(`Dashboard: Timeframe changed to: ${newTimeframe}`);
    setLocalTimeframe(newTimeframe);
    selectTimeframe(newTimeframe); // Update global context
  };

  // Mobile navigation handlers
  const handleMobileBottomNavChange = (event, newValue) => {
    setMobileBottomNav(newValue);
    switch (newValue) {
      case 0:
        setCurrentMobileView("chart");
        break;
      case 1:
        setCurrentMobileView("filters");
        setMobileDrawerOpen(true);
        break;
      case 2:
        setCurrentMobileView("market");
        setMobileDrawerOpen(true);
        break;
      default:
        setCurrentMobileView("chart");
    }
  };

  const handleMobileDrawerClose = () => {
    setMobileDrawerOpen(false);
  };

  // Mobile view renderer
  const renderMobileView = () => {
    switch (currentMobileView) {
      case "filters":
        return (
          <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
            <FilterSidebar
              ref={filterSidebarRef}
              selectedSymbol={selectedCoin}
              marketPanelRef={marketPanelRef}
            />
          </Box>
        );
      case "market":
        return (
          <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
            <MarketPanel
              onSelectCoin={handleCoinSelect}
              onCreateAlert={handleCreateAlertFromFavorite}
              onRef={(ref) => {
                marketPanelRef.current = ref;
              }}
            />
          </Box>
        );
      default:
        return renderChartView();
    }
  };

  // Chart view renderer
  const renderChartView = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        p: { xs: 1, sm: 0.5 },
      }}
    >
      {/* Latest Alert Display - Shows latest recent alert with chart at the top */}
      <LatestAlertDisplay />

      {/* Coin Price Header - Shows detailed coin price info */}
      {selectedCoin && <CoinPriceHeader symbol={selectedCoin} />}

      {/* Show button to switch to last triggered symbol if different from current */}
      {lastTriggeredSymbol && lastTriggeredSymbol !== selectedCoin && (
        <Box sx={{ mb: 1, textAlign: "center" }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setSelectedCoin(lastTriggeredSymbol);
              selectSymbol(lastTriggeredSymbol);
            }}
            sx={{
              bgcolor: "#22C55E",
              color: "white",
              "&:hover": { bgcolor: "#16A34A" },
              fontSize: "0.75rem",
              py: 0.5,
              px: 2,
            }}
          >
            🔥 Show Last Triggered: {lastTriggeredSymbol}
          </Button>
        </Box>
      )}

      {/* Chart Header - Show if displaying latest triggered alert */}
      {lastTriggeredSymbol === selectedCoin && (
        <Box
          sx={{
            mb: 1,
            p: 1.5,
            bgcolor: "rgba(34, 197, 94, 0.1)",
            borderRadius: 1,
            border: "1px solid rgba(34, 197, 94, 0.3)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "#22C55E", fontWeight: "bold" }}
          >
            📊 Chart showing latest triggered alert pair: {selectedCoin}
          </Typography>
        </Box>
      )}

      {/* LineChart with selected coin */}
      <LineChart
        symbol={selectedCoin}
        timeframe={localTimeframe}
        onTimeframeChange={handleTimeframeChange}
      />

      {/* Bottom area - Alerts List */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          borderRadius: 1,
          bgcolor: "#0A0E17",
          p: 1,
          mt: 1,
        }}
      >
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "rgba(34, 197, 94, 0.1)",
            borderRadius: 2,
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <Typography variant="body2" sx={{ color: "#22C55E" }}>
            📈 Triggered Alerts History - Only shows alerts that have been
            activated
          </Typography>
        </Box>

        {/* Triggered Alerts Panel - Only shows alerts that have been triggered */}
        <Box
          sx={{
            mt: 1,
            height: { xs: "calc(100vh - 400px)", sm: "calc(100vh - 350px)" },
            overflow: "hidden",
          }}
        >
          <TriggeredAlertsPanel />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#0A0E17",
        display: "flex",
        flexDirection: "column",
        m: 0,
        p: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Desktop Layout */}
      {!isMobile ? (
        <Grid
          container
          spacing={0}
          sx={{
            flexGrow: 1,
            height: "100%",
            overflow: "hidden",
            m: 0,
            p: 0,
            maxWidth: "100%",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Left Section - Filters Sidebar */}
          <Grid
            item
            xs={12}
            md={3}
            lg={3}
            sx={{
              height: "100vh",
              overflow: "hidden",
              display: { xs: "none", md: "block" },
              p: 0,
              maxWidth: "25%",
              flexBasis: "25%",
              boxSizing: "border-box",
            }}
          >
            <Paper
              sx={{
                p: 1,
                height: "100%",
                overflow: "auto",
                bgcolor: "#0A0E17",
                borderRadius: 0,
                m: 0,
              }}
            >
              <FilterSidebar
                ref={filterSidebarRef}
                selectedSymbol={selectedCoin}
                marketPanelRef={marketPanelRef}
              />
            </Paper>
          </Grid>

          {/* Main Section - Chart and Alerts */}
          <Grid
            item
            xs={12}
            md={6}
            lg={6}
            sx={{
              height: "100vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              p: 0,
              maxWidth: "50%",
              flexBasis: "50%",
              boxSizing: "border-box",
            }}
          >
            {renderChartView()}
          </Grid>

          {/* Right Section - Market Panel */}
          <Grid
            item
            xs={12}
            md={3}
            lg={3}
            sx={{
              height: "100vh",
              overflow: "hidden",
              display: { xs: "none", md: "block" },
              p: 0,
              maxWidth: "25%",
              flexBasis: "25%",
              boxSizing: "border-box",
            }}
          >
            <Paper
              sx={{
                p: 1,
                height: "100%",
                overflow: "auto",
                bgcolor: "#0A0E17",
                borderRadius: 0,
                m: 0,
              }}
            >
              <MarketPanel
                onSelectCoin={handleCoinSelect}
                onCreateAlert={handleCreateAlertFromFavorite}
                onRef={(ref) => {
                  marketPanelRef.current = ref;
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      ) : (
        /* Mobile Layout */
        <Box
          sx={{
            flexGrow: 1,
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            pb: 7, // Space for bottom navigation
          }}
        >
          {/* Mobile Header with Menu Button */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1,
              bgcolor: "rgba(0, 0, 0, 0.2)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              sx={{ color: "white", mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: "white", flexGrow: 1 }}>
              {currentMobileView === "chart"
                ? "Trading Dashboard"
                : currentMobileView === "filters"
                ? "Filters"
                : "Market"}
            </Typography>
          </Box>

          {/* Mobile Content Area */}
          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            {renderMobileView()}
          </Box>

          {/* Mobile Bottom Navigation */}
          <BottomNavigation
            value={mobileBottomNav}
            onChange={handleMobileBottomNavChange}
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: "#0A0E17",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              zIndex: 1000,
              "& .MuiBottomNavigationAction-root": {
                color: "rgba(255, 255, 255, 0.6)",
                "&.Mui-selected": {
                  color: "#22C55E",
                },
              },
            }}
          >
            <BottomNavigationAction label="Chart" icon={<TrendingUpIcon />} />
            <BottomNavigationAction label="Filters" icon={<FilterListIcon />} />
            <BottomNavigationAction label="Market" icon={<ListIcon />} />
          </BottomNavigation>
        </Box>
      )}

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={handleMobileDrawerClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "100%", sm: "400px" },
            bgcolor: "#0A0E17",
            color: "white",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <IconButton
            onClick={handleMobileDrawerClose}
            sx={{ color: "white", mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: "white" }}>
            {currentMobileView === "filters"
              ? "Filters & Alerts"
              : "Market Panel"}
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          {currentMobileView === "filters" ? (
            <FilterSidebar
              ref={filterSidebarRef}
              selectedSymbol={selectedCoin}
              marketPanelRef={marketPanelRef}
            />
          ) : (
            <MarketPanel
              onSelectCoin={handleCoinSelect}
              onCreateAlert={handleCreateAlertFromFavorite}
              onRef={(ref) => {
                marketPanelRef.current = ref;
              }}
            />
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Dashboard;
