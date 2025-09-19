# 🔄 Continuous Alert Monitoring System

## Overview

The Continuous Alert Monitoring System ensures that alerts continue to trigger automatically after the first alert fires, without requiring manual re-creation. The system uses timeframe-based reset logic to prevent spam while maintaining real-time monitoring.

## 🚀 Key Features

### ✅ Continuous Monitoring
- **No 6-hour cooldown**: Alerts can trigger multiple times as conditions are met
- **Automatic reset**: Alert counters reset when new candles start
- **Real-time monitoring**: System continuously checks conditions every 30 seconds

### ✅ Timeframe-based Reset
- **Independent counters**: Each pair + timeframe has its own counter
- **Candle boundary detection**: Automatically detects when new candles start
- **Smart reset logic**: Counters reset only when new candles begin

### ✅ Duplicate Prevention
- **Same candle protection**: Prevents multiple alerts within the same candle
- **Configurable limits**: Set maximum alerts per candle (default: 1)
- **Automatic tracking**: System tracks which candles have already triggered alerts

### ✅ Comprehensive Logging
- **Candle start/end times**: Logs when new candles are detected
- **Counter resets**: Logs when alert counters are reset
- **Alert triggers**: Logs when alerts are triggered or blocked
- **Skip reasons**: Logs why alerts are skipped (already triggered, limit reached, etc.)

## 🔧 How It Works

### 1. Alert Creation
When an alert is created, the system automatically enables continuous monitoring:

```javascript
// Automatic setup for new alerts
alert.enableContinuousMonitoring('5MIN', 1);
```

### 2. Continuous Processing
The system runs every 30 seconds and:

1. **Checks candle boundaries** for all active alerts
2. **Resets counters** when new candles are detected
3. **Processes alerts** for current conditions
4. **Prevents duplicates** within the same candle

### 3. Candle Boundary Detection
```javascript
// Example: 5-minute candle detection
const currentCandleOpenTime = "2024-01-15T10:30:00.000Z";
const previousCandleOpenTime = "2024-01-15T10:25:00.000Z";

if (currentCandleOpenTime !== previousCandleOpenTime) {
  // New candle detected - reset counter
  alert.timeframeAlertCounters.set('5MIN', {
    count: 0,
    lastCandleOpenTime: currentCandleOpenTime,
    lastResetTime: new Date()
  });
}
```

### 4. Alert Count Management
```javascript
// Check if alert can be sent
const limitReached = alert.isAlertCountLimitReached('5MIN', candleOpenTime);

if (!limitReached) {
  // Send alert and increment counter
  alert.incrementAlertCount('5MIN', candleOpenTime);
  // Send notifications...
}
```

## 📊 Alert Count System

### Counter Structure
```javascript
timeframeAlertCounters: {
  "5MIN": {
    count: 1,                    // Number of alerts sent in current candle
    lastCandleOpenTime: "2024-01-15T10:30:00.000Z",  // Current candle open time
    lastResetTime: "2024-01-15T10:30:15.123Z"        // When counter was last reset
  }
}
```

### Counter Lifecycle
1. **New Candle**: Counter resets to 0
2. **Alert Triggered**: Counter increments to 1
3. **Same Candle**: Additional alerts blocked (if limit reached)
4. **Next Candle**: Counter resets to 0, cycle repeats

## 🛠️ Configuration

### Default Settings
- **Timeframe**: 5MIN (configurable)
- **Max alerts per candle**: 1 (configurable)
- **Check interval**: 30 seconds
- **Fallback cooldown**: 30 minutes (if alert count disabled)

### Customization
```javascript
// Enable continuous monitoring with custom settings
alert.enableContinuousMonitoring('15MIN', 2);  // 15-minute timeframe, max 2 alerts per candle
```

## 📝 Logging Examples

### New Candle Detected
```
🔄 === NEW CANDLE DETECTED ===
   Symbol: BTCUSDT
   Timeframe: 5MIN
   Previous candle: 2024-01-15T10:25:00.000Z
   Current candle: 2024-01-15T10:30:00.000Z
   Previous count: 1
   Reset time: 2024-01-15T10:30:15.123Z
   ✅ Counter reset completed for BTCUSDT 5MIN
   📊 New count: 0
   🕐 Next alert allowed immediately if conditions met
```

### Alert Triggered
```
🚨 === ALERT TRIGGERED ===
🚨 PAIR + CONDITION MET: BTCUSDT
🚨 Alert ID: 507f1f77bcf86cd799439011
🚨 Conditions met: { changePercent: 2.5, rsi: 'disabled', ema: 'disabled', candle: 'disabled' }
🚨 Current price: 42500.50
🚨 Base price: 41463.41
🚨 Timestamp: 2024-01-15T10:30:15.123Z
```

