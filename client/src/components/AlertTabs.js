import React, { useState } from 'react';
import { Box, Tab, Tabs, Paper } from '@mui/material';
import AlertsList from './AlertsList';
import CreateAlertForm from './CreateAlertForm';
import RSIAnalysis from './RSIAnalysis';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`alert-tabpanel-${index}`}
      aria-labelledby={`alert-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AlertTabs = () => {
  const [value, setValue] = useState(0);
  // Track which tabs have been visited to enable lazy loading
  const [visitedTabs, setVisitedTabs] = useState([0]); // Start with first tab as visited

  const handleChange = (event, newValue) => {
    setValue(newValue);
    
    // Mark this tab as visited if it hasn't been already
    if (!visitedTabs.includes(newValue)) {
      setVisitedTabs([...visitedTabs, newValue]);
    }
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: 'background.paper'
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={value} 
          onChange={handleChange} 
          aria-label="alerts tabs"
          variant="fullWidth"
          sx={{ 
            '& .MuiTab-root': { 
              py: 2, 
              fontSize: '1rem',
              fontWeight: 'medium'
            } 
          }}
        >
          <Tab label="Alerts List" />
          <Tab label="Create Alert" />
          <Tab label="RSI Analysis" />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        {visitedTabs.includes(0) && <AlertsList />}
      </TabPanel>

      <TabPanel value={value} index={1}>
        {visitedTabs.includes(1) && <CreateAlertForm />}
      </TabPanel>

      <TabPanel value={value} index={2}>
        {visitedTabs.includes(2) && <RSIAnalysis />}
      </TabPanel>
    </Paper>
  );
};

export default AlertTabs;
