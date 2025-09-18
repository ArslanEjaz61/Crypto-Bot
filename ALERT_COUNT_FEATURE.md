# Alert Count per Timeframe Feature

## Overview

The **Alert Count per Timeframe** feature implements intelligent spam prevention for trading alerts by limiting the number of alerts that can be sent within a single candle timeframe. This prevents users from receiving multiple alerts for the same price movement within the same candle period.

## Key Features

### 1. Per-Timeframe Max Alerts
- Each selected timeframe (5MIN, 15MIN, 1HR, 4HR, 12HR, D) has its own independent alert counter
- Only the allowed number of alerts (default: 1) can be fired during that candle
- When a new candle starts for that timeframe → counter resets to 0

### 2. Spam Prevention
- **DO NOT** send the same alert again & again within the same candle once max allowed count is reached
- Skip all extra alerts until the next candle starts
- Prevents notification fatigue and improves user experience

### 3. Independent Timeframe Counters
- If user selects multiple timeframes (e.g., 5MIN + 15MIN), keep separate counters for each
- Reset each counter only when its timeframe's new candle begins
- Each timeframe operates independently

### 4. Favourite Pairs Integration
- Apply this logic only to pairs selected in "Favourites"
- If no favourite is selected, no alert should be triggered for this condition
- Works seamlessly with existing favorite pairs functionality

## Example Usage

### Scenario
User selects:
- **Change %**: 1MIN → 1%
- **Alert Count**: 5MIN
- **Pairs**: BTCUSDT, ETHUSDT

### Expected Flow
1. ✅ If BTCUSDT moves 1% → send 1 alert
2. ❌ If BTCUSDT again crosses 1% inside SAME 5min candle → do NOT send again
3. ✅ When next 5min candle starts → reset count → send alert if condition matches

## Technical Implementation

### Data Structure

```javascript
// Alert Model Schema Addition
timeframeAlertCounters: {
  type: Map,
  of: {
    count: { type: Number, default: 0 },
    lastCandleOpenTime: { type: String }, // Store the openTime of the last candle
    lastResetTime: { type: Date, default: Date.now }
  },
  default: new Map()
}

// Example Data Structure
activeAlerts = {
  "BTCUSDT": {
    "5MIN": { count: 1, lastCandleOpenTime: "2025-01-18T10:05:00.000Z" },
    "15MIN": { count: 0, lastCandleOpenTime: "2025-01-18T10:00:00.000Z" }
  }
}
```

### Key Methods

#### `isAlertCountLimitReached(timeframe, candleOpenTime)`
- Checks if the alert count limit is reached for a specific timeframe
- Automatically resets counter when a new candle is detected
- Returns `true` if limit is reached, `false` if alert can be sent

#### `incrementAlertCount(timeframe, candleOpenTime)`
- Increments the alert count for a specific timeframe
- Handles new candle detection and counter reset
- Updates the last candle open time

#### `getAlertCount(timeframe)`
- Returns the current alert count for a specific timeframe
- Useful for debugging and monitoring

### Candle Detection Logic

The system uses precise candle open time calculation based on timeframe:

```javascript
function getCurrentCandleOpenTime(timeframe) {
  const now = new Date();
  let candleOpenTime;
  
  switch (timeframe) {
    case '5MIN':
      const minutes5 = Math.floor(now.getMinutes() / 5) * 5;
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes5, 0, 0);
      break;
    case '15MIN':
      const minutes15 = Math.floor(now.getMinutes() / 15) * 15;
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), minutes15, 0, 0);
      break;
    case '1HR':
      candleOpenTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
      break;
    // ... other timeframes
  }
  
  return candleOpenTime.toISOString();
}
```

## Frontend Integration

### FilterSidebar Updates
- Added visual indicator when Alert Count is enabled
- Shows "Max 1 alert per candle" message
- Explains spam prevention functionality

### Alert Creation
- Automatically sets `alertCountEnabled: true` when timeframe is selected
- Sets `maxAlertsPerTimeframe: 1` as default
- Integrates with existing alert creation flow

## Configuration Options

### Alert Model Fields
- `alertCountEnabled`: Boolean - Whether alert counting is enabled
- `alertCountTimeframe`: String - Which timeframe to count alerts for
- `maxAlertsPerTimeframe`: Number - Maximum alerts allowed per candle (default: 1)
- `timeframeAlertCounters`: Map - Stores counters for each timeframe

### Supported Timeframes
- 5MIN
- 15MIN
- 1HR
- 4HR
- 12HR
- D (Daily)

## Testing

Run the test script to verify functionality:

```bash
node test-alert-count-feature.js
```

The test covers:
- ✅ Alert creation with count enabled
- ✅ Limit checking logic
- ✅ Candle reset functionality
- ✅ Multiple timeframe independence
- ✅ Edge cases and error handling

## Benefits

1. **Reduced Spam**: Prevents multiple alerts for the same price movement
2. **Better UX**: Users get meaningful alerts without notification fatigue
3. **Flexible**: Works with any timeframe and multiple pairs
4. **Intelligent**: Automatically resets when new candles start
5. **Independent**: Each timeframe operates separately

## Future Enhancements

- Configurable max alerts per timeframe (currently fixed at 1)
- Alert count statistics and monitoring
- Integration with alert history and analytics
- Custom reset conditions beyond candle boundaries

## Troubleshooting

### Common Issues

1. **Alerts not being limited**: Check if `alertCountEnabled` is true and `alertCountTimeframe` is set
2. **Counters not resetting**: Verify candle open time calculation is working correctly
3. **Multiple timeframes interfering**: Ensure each timeframe has its own counter

### Debug Logging

The system provides detailed console logging:
- `🔍 Checking alert count limit for SYMBOL TIMEFRAME`
- `🚫 Alert count limit reached for SYMBOL TIMEFRAME. Skipping alert.`
- `🔄 New candle detected! Resetting counter for TIMEFRAME`
- `📈 Incremented alert count for SYMBOL TIMEFRAME: COUNT`

## Conclusion

The Alert Count per Timeframe feature provides intelligent spam prevention while maintaining the flexibility and power of the existing alert system. It ensures users receive meaningful notifications without being overwhelmed by duplicate alerts for the same price movements.
