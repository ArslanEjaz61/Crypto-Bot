import React, { useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Clear,
  Notifications,
  NotificationsActive
} from '@mui/icons-material';
import { format } from 'date-fns';
import useRealtimeAlerts from '../hooks/useRealtimeAlerts';

/**
 * Real-time Alerts Panel Component
 * 
 * Displays real-time triggered alerts using WebSocket connection
 * Shows connection status and latest alerts
 */

const RealtimeAlertsPanel = () => {
  const {
    triggeredAlerts,
    latestAlert,
    isConnected,
    connectionError,
    clearAlerts,
  } = useRealtimeAlerts();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Play sound when new alert arrives
  useEffect(() => {
    if (latestAlert) {
      // You can add sound notification here
      console.log('🔔 New alert:', latestAlert);
    }
  }, [latestAlert]);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsActive sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold">
            Real-time Alerts
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Connection Status */}
          <Tooltip title={isConnected ? 'Connected to real-time system' : 'Disconnected'}>
            <Chip
              icon={isConnected ? <Wifi /> : <WifiOff />}
              label={isConnected ? 'Live' : 'Offline'}
              color={isConnected ? 'success' : 'error'}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Tooltip>
          
          {/* Clear button */}
          {triggeredAlerts.length > 0 && (
            <Tooltip title="Clear all alerts">
              <IconButton 
                size="small" 
                onClick={clearAlerts}
                sx={{ color: 'white' }}
              >
                <Clear />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.3)' }} />

      {/* Connection Error */}
      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {connectionError}
        </Alert>
      )}

      {/* Latest Alert Highlight */}
      {latestAlert && (
        <Paper
          elevation={6}
          sx={{
            p: 2,
            mb: 2,
            background: 'rgba(255, 255, 255, 0.95)',
            color: 'black',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': {
                boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)',
              },
              '50%': {
                boxShadow: '0 0 20px 10px rgba(255, 255, 255, 0)',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                LATEST ALERT
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {latestAlert.symbol}
              </Typography>
            </Box>
            
            {latestAlert.direction === '>' ? (
              <TrendingUp sx={{ fontSize: 40, color: '#4caf50' }} />
            ) : (
              <TrendingDown sx={{ fontSize: 40, color: '#f44336' }} />
            )}
          </Box>
          
          <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current Price
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                ${(latestAlert.triggeredPrice || latestAlert.price)?.toFixed(8)}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                Target
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                ${latestAlert.targetPrice?.toFixed(8)}
              </Typography>
            </Box>
            
            {latestAlert.priceChangePercent && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  24h Change
                </Typography>
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  color={latestAlert.priceChangePercent > 0 ? '#4caf50' : '#f44336'}
                >
                  {latestAlert.priceChangePercent > 0 ? '+' : ''}
                  {latestAlert.priceChangePercent?.toFixed(2)}%
                </Typography>
              </Box>
            )}
          </Stack>
          
          <Typography variant="caption" color="text.secondary">
            {latestAlert.createdAt ? format(new Date(latestAlert.createdAt), 'PPpp') : 'Just now'}
          </Typography>
        </Paper>
      )}

      {/* Alert History */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {triggeredAlerts.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              opacity: 0.7,
            }}
          >
            <Notifications sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">
              {isConnected 
                ? 'Waiting for alerts...' 
                : 'Connecting to real-time system...'}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1 }}>
              Alerts will appear here instantly when triggered
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {triggeredAlerts.slice(0, 10).map((alert, index) => (
              <Paper
                key={alert._id || index}
                elevation={2}
                sx={{
                  p: 1.5,
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'black',
                  opacity: 1 - (index * 0.08), // Fade older alerts
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {alert.symbol}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ${(alert.triggeredPrice || alert.price)?.toFixed(8)}
                      {' → '}
                      Target: ${alert.targetPrice?.toFixed(8)}
                    </Typography>
                  </Box>
                  
                  {alert.direction === '>' ? (
                    <TrendingUp sx={{ color: '#4caf50' }} />
                  ) : (
                    <TrendingDown sx={{ color: '#f44336' }} />
                  )}
                </Box>
                
                <Typography variant="caption" color="text.secondary">
                  {alert.createdAt ? format(new Date(alert.createdAt), 'pp') : 'Just now'}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>

      {/* Alert Count */}
      {triggeredAlerts.length > 0 && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {triggeredAlerts.length} alert{triggeredAlerts.length !== 1 ? 's' : ''} received
            {triggeredAlerts.length > 10 && ' (showing latest 10)'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RealtimeAlertsPanel;

