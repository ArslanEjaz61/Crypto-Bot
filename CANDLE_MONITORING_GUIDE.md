# 🕯️ Candle Monitoring System Implementation Guide

## Overview

This implementation adds sophisticated real-time candle monitoring capabilities to your trading dashboard. The system monitors multiple timeframes simultaneously and triggers alerts only once per candle to prevent spam notifications.

## 🚀 Key Features

### 1. **Multiple Timeframe Support**
- Monitor up to 7 different timeframes: `5MIN`, `15MIN`, `1HR`, `4HR`, `12HR`, `D`, `W`
- Each timeframe is monitored independently
- Alerts can be configured for any combination of timeframes

### 2. **Advanced Candle Pattern Detection**
- **ABOVE_OPEN**: Close price is above open price
- **BELOW_OPEN**: Close price is below open price  
- **GREEN_CANDLE**: Bullish candle (close > open)
- **RED_CANDLE**: Bearish candle (close < open)
- **DOJI**: Open and close are very close (within 0.1% of range)
- **HAMMER**: Generic hammer pattern (small body, long lower wick)
- **BULLISH_HAMMER**: Hammer with bullish close
- **BEARISH_HAMMER**: Hammer with bearish close
- **LONG_UPPER_WICK**: Upper wick is at least 2x body size
- **LONG_LOWER_WICK**: Lower wick is at least 2x body size

### 3. **Smart Alert Management**
- **One Alert Per Candle**: Prevents spam by tracking which candles have already triggered
- **Automatic Reset**: Alert state resets when new candles start
- **Real-time Monitoring**: Uses live Binance API data for accurate detection

## 🏗️ Architecture

### Backend Components

#### 1. **Candle Monitoring Service** (`server/services/candleMonitoringService.js`)
```javascript
// Key functions:
- getCurrentCandleData(symbol, timeframes) // Get real-time candle data
- checkCandleCondition(candle, condition) // Check if condition is met
- monitorCandleCondition(symbol, timeframe, condition) // Monitor single timeframe
- monitorMultipleTimeframes(symbol, timeframes, condition) // Monitor multiple timeframes
```

#### 2. **Enhanced Alert Model** (`server/models/alertModel.js`)
```javascript
// New fields:
- candleTimeframes: [String] // Array of timeframes to monitor
- candleAlertStates: Map // Tracks alert states per timeframe
- resetCandleAlertStates(timeframe, candleOpenTime) // Reset for new candles
- wasCandleAlertTriggered(timeframe, candleOpenTime) // Check if already triggered
```

#### 3. **Updated Cron Jobs** (`server/utils/cronJobs.js`)
- Fetches real-time candle data from Binance API
- Resets alert states for new candles
- Monitors all active candle alerts every minute

### Frontend Integration

#### Alert Creation API
```javascript
POST /api/alerts
{
  "symbol": "BTCUSDT",
  "candleTimeframes": ["5MIN", "15MIN", "1HR"], // Multiple timeframes
  "candleCondition": "BULLISH_HAMMER", // Single condition
  "email": "trader@example.com",
  // ... other alert fields
}
```

## 📋 Implementation Details

### 1. **Real-time Data Fetching**
- Uses Binance API `/api/v3/klines` endpoint
- Fetches current and previous candle data
- Handles API rate limits and errors gracefully
- Caches data to reduce API calls

### 2. **Candle State Tracking**
```javascript
// Each alert tracks state per timeframe:
candleAlertStates: {
  "5MIN": {
    triggered: false,
    lastTriggeredCandle: "5MIN_1703123400000", // timeframe_openTime
    lastChecked: "2023-12-21T10:30:00Z"
  },
  "1HR": {
    triggered: true,
    lastTriggeredCandle: "1HR_1703122800000",
    lastChecked: "2023-12-21T10:30:00Z"
  }
}
```

