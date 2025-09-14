import React, { useEffect, useRef } from "react";
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import * as LightweightCharts from "lightweight-charts";

// Create the most minimal chart possible to avoid DOM issues
const MinimalChart = ({ symbol, timeframe = "1h" }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    // Fetch data and create chart only when needed
    if (symbol && containerRef.current) {
      fetchDataAndCreateChart();
    }

    return () => {
      // Cleanup properly when component unmounts
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          console.error("Error cleaning up chart:", error);
        }
        chartRef.current = null;
      }
    };
  }, [symbol, timeframe]); // Re-run when symbol or timeframe changes

  const fetchDataAndCreateChart = async () => {
    try {
      // Show loading indicator
      const loadingIndicator = document.createElement("div");
      loadingIndicator.textContent = "Loading...";
      loadingIndicator.style.color = "white";
      loadingIndicator.style.position = "absolute";
      loadingIndicator.style.top = "50%";
      loadingIndicator.style.left = "50%";
      loadingIndicator.style.transform = "translate(-50%, -50%)";

      // Clear container and add loading indicator
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(loadingIndicator);
      }

      // Fetch data from API
      console.log(`Fetching data for ${symbol} with timeframe ${timeframe}...`);
      const response = await fetch(
        `/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        throw new Error("No chart data available");
      }

      // Make sure container is still available (component might have unmounted)
      if (!containerRef.current) return;

      // Clear container before creating chart
      containerRef.current.innerHTML = "";

      // Create chart with minimal options
      const chart = LightweightCharts.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 400,
        layout: { textColor: "#d1d4dc", background: { color: "#222" } },
        grid: {
          vertLines: { color: "transparent" },
          horzLines: { color: "transparent" },
        },
        timeScale: { timeVisible: true, borderColor: "#444" },
      });

      // Store reference to chart for cleanup
      chartRef.current = chart;

      // Create series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });

      // Format data properly
      const formattedData = data.map((item) => ({
        time:
          typeof item.time === "number"
            ? item.time
            : Math.floor(new Date(item.time).getTime() / 1000),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      }));

      // Set data
      candlestickSeries.setData(formattedData);

      // Fit content
      chart.timeScale().fitContent();

      console.log(
        `Chart created successfully with ${formattedData.length} candles`
      );
    } catch (error) {
      console.error("Error creating chart:", error);

      // Show error message in container
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="color: #ff4455; text-align: center; padding: 20px;">
          Error loading chart: ${error.message}
        </div>`;
      }
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: "background.paper", borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {symbol
          ? `${symbol} Chart (${timeframe})`
          : "Select a coin to view chart"}
      </Typography>

      <Box
        ref={containerRef}
        sx={{
          width: "100%",
          height: 400,
          bgcolor: "#222",
          position: "relative",
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      />

      <Box sx={{ mt: 1, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          Powered by TradingView Lightweight Charts
        </Typography>
      </Box>
    </Paper>
  );
};

export default MinimalChart;
