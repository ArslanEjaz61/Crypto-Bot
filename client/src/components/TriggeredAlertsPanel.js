import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Collapse,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Badge,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmailIcon from '@mui/icons-material/Email';
import TelegramIcon from '@mui/icons-material/Telegram';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { format } from 'date-fns';

const TriggeredAlertsPanel = () => {
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSymbols, setExpandedSymbols] = useState({});
  const [symbolHistory, setSymbolHistory] = useState({});

  // Fetch triggered alerts and set up socket connection
  useEffect(() => {
    fetchTriggeredAlerts();
    
    // Set up Socket.IO connection for real-time updates
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    const socket = io(API_URL);
    
    // Listen for new triggered alerts
    socket.on('triggered-alert-created', (data) => {
      console.log('📡 Received new triggered alert via socket:', data);
      
      // Add the new triggered alert to the list immediately
      setTriggeredAlerts(prevAlerts => {
        // Check if alert already exists to avoid duplicates
        const exists = prevAlerts.some(alert => alert._id === data.triggeredAlert._id);
        if (!exists) {
          return [data.triggeredAlert, ...prevAlerts];
        }
        return prevAlerts;
      });
    });
    
    // Set up auto-refresh every 60 seconds as backup (reduced frequency since we have real-time updates)
    const interval = setInterval(() => {
      fetchTriggeredAlerts();
    }, 60000);
    
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const fetchTriggeredAlerts = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      console.log('Fetching triggered alerts from:', `${API_URL}/api/triggered-alerts`);
      
      const response = await fetch(`${API_URL}/api/triggered-alerts`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTriggeredAlerts(data.triggeredAlerts || []);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error fetching triggered alerts:', err);
      setError(`Error loading triggered alerts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSymbolHistory = async (symbol) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/triggered-alerts/symbol/${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch symbol history');
      
      const data = await response.json();
      setSymbolHistory(prev => ({
        ...prev,
        [symbol]: data.rawHistory || []
      }));
    } catch (err) {
      console.error('Error fetching symbol history:', err);
    }
  };

  const toggleSymbolExpansion = (symbol) => {
    const isExpanded = !expandedSymbols[symbol];
    setExpandedSymbols(prev => ({
      ...prev,
      [symbol]: isExpanded
    }));

    // Fetch history when expanding
    if (isExpanded && !symbolHistory[symbol]) {
      fetchSymbolHistory(symbol);
    }
  };

  const getConditionIcon = (conditionMet) => {
    switch (conditionMet) {
      case 'PRICE_ABOVE':
      case 'PERCENTAGE_CHANGE':
      case 'RSI_ABOVE':
      case 'EMA_CROSS_ABOVE':
        return <TrendingUpIcon color="success" />;
      case 'PRICE_BELOW':
      case 'RSI_BELOW':
      case 'EMA_CROSS_BELOW':
        return <TrendingDownIcon color="error" />;
      default:
        return <CheckCircleIcon color="info" />;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'EMAIL':
        return <EmailIcon fontSize="small" />;
      case 'TELEGRAM':
        return <TelegramIcon fontSize="small" />;
      default:
        return <CheckCircleIcon fontSize="small" />;
    }
  };

  const getNotificationStatusColor = (status) => {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Group alerts by symbol
  const groupedAlerts = triggeredAlerts.reduce((acc, alert) => {
    if (!acc[alert.symbol]) {
      acc[alert.symbol] = [];
    }
    acc[alert.symbol].push(alert);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading triggered alerts: {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 2, bgcolor: '#0A0E17', color: 'white', height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ color: '#E2E8F0' }}>
          Triggered Alerts History
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchTriggeredAlerts}
          sx={{ color: '#60A5FA', borderColor: '#60A5FA' }}
        >
          Refresh
        </Button>
      </Box>

      {Object.keys(groupedAlerts).length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4, p: 3 }}>
          <Typography color="#94A3B8">
            No triggered alerts found. Alerts will appear here when conditions are met.
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {Object.entries(groupedAlerts).map(([symbol, alerts]) => (
            <Box key={symbol}>
              <ListItem
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer'
                }}
                onClick={() => toggleSymbolExpansion(symbol)}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="h6" sx={{ color: '#E2E8F0' }}>
                        {symbol}
                      </Typography>
                      <Badge badgeContent={alerts.length} color="primary" />
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                      Last triggered: {format(new Date(alerts[0].triggeredAt), 'MMM dd, yyyy HH:mm')}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSymbolExpansion(symbol);
                    }}
                    sx={{ color: '#94A3B8' }}
                  >
                    {expandedSymbols[symbol] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>

              <Collapse in={expandedSymbols[symbol]} timeout="auto" unmountOnExit>
                <Box sx={{ ml: 2, mb: 2 }}>
                  {(symbolHistory[symbol] || alerts).map((alert, index) => (
                    <Paper
                      key={alert._id}
                      sx={{
                        p: 2,
                        mb: 1,
                        bgcolor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      <Box display="flex" justifyContent="between" alignItems="flex-start" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getConditionIcon(alert.conditionMet)}
                          <Typography variant="body2" sx={{ color: '#E2E8F0' }}>
                            {alert.conditionDetails?.description || alert.conditionMet}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          {format(new Date(alert.triggeredAt), 'MMM dd, HH:mm:ss')}
                        </Typography>
                      </Box>

                      {alert.conditionDetails && (
                        <Box mb={1}>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Target: {alert.conditionDetails.targetValue} | 
                            Actual: {alert.conditionDetails.actualValue}
                            {alert.conditionDetails.timeframe && ` | ${alert.conditionDetails.timeframe}`}
                          </Typography>
                        </Box>
                      )}

                      {alert.marketData && (
                        <Box mb={1}>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Price: ${alert.marketData.price} | 
                            24h Change: {alert.marketData.priceChangePercent24h}%
                            {alert.marketData.rsi && ` | RSI: ${alert.marketData.rsi}`}
                          </Typography>
                        </Box>
                      )}

                      <Box display="flex" gap={1} flexWrap="wrap">
                        {alert.notifications?.map((notification, notifIndex) => (
                          <Tooltip
                            key={notifIndex}
                            title={`${notification.type} to ${notification.recipient} - ${notification.status}`}
                          >
                            <Chip
                              icon={getNotificationIcon(notification.type)}
                              label={notification.type}
                              size="small"
                              color={getNotificationStatusColor(notification.status)}
                              variant="outlined"
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Box>
              </Collapse>
              
              {Object.keys(groupedAlerts).indexOf(symbol) < Object.keys(groupedAlerts).length - 1 && (
                <Divider sx={{ my: 1, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />
              )}
            </Box>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TriggeredAlertsPanel;
