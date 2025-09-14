const { sendAlertEmail } = require('./server/utils/emailService');
const { sendAlertNotification, testTelegramConnection, sendTestMessage } = require('./server/utils/telegramService');

// Test alert data
const testAlert = {
  symbol: 'BTCUSDT',
  direction: '>',
  targetType: 'percentage',
  targetValue: 5,
  currentPrice: 45000,
  basePrice: 43000,
  changePercentValue: 4.65,
  changePercentTimeframe: '1HR',
  candleCondition: 'GREEN_CANDLE',
  candleTimeframe: '1HR',
  rsiEnabled: true,
  rsiTimeframe: '1HR',
  rsiPeriod: 14,
  rsiCondition: 'ABOVE',
  rsiLevel: 70,
  emaEnabled: true,
  emaTimeframe: '1HR',
  emaFastPeriod: 12,
  emaSlowPeriod: 26,
  emaCondition: 'CROSSING_UP',
  email: ' kainat.tasadaq3@gmail.com',
  comment: 'Test alert for notification system',
  createdAt: new Date()
};

const testCryptoData = {
  price: 45000,
  volume24h: 1500000,
  priceChangePercent24h: 4.65
};

const testTechnicalData = {
  candle: {
    '1HR': {
      open: 44500,
      high: 45200,
      low: 44300,
      close: 45000
    }
  },
  rsi: {
    '1HR': 72.5
  },
  ema: {
    '1HR': {
      12: 44800,
      26: 44600
    }
  }
};

const testMarketData = {
  currentPrice: 45000,
  currentVolume: 1500000,
  rsi: testTechnicalData.rsi,
  emaData: testTechnicalData.ema,
  marketData: {
    priceChangePercent24h: 4.65,
    volume: 1500000,
    dailyVolume: 50000000
  }
};

async function testNotifications() {
  console.log('🧪 Testing Notification Systems...\n');
  
  // Test 1: Telegram Connection
  console.log('1️⃣ Testing Telegram Connection...');
  try {
    const telegramConnected = await testTelegramConnection();
    if (telegramConnected) {
      console.log('✅ Telegram connection successful\n');
    } else {
      console.log('❌ Telegram connection failed\n');
    }
  } catch (error) {
    console.log('❌ Telegram connection error:', error.message, '\n');
  }
  
  // Test 2: Send Test Telegram Message
  console.log('2️⃣ Sending Test Telegram Message...');
  try {
    const testMessageSent = await sendTestMessage();
    if (testMessageSent) {
      console.log('✅ Test Telegram message sent successfully\n');
    } else {
      console.log('❌ Failed to send test Telegram message\n');
    }
  } catch (error) {
    console.log('❌ Test Telegram message error:', error.message, '\n');
  }
  
  // Test 3: Send Alert via Telegram (with retry logic)
  console.log('3️⃣ Testing Telegram Alert Notification...');
  try {
    const telegramAlertSent = await sendAlertNotification(testAlert, testMarketData);
    if (telegramAlertSent) {
      console.log('✅ Telegram alert notification sent successfully\n');
    } else {
      console.log('❌ Failed to send Telegram alert notification\n');
    }
  } catch (error) {
    console.log('❌ Telegram alert notification error:', error.message, '\n');
  }
  
  // Test 4: Email Notification (if environment variables are set)
  console.log('4️⃣ Testing Email Notification...');
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    try {
      const emailResult = await sendAlertEmail(
        testAlert.email,
        testAlert,
        testCryptoData,
        testTechnicalData
      );
      console.log('✅ Email notification sent successfully:', emailResult.messageId, '\n');
    } catch (error) {
      console.log('❌ Email notification error:', error.message, '\n');
    }
  } else {
    console.log('⚠️ Email environment variables not set, skipping email test\n');
  }
  
  console.log('🏁 Notification testing completed!');
}

// Run the tests
testNotifications().catch(console.error);