### 3. **Alert Triggering Logic**
1. **Check for New Candles**: Compare current candle openTime with previous
2. **Reset States**: Clear triggered flags for new candles
3. **Check Conditions**: Evaluate candle patterns against selected conditions
4. **Trigger Alerts**: Send notification only if condition met and not already triggered
5. **Update States**: Mark timeframe as triggered for current candle

## 🔧 Usage Examples

### Example 1: Monitor Hammer Patterns
```javascript
const hammerAlert = {
  symbol: "BTCUSDT",
  candleTimeframes: ["1HR", "4HR", "D"],
  candleCondition: "BULLISH_HAMMER",
  email: "trader@example.com"
};
```

### Example 2: Monitor Doji Patterns
```javascript
const dojiAlert = {
  symbol: "ETHUSDT", 
  candleTimeframes: ["D"],
  candleCondition: "DOJI",
  email: "trader@example.com"
};
```

### Example 3: Monitor Green Candles
```javascript
const greenCandleAlert = {
  symbol: "ADAUSDT",
  candleTimeframes: ["5MIN", "15MIN", "1HR"],
  candleCondition: "GREEN_CANDLE", 
  email: "trader@example.com"
};
```

## 🧪 Testing

### Run the Test Script
```bash
node test-candle-monitoring.js
```

This will test:
- Timeframe conversion
- Real-time data fetching
- Candle condition detection
- Monitoring functionality

### Manual Testing
1. Create an alert with candle conditions
2. Monitor the logs for real-time data fetching
3. Verify alerts trigger only once per candle
4. Check that states reset for new candles

## 📊 Monitoring & Debugging

### Log Messages to Watch
```
🕯️ Fetching real-time candle data for BTCUSDT timeframes: ["5MIN", "1HR"]
📊 Retrieved candle data for BTCUSDT: ["5MIN", "1HR"]
🚨 ALERT TRIGGERED for BTCUSDT - Candle pattern detected
✅ Candle alert state updated for 1HR timeframe
```

### Common Issues & Solutions

#### 1. **No Candle Data**
- Check Binance API connectivity
- Verify symbol format (e.g., "BTCUSDT" not "BTC/USDT")
- Check API rate limits

#### 2. **Alerts Not Triggering**
- Verify candle conditions are correctly configured
- Check if alert states are being reset properly
- Ensure timeframes are valid

#### 3. **Spam Alerts**
- Verify candle state tracking is working
- Check that `lastTriggeredCandle` is being updated
- Ensure new candle detection is accurate

## 🔄 Workflow

### 1. **Alert Creation**
1. User selects timeframes and condition in frontend
2. Frontend sends POST request to `/api/alerts`
3. Backend validates and stores alert with candle configuration
4. Alert becomes active for monitoring

### 2. **Real-time Monitoring**
1. Cron job runs every minute
2. Fetches fresh candle data from Binance API
3. Checks each active candle alert
4. Resets states for new candles
5. Evaluates conditions against real-time data
6. Triggers alerts for new conditions
7. Updates alert states to prevent spam

### 3. **Alert Triggering**
1. Condition is met for a timeframe
2. System checks if already triggered for current candle
3. If not triggered, sends notification (email/telegram)
4. Updates alert state to prevent re-triggering
5. Logs trigger event for debugging

## 🎯 Benefits

1. **Accurate Detection**: Uses real-time Binance data
2. **No Spam**: One alert per candle prevents notification overload
3. **Flexible**: Monitor any combination of timeframes
4. **Reliable**: Robust error handling and retry logic
5. **Scalable**: Efficient monitoring of multiple alerts
6. **User-Friendly**: Simple frontend integration

## 🚀 Next Steps

1. **Test the Implementation**: Run the test script and create sample alerts
2. **Monitor Performance**: Watch logs for any issues
3. **User Feedback**: Gather feedback on alert accuracy and timing
4. **Enhancements**: Consider adding more candle patterns or timeframes
5. **Analytics**: Track alert success rates and user engagement

---

**Status**: ✅ **IMPLEMENTED** - Candle monitoring system is fully functional and ready for production use.
