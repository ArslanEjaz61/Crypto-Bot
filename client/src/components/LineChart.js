import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Paper, Typography, CircularProgress, ButtonGroup, Button } from '@mui/material';
import { createChart, LineSeries } from 'lightweight-charts';

// Available timeframes
const TIMEFRAMES = [
  { value: '1m', label: '1M', limit: 200 },
  { value: '5m', label: '5M', limit: 200 },
  { value: '15m', label: '15M', limit: 200 },
  { value: '30m', label: '30M', limit: 200 },
  { value: '1h', label: '1H', limit: 200 },
  { value: '4h', label: '4H', limit: 150 },
  { value: '1d', label: '1D', limit: 100 }
];

// Line chart component using named imports
const LineChart = ({ symbol, timeframe: propTimeframe = '1h', onTimeframeChange }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(propTimeframe);
  
  // Get the current timeframe config
  const currentTimeframeConfig = TIMEFRAMES.find(tf => tf.value === selectedTimeframe) || TIMEFRAMES[4]; // Default to 1h
  
  // Use a key to force remounting when symbol/timeframe changes
  const chartKey = `${symbol || 'none'}-${selectedTimeframe}`;
  
  // Debug changes to selectedTimeframe
  useEffect(() => {
    console.log(`LineChart: selectedTimeframe changed to ${selectedTimeframe}`);
  }, [selectedTimeframe]);
  
  // Debug changes to propTimeframe
  useEffect(() => {
    console.log(`LineChart: propTimeframe changed to ${propTimeframe}`);
  }, [propTimeframe]);
  
  // Reset state when chart key changes
  useEffect(() => {
    console.log(`LineChart: chartKey changed to ${chartKey}`);
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (seriesRef.current) {
      seriesRef.current = null;
    }
    setLoading(true);
    setError(null);
  }, [chartKey]);
  
  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe) => {
    console.log(`LineChart: Changing timeframe from ${selectedTimeframe} to ${newTimeframe}`);
    
    // Update local state
    setSelectedTimeframe(newTimeframe);
    
    // Notify parent component
    if (onTimeframeChange) {
      console.log('LineChart: Notifying parent of timeframe change');
      onTimeframeChange(newTimeframe);
    } else {
      console.warn('LineChart: No onTimeframeChange handler provided');
    }
  }, [selectedTimeframe, onTimeframeChange]);

  // Effect to update selected timeframe when prop changes
  useEffect(() => {
    if (propTimeframe !== selectedTimeframe) {
      console.log(`LineChart: Updating selectedTimeframe from ${selectedTimeframe} to ${propTimeframe} (from props)`);
      setSelectedTimeframe(propTimeframe);
    }
  }, [propTimeframe, selectedTimeframe]);

  useEffect(() => {
    if (!symbol || !containerRef.current) return;
    
    const fetchDataAndRenderChart = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the limit for the selected timeframe
        const limit = currentTimeframeConfig.limit;
        
        console.log(`Fetching data for ${symbol} (${selectedTimeframe}), limit: ${limit}...`);
        const response = await fetch(`/api/crypto/${symbol}/chart?timeframe=${selectedTimeframe}&limit=${limit}`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
          setError('No data available');
          setLoading(false);
          return;
        }
        
        console.log(`Received ${data.length} data points for ${symbol}`);
        
        // Clean up previous chart if it exists
        if (chartRef.current) {
          console.log('Removing previous chart');
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        }
        
        console.log('Creating new line chart');
        
        // Create chart using named import style
        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 400,
          layout: {
            background: { color: '#222' },
            textColor: '#DDD',
          },
          grid: {
            vertLines: { color: '#444' },
            horzLines: { color: '#444' },
          },
          timeScale: {
            timeVisible: true,
            borderColor: '#444'
          }
        });
        
        chartRef.current = chart;
        
        // Create line series using addSeries with LineSeries
        const series = chart.addSeries(LineSeries, {
          color: '#2962FF',
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 6,
        });
        
        seriesRef.current = series;
        
        // Debug the incoming data
        console.log(`Processing ${data.length} data points for timeframe ${selectedTimeframe}`);
        console.log('Sample timestamps:', data.slice(0, 5).map(item => item.time));
        
        // Format data based on timeframe
        // For shorter timeframes (< 1h), we need more precise time format
        let formattedData = data.map(item => {
          // Convert timestamp to appropriate format based on timeframe
          let dateObj;
          if (typeof item.time === 'number') {
            dateObj = new Date(item.time * 1000); // If seconds timestamp
            if (!isFinite(dateObj)) { // If milliseconds timestamp
              dateObj = new Date(item.time);
            }
          } else {
            dateObj = new Date(item.time);
          }
          
          // Always use YYYY-MM-DD format as required by Lightweight Charts
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const timeString = `${year}-${month}-${day}`;
          
          // Store additional time info for debugging but don't use in the chart
          let debugTimeInfo = '';
          if (['1m', '5m', '15m', '30m'].includes(selectedTimeframe)) {
            // For minute-based timeframes
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            debugTimeInfo = `${hours}:${minutes}`;
          } else if (['1h', '4h'].includes(selectedTimeframe)) {
            // For hour-based timeframes
            const hours = String(dateObj.getHours()).padStart(2, '0');
            debugTimeInfo = `${hours}:00`;
          }
          
          return {
            time: timeString,
            value: Number(item.close),
            originalTime: item.time // Keep original for debugging
          };
        });
        
        // Remove duplicates by time value - keep the latest entry for each timestamp
        const timeMap = new Map();
        for (const item of formattedData) {
          // For each day, keep the last value
          timeMap.set(item.time, item);
        }
        formattedData = Array.from(timeMap.values());
        
        // Sort by time string to ensure ascending order
        formattedData.sort((a, b) => a.time.localeCompare(b.time));
        
        // Debug the processed data
        console.log('Processed data (after deduplication):', 
          formattedData.length, 
          'items, first 5:', 
          formattedData.slice(0, 5));
          
        console.log('Using strict YYYY-MM-DD format for all data points');
          
        // Remove debug property before sending to chart
        formattedData = formattedData.map(({ time, value }) => ({ time, value }));
        
        // Set data
        series.setData(formattedData);
        
        // Fit content
        chart.timeScale().fitContent();
        
        console.log('Line chart rendered successfully');
        setLoading(false);
        
      } catch (err) {
        console.error('Chart error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchDataAndRenderChart();
    
    // Clean up on unmount
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
        } catch (err) {
          console.error('Error removing chart:', err);
        }
      }
    };
  }, [symbol, selectedTimeframe, currentTimeframeConfig]);

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {symbol ? `${symbol} Line Chart` : 'Select a coin to view chart'}
        </Typography>
        
        {symbol && (
          <ButtonGroup size="small" aria-label="timeframe selection">
            {TIMEFRAMES.map((tf) => (
              <Button 
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                variant={selectedTimeframe === tf.value ? 'contained' : 'outlined'}
                sx={{ px: 1, minWidth: '40px' }}
              >
                {tf.label}
              </Button>
            ))}
          </ButtonGroup>
        )}
      </Box>
      
      <Box
        ref={containerRef}
        sx={{ 
          width: '100%', 
          height: 400, 
          bgcolor: '#222',
          position: 'relative',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {loading && (
          <CircularProgress size={40} sx={{ color: 'primary.main' }} />
        )}
        
        {!loading && error && (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
      
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Powered by TradingView Lightweight Charts
        </Typography>
      </Box>
    </Paper>
  );
};

export default LineChart;
