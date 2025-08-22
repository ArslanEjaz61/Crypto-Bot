import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import * as LightweightCharts from 'lightweight-charts';

// Most basic chart implementation - avoiding any DOM manipulation issues
const StaticChart = ({ symbol, timeframe = '1h' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only run chart initialization once the component is mounted with a DOM node
    if (!symbol) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        console.log(`Fetching data for ${symbol} (${timeframe})...`);
        const response = await fetch(`/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
          setError('No data available');
          setLoading(false);
          return;
        }
        
        console.log(`Received ${data.length} candles for ${symbol}`);
        
        // Only proceed if we have a container element
        const container = document.getElementById('chart-container');
        if (!container) {
          throw new Error('Chart container not found');
        }
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create chart
        const chart = LightweightCharts.createChart(container, {
          width: container.clientWidth,
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
        
        // Add series
        const series = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350'
        });
        
        // Format data
        const formattedData = data.map(item => ({
          time: typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000),
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close)
        }));
        
        // Set data
        series.setData(formattedData);
        
        // Fit content
        chart.timeScale().fitContent();
        
        console.log('Chart rendered successfully');
        setLoading(false);
        
        // Cleanup function to remove chart on unmount
        return () => {
          try {
            chart.remove();
          } catch (err) {
            console.error('Error removing chart:', err);
          }
        };
        
      } catch (error) {
        console.error('Chart error:', error);
        setError(error.message);
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Clean up on unmount or when symbol/timeframe changes
    return () => {
      const container = document.getElementById('chart-container');
      if (container) {
        console.log('Cleaning up chart container');
        container.innerHTML = '';
      }
    };
    
  }, [symbol, timeframe]);

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {symbol ? `${symbol} Chart (${timeframe})` : 'Select a coin to view chart'}
      </Typography>
      
      <Box 
        id="chart-container"
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

export default StaticChart;
