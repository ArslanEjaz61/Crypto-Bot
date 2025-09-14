import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Link,
  Button,
  ButtonGroup,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import TimelineIcon from "@mui/icons-material/Timeline";
import { useFilters } from "../context/FilterContext";
// Import all required modules from lightweight-charts
import * as LightweightCharts from "lightweight-charts";

const CoinAlertChart = ({
  symbol,
  timeframe = "1h",
  meetsConditions = false,
  onTimeframeChange,
}) => {
  const { filters, getValidationFilters } = useFilters();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alertLevels, setAlertLevels] = useState(null);

  // Extract alert levels from filters
  useEffect(() => {
    if (!filters) return;

    // Extract price levels from filters that can be visualized on the chart
    const validationFilters = getValidationFilters();
    const levels = {};

    if (validationFilters.price) {
      if (validationFilters.price.min) {
        levels.support = validationFilters.price.min;
      }
      if (validationFilters.price.max) {
        levels.resistance = validationFilters.price.max;
      }
    }

    setAlertLevels(levels);
  }, [filters, getValidationFilters]);

  // Fetch chart data
  useEffect(() => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    // Fetch chart data from our API endpoint that connects to Binance
    console.log(
      `Fetching chart data for ${symbol} with timeframe ${timeframe}`
    );
    fetch(`/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.length > 0) {
          setChartData(data);
        } else {
          setError("No chart data available");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching chart data:", err);
        setError(`Failed to load chart data: ${err.message}`);
        setLoading(false);
      });

    return () => {
      // Cleanup function if needed
    };
  }, [symbol, timeframe]);

  // Initialize and update chart
  useEffect(() => {
    if (
      !chartContainerRef.current ||
      loading ||
      error ||
      chartData.length === 0
    )
      return;

    // Clear any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create new chart with proper API usage for v5+
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: "#1c252b" },
        textColor: "#d9d9d9",
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      timeScale: {
        borderColor: "#2c3940",
        timeVisible: true,
      },
      // Add attribution as required by the license
      attributionLogo: {
        visible: true,
      },
    });

    // Add candlestick series using proper API method
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#9acd32",
      downColor: "#ff4500",
      borderVisible: false,
      wickUpColor: "#9acd32",
      wickDownColor: "#ff4500",
    });

    console.log("Candlestick series created:", candleSeries);

    // Add price line markers for alert conditions if available
    if (alertLevels) {
      if (alertLevels.support) {
        candleSeries.createPriceLine({
          price: alertLevels.support,
          color: "#4CAF50",
          lineWidth: 2,
          lineStyle: 2, // Dashed line
          axisLabelVisible: true,
          title: "Support Level",
        });
      }

      if (alertLevels.resistance) {
        candleSeries.createPriceLine({
          price: alertLevels.resistance,
          color: "#FF5252",
          lineWidth: 2,
          lineStyle: 2, // Dashed line
          axisLabelVisible: true,
          title: "Resistance Level",
        });
      }
    }

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: "#3875d7",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Set data with verification
    console.log("Setting chart data:", chartData);
    try {
      // Ensure data is properly formatted for chart
      // Lightweight Charts v5 requires the time format to be in specific formats
      // For UTC timestamp in seconds: time needs integer timestamp
      const formattedData = chartData.map((item) => ({
        // Convert to proper time format for Lightweight Charts v5
        time:
          typeof item.time === "number"
            ? item.time
            : Math.floor(new Date(item.time).getTime() / 1000),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      }));

      console.log("Formatted data sample:", formattedData[0]);
      candleSeries.setData(formattedData);
    } catch (err) {
      console.error("Error setting candlestick data:", err);
    }
    try {
      const volumeData = chartData.map((item) => ({
        // Match the time format used in candlestick data
        time:
          typeof item.time === "number"
            ? item.time
            : Math.floor(new Date(item.time).getTime() / 1000),
        value: Number(item.volume),
        color: Number(item.close) > Number(item.open) ? "#9acd32" : "#ff4500",
      }));

      console.log("Volume data sample:", volumeData[0]);
      volumeSeries.setData(volumeData);
    } catch (err) {
      console.error("Error setting volume data:", err);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Save chart reference
    chartRef.current = chart;

    // Handle resize
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (chartRef.current && entries[0].contentRect) {
        chartRef.current.applyOptions({
          width: entries[0].contentRect.width,
          height: 400,
        });
        chartRef.current.timeScale().fitContent();
      }
    });

    resizeObserverRef.current.observe(chartContainerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [chartData, loading, error]);

  const handleTimeframeChange = (newTimeframe) => {
    // Store the last selected timeframe in session storage
    if (typeof window !== "undefined") {
      sessionStorage.setItem("preferredTimeframe", newTimeframe);
    }

    // Call the parent component's callback to update the timeframe
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: "background.paper", borderRadius: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography variant="h6" component="h3">
            {symbol} Chart - {timeframe.toUpperCase()}
          </Typography>
          {meetsConditions && (
            <Chip
              icon={<NotificationsActiveIcon />}
              label="Alert Condition Met"
              color="warning"
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        <ButtonGroup size="small" aria-label="timeframe selection">
          <Button
            variant={timeframe === "5m" ? "contained" : "outlined"}
            onClick={() => handleTimeframeChange("5m")}
          >
            5M
          </Button>
          <Button
            variant={timeframe === "15m" ? "contained" : "outlined"}
            onClick={() => handleTimeframeChange("15m")}
          >
            15M
          </Button>
          <Button
            variant={timeframe === "1h" ? "contained" : "outlined"}
            onClick={() => handleTimeframeChange("1h")}
          >
            1H
          </Button>
          <Button
            variant={timeframe === "4h" ? "contained" : "outlined"}
            onClick={() => handleTimeframeChange("4h")}
          >
            4H
          </Button>
          <Button
            variant={timeframe === "1d" ? "contained" : "outlined"}
            onClick={() => handleTimeframeChange("1d")}
          >
            1D
          </Button>
        </ButtonGroup>
      </Box>

      <Box
        ref={chartContainerRef}
        sx={{
          width: "100%",
          height: 400,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Typography color="error.main">{error}</Typography>
        )}

        {!loading && !error && chartData.length === 0 && (
          <Typography>No chart data available</Typography>
        )}
      </Box>

      {/* TradingView attribution as required by license */}
      <Box
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Charts powered by{" "}
          <Link
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noopener"
            underline="hover"
          >
            TradingView Lightweight Charts™
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default CoinAlertChart;
