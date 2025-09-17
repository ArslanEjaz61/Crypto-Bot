# 🕯️ One Alert Per Candle - Complete Implementation Guide

## 🎯 **What You Requested**

You wanted the candle alerts to trigger **only once per specific candle**:
- If you select **5M** timeframe and **Green Candle** condition
- When a **5M candle** on Binance goes green (close > open)
- The alert should trigger **only once** for that specific 5M candle
- It should **not trigger again** until a **new 5M candle** starts
- This logic should work for **all timeframes** and **all conditions**

## ✅ **What's Been Implemented**

### 🔒 **One Alert Per Candle Logic**

The system now ensures that:

1. **Unique Candle Identification**: Each candle is identified by `timeframe_openTime`
   - Example: `5MIN_1703123400000` (5M candle that opened at timestamp 1703123400000)

2. **Alert State Tracking**: Each alert tracks which candles have been triggered
   ```javascript
   candleAlertStates: {
     "5MIN": {
       triggered: true,
       lastTriggeredCandle: "5MIN_1703123400000",
       lastChecked: "2024-01-01T12:00:00Z"
     }
   }
   ```

3. **Duplicate Prevention**: Before triggering, the system checks:
   - Is the condition met? (e.g., Green Candle)
   - Has this specific candle already triggered an alert?
   - If YES to both → Trigger alert and mark as triggered
   - If already triggered → Skip (no spam)

4. **New Candle Detection**: When a new candle starts:
   - System detects different `openTime`
   - Resets alert state for that timeframe
   - Allows alert to trigger again for the new candle

## 🔄 **How It Works**

### **Step 1: Alert Creation**
```
1. User selects 5M timeframe + Green Candle condition
2. Alert is created with candleAlertStates: {}
3. System starts monitoring every minute
```

### **Step 2: Candle Monitoring**
```
Every minute:
1. Fetch fresh 5M candle data from Binance API
2. Check if Close > Open (Green Candle condition)
3. Create candle key: "5MIN_1703123400000"
4. Check alert state for this candle key
```

### **Step 3: First Trigger**
```
If condition met AND not already triggered:
1. 🚨 TRIGGER ALERT
2. Send email notification
3. Send Telegram notification
4. Create triggered alert record
5. Update alert state: triggered = true, lastTriggeredCandle = "5MIN_1703123400000"
```

### **Step 4: Subsequent Checks (Same Candle)**
```
If condition still met BUT already triggered:
1. ⏳ Skip alert (no spam)
2. Log: "Already triggered for this candle"
3. Continue monitoring
```

### **Step 5: New Candle Detection**
```
When new 5M candle starts:
1. New openTime detected (e.g., 1703123700000)
2. New candle key: "5MIN_1703123700000"
3. Reset alert state: triggered = false, lastTriggeredCandle = null
4. Ready to trigger again if condition is met
```

## 🧪 **Testing the Functionality**

### **Run the Test**
```bash
node test-one-alert-per-candle.js
```

### **Manual Test Steps**
1. **Create Alert**: 5M + Green Candle for BTCUSDT
2. **Wait for Green Candle**: Monitor when BTCUSDT 5M candle goes green
3. **First Trigger**: Alert should trigger once
4. **Subsequent Checks**: Same candle should not trigger again
5. **New Candle**: When new 5M candle starts, alert can trigger again

## 📊 **Detailed Logging**

The system now provides detailed logging:

```
🔍 Checking candle alert for BTCUSDT 5MIN:
   Condition: GREEN_CANDLE
   OHLC: O:45000 H:45100 L:44950 C:45075
   Candle Key: 5MIN_1703123400000
   Alert State: { triggered: false, lastTriggeredCandle: null }

🚨 CANDLE ALERT TRIGGERED: BTCUSDT 5MIN GREEN_CANDLE
   ✅ First time triggering for this candle: 5MIN_1703123400000

⏳ Candle alert already triggered for BTCUSDT 5MIN candle: 5MIN_1703123400000
   ❌ Skipping duplicate trigger

🔄 Checking candle state reset for BTCUSDT 5MIN:
   Current candle key: 5MIN_1703123700000
   Previous alert state: { triggered: true, lastTriggeredCandle: "5MIN_1703123400000" }
   ✅ New candle detected! Resetting alert state for 5MIN
```

## 🎯 **All Timeframes and Conditions Supported**

### **Timeframes**
- ✅ 5MIN, 15MIN, 1HR, 4HR, 12HR, D, W
- ✅ Each timeframe tracked independently
- ✅ Can have alerts for multiple timeframes simultaneously

### **Conditions**
- ✅ Green Candle (Close > Open)
- ✅ Red Candle (Close < Open)
- ✅ Candle Above Open
- ✅ Candle Below Open
- ✅ Bullish Hammer
- ✅ Bearish Hammer
- ✅ Doji
- ✅ Long Upper Wick
- ✅ Long Lower Wick

### **Example Scenarios**
```
Scenario 1: 5M Green Candle Alert
- 5M candle goes green → Alert triggers once
- Same 5M candle stays green → No more alerts
- New 5M candle goes green → Alert triggers again

Scenario 2: 1HR Bullish Hammer Alert
- 1HR candle forms bullish hammer → Alert triggers once
- Same 1HR candle continues → No more alerts
- New 1HR candle forms bullish hammer → Alert triggers again

Scenario 3: Multiple Timeframes
- 5M alert: Triggers once per 5M candle
- 1HR alert: Triggers once per 1HR candle
- Both work independently
```

## 🔧 **Technical Implementation**

### **Database Schema**
```javascript
{
  symbol: "BTCUSDT",
  candleTimeframes: ["5MIN"],
  candleCondition: "GREEN_CANDLE",
  candleAlertStates: {
    "5MIN": {
      triggered: true,
      lastTriggeredCandle: "5MIN_1703123400000",
      lastChecked: "2024-01-01T12:00:00Z"
    }
  }
}
```

### **Key Methods**
1. **`resetCandleAlertStates()`**: Resets state when new candle detected
2. **`wasCandleAlertTriggered()`**: Checks if already triggered for current candle
3. **`checkConditions()`**: Main logic for condition checking and spam prevention

## 🚀 **Ready to Use!**

Your candle alert system now works exactly as requested:

✅ **One alert per specific candle** (no spam)
✅ **Works for all timeframes** (5M, 15M, 1HR, etc.)
✅ **Works for all conditions** (Green, Red, Hammer, etc.)
✅ **Real-time Binance data** (accurate and fresh)
✅ **Email notifications** to kainat.tasadaq3@gmail.com
✅ **Telegram notifications**
✅ **Triggered alerts history**
✅ **Latest triggers display**

**Test it now!** Create a 5M Green Candle alert and watch it trigger only once per 5M candle! 🕯️📈
