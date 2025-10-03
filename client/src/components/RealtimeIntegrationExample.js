import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import useRealtimeAlerts from '../hooks/useRealtimeAlerts';

/**
 * Example: How to integrate Real-time Alerts into your existing Dashboard
 * 
 * This is a demo component showing how to use the useRealtimeAlerts hook
 * You can copy this pattern into your existing components
 */

const RealtimeIntegrationExample = () => {
  // Get real-time alert data
  const {
    triggeredAlerts,      // Array of all triggered alerts
    latestAlert,          // Most recent alert
    latestPrices,         // Real-time prices for subscribed symbols
    isConnected,          // WebSocket connection status
    connectionError,      // Connection error if any
    subscribeToPrices,    // Function to subscribe to price updates
    clearAlerts,          // Function to clear alert history
  } = useRealtimeAlerts();

  // Example: Subscribe to specific symbols for price updates
  React.useEffect(() => {
    // Subscribe to BTC and ETH prices
    subscribeToPrices(['BTCUSDT', 'ETHUSDT']);
  }, [subscribeToPrices]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Real-time Alerts Integration Example
      </Typography>

      <Grid container spacing={3}>
        {/* Connection Status Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: isConnected ? '#e8f5e9' : '#ffebee' }}>
            <Typography variant="h6">
              Connection Status
            </Typography>
            <Typography variant="h3" sx={{ my: 2 }}>
              {isConnected ? '🟢' : '🔴'}
            </Typography>
            <Typography>
              {isConnected ? 'Connected to Real-time System' : 'Disconnected'}
            </Typography>
            {connectionError && (
              <Typography color="error" variant="caption">
                Error: {connectionError}
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Latest Alert Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="h6">
              Latest Alert
            </Typography>
            {latestAlert ? (
              <>
                <Typography variant="h4" sx={{ my: 2 }}>
                  {latestAlert.symbol}
                </Typography>
                <Typography>
                  Price: ${latestAlert.triggeredPrice || latestAlert.price}
                </Typography>
                <Typography>
                  Target: ${latestAlert.targetPrice}
                </Typography>
                <Typography>
                  Direction: {latestAlert.direction === '>' ? '📈 Up' : '📉 Down'}
                </Typography>
              </>
            ) : (
              <Typography sx={{ my: 2 }} color="text.secondary">
                No alerts yet
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Total Alerts Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
            <Typography variant="h6">
              Total Alerts
            </Typography>
            <Typography variant="h3" sx={{ my: 2 }}>
              {triggeredAlerts.length}
            </Typography>
            <Typography>
              Alerts received in this session
            </Typography>
            {triggeredAlerts.length > 0 && (
              <button 
                onClick={clearAlerts}
                style={{ 
                  marginTop: '10px',
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
            )}
          </Paper>
        </Grid>

        {/* Live Prices Card */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Live Prices (Real-time)
            </Typography>
            {Object.keys(latestPrices).length > 0 ? (
              <Box>
                {Object.entries(latestPrices).slice(0, 5).map(([symbol, price]) => (
                  <Box 
                    key={symbol} 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid #eee'
                    }}
                  >
                    <Typography fontWeight="bold">{symbol}</Typography>
                    <Typography>${price}</Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No price data yet (subscribe to symbols to see prices)
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Recent Alerts List */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            {triggeredAlerts.length > 0 ? (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {triggeredAlerts.slice(0, 10).map((alert, index) => (
                  <Box 
                    key={alert._id || index}
                    sx={{ 
                      p: 1,
                      mb: 1,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography fontWeight="bold">
                        {alert.symbol}
                      </Typography>
                      <Typography>
                        {alert.direction === '>' ? '📈' : '📉'}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      ${alert.triggeredPrice || alert.price} 
                      {' → '}
                      Target: ${alert.targetPrice}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">
                No alerts yet. Create an alert to see it trigger in real-time!
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Code Example */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: '#263238', color: '#fff' }}>
        <Typography variant="h6" gutterBottom>
          Code Example - How to Use in Your Component
        </Typography>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>
{`import useRealtimeAlerts from '../hooks/useRealtimeAlerts';

function YourComponent() {
  const { 
    triggeredAlerts, 
    latestAlert, 
    isConnected 
  } = useRealtimeAlerts();

  // Display latest alert
  if (latestAlert) {
    console.log('New alert:', latestAlert);
    // Show notification, update UI, etc.
  }

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Live' : '🔴 Offline'}</div>
      
      {/* Show latest alert */}
      {latestAlert && (
        <div className="alert-notification">
          🚨 {latestAlert.symbol} reached $\{latestAlert.price}!
        </div>
      )}
      
      {/* List all alerts */}
      <ul>
        {triggeredAlerts.map(alert => (
          <li key={alert._id}>
            {alert.symbol}: $\{alert.price}
          </li>
        ))}
      </ul>
    </div>
  );
}`}
        </pre>
      </Paper>
    </Box>
  );
};

export default RealtimeIntegrationExample;

