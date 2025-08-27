import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Tabs, Tab } from '@mui/material';
import AlertSummary from './AlertSummary';
import LineChart from './LineChart.jsx';
import GroupedAlertsList from './GroupedAlertsList';
import RSIAnalysisList from './RSIAnalysisList';
import MarketPanel from './MarketPanel';
import { useAlert } from '../context/AlertContext';

const Dashboard = ({ children }) => {
  const { alerts } = useAlert();
  const [recentAlert, setRecentAlert] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Get the most recent alert overall
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    
    // Show most recent alert
    const sortedAlerts = [...alerts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setRecentAlert(sortedAlerts[0]);
  }, [alerts]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Grid container spacing={2} sx={{ height: '100%', p: 1 }}>
        {/* Main Section - Chart and Alerts */}
        <Grid item xs={12} md={8} lg={9} sx={{ height: '100%', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top area - Alert Summary and Chart */}
            <AlertSummary alert={recentAlert} />
            
            {/* Using LineChart with fixed BTCUSDT */}
            <LineChart symbol="BTCUSDT" defaultTimeframe="1h" />
            
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
                <Tab label="RSI Analysis" />
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
              
              {tabValue === 2 && (
                <RSIAnalysisList />
              )}
            </Box>
          </Box>
        </Grid>

        {/* Right Section - Market Panel */}
        <Grid item xs={12} md={4} lg={3} sx={{ height: '100%', overflow: 'auto' }}>
          <MarketPanel />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
