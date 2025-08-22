import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Tabs, Tab } from '@mui/material';
import FilterSidebar from './FilterSidebar';
import AlertSummary from './AlertSummary';
import CoinAlertChart from '../components/CoinAlertChart';
import SimpleChart from '../components/SimpleChart';
import BasicChart from '../components/BasicChart';
import MinimalChart from '../components/MinimalChart';
import StaticChart from '../components/StaticChart';
import FinalChart from '../components/FinalChart';
import LineChart from '../components/LineChart';
import GroupedAlertsList from './GroupedAlertsList';
import MarketPanel from './MarketPanel';
import { useFilters } from '../context/FilterContext';
import { useAlert } from '../context/AlertContext';
import { useCrypto } from '../context/CryptoContext';

const Dashboard = ({ children }) => {
  const { filters, setFilters } = useFilters();
  const { alerts, loading: alertsLoading } = useAlert();
  const { cryptos, loading: cryptosLoading, checkAlertConditions } = useCrypto();
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [recentAlert, setRecentAlert] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [meetingCondition, setMeetingCondition] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState(() => {
    // Get timeframe from session storage or use default
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('preferredTimeframe') || '1h';
    }
    return '1h';
  });

  // Get the most recent alert for the selected coin or the most recent alert overall
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    
    if (selectedCoin) {
      const coinAlerts = alerts.filter(alert => alert.symbol === selectedCoin.symbol);
      if (coinAlerts.length > 0) {
        // Sort by date descending
        coinAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentAlert(coinAlerts[0]);
        return;
      }
    }
    
    // If no coin selected or no alerts for selected coin, show most recent alert
    const sortedAlerts = [...alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setRecentAlert(sortedAlerts[0]);
  }, [alerts, selectedCoin]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle coin selection from market panel
  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin);
    
    // Check if the selected coin meets alert conditions
    if (coin) {
      checkAlertConditions(coin.symbol, filters)
        .then(result => {
          setMeetingCondition(result.meetsConditions);
        })
        .catch(err => {
          console.error('Error checking conditions:', err);
          setMeetingCondition(false);
        });
    } else {
      setMeetingCondition(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Grid container spacing={2} sx={{ height: '100%', p: 1 }}>
        {/* Left Sidebar - Filter Section */}
        <Grid item xs={12} md={3} lg={2} sx={{ height: '100%', overflow: 'auto' }}>
          <FilterSidebar filters={filters} setFilters={setFilters} />
        </Grid>

        {/* Middle Section - Chart and Alerts */}
        <Grid item xs={12} md={6} lg={7} sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top area - Alert Summary and Chart */}
            <AlertSummary alert={recentAlert} />
            
            {/* Using LineChart with named imports style */}
            <LineChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
              onTimeframeChange={(tf) => {
                console.log(`Dashboard: Setting timeframe to ${tf}`);
                setChartTimeframe(tf);
                // Also store in session storage for persistence
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('preferredTimeframe', tf);
                }
              }}
            />
            {/* Previous attempts - temporarily disabled 
            <FinalChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
            />
            <StaticChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
            />
            <MinimalChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
            />
            <BasicChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
            />
            <SimpleChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
            />
            <CoinAlertChart 
              symbol={selectedCoin ? selectedCoin.symbol : recentAlert?.symbol} 
              timeframe={chartTimeframe}
              meetsConditions={meetingCondition}
              onTimeframeChange={setChartTimeframe}
            /> */}
            
            {/* Bottom area - Alerts List */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                sx={{ mb: 2 }}
                variant="fullWidth"
              >
                <Tab label="Alerts" />
                <Tab label="Overview" />
              </Tabs>
              
              {tabValue === 0 && (
                <GroupedAlertsList />
              )}
              
              {tabValue === 1 && (
                <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                  <Typography variant="h6">Market Overview</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Overview content will be displayed here.
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right Section - Market Panel */}
        <Grid item xs={12} md={3} lg={3} sx={{ height: '100%', overflow: 'auto' }}>
          <MarketPanel onSelectCoin={handleSelectCoin} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
