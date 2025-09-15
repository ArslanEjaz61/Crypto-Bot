import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import InfoIcon from "@mui/icons-material/Info";
import { format } from "date-fns";

const LatestAlertDisplay = () => {
  const [latestAlert, setLatestAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLatestAlert();

    // Set up Socket.IO connection for real-time updates
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const io = require("socket.io-client");
    const socket = io(API_URL);

    // Listen for new triggered alerts
    socket.on("triggered-alert-created", (data) => {
      console.log("📡 Received new triggered alert via socket:", data);
      setLatestAlert(data.triggeredAlert);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchLatestAlert = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

      const response = await fetch(
        `${API_URL}/api/triggered-alerts?limit=1&sort=createdAt&order=desc`
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.triggeredAlerts && data.triggeredAlerts.length > 0) {
        const alert = data.triggeredAlerts[0];
        console.log("📊 LatestAlertDisplay loaded latest alert:", alert);
        console.log("📊 MarketData price:", alert.marketData?.price);
        console.log(
          "📊 ConditionDetails actualValue:",
          alert.conditionDetails?.actualValue
        );
        setLatestAlert(alert);
      } else {
        console.log("📊 No triggered alerts found");
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching latest alert:", err);
      setError(`Error loading latest alert: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!latestAlert) {
    return (
      <Paper
        sx={{
          p: 3,
          mb: 0,
          bgcolor: "#0A0E17",
          color: "white",
          borderRadius: 0,
          border: "none",
          boxShadow: "none",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: "bold",
              color: "#E2E8F0",
              mb: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <InfoIcon sx={{ fontSize: "1.5rem", color: "#6B7280" }} />
            No Latest Alert Found
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#94A3B8",
              mb: 2,
            }}
          >
            No alerts have been triggered recently
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#6B7280",
              fontStyle: "italic",
            }}
          >
            Create alerts in the Filters panel to start monitoring market
            conditions
          </Typography>
        </Box>
      </Paper>
    );
  }

  const isPositive = (latestAlert.marketData?.priceChangePercent24h || 0) > 0;

  return (
    <Paper
      sx={{
        p: 3,
        mb: 0,
        bgcolor: "#0A0E17",
        color: "white",
        borderRadius: 0,
        border: "none",
        boxShadow: "none",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h2"
            sx={{ fontWeight: "bold", color: "#E2E8F0" }}
          >
            🔥 Latest Alert: {latestAlert.symbol}
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
            {latestAlert.conditionDetails?.description ||
              latestAlert.conditionMet ||
              "Alert triggered"}
            {latestAlert.changePercentTimeframe && (
              <span style={{ marginLeft: "8px", color: "#60A5FA" }}>
                | Timeframe: {latestAlert.changePercentTimeframe}
              </span>
            )}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Chip
            icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={`${isPositive ? "+" : ""}${
              latestAlert.marketData?.priceChangePercent24h
                ? latestAlert.marketData.priceChangePercent24h.toFixed(2)
                : "0.00"
            }%`}
            color={isPositive ? "success" : "error"}
            variant="filled"
            sx={{ mr: 1, fontWeight: "bold" }}
          />
          <Typography
            variant="h5"
            sx={{ color: "#E2E8F0", fontWeight: "bold" }}
          >
            $
            {latestAlert.marketData?.price
              ? latestAlert.marketData.price.toFixed(4)
              : latestAlert.conditionDetails?.actualValue
              ? parseFloat(latestAlert.conditionDetails.actualValue).toFixed(4)
              : "0.0000"}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2, bgcolor: "rgba(255, 255, 255, 0.1)" }} />

      {/* Information Grid */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={6} md={3}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <VolumeUpIcon sx={{ color: "#60A5FA", mr: 1 }} />
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              Volume (24h)
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{ color: "#E2E8F0", fontWeight: "bold" }}
          >
            ${formatNumber(latestAlert.marketData?.volume || 0)}
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <AttachMoneyIcon sx={{ color: "#10B981", mr: 1 }} />
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              Last Price
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{ color: "#E2E8F0", fontWeight: "bold" }}
          >
            $
            {latestAlert.marketData?.price
              ? latestAlert.marketData.price.toFixed(4)
              : latestAlert.conditionDetails?.actualValue
              ? parseFloat(latestAlert.conditionDetails.actualValue).toFixed(4)
              : "0.0000"}
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <AccessTimeIcon sx={{ color: "#F59E0B", mr: 1 }} />
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              Time
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{ color: "#E2E8F0", fontWeight: "bold" }}
          >
            {format(new Date(latestAlert.triggeredAt), "HH:mm:ss")}
          </Typography>
        </Grid>

        <Grid item xs={6} md={3}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <AccessTimeIcon sx={{ color: "#8B5CF6", mr: 1 }} />
            <Typography variant="body2" sx={{ color: "#94A3B8" }}>
              Date
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{ color: "#E2E8F0", fontWeight: "bold" }}
          >
            {format(new Date(latestAlert.triggeredAt), "MMM dd, yyyy")}
          </Typography>
        </Grid>
      </Grid>

      {/* Additional Details */}
      {latestAlert.conditionDetails && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: "#94A3B8", mb: 1 }}>
            Alert Details:
          </Typography>
          <Typography variant="body2" sx={{ color: "#E2E8F0" }}>
            Target: {latestAlert.conditionDetails.targetValue} | Actual:{" "}
            {latestAlert.conditionDetails.actualValue}
            {latestAlert.conditionDetails.timeframe &&
              ` | Timeframe: ${latestAlert.conditionDetails.timeframe}`}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// Helper functions
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

export default LatestAlertDisplay;
