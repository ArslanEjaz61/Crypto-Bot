import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Grid, Paper, Typography, Button } from '@mui/material';
import LineChart from './LineChart.js';
import CryptoList from './CryptoList';
import MarketPanel from './MarketPanel';
import FilterSidebar from './FilterSidebar';
import CoinPriceHeader from './CoinPriceHeader';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';
import { useSelectedPair } from '../context/SelectedPairContext';

const Dashboard = ({ children }) => {
  const { alerts } = useAlert();
  const { cryptos } = useCrypto();
  const { selectedSymbol, selectedTimeframe, selectSymbol, selectTimeframe } = useSelectedPair();
  
  // Keep local state for backward compatibility, but sync with context
  const [selectedCoin, setSelectedCoin] = useState(selectedSymbol);
  const [localTimeframe, setLocalTimeframe] = useState(selectedTimeframe);
  
  // Reference to FilterSidebar's createAlert function
  const filterSidebarRef = useRef();
  
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

  // Handle creating alert when favorite is clicked
  const handleCreateAlertFromFavorite = (symbol) => {
    console.log('Creating alert for favorited symbol:', symbol);
    // Trigger FilterSidebar's handleCreateAlert with the selected symbol
    if (filterSidebarRef.current && filterSidebarRef.current.handleCreateAlert) {
      filterSidebarRef.current.handleCreateAlert(symbol);
    }
  };

  // Log alerts for debugging
  useEffect(() => {
    console.log('Dashboard - Current alerts state:', alerts);
    console.log('Dashboard - Coins with alerts:', coinsWithAlerts);
  }, [alerts, coinsWithAlerts]);

  // Handle coin selection from market panel
  const handleCoinSelect = (symbol) => {
    // Ensure symbol is a string, not an object
    const symbolStr = typeof symbol === 'object' ? 
      (symbol.symbol || 'BTCUSDT') : // Extract symbol property if it's an object
      String(symbol); // Convert to string otherwise
      
    console.log(`Dashboard: Coin selected from market panel: ${symbolStr}`);
    setSelectedCoin(symbolStr);
    selectSymbol(symbolStr); // Update global context
  };

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe) => {
    console.log(`Dashboard: Timeframe changed to: ${newTimeframe}`);
    setLocalTimeframe(newTimeframe);
    selectTimeframe(newTimeframe); // Update global context
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '110%',
      overflow: 'auto', /* Changed from hidden to auto to enable scrolling */
      bgcolor: '#0A0E17', // Dark background color matching the image
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Grid container spacing={1} sx={{ 
        flexGrow: 1, 
        p: { xs: 0.5, sm: 1 },
        overflow: 'auto',
        minHeight: '100%'
      }}>
        {/* Left Section - Filters Sidebar */}
        <Grid item xs={12} md={3} lg={3} sx={{ 
          height: { xs: 'auto', md: '100%' },
          overflow: 'auto',
          display: { xs: 'none', md: 'block' } // Hide on mobile, show on tablet+
        }}>
          <Paper sx={{ p: 1, height: '100%', overflow: 'auto', bgcolor: '#0A0E17', borderRadius: 2 }}>
            <FilterSidebar ref={filterSidebarRef} selectedSymbol={selectedCoin} />
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
            {/* Coin Price Header - Shows detailed coin price info */}
            {selectedCoin && (
              <CoinPriceHeader symbol={selectedCoin} />
            )}
            
            {/* LineChart with selected coin */}
            <LineChart 
              symbol={selectedCoin} 
              timeframe={localTimeframe}
              onTimeframeChange={handleTimeframeChange}
            />
            
            {/* Chart Summary removed as requested */}
            
            {/* Bottom area - Alerts List */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              borderRadius: 1,
              bgcolor: '#0A0E17',
              p: 1
            }}>
              
              {/* <Box sx={{ p: 2, bgcolor: '#0A0E17', borderRadius: 2, mb: 3 }}>
                <Typography variant="h6" color="white">Alert Coins</Typography>
                <Typography variant="body2" color="#94A3B8" sx={{ mt: 1 }}>
                  Showing coins that have active alerts
                </Typography>
              </Box> */}
              
              {/* Crypto List with Alerts */}
              {coinsWithAlerts.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <CryptoList cryptos={coinsWithAlerts} />
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', mt: 3, p: 4, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                  <Typography color="#94A3B8">No coins with alerts found</Typography>
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
          <Paper sx={{ p: 1, height: '100%', overflow: 'auto', bgcolor: '#0A0E17', borderRadius: 2 }}>
            <MarketPanel onSelectCoin={handleCoinSelect} onCreateAlert={handleCreateAlertFromFavorite} />
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
          bgcolor: '#0A0E17',
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
