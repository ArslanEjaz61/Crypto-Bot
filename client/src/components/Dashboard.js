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

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      overflow: 'hidden', 
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Grid container spacing={1} sx={{ 
        flexGrow: 1, 
        p: { xs: 0.5, sm: 1 },
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Left Section - Filters Sidebar */}
        <Grid item xs={12} md={3} lg={3} sx={{ 
          height: { xs: 'auto', md: '100%' },
          overflow: 'auto',
          display: { xs: 'none', md: 'block' } // Hide on mobile, show on tablet+
        }}>
          <Paper sx={{ p: 1, height: '100%', overflow: 'auto' }}>
            <FilterSidebar selectedSymbol={selectedCoin} />
          </Paper>
        </Grid>

        {/* Main Section - Chart and Alerts */}
        <Grid item xs={12} md={6} lg={6} sx={{ 
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            overflow: 'hidden',
            p: { xs: 0.5, sm: 1 }
          }}>
            {/* LineChart with selected coin */}
            <Box sx={{ 
              flex: '0 0 auto',
              mb: 1,
              height: { xs: '300px', sm: '350px', md: '400px' }
            }}>
              <LineChart symbol={selectedCoin} defaultTimeframe="1h" />
            </Box>
            
            {/* Bottom area - Alerts List */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              borderRadius: 1,
              bgcolor: 'background.paper',
              p: 1
            }}>
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
                <Box sx={{ mt: 2 }}>
                  <CryptoList cryptos={coinsWithAlerts} />
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', mt: 3, p: 4, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                  <Typography>No coins with alerts found</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right Section - Market Panel */}
        <Grid item xs={12} md={3} lg={3} sx={{ 
          height: { xs: 'auto', md: '100%' },
          overflow: 'auto',
          display: { xs: 'none', md: 'block' } // Hide on mobile, show on tablet+
        }}>
          <Paper sx={{ p: 1, height: '100%', overflow: 'auto', bgcolor: 'background.paper' }}>
            <MarketPanel onSelectCoin={(symbol) => setSelectedCoin(symbol)} />
          </Paper>
        </Grid>
        
        {/* Mobile Controls - Only visible on mobile */}
        <Grid item xs={12} sx={{ 
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          p: 1,
          justifyContent: 'space-around'
        }}>
          <Button 
            variant="contained" 
            size="small"
            sx={{ flex: 1, mr: 1 }}
            onClick={() => document.querySelector('.filter-sidebar-mobile')?.scrollIntoView()}
          >
            Filters
          </Button>
          <Button 
            variant="contained" 
            size="small"
            sx={{ flex: 1, mx: 1 }}
            onClick={() => document.querySelector('.chart-section')?.scrollIntoView()}
          >
            Chart
          </Button>
          <Button 
            variant="contained" 
            size="small"
            sx={{ flex: 1, ml: 1 }}
            onClick={() => document.querySelector('.market-panel-mobile')?.scrollIntoView()}
          >
            Market
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
