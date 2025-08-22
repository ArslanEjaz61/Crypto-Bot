import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import * as LightweightCharts from 'lightweight-charts';

// Use React's key prop to force complete remount on symbol/timeframe changes
const ChartComponent = ({ symbol, timeframe }) => {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let chart = null;
    let candleSeries = null;
    
    const initChart = async () => {
      try {
        if (!containerRef.current) return;
        
        console.log(`Creating chart for ${symbol} (${timeframe})`);
        
        // Create chart
        chart = LightweightCharts.createChart(containerRef.current, {
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
        
        // Create series
        candleSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350'
        });
        
        // Fetch data
        const response = await fetch(`/api/crypto/${symbol}/chart?timeframe=${timeframe}&limit=100`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        if (!data || data.length === 0) throw new Error('No chart data available');
        
        // Format data
        const formattedData = data.map(item => ({
          time: typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000),
          open: Number(item.open),
          high: Number(item.high),
          low: Number(item.low),
          close: Number(item.close)
        }));
        
        // Set data
        candleSeries.setData(formattedData);
        
        // Fit content
        chart.timeScale().fitContent();
        
        console.log('Chart created successfully');
      } catch (err) {
        console.error('Chart error:', err);
        setError(err.message);
      }
    };
    
    initChart();
    
    // Cleanup function
    return () => {
      if (chart) {
        try {
          console.log('Removing chart on cleanup');
          chart.remove();
        } catch (err) {
          console.error('Error removing chart:', err);
        }
      }
    };
  }, [symbol, timeframe]);
  
  if (error) {
    return (
      <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#222' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: 400, 
        bgcolor: '#222',
        borderRadius: 1
      }}
    />
  );
};

// Wrapper component that uses key prop for complete remounts
const FinalChart = ({ symbol, timeframe = '1h' }) => {
  const [loading, setLoading] = useState(!symbol);
  
  // Use a unique key combining symbol and timeframe to force complete remount
  const chartKey = `${symbol || 'none'}-${timeframe}`;
  
  // Show loading briefly when symbol changes
  useEffect(() => {
    if (symbol) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [symbol, timeframe]);
  
  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {symbol ? `${symbol} Chart (${timeframe})` : 'Select a coin to view chart'}
      </Typography>
      
      {loading ? (
        <Box sx={{ 
          height: 400, 
          bgcolor: '#222', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderRadius: 1
        }}>
          <CircularProgress />
        </Box>
      ) : (
        symbol && <ChartComponent key={chartKey} symbol={symbol} timeframe={timeframe} />
      )}
      
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Powered by TradingView Lightweight Charts
        </Typography>
      </Box>
    </Paper>
  );
};

export default FinalChart;
