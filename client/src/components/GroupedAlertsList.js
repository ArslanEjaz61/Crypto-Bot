import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box,
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Collapse,
  Chip,
  IconButton,
  Divider,
  Badge,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useAlert } from '../context/AlertContext';
import { useFilters } from '../context/FilterContext';
import { useCrypto } from '../context/CryptoContext';

const GroupedAlertsList = () => {
  const { alerts, loading } = useAlert();
  const { applyFilters, filters, getValidationFilters } = useFilters();
  const { checkAlertConditions } = useCrypto();
  const [groupedAlerts, setGroupedAlerts] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [symbolsWithAlerts, setSymbolsWithAlerts] = useState({});
  const [isChecking, setIsChecking] = useState({});
  
  // Group alerts by symbol
  // Check if a coin meets alert conditions
  const checkSymbolConditions = useCallback(async (symbol) => {
    if (!symbol || !filters) return;
    
    setIsChecking(prev => ({ ...prev, [symbol]: true }));
    
    try {
      const result = await checkAlertConditions(symbol, filters);
      setSymbolsWithAlerts(prev => ({
        ...prev,
        [symbol]: result.meetsConditions
      }));
    } catch (error) {
      console.error(`Error checking conditions for ${symbol}:`, error);
      setSymbolsWithAlerts(prev => ({
        ...prev,
        [symbol]: false
      }));
    } finally {
      setIsChecking(prev => ({ ...prev, [symbol]: false }));
    }
  }, [filters, checkAlertConditions]);
  
  useEffect(() => {
    console.log('GroupedAlertsList - Alerts state:', alerts);
    if (!alerts) {
      console.log('No alerts available');
      return;
    }
    
    // For debugging, show all alerts raw data
    console.log('Raw alerts data:', JSON.stringify(alerts));
    
    // TEMPORARY DEBUGGING: Skip filtering and show all alerts
    const filteredAlerts = alerts;
    console.log('Using all alerts (bypassing filters):', filteredAlerts.length);
    
    // Group by symbol
    const groups = filteredAlerts.reduce((acc, alert) => {
      // Make sure each alert has a symbol, default to "UNKNOWN" if missing
      const symbol = alert.symbol || "UNKNOWN";
      console.log('Processing alert with symbol:', symbol, alert);
      
      if (!acc[symbol]) {
        acc[symbol] = [];
      }
      acc[symbol].push(alert);
      return acc;
    }, {});
    
    console.log('Grouped alerts by symbol:', groups);
    
    // Sort each group by timestamp (newest first)
    Object.keys(groups).forEach(symbol => {
      groups[symbol].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      // Check if this symbol meets current filter conditions
      checkSymbolConditions(symbol);
    });
    
    // Sort groups by the count (most alerts first)
    const sortedGroups = Object.fromEntries(
      Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
    );
    
    setGroupedAlerts(sortedGroups);
    console.log('Set grouped alerts:', sortedGroups);
    
    // Initialize all groups as collapsed
    if (Object.keys(sortedGroups).length > 0 && Object.keys(expandedGroups).length === 0) {
      // Except the first one
      const firstSymbol = Object.keys(sortedGroups)[0];
      setExpandedGroups({ [firstSymbol]: true });
    }
  }, [alerts, applyFilters, checkSymbolConditions]);
  
  // Handle toggle group expansion
  const toggleGroup = (symbol) => {
    setExpandedGroups(prev => ({
      ...prev,
      [symbol]: !prev[symbol]
    }));
  };
  
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Alerts by Symbol
      </Typography>
      
      {loading ? (
        <Typography>Loading alerts...</Typography>
      ) : Object.keys(groupedAlerts).length === 0 ? (
        <Typography>No alerts found</Typography>
      ) : (
        <List sx={{ width: '100%' }}>
          {Object.entries(groupedAlerts).map(([symbol, alertsList]) => (
            <React.Fragment key={symbol}>
              <ListItem 
                button
                onClick={() => toggleGroup(symbol)}
                sx={{ 
                  bgcolor: symbolsWithAlerts[symbol] ? 'rgba(255, 193, 7, 0.1)' : 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' },
                  border: symbolsWithAlerts[symbol] ? '1px solid #FFC107' : 'none',
                  borderRadius: '4px',
                  mb: 1
                }}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                          {symbol}
                        </Typography>
                        {isChecking[symbol] ? (
                          <CircularProgress size={16} sx={{ ml: 1 }} />
                        ) : symbolsWithAlerts[symbol] ? (
                          <NotificationsActiveIcon color="warning" sx={{ ml: 1 }} fontSize="small" />
                        ) : null}
                      </Box>
                      <Box>
                        {symbolsWithAlerts[symbol] && (
                          <Chip 
                            label="Alert Condition Met" 
                            size="small" 
                            color="warning"
                            sx={{ mr: 1 }}
                          />
                        )}
                        <Chip 
                          label={`Alerts ${alertsList.length}`} 
                          size="small" 
                          color="primary"
                        />
                      </Box>
                    </Box>
                  }
                />
                {expandedGroups[symbol] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItem>
              
              <Collapse in={expandedGroups[symbol]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {alertsList.map((alert, idx) => (
                    <React.Fragment key={alert._id || idx}>
                      <ListItem sx={{ pl: 4, py: 1 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                  {formatTime(alert.createdAt)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {alert.condition || 'Price alert'}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                ${alert.price ? alert.price.toFixed(4) : '0.0000'}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < alertsList.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </Collapse>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default GroupedAlertsList;
