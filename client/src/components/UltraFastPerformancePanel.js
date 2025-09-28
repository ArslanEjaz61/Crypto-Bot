/**
 * Ultra-Fast Performance Panel
 * Displays real-time performance metrics and system status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  Divider
} from '@mui/material';
import {
  Speed as SpeedIcon,
  NetworkCheck as NetworkIcon,
  Memory as MemoryIcon,
  Notifications as NotificationIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAlert } from '../context/AlertContext';

const UltraFastPerformancePanel = () => {
  const { ultraFastAlerts, performanceMetrics, isUltraFastEnabled } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Performance thresholds
  const OPTIMAL_RESPONSE_TIME = 100; // ms
  const WARNING_RESPONSE_TIME = 200; // ms
  const CRITICAL_RESPONSE_TIME = 500; // ms

  /**
   * Get performance status color and icon
   */
  const getPerformanceStatus = useCallback((responseTime) => {
    if (responseTime <= OPTIMAL_RESPONSE_TIME) {
      return { color: 'success', icon: CheckCircleIcon, label: 'OPTIMAL' };
    } else if (responseTime <= WARNING_RESPONSE_TIME) {
      return { color: 'warning', icon: WarningIcon, label: 'GOOD' };
    } else if (responseTime <= CRITICAL_RESPONSE_TIME) {
      return { color: 'error', icon: ErrorIcon, label: 'SLOW' };
    } else {
      return { color: 'error', icon: ErrorIcon, label: 'CRITICAL' };
    }
  }, []);

  /**
   * Format response time with color coding
   */
  const formatResponseTime = useCallback((time) => {
    const status = getPerformanceStatus(time);
    return {
      text: `${time.toFixed(1)}ms`,
      color: status.color,
      status: status.label
    };
  }, [getPerformanceStatus]);

  /**
   * Refresh performance metrics
   */
  const refreshMetrics = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refresh of performance data
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate refresh
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Metrics are automatically updated by the hook
    }, 2000); // Every 2 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Don't render if ultra-fast system is not enabled
  if (!isUltraFastEnabled) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Alert severity="info">
            Ultra-Fast Alert System is initializing...
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const alertMetrics = performanceMetrics?.alerts || {};
  const webSocketMetrics = performanceMetrics?.webSocket || {};
  const workerMetrics = performanceMetrics?.workers || {};
  const networkMetrics = performanceMetrics?.network || {};
  const notificationMetrics = performanceMetrics?.notifications || {};

  const avgResponseTime = alertMetrics.averageProcessingTime || 0;
  const responseStatus = formatResponseTime(avgResponseTime);

  return (
    <Card sx={{ mb: 2, border: '1px solid', borderColor: 'primary.main' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <SpeedIcon color="primary" />
            <Typography variant="h6" color="primary">
              Ultra-Fast Performance Monitor
            </Typography>
            <Chip
              label={responseStatus.status}
              color={responseStatus.color}
              size="small"
              icon={<CheckCircleIcon />}
            />
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  size="small"
                />
              }
              label="Auto Refresh"
            />
            <Tooltip title="Refresh Metrics">
              <IconButton 
                onClick={refreshMetrics} 
                disabled={refreshing}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Alert Processing Performance */}
          <Grid item xs={12} md={6}>
            <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid #333">
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Alert Processing
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Response Time
                  </Typography>
                  <Typography variant="h6" color={responseStatus.color}>
                    {responseStatus.text}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Alerts Processed
                  </Typography>
                  <Typography variant="h6">
                    {alertMetrics.alertsProcessed || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Alerts Triggered
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {alertMetrics.alertsTriggered || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Cache Hit Rate
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {alertMetrics.cacheHitRate?.toFixed(1) || 0}%
                  </Typography>
                </Grid>
              </Grid>

              {/* Performance Progress Bar */}
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  Performance Target (100ms)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min((OPTIMAL_RESPONSE_TIME / Math.max(avgResponseTime, 1)) * 100, 100)}
                  color={responseStatus.color}
                  sx={{ height: 8, borderRadius: 4, mt: 1 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* WebSocket Performance */}
          <Grid item xs={12} md={6}>
            <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid #333">
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <NetworkIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Real-Time Data
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Latency
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {webSocketMetrics.averageLatency?.toFixed(1) || 0}ms
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Update Rate
                  </Typography>
                  <Typography variant="h6">
                    {webSocketMetrics.updatesPerSecond?.toFixed(1) || 0}/s
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Active Symbols
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {webSocketMetrics.activeSubscriptions || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Connection Status
                  </Typography>
                  <Chip
                    label={webSocketMetrics.globalConnection ? 'CONNECTED' : 'DISCONNECTED'}
                    color={webSocketMetrics.globalConnection ? 'success' : 'error'}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Worker Performance */}
          <Grid item xs={12} md={6}>
            <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid #333">
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <MemoryIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Background Processing
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Tasks Completed
                  </Typography>
                  <Typography variant="h6">
                    {workerMetrics.tasksCompleted || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Worker Utilization
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {workerMetrics.workerUtilization?.toFixed(1) || 0}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Queue Size
                  </Typography>
                  <Typography variant="h6">
                    {workerMetrics.queueSize || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Error Rate
                  </Typography>
                  <Typography variant="h6" color={workerMetrics.tasksErrored > 0 ? 'error.main' : 'success.main'}>
                    {workerMetrics.tasksErrored || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>

          {/* Network Performance */}
          <Grid item xs={12} md={6}>
            <Box p={2} bgcolor="background.paper" borderRadius={1} border="1px solid #333">
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <NetworkIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Network Optimization
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {networkMetrics.successRate?.toFixed(1) || 0}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Cache Hit Rate
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {networkMetrics.cacheHitRate?.toFixed(1) || 0}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Avg Response Time
                  </Typography>
                  <Typography variant="h6">
                    {networkMetrics.averageResponseTime?.toFixed(1) || 0}ms
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary">
                    Requests Saved
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {networkMetrics.requestsSavedByBatching || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Notification Performance */}
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <NotificationIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="bold">
              Notification System
            </Typography>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Delivery Time
              </Typography>
              <Typography variant="body1" color="success.main">
                {notificationMetrics.averageDeliveryTime?.toFixed(1) || 0}ms
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Notifications Sent
              </Typography>
              <Typography variant="body1">
                {notificationMetrics.notificationsSent || 0}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Click Rate
              </Typography>
              <Typography variant="body1" color="info.main">
                {notificationMetrics.clickRate?.toFixed(1) || 0}%
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="caption" color="textSecondary">
                Permission Status
              </Typography>
              <Chip
                label={notificationMetrics.hasPermission ? 'GRANTED' : 'DENIED'}
                color={notificationMetrics.hasPermission ? 'success' : 'error'}
                size="small"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Performance Summary */}
        <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
          <Typography variant="body2" color="textSecondary" align="center">
            {avgResponseTime <= OPTIMAL_RESPONSE_TIME ? (
              <span style={{ color: '#4caf50' }}>
                🎯 TARGET ACHIEVED: Ultra-fast performance active ({responseStatus.text} response time)
              </span>
            ) : (
              <span style={{ color: '#ff9800' }}>
                ⚠️ Performance can be improved. Target: &lt;100ms, Current: {responseStatus.text}
              </span>
            )}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UltraFastPerformancePanel;
