/**
 * Example: How to create candle alerts with multiple timeframes
 * This shows how the frontend should send data to create candle alerts
 */

// Example 1: Create alert with multiple timeframes and candle condition
const createCandleAlertExample = {
  symbol: "BTCUSDT",
  direction: ">",
  targetType: "percentage",
  targetValue: 1,
  currentPrice: 45000,
  basePrice: 45000,
  trackingMode: "current",
  alertTime: "14:30",
  comment: "BTC Hammer pattern alert",
  email: "trader@example.com",
  
  // Candle configuration - NEW FIELDS
  candleTimeframes: ["5MIN", "15MIN", "1HR", "4HR"], // Multiple timeframes
  candleCondition: "BULLISH_HAMMER", // Single condition for all timeframes
  
  // Other conditions (optional)
  rsiEnabled: false,
  emaEnabled: false,
  
  // Market filters
  market: "SPOT",
  exchange: "BINANCE",
  tradingPair: "USDT",
  minDailyVolume: 1000000
};

// Example 2: Create alert for Doji pattern on daily timeframe
const createDojiAlertExample = {
  symbol: "ETHUSDT",
  direction: ">",
  targetType: "price",
  targetValue: 3000,
  currentPrice: 2800,
  basePrice: 2800,
  trackingMode: "current",
  alertTime: "09:00",
  comment: "ETH Daily Doji pattern",
  email: "trader@example.com",
  
  // Candle configuration
  candleTimeframes: ["D"], // Only daily timeframe
  candleCondition: "DOJI",
  
  rsiEnabled: false,
  emaEnabled: false,
  
  market: "SPOT",
  exchange: "BINANCE",
  tradingPair: "USDT",
  minDailyVolume: 5000000
};

// Example 3: Create alert for multiple conditions across timeframes
const createMultiTimeframeAlertExample = {
  symbol: "ADAUSDT",
  direction: ">",
  targetType: "percentage",
  targetValue: 2,
  currentPrice: 0.5,
  basePrice: 0.5,
  trackingMode: "current",
  alertTime: "16:00",
  comment: "ADA multi-timeframe green candles",
  email: "trader@example.com",
  
  // Candle configuration - Monitor multiple timeframes
  candleTimeframes: ["5MIN", "15MIN", "1HR", "4HR", "12HR"],
  candleCondition: "GREEN_CANDLE", // Green candle on any of these timeframes
  
  rsiEnabled: false,
  emaEnabled: false,
  
  market: "SPOT",
  exchange: "BINANCE",
  tradingPair: "USDT",
  minDailyVolume: 2000000
};

/**
 * Frontend JavaScript code to create candle alerts
 */
function createCandleAlert(selectedTimeframes, selectedCondition, symbol, email) {
  const alertData = {
    symbol: symbol,
    direction: ">",
    targetType: "percentage",
    targetValue: 1, // Default 1% change
    currentPrice: 0, // Will be set by backend
    basePrice: 0, // Will be set by backend
    trackingMode: "current",
    alertTime: new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    comment: `${symbol} ${selectedCondition.replace(/_/g, ' ')} alert`,
    email: email,
    
    // Candle configuration
    candleTimeframes: selectedTimeframes, // Array of selected timeframes
    candleCondition: selectedCondition, // Single condition
    
    rsiEnabled: false,
    emaEnabled: false,
    
    market: "SPOT",
    exchange: "BINANCE",
    tradingPair: "USDT",
    minDailyVolume: 0
  };

  // Send to backend
  return fetch('/api/alerts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(alertData)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Candle alert created:', data);
    return data;
  })
  .catch(error => {
    console.error('Error creating candle alert:', error);
    throw error;
  });
}

/**
 * Example usage in React component
 */
const CandleAlertForm = () => {
  const [selectedTimeframes, setSelectedTimeframes] = useState([]);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [email, setEmail] = useState('');

  const handleTimeframeChange = (timeframe, checked) => {
    if (checked) {
      setSelectedTimeframes([...selectedTimeframes, timeframe]);
    } else {
      setSelectedTimeframes(selectedTimeframes.filter(tf => tf !== timeframe));
    }
  };

  const handleCreateAlert = async () => {
    if (selectedTimeframes.length === 0) {
      alert('Please select at least one timeframe');
      return;
    }
    
    if (!selectedCondition) {
      alert('Please select a candle condition');
      return;
    }

    try {
      await createCandleAlert(selectedTimeframes, selectedCondition, symbol, email);
      alert('Candle alert created successfully!');
    } catch (error) {
      alert('Failed to create candle alert: ' + error.message);
    }
  };

  return (
    <div>
      <h3>Create Candle Alert</h3>
      
      {/* Timeframe Selection */}
      <div>
        <h4>Select Timeframes:</h4>
        {['5MIN', '15MIN', '1HR', '4HR', '12HR', 'D', 'W'].map(timeframe => (
          <label key={timeframe}>
            <input
              type="checkbox"
              checked={selectedTimeframes.includes(timeframe)}
              onChange={(e) => handleTimeframeChange(timeframe, e.target.checked)}
            />
            {timeframe}
          </label>
        ))}
      </div>

      {/* Condition Selection */}
      <div>
        <h4>Select Condition:</h4>
        <select 
          value={selectedCondition} 
          onChange={(e) => setSelectedCondition(e.target.value)}
        >
          <option value="">Select a condition</option>
          <option value="ABOVE_OPEN">Candle Above Open</option>
          <option value="BELOW_OPEN">Candle Below Open</option>
          <option value="GREEN_CANDLE">Green Candle</option>
          <option value="RED_CANDLE">Red Candle</option>
          <option value="DOJI">Doji</option>
          <option value="HAMMER">Hammer</option>
          <option value="BULLISH_HAMMER">Bullish Hammer</option>
          <option value="BEARISH_HAMMER">Bearish Hammer</option>
          <option value="LONG_UPPER_WICK">Long Upper Wick</option>
          <option value="LONG_LOWER_WICK">Long Lower Wick</option>
        </select>
      </div>

      {/* Symbol and Email */}
      <div>
        <input
          type="text"
          placeholder="Symbol (e.g., BTCUSDT)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button onClick={handleCreateAlert}>
        Create Alert
      </button>
    </div>
  );
};

module.exports = {
  createCandleAlertExample,
  createDojiAlertExample,
  createMultiTimeframeAlertExample,
  createCandleAlert,
  CandleAlertForm
};
