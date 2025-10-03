import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const SimpleDashboard = () => {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        bgcolor: "#0A0E17",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 4,
          bgcolor: "#1a1a1a",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h4" sx={{ color: "white", mb: 2 }}>
          🚀 Trading Dashboard
        </Typography>
        <Typography variant="h6" sx={{ color: "#4f80ff", mb: 2 }}>
          Welcome to Binance Alerts
        </Typography>
        <Typography variant="body1" sx={{ color: "white" }}>
          Dashboard is loading successfully!
        </Typography>
      </Paper>
    </Box>
  );
};

export default SimpleDashboard;
