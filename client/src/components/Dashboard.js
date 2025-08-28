import React, { useState, useEffect, useMemo } from 'react';
import { Box, Grid, Paper, Typography, Tabs, Tab, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LineChart from './LineChart.js';
import CryptoList from './CryptoList';
import MarketPanel from './MarketPanel';
import FilterSidebar from './FilterSidebar';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';

const Dashboard = ({ children }) => {
  const { alerts, loadAlerts } = useAlert();
  const { cryptos } = useCrypto();
  const [tabValue, setTabValue] = useState(0);
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  
  // Get crypto coins that have alerts
  const coinsWithAlerts = useMemo(() => {
    if (!alerts || alerts.length === 0 || !cryptos || cryptos.length === 0) {
      return [];
    }
    
    // Group alerts by symbol
    const alertsBySymbol = {};
    alerts.forEach(alert => {
      if (!alert.symbol) return;
      
      if (!alertsBySymbol[alert.symbol]) {
        alertsBySymbol[alert.symbol] = [];
      }
      alertsBySymbol[alert.symbol].push(alert);
    });
    
    // Match with crypto data
    return cryptos
      .filter(crypto => alertsBySymbol[crypto.symbol])
      .map(crypto => ({
        ...crypto,
        alertsCount: alertsBySymbol[crypto.symbol].length
      }));
  }, [alerts, cryptos]);

  // Log alerts for debugging
  useEffect(() => {
    console.log('Dashboard - Current alerts state:', alerts);
  }, [alerts]);
  
  // Force refresh alerts
  const handleRefreshAlerts = () => {
    console.log('Manual refresh of alerts requested');
    loadAlerts(1, 100, true);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    setSelectedTimeframe(newTimeframe);
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Grid container spacing={2} sx={{ height: '100%', p: 1 }}>
        {/* Left Section - Filters Sidebar */}
        <Grid item xs={12} md={3} lg={3} sx={{ height: '100%', overflow: 'auto' }}>
          <FilterSidebar selectedSymbol={selectedCoin} />
        </Grid>

        {/* Main Section - Chart and Alerts */}
        <Grid item xs={12} md={6} lg={6} sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* LineChart with selected coin */}
            <LineChart 
              symbol={selectedCoin} 
              timeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
            />
            
            {/* Bottom area - Alerts List */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  variant="fullWidth"
                  sx={{ flexGrow: 1 }}
                >
                  <Tab label="Alerts" />
                  <Tab label="Overview" />
                  <Tab label="RSI Analysis" />
                </Tabs>
                <Button 
                  onClick={handleRefreshAlerts}
                  startIcon={<RefreshIcon />}
                  size="small"
                  variant="outlined"
                  sx={{ ml: 2 }}
                >
                  Refresh
                </Button>
              </Box>
              
              {tabValue === 0 && (
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 3 }}>
                  <Typography variant="h6">Alert Coins</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Showing coins that have active alerts
                  </Typography>
                </Box>
              )}
              
              {tabValue === 1 && (
                <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Typography variant="h6">Market Overview</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Overview content will be displayed here.
                  </Typography>
                </Paper>
              )}
              
              {tabValue === 2 && (
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Typography variant="h6">RSI Analysis</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    RSI analysis will be displayed here.
                  </Typography>
                </Box>
              )}
              
              {/* Crypto List with Alerts */}
              {coinsWithAlerts.length > 0 ? (
                <CryptoList cryptos={coinsWithAlerts} />
              ) : (
                <Box sx={{ textAlign: 'center', mt: 3, p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Typography>No coins with alerts found</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right Section - Market Panel */}
        <Grid item xs={12} md={3} lg={3} sx={{ height: '100%', overflow: 'auto' }}>
          <MarketPanel onSelectCoin={(symbol) => setSelectedCoin(symbol)} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
