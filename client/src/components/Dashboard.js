import React, { useState, useEffect, useMemo, useRef } from "react";
import { Box, Grid, Paper, Typography, Button } from "@mui/material";
import LineChart from "./LineChart.js";
import CryptoList from "./CryptoList";
import MarketPanel from "./MarketPanel";
import FilterSidebar from "./FilterSidebar";
import CoinPriceHeader from "./CoinPriceHeader";
import TriggeredAlertsPanel from "./TriggeredAlertsPanel";
import { useAlert } from "../context/AlertContext";
import { useSelectedPair } from "../context/SelectedPairContext";
import io from "socket.io-client";

const Dashboard = ({ children }) => {
  const { alerts } = useAlert();
  const { selectedSymbol, selectedTimeframe, selectSymbol, selectTimeframe } =
    useSelectedPair();

  // Keep local state for backward compatibility, but sync with context
  const [selectedCoin, setSelectedCoin] = useState(selectedSymbol);
  const [localTimeframe, setLocalTimeframe] = useState(selectedTimeframe);
  const [lastTriggeredSymbol, setLastTriggeredSymbol] = useState(null);

  // Reference to FilterSidebar's createAlert function
  const filterSidebarRef = useRef();

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
        // First, set BTCUSDT as default if no symbol is selected
        if (!selectedCoin) {
          console.log("Setting BTCUSDT as default chart symbol");
          setSelectedCoin("BTCUSDT");
          selectSymbol("BTCUSDT");
        }

        // Then fetch the last triggered alert
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

            // If we just set BTCUSDT as default, switch to the last triggered symbol
            if (selectedCoin === "BTCUSDT" || !selectedCoin) {
              console.log(
                "Switching from default to last triggered symbol:",
                lastTriggered.symbol
              );
              setSelectedCoin(lastTriggered.symbol);
              selectSymbol(lastTriggered.symbol);
            }
          }
        }
      } catch (error) {
        console.error("Error initializing chart:", error);
        // Fallback to BTCUSDT if there's an error
        if (!selectedCoin) {
          setSelectedCoin("BTCUSDT");
          selectSymbol("BTCUSDT");
        }
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

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "#0A0E17",
        display: "flex",
        flexDirection: "column",
        m: 0,
        p: 0,
      }}
    >
      <Grid
        container
        spacing={0}
        sx={{
          flexGrow: 1,
          height: "100%",
          overflow: "hidden",
          m: 0,
          p: 0,
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
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              p: 0.5,
            }}
          >
            {/* Coin Price Header - Shows detailed coin price info */}
            {selectedCoin && (
              <Box sx={{ position: "relative" }}>
                <CoinPriceHeader symbol={selectedCoin} />
                {/* Show indicator if this is the last triggered symbol */}
                {lastTriggeredSymbol === selectedCoin && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      bgcolor: "#22C55E",
                      color: "white",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      zIndex: 1,
                    }}
                  >
                    🔥 TRIGGERED
                  </Box>
                )}
              </Box>
            )}

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

            {/* LineChart with selected coin */}
            <LineChart
              symbol={selectedCoin}
              timeframe={localTimeframe}
              onTimeframeChange={handleTimeframeChange}
            />

            {/* Chart Summary removed as requested */}

            {/* Bottom area - Alerts List */}
            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                borderRadius: 1,
                bgcolor: "#0A0E17",
                p: 1,
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
                  height: "calc(100vh - 350px)",
                  overflow: "hidden",
                }}
              >
                <TriggeredAlertsPanel />
              </Box>
            </Box>
          </Box>
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
              filterSidebarRef={filterSidebarRef}
            />
          </Paper>
        </Grid>

        {/* Mobile Controls - Only visible on mobile */}
        <Grid
          item
          xs={12}
          sx={{
            display: { xs: "flex", md: "none" },
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            bgcolor: "#0A0E17",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            p: 1,
            justifyContent: "space-around",
          }}
        >
          <Button
            variant="contained"
            size="small"
            sx={{ flex: 1, mr: 1 }}
            onClick={() =>
              document.querySelector(".filter-sidebar-mobile")?.scrollIntoView()
            }
          >
            Filters
          </Button>
          <Button
            variant="contained"
            size="small"
            sx={{ flex: 1, mx: 1 }}
            onClick={() =>
              document.querySelector(".chart-section")?.scrollIntoView()
            }
          >
            Chart
          </Button>
          <Button
            variant="contained"
            size="small"
            sx={{ flex: 1, ml: 1 }}
            onClick={() =>
              document.querySelector(".market-panel-mobile")?.scrollIntoView()
            }
          >
            Market
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