### Alert Blocked (Limit Reached)
```
🚫 === ALERT BLOCKED - COUNT LIMIT REACHED ===
   Symbol: BTCUSDT
   Timeframe: 5MIN
   Current count: 1
   Max allowed: 1
   Candle open time: 2024-01-15T10:30:00.000Z
   Reason: Already sent max alerts for this candle
   Next alert: When new 5MIN candle opens
```

### Auto-Trigger After Reset
```
🚨 === AUTO-TRIGGER AFTER CANDLE RESET ===
   Symbol: BTCUSDT
   Timeframe: 5MIN
   Reason: Conditions still met after candle reset
   Candle open time: 2024-01-15T10:30:00.000Z
```

## 🧪 Testing

### Test Scripts
1. **Enable Continuous Monitoring**: `node enable-continuous-monitoring.js`
2. **Test System**: `node test-continuous-monitoring.js`

### Manual Testing
1. Create an alert with continuous monitoring enabled
2. Wait for conditions to be met
3. Verify alert triggers
4. Wait for new candle to start
5. Verify counter resets and new alerts can trigger

## 🔍 Troubleshooting

### Common Issues

#### Alerts Not Triggering After First Alert
- **Check**: Is continuous monitoring enabled?
- **Solution**: Run `node enable-continuous-monitoring.js`

#### Too Many Alerts (Spam)
- **Check**: Alert count limits and timeframe settings
- **Solution**: Adjust `maxAlertsPerTimeframe` or timeframe

#### Alerts Not Resetting
- **Check**: Candle boundary detection logs
- **Solution**: Verify Binance API connectivity and candle data

### Debug Commands
```javascript
// Check alert status
console.log(alert.isContinuousMonitoringEnabled());
console.log(alert.getAlertCount('5MIN'));

// Check counter details
console.log(alert.timeframeAlertCounters.get('5MIN'));
```

## 📈 Performance

### Optimization Features
- **Efficient candle detection**: Only checks when necessary
- **Batch processing**: Processes multiple alerts together
- **Smart caching**: Reuses candle data when possible
- **Error handling**: Continues processing even if individual alerts fail

### Monitoring
- **Processing stats**: Tracks alerts processed, triggered, and errors
- **Reset stats**: Tracks candle boundary checks and counter resets
- **Performance metrics**: Logs processing times and API calls

## 🎯 Expected Behavior

### ✅ What Should Happen
1. **First Alert**: Triggers when conditions are met
2. **Same Candle**: No additional alerts (if limit reached)
3. **New Candle**: Counter resets, new alerts can trigger
4. **Continuous**: System keeps monitoring indefinitely
5. **No Manual Action**: User doesn't need to click "Create Alert" again

### ❌ What Should NOT Happen
1. **6-hour cooldown**: Alerts should not be blocked for 6 hours
2. **Manual re-creation**: User should not need to recreate alerts
3. **Spam alerts**: Multiple alerts in same candle (if limit set to 1)
4. **System stops**: Monitoring should continue indefinitely

## 🔧 Migration

### For Existing Alerts
Run the migration script to enable continuous monitoring for all existing alerts:

```bash
node enable-continuous-monitoring.js
```

### For New Alerts
Continuous monitoring is automatically enabled when alerts are created.

## 📚 API Reference

### Alert Model Methods
- `enableContinuousMonitoring(timeframe, maxAlerts)`: Enable continuous monitoring
- `isContinuousMonitoringEnabled()`: Check if continuous monitoring is enabled
- `getAlertCount(timeframe)`: Get current alert count for timeframe
- `isAlertCountLimitReached(timeframe, candleOpenTime)`: Check if limit reached
- `incrementAlertCount(timeframe, candleOpenTime)`: Increment alert count

### Service Methods
- `processAlerts()`: Process all active alerts
- `checkAndResetCandleBoundaries()`: Check for new candles and reset counters
- `setupAlertScheduler(io)`: Setup continuous monitoring scheduler

## 🎉 Success Criteria

The continuous monitoring system is working correctly when:

1. ✅ **First alert triggers** when conditions are met
2. ✅ **No 6-hour cooldown** - alerts can trigger again quickly
3. ✅ **Counter resets** when new candles start
4. ✅ **Duplicate prevention** works within same candle
5. ✅ **Continuous monitoring** never stops
6. ✅ **Comprehensive logging** shows all activities
7. ✅ **No manual intervention** required after first alert

This system ensures that users get the real-time monitoring they expect without the frustration of having to manually recreate alerts after each trigger.
