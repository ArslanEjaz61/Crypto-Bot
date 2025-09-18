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
          const data = await response.json();
          if (data.triggeredAlerts && data.triggeredAlerts.length > 0) {
            setLatestAlert(data.triggeredAlerts[0]);
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
      setLatestAlert(data.triggeredAlert);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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

        const data = await response.json();
        console.log("📊 Chart API Response:", data);

        if (!data || data.length === 0) {
          setError("No data available");
          setLoading(false);
          return;
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
      {/* Top Section - Pair Name, Alert Details, Volume, Price, Time, Date */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: { xs: 1, sm: 2 },
          mb: 2,
          p: 2,
          bgcolor: "#0A0E17",
          borderRadius: 1,
          color: "white",
        }}
      >
        {/* Pair Name */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: "#E2E8F0",
            fontSize: { xs: "1rem", sm: "1.25rem" },
          }}
        >
          {symbol || "Select a coin"}
        </Typography>

        {/* Separator */}
        <Typography sx={{ color: "#6B7280" }}>|</Typography>

        {/* Alert Details */}
        {latestAlert && (
          <>
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              {latestAlert.conditionDetails?.description ||
                latestAlert.conditionMet ||
                "Alert triggered"}
              {latestAlert.changePercentTimeframe && (
                <span style={{ marginLeft: "8px", color: "#60A5FA" }}>
                  | Timeframe: {latestAlert.changePercentTimeframe}
                </span>
              )}
            </Typography>

            {/* Separator */}
            <Typography sx={{ color: "#6B7280" }}>|</Typography>
          </>
        )}

        {/* Alert Details - Target, Actual, Timeframe */}
        {latestAlert && latestAlert.conditionDetails && (
          <>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#94A3B8", display: "block" }}
              >
                Alert Details
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#E2E8F0", fontWeight: "bold" }}
              >
                Target: {latestAlert.conditionDetails.targetValue} | Actual:{" "}
                {latestAlert.conditionDetails.actualValue}
                {latestAlert.conditionDetails.timeframe &&
                  ` | Timeframe: ${latestAlert.conditionDetails.timeframe}`}
              </Typography>
            </Box>

            {/* Separator */}
            <Typography sx={{ color: "#6B7280" }}>|</Typography>
          </>
        )}

        {/* Volume */}
        {latestAlert && (
          <>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#94A3B8", display: "block" }}
              >
                Volume (24h)
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#E2E8F0", fontWeight: "bold" }}
              >
                ${formatNumber(latestAlert.marketData?.volume || 0)}
              </Typography>
            </Box>

            {/* Separator */}
            <Typography sx={{ color: "#6B7280" }}>|</Typography>
          </>
        )}

        {/* Last Price */}
        {latestAlert && (
          <>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#94A3B8", display: "block" }}
              >
                Last Price
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#E2E8F0", fontWeight: "bold" }}
              >
                $
                {latestAlert.marketData?.price
                  ? latestAlert.marketData.price.toFixed(4)
                  : latestAlert.conditionDetails?.actualValue
                  ? parseFloat(
                      latestAlert.conditionDetails.actualValue
                    ).toFixed(4)
                  : "0.0000"}
              </Typography>
            </Box>

            {/* Separator */}
            <Typography sx={{ color: "#6B7280" }}>|</Typography>
          </>
        )}

        {/* Time */}
        {latestAlert && (
          <>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "#94A3B8", display: "block" }}
              >
                Time
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#E2E8F0", fontWeight: "bold" }}
              >
                {format(new Date(latestAlert.triggeredAt), "HH:mm:ss")}
              </Typography>
            </Box>

            {/* Separator */}
            <Typography sx={{ color: "#6B7280" }}>|</Typography>
          </>
        )}

        {/* Date */}
        {latestAlert && (
          <Box>
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", display: "block" }}
            >
              Date
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "#E2E8F0", fontWeight: "bold" }}
            >
              {format(new Date(latestAlert.triggeredAt), "MMM dd, yyyy")}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Timeframe Buttons */}
      {symbol && (
        <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
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

      <Box sx={{ mt: 1, textAlign: "center" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
        >
          Powered by TradingView Lightweight Charts
        </Typography>
      </Box>
    </Paper>
  );
};

export default LineChart;
