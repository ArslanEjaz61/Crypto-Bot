import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Paper, Typography, ButtonGroup, Button } from '@mui/material';
import * as LightweightCharts from 'lightweight-charts';

// Define LineChart as a proper React function component
const LineChart = ({ symbol = 'BTCUSDT', defaultTimeframe = '1h' }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle window resize - defined outside to avoid recreation on each render
  const handleResize = useCallback(() => {
    if (chartRef.current && containerRef.current) {
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth
      });
    }
  }, []);

  // Cleanup function extracted for reuse
  const cleanupChart = useCallback(() => {
    // Remove resize listener first
    window.removeEventListener('resize', handleResize);
    
    // Then cleanup chart
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        console.error('Error cleaning up chart:', error);
      }
      chartRef.current = null;
    }
  }, [handleResize]);

  useEffect(() => {
    // Always clean up previous chart before creating a new one
    cleanupChart();
    
    // Create chart when component mounts if container is ready
    if (containerRef.current) {
      fetchDataAndCreateChart();
    }

    // Cleanup on unmount or when dependencies change
    return cleanupChart;
  }, [symbol, timeframe, cleanupChart]); // Re-run when symbol or timeframe changes

  const handleTimeframeChange = (newTimeframe) => {
    console.log(`Changing timeframe to ${newTimeframe}`);
    setTimeframe(newTimeframe);
  };

  const fetchDataAndCreateChart = async () => {
    setIsLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      // Don't manually clear the container - let React handle the DOM
      // Just ensure the chart is properly removed

      // Fetch data from API
      console.log(`Fetching data for ${symbol} with timeframe ${timeframe}...`);
      const response = await fetch(`/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('No chart data available');
      }

      // Make sure container is still available
      if (!containerRef.current) return;
      
      // Create chart with dark theme
      const chart = LightweightCharts.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 400,
        layout: { 
          textColor: '#d1d4dc', 
          background: { color: '#222' } 
        },
        grid: { 
          vertLines: { color: '#444' }, 
          horzLines: { color: '#444' } 
        },
        timeScale: { 
          timeVisible: true, 
          borderColor: '#444' 
        },
      });
      
      // Store reference to chart for cleanup
      chartRef.current = chart;

      // Create line series (instead of candlestick)
      const lineSeries = chart.addLineSeries({
        color: '#4CAF50',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
      });

      // Format data for line series (close price only)
      const formattedData = data.map(item => {
        let time;
        if (typeof item.time === 'string') {
          // If time is ISO string, convert to YYYY-MM-DD format
          const date = new Date(item.time);
          time = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else {
          // If time is unix timestamp
          time = item.time;
        }
        
        return {
          time: time,
          value: Number(item.close)
        };
      });

      // Remove duplicate timestamps to prevent errors
      const uniqueData = [];
      const timeMap = new Set();
      
      formattedData.forEach(item => {
        const timeStr = item.time.toString();
        if (!timeMap.has(timeStr)) {
          timeMap.add(timeStr);
          uniqueData.push(item);
        }
      });

      // Set data
      lineSeries.setData(uniqueData);
      
      // Fit content
      chart.timeScale().fitContent();
      
      console.log(`Line chart created successfully with ${uniqueData.length} points`);

      // Add resize listener
      window.addEventListener('resize', handleResize);

    } catch (error) {
      console.error('Error creating chart:', error);
      // Set error state to be displayed by React
      setError(error.message || 'Error loading chart data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {symbol} Price Chart
        </Typography>
        
        <ButtonGroup size="small" variant="outlined">
          <Button 
            onClick={() => handleTimeframeChange('15m')}
            variant={timeframe === '15m' ? 'contained' : 'outlined'}
          >
            15m
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('1h')}
            variant={timeframe === '1h' ? 'contained' : 'outlined'}
          >
            1h
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('4h')}
            variant={timeframe === '4h' ? 'contained' : 'outlined'}
          >
            4h
          </Button>
          <Button 
            onClick={() => handleTimeframeChange('1d')}
            variant={timeframe === '1d' ? 'contained' : 'outlined'}
          >
            1d
          </Button>
        </ButtonGroup>
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
        {isLoading && !error && (
          <Typography color="text.secondary">Loading chart...</Typography>
        )}
        
        {error && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="error">
              Error loading chart: {error}
            </Typography>
          </Box>
        )}
      </Box>
      
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Powered by Lightweight Charts
        </Typography>
      </Box>
    </Paper>
  );
};

// Make sure the component is properly exported as the default export
export default LineChart;
