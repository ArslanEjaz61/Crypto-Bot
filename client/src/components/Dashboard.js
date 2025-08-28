import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Tabs, Tab, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AlertSummary from './AlertSummary';
import LineChart from './LineChart.js';
import GroupedAlertsList from './GroupedAlertsList';
import RSIAnalysisList from './RSIAnalysisList';
import MarketPanel from './MarketPanel';
import FilterSidebar from './FilterSidebar';
import { useAlert } from '../context/AlertContext';

const Dashboard = ({ children }) => {
  const { alerts, loadAlerts } = useAlert();
  const [recentAlert, setRecentAlert] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');

  // Get the most recent alert overall
  useEffect(() => {
    console.log('Dashboard - Current alerts state:', alerts);
    if (!alerts || alerts.length === 0) return;
    
    // Show most recent alert
    const sortedAlerts = [...alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setRecentAlert(sortedAlerts[0]);
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
    <Box sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Grid container spacing={2} sx={{ height: '100%', p: 1 }}>
        {/* Left Section - Filters Sidebar */}
        <Grid item xs={12} md={3} lg={3} sx={{ height: '100%', overflow: 'auto' }}>
          <FilterSidebar selectedSymbol={selectedCoin} />
        </Grid>

        {/* Main Section - Chart and Alerts */}
        <Grid item xs={12} md={6} lg={6} sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top area - Alert Summary and Chart */}
            <AlertSummary alert={recentAlert} />
            
            {/* LineChart with selected coin */}
            <LineChart symbol={selectedCoin} defaultTimeframe="1h" />
            
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
              
              {tabValue === 2 && (
                <RSIAnalysisList />
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
