import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  ButtonGroup,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { createChart, LineSeries } from "lightweight-charts";
import { format } from "date-fns";

// Available timeframes
const TIMEFRAMES = [
  { value: "1m", label: "1M", limit: 1000 },
  { value: "5m", label: "5M", limit: 200 },
  { value: "15m", label: "15M", limit: 200 },
  { value: "30m", label: "30M", limit: 200 },
  { value: "1h", label: "1H", limit: 1000 },
  { value: "4h", label: "4H", limit: 1000 },
  { value: "1d", label: "1D", limit: 365 },
];

// Line chart component using named imports
const LineChart = ({
  symbol,
  timeframe: propTimeframe = "1h",
  onTimeframeChange,
  onSymbolChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(propTimeframe);
  const [latestAlert, setLatestAlert] = useState(null);
  const [livePrice, setLivePrice] = useState(null);
  const [isShowingTriggeredAlert, setIsShowingTriggeredAlert] = useState(false);
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);

  // Get the current timeframe config
  const currentTimeframeConfig =
    TIMEFRAMES.find((tf) => tf.value === selectedTimeframe) || TIMEFRAMES[4]; // Default to 1h

  // Fetch latest alert and set up real-time updates
  useEffect(() => {
    const fetchLatestAlert = async () => {
      try {
        const API_URL =
          process.env.REACT_APP_API_URL || "http://localhost:5000";
        const response = await fetch(
          `${API_URL}/api/triggered-alerts?limit=1&sort=createdAt&order=desc`
        );
        if (response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.triggeredAlerts && data.triggeredAlerts.length > 0) {
              setLatestAlert(data.triggeredAlerts[0]);
              console.log(
                "📊 Chart loaded latest alert:",
                data.triggeredAlerts[0]
              );
            }
          } else {
            console.warn("📊 Triggered alerts API returned non-JSON response");
          }
        }
      } catch (error) {
        console.error("Error fetching latest alert:", error);
      }
    };

    fetchLatestAlert();

    // Set up Socket.IO connection for real-time updates
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const io = require("socket.io-client");
    const socket = io(API_URL);

    // Listen for new triggered alerts
    socket.on("triggered-alert-created", (data) => {
      console.log("📡 Chart received new triggered alert via socket:", data);

      // Always update the latest alert data for real-time display
      if (data.triggeredAlert) {
        setLatestAlert(data.triggeredAlert);
        console.log(
          "📊 Chart updated with new triggered alert data:",
          data.triggeredAlert
        );

        // Automatically switch to the triggered symbol if onSymbolChange is provided
        if (onSymbolChange && data.triggeredAlert.symbol !== symbol) {
          console.log(
            "🔄 Auto-switching chart to triggered symbol:",
            data.triggeredAlert.symbol
          );
          onSymbolChange(data.triggeredAlert.symbol);
          setIsShowingTriggeredAlert(true);
        }

        // Update live price if this is the current symbol
        if (data.triggeredAlert.symbol === symbol) {
          console.log(
            "🔥 Chart is now showing LIVE data for triggered symbol:",
            symbol
          );
          setLivePrice(
            data.triggeredAlert.marketData?.price ||
              data.triggeredAlert.conditionDetails?.actualValue
          );
          setIsShowingTriggeredAlert(true);
        }
      }
    });

    // Listen for live price updates (if available)
    socket.on("price-update", (data) => {
      if (data.symbol === symbol && data.price) {
        setLivePrice(data.price);
        console.log("💰 Live price update for", symbol, ":", data.price);

        // Update chart with new price data in real-time
        if (seriesRef.current && data.timestamp) {
          const newDataPoint = {
            time: Math.floor(Date.now() / 1000), // Current timestamp in seconds
            value: data.price,
          };

          try {
            seriesRef.current.update(newDataPoint);
            console.log("📈 Chart updated with real-time price:", data.price);
          } catch (error) {
            console.error("Error updating chart with real-time data:", error);
          }
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [symbol]);

  // Helper function to format numbers
  const formatNumber = (num) => {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(1) + "B";
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(1) + "M";
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(1) + "K";
    }
    return num.toFixed(0);
  };

  // Use a key to force remounting when symbol/timeframe changes
  const chartKey = `${symbol || "none"}-${selectedTimeframe}`;

  // Debug changes to selectedTimeframe
  useEffect(() => {
    console.log(`LineChart: selectedTimeframe changed to ${selectedTimeframe}`);
  }, [selectedTimeframe]);

  // Debug changes to propTimeframe
  useEffect(() => {
    console.log(`LineChart: propTimeframe changed to ${propTimeframe}`);
  }, [propTimeframe]);

  // Debug changes to symbol prop
  useEffect(() => {
    console.log(`LineChart: symbol prop changed to ${symbol}`);
  }, [symbol]);

  // Reset state when chart key changes
  useEffect(() => {
    console.log(`LineChart: chartKey changed to ${chartKey}`);
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }
    if (seriesRef.current) {
      seriesRef.current = null;
    }
    setLoading(true);
    setError(null);
    setIsShowingTriggeredAlert(false); // Reset triggered alert state
    setIsUsingFallbackData(false); // Reset fallback data state
  }, [chartKey]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback(
    (newTimeframe) => {
      console.log(
        `LineChart: Changing timeframe from ${selectedTimeframe} to ${newTimeframe}`
      );

      // Update local state
      setSelectedTimeframe(newTimeframe);

      // Notify parent component
      if (onTimeframeChange) {
        console.log("LineChart: Notifying parent of timeframe change");
        onTimeframeChange(newTimeframe);
      } else {
        console.warn("LineChart: No onTimeframeChange handler provided");
      }
    },
    [selectedTimeframe, onTimeframeChange]
  );

  // Effect to update selected timeframe when prop changes
  useEffect(() => {
    if (propTimeframe !== selectedTimeframe) {
      console.log(
        `LineChart: Updating selectedTimeframe from ${selectedTimeframe} to ${propTimeframe} (from props)`
      );
      setSelectedTimeframe(propTimeframe);
    }
  }, [propTimeframe, selectedTimeframe]);

  useEffect(() => {
    if (!symbol || !containerRef.current) return;

    const fetchDataAndRenderChart = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the limit for the selected timeframe
        const limit = currentTimeframeConfig.limit;

        // Ensure symbol is a string, not an object
        const symbolStr =
          typeof symbol === "object"
            ? symbol.symbol || "BTCUSDT" // Extract symbol property if it's an object
            : String(symbol); // Convert to string otherwise

        console.log(
          `Fetching data for ${symbolStr} (${selectedTimeframe}), limit: ${limit}...`
        );
        const apiUrl = `/api/crypto/${symbolStr}/chart?timeframe=${selectedTimeframe}&limit=${limit}`;
        console.log("📊 Chart API URL:", apiUrl);
        const response = await fetch(apiUrl);

        if (!response.ok) {
          console.error(
            "📊 Chart API Error:",
            response.status,
            response.statusText
          );
          throw new Error(
            `API error: ${response.status} - ${response.statusText}`
          );
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error("📊 Chart API returned non-JSON response:", contentType);
          throw new Error("Server returned HTML instead of JSON");
        }

        const data = await response.json();
        console.log("📊 Chart API Response:", data);

        if (!data || data.length === 0) {
          setError("No data available");
          setLoading(false);
          return;
        }

        // Check if we're using fallback data
        if (data._fallback) {
          console.warn(
            "⚠️ Using fallback chart data due to API connectivity issues"
          );
          setIsUsingFallbackData(true);
        } else {
          setIsUsingFallbackData(false);
        }

        console.log(`Received ${data.length} data points for ${symbol}`);

        // Clean up previous chart if it exists
        if (chartRef.current) {
          console.log("Removing previous chart");
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }

        console.log("Creating new line chart");

        // Create chart using named import style
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { color: "#222" },
            textColor: "#DDD",
          },
          grid: {
            vertLines: { color: "transparent" },
            horzLines: { color: "transparent" },
          },
          timeScale: {
            timeVisible: true,
            borderColor: "#444",
          },
        });

        chartRef.current = chart;

        // Create line series using addSeries with LineSeries
        const series = chart.addSeries(LineSeries, {
          color: "#2962FF",
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 6,
        });

        seriesRef.current = series;

        // Debug the incoming data
        console.log(
          `Processing ${data.length} data points for timeframe ${selectedTimeframe}`
        );
        console.log(
          "Sample timestamps:",
          data.slice(0, 5).map((item) => item.time)
        );

        // Format data based on timeframe
        // For shorter timeframes (< 1h), we need more precise time format
        let formattedData = data.map((item) => {
          // Convert timestamp to appropriate format based on timeframe
          let dateObj;
          if (typeof item.time === "number") {
            dateObj = new Date(item.time * 1000); // If seconds timestamp
            if (!isFinite(dateObj)) {
              // If milliseconds timestamp
              dateObj = new Date(item.time);
            }
          } else {
            dateObj = new Date(item.time);
          }

          // Always use YYYY-MM-DD format as required by Lightweight Charts
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          const timeString = `${year}-${month}-${day}`;

          return {
            time: timeString,
            value: Number(item.close),
            originalTime: item.time, // Keep original for debugging
          };
        });

        // Remove duplicates by time value - keep the latest entry for each timestamp
        const timeMap = new Map();
        for (const item of formattedData) {
          // For each day, keep the last value
          timeMap.set(item.time, item);
        }
        formattedData = Array.from(timeMap.values());

        // Sort by time string to ensure ascending order
        formattedData.sort((a, b) => a.time.localeCompare(b.time));

        // Debug the processed data
        console.log(
          "Processed data (after deduplication):",
          formattedData.length,
          "items, first 5:",
          formattedData.slice(0, 5)
        );

        console.log("Using strict YYYY-MM-DD format for all data points");

        // Remove debug property before sending to chart
        formattedData = formattedData.map(({ time, value }) => ({
          time,
          value,
        }));

        // Set data
        series.setData(formattedData);

        // Fit content
        chart.timeScale().fitContent();

        console.log("Line chart rendered successfully");
        setLoading(false);
      } catch (err) {
        console.error("Chart error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDataAndRenderChart();

    // Clean up on unmount
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        } catch (err) {
          console.error("Error removing chart:", err);
        }
      }
    };
  }, [symbol, selectedTimeframe, currentTimeframeConfig]);

  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 2 },
        mb: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      {/* Timeframe Buttons */}
      {symbol && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* Left side - Price, Time, Date, Symbol and Volume */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0.5,
            }}
          >
            {/* Symbol and Volume */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ color: "#E2E8F0", fontWeight: "bold" }}
              >
                {symbol}
              </Typography>
              {isUsingFallbackData && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "#F59E0B",
                    fontSize: "0.6rem",
                    bgcolor: "rgba(245, 158, 11, 0.1)",
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  ⚠️ DEMO DATA
                </Typography>
              )}
            </Box>
            {latestAlert && (
              <Typography
                variant="caption"
                sx={{
                  color: "#94A3B8",
                  fontWeight: "normal",
                }}
              >
                Volume (24h): $
                {formatNumber(latestAlert.marketData?.volume || 0)}
                {latestAlert.symbol === symbol}
              </Typography>
            )}
          </Box>
          {/* Right side - Timeframe Buttons */}
          <ButtonGroup
            size="small"
            aria-label="timeframe selection"
            sx={{
              "& .MuiButton-root": {
                minWidth: "50px",
                fontSize: "0.75rem",
                py: 0.5,
              },
            }}
          >
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                variant={
                  selectedTimeframe === tf.value ? "contained" : "outlined"
                }
              >
                {tf.label}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
      )}

      {/* Chart */}
      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: { xs: 250, sm: 300, md: 400 },
          bgcolor: "#222",
          position: "relative",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: isShowingTriggeredAlert
            ? "2px solid #10B981"
            : "2px solid transparent",
          boxShadow: isShowingTriggeredAlert
            ? "0 0 20px rgba(16, 185, 129, 0.3)"
            : "none",
          transition: "all 0.3s ease-in-out",
        }}
      >
        {loading && (
          <CircularProgress
            size={isMobile ? 30 : 40}
            sx={{ color: "primary.main" }}
          />
        )}

        {!loading && error && (
          <Typography
            color="error"
            sx={{
              p: 2,
              fontSize: { xs: "0.875rem", sm: "1rem" },
              textAlign: "center",
            }}
          >
            {error}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          mt: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left side - Alert Details */}
        {latestAlert && latestAlert.conditionDetails && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "#94A3B8",
                fontSize: "0.7rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              🚨 Alert Triggered - {latestAlert.symbol}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#E2E8F0", fontWeight: "bold", fontSize: "0.8rem" }}
            >
              Target: {latestAlert.conditionDetails.targetValue} | Actual:{" "}
              {latestAlert.conditionDetails.actualValue} | Timeframe:{" "}
              {latestAlert.conditionDetails.timeframe}
            </Typography>
            {/* {latestAlert.conditionDetails.description && (
              <Typography
                variant="caption"
                sx={{
                  color: "#10B981",
                  fontSize: "0.65rem",
                  display: "block",
                  mt: 0.5,
                }}
              >
                {latestAlert.conditionDetails.description}
              </Typography>
            )} */}
          </Box>
        )}

        {/* Right side - Price, Time, Date, Volume */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Last Price */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "0.7rem" }}
            >
              Last Price
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#E2E8F0",
                fontWeight: "bold",
                fontSize: "0.8rem",
              }}
            >
              $
              {livePrice ||
                latestAlert?.marketData?.price ||
                latestAlert?.conditionDetails?.actualValue ||
                "0.0000"}
            </Typography>
            {/* {latestAlert?.marketData?.priceChangePercent24h && (
              <Typography
                variant="caption"
                sx={{
                  color:
                    latestAlert.marketData.priceChangePercent24h >= 0
                      ? "#10B981"
                      : "#EF4444",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                }}
              >
                {latestAlert.marketData.priceChangePercent24h >= 0 ? "+" : ""}
                {latestAlert.marketData.priceChangePercent24h.toFixed(2)}%
              </Typography>
            )} */}
          </Box>

          {/* Divider */}
          <Typography variant="body2" sx={{ color: "#E2E8F0" }}>
            |
          </Typography>

          {/* Time */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "0.7rem" }}
            >
              Time
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#E2E8F0",
                fontWeight: "bold",
                fontSize: "0.8rem",
              }}
            >
              {latestAlert
                ? format(new Date(latestAlert.triggeredAt), "HH:mm:ss")
                : "00:00:00"}
            </Typography>
          </Box>

          {/* Divider */}
          <Typography variant="body2" sx={{ color: "#E2E8F0" }}>
            |
          </Typography>

          {/* Date */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "0.7rem" }}
            >
              Date
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#E2E8F0",
                fontWeight: "bold",
                fontSize: "0.8rem",
              }}
            >
              {latestAlert
                ? format(new Date(latestAlert.triggeredAt), "MMM dd, yyyy")
                : "Jan 01, 2025"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default LineChart;
