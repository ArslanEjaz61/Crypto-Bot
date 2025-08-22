import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
// Import the full library instead of just createChart
import * as LightweightCharts from 'lightweight-charts';

const SimpleChart = ({ symbol, timeframe = '1h' }) => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clean up previous chart instance when component unmounts or symbol/timeframe changes
  useEffect(() => {
    return () => {
      // Clean up chart when component unmounts
      if (chartInstanceRef.current) {
        console.log('Cleaning up previous chart instance');
        try {
          chartInstanceRef.current.remove();
          chartInstanceRef.current = null;
        } catch (err) {
          console.error('Error cleaning up chart:', err);
        }
      }
    };
  }, []);

  // Fetch data and create chart when symbol or timeframe changes
  useEffect(() => {
    if (!symbol) return;
    
    setLoading(true);
    setError(null);

    // Fetch data
    console.log(`Fetching chart data for ${symbol} with timeframe ${timeframe}`);
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

        console.log('Chart data received:', data.length, 'items');
        console.log('Sample data item:', data[0]);
        
        // Create chart after data is received
        createSimpleChart(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching chart data:', err);
        setError(`Failed to load chart data: ${err.message}`);
        setLoading(false);
      });
  }, [symbol, timeframe]);

  function createSimpleChart(chartData) {
    if (!chartContainerRef.current) return;
    
    // Clean up previous chart instance if it exists
    if (chartInstanceRef.current) {
      try {
        console.log('Removing previous chart instance');
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      } catch (err) {
        console.error('Error removing previous chart:', err);
      }
    }

    try {
      console.log('Creating chart using LightweightCharts library...');
      
      // Create chart instance using the full library reference
      const chart = LightweightCharts.createChart(chartContainerRef.current);
      
      // Store the chart instance reference
      chartInstanceRef.current = chart;
      
      // Set the container size
      chart.applyOptions({
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

      // Format data for chart
      const formattedData = chartData.map(item => ({
        time: typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
      }));

      console.log('Formatted data sample:', formattedData[0]);

      // Create series using the proper way for v5
      console.log('Adding candlestick series...');
      const candlestickSeries = chart.addCandlestickSeries();
      console.log('Series created:', candlestickSeries);
      
      // Set data
      console.log('Setting series data...');
      candlestickSeries.setData(formattedData);
      
      // Fit content to container
      chart.timeScale().fitContent();
      
      console.log('Chart created successfully');
    } catch (err) {
      console.error('Error creating chart:', err);
      setError(`Error creating chart: ${err.message}`);
    }
  }

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        {symbol} Simple Chart - {timeframe.toUpperCase()}
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

export default SimpleChart;
