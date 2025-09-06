const express = require('express');
const router = express.Router();
const Crypto = require('../models/cryptoModel');
const axios = require('axios');

// Helper function to get Binance klines data
async function getBinanceKlines(symbol, interval, limit = 500) {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: symbol.toUpperCase(),
        interval: interval,
        limit: limit
      }
    });
    
    return response.data.map(kline => ({
      openTime: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: parseInt(kline[6])
    }));
  } catch (error) {
    console.error('Error fetching Binance klines:', error);
    return null;
  }
}

// Helper function to calculate RSI
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  
  let gains = [];
  let losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains.push(difference);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(difference));
    }
  }
  
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
  
  const rsiValues = [];
  
  for (let i = period; i < gains.length; i++) {
    if (avgLoss === 0) {
      rsiValues.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(rsi);
    }
    
    // Update averages using Wilder's smoothing
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  return rsiValues[rsiValues.length - 1]; // Return latest RSI
}

// Helper function to calculate EMA
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

// Convert timeframe format
function convertTimeframe(timeframe) {
  const timeframeMap = {
    '5MIN': '5m',
    '15MIN': '15m',
    '1HR': '1h',
    '4HR': '4h',
    '12HR': '12h',
    'D': '1d',
    'W': '1w'
  };
  return timeframeMap[timeframe] || '1h';
}

// GET /api/indicators/:symbol/rsi
router.get('/:symbol/rsi', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = 14, timeframe = '1h' } = req.query;
    
    console.log(`Fetching RSI for ${symbol}, period: ${period}, timeframe: ${timeframe}`);
    
    const binanceInterval = convertTimeframe(timeframe);
    const klines = await getBinanceKlines(symbol, binanceInterval, 100);
    
    if (!klines || klines.length === 0) {
      return res.status(404).json({ error: 'No data available for this symbol' });
    }
    
    const closePrices = klines.map(k => k.close);
    const rsi = calculateRSI(closePrices, parseInt(period));
    
    if (rsi === null) {
      return res.status(400).json({ error: 'Insufficient data to calculate RSI' });
    }
    
    res.json({
      symbol,
      timeframe,
      period: parseInt(period),
      rsi: rsi,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in RSI endpoint:', error);
    res.status(500).json({ error: 'Failed to calculate RSI' });
  }
});

// GET /api/indicators/:symbol/ema
router.get('/:symbol/ema', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { periods = '9,12,26,50,200', timeframe = '1h' } = req.query;
    
    console.log(`Fetching EMA for ${symbol}, periods: ${periods}, timeframe: ${timeframe}`);
    
    const binanceInterval = convertTimeframe(timeframe);
    const klines = await getBinanceKlines(symbol, binanceInterval, 200);
    
    if (!klines || klines.length === 0) {
      return res.status(404).json({ error: 'No data available for this symbol' });
    }
    
    const closePrices = klines.map(k => k.close);
    const periodArray = periods.split(',').map(p => parseInt(p.trim()));
    
    const emaData = {};
    periodArray.forEach(period => {
      const ema = calculateEMA(closePrices, period);
      if (ema !== null) {
        emaData[period] = ema;
      }
    });
    
    res.json({
      symbol,
      timeframe,
      periods: periodArray,
      ema: emaData,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in EMA endpoint:', error);
    res.status(500).json({ error: 'Failed to calculate EMA' });
  }
});

// GET /api/indicators/:symbol/volume-history
router.get('/:symbol/volume-history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 10, timeframe = '1h' } = req.query;
    
    console.log(`Fetching volume history for ${symbol}, limit: ${limit}, timeframe: ${timeframe}`);
    
    const binanceInterval = convertTimeframe(timeframe);
    const klines = await getBinanceKlines(symbol, binanceInterval, parseInt(limit));
    
    if (!klines || klines.length === 0) {
      return res.status(404).json({ error: 'No data available for this symbol' });
    }
    
    const volumeHistory = klines.map(k => k.volume);
    const avgVolume = volumeHistory.reduce((sum, vol) => sum + vol, 0) / volumeHistory.length;
    
    res.json({
      symbol,
      timeframe,
      volumeHistory,
      averageVolume: avgVolume,
      currentVolume: volumeHistory[volumeHistory.length - 1],
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in volume history endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch volume history' });
  }
});

// GET /api/indicators/:symbol/ohlcv
router.get('/:symbol/ohlcv', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h', limit = 1 } = req.query;
    
    console.log(`Fetching OHLCV for ${symbol}, timeframe: ${timeframe}, limit: ${limit}`);
    
    const binanceInterval = convertTimeframe(timeframe);
    const klines = await getBinanceKlines(symbol, binanceInterval, parseInt(limit));
    
    if (!klines || klines.length === 0) {
      return res.status(404).json({ error: 'No data available for this symbol' });
    }
    
    const latestCandle = klines[klines.length - 1];
    const previousCandle = klines.length > 1 ? klines[klines.length - 2] : null;
    
    res.json({
      symbol,
      timeframe,
      current: {
        open: latestCandle.open,
        high: latestCandle.high,
        low: latestCandle.low,
        close: latestCandle.close,
        volume: latestCandle.volume,
        openTime: latestCandle.openTime,
        closeTime: latestCandle.closeTime
      },
      previous: previousCandle ? {
        open: previousCandle.open,
        high: previousCandle.high,
        low: previousCandle.low,
        close: previousCandle.close,
        volume: previousCandle.volume,
        openTime: previousCandle.openTime,
        closeTime: previousCandle.closeTime
      } : null,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error in OHLCV endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch OHLCV data' });
  }
});

module.exports = router;
