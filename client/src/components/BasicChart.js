import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
// Import the entire library correctly
import * as LightweightCharts from 'lightweight-charts';

const BasicChart = ({ symbol, timeframe = '1h' }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        console.log('Cleaning up chart on unmount');
        try {
          // Use proper chart removal method
          chartRef.current.remove();
        } catch (err) {
          console.error('Error during chart cleanup:', err);
        }
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);
    
    console.log(`Loading data for ${symbol} - timeframe: ${timeframe}`);
    
    // Fetch data for the chart
    fetch(`/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (!data || data.length === 0) {
          setError('No chart data available');
          setLoading(false);
          return;
        }

        console.log(`Received ${data.length} candles for ${symbol}`);
        console.log('Sample data point:', data[0]);
        
        initializeChart(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching chart data:', err);
        setError(`Failed to load chart: ${err.message}`);
        setLoading(false);
      });
  }, [symbol, timeframe]);

  const initializeChart = (data) => {
    if (!chartContainerRef.current) return;
    
    // Format the data
    const formattedData = data.map(item => ({
      // Ensure time is a number in seconds
      time: typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000),
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close)
    }));
    
    console.log('Formatted sample:', formattedData[0]);

    try {
      // Clean up previous chart if it exists
      if (chartRef.current) {
        try {
          // Use proper chart removal method
          chartRef.current.remove();
        } catch (err) {
          console.error('Error removing previous chart:', err);
        }
        chartRef.current = null;
        seriesRef.current = null;
      }
      
      // Wait a moment before creating new chart to ensure DOM is ready
      console.log('Container is ready for new chart');

      // Make sure container is empty
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
      
      // Create the chart with the most basic setup
      console.log('Creating new chart...');
      const chart = LightweightCharts.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 400,
        layout: {
          background: { color: '#222' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: '#444' },
          horzLines: { color: '#444' },
        },
      });
      
      // Store reference
      chartRef.current = chart;
      
      console.log('Creating series...');
      
      // Create candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
      });
      
      // Store series reference
      seriesRef.current = candleSeries;
      
      console.log('Setting data...');
      
      // Set the data
      candleSeries.setData(formattedData);
      
      // Fit all data on screen
      chart.timeScale().fitContent();
      
      console.log('Chart created successfully');
    } catch (err) {
      console.error('Chart creation error:', err);
      setError(`Chart creation failed: ${err.message}`);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        {symbol ? `${symbol} Chart (${timeframe})` : 'Loading Chart...'}
      </Typography>

      <Box 
        ref={chartContainerRef} 
        sx={{ 
          width: '100%', 
          height: 400, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          position: 'relative',
          bgcolor: '#222'
        }}
      >
        {loading && (
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && error && (
          <Typography color="error.main">
            {error}
          </Typography>
        )}
      </Box>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Powered by TradingView Lightweight Charts
        </Typography>
      </Box>
    </Paper>
  );
};

export default BasicChart;
