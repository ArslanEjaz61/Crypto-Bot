const { Telegraf } = require('telegraf');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7689697171:AAHtPknH6HQZMVYAnG9-jl2MWK1ytt31TRU';
const TELEGRAM_CHAT_ID = '7556026561';

// Initialize Telegraf bot with timeout and retry options
const bot = new Telegraf(TELEGRAM_BOT_TOKEN, {
  telegram: {
    apiRoot: 'https://api.telegram.org',
    webhookReply: false,
    agent: null,
    attachmentAgent: null
  }
});

// Set default timeout for all requests
bot.telegram.options.timeout = 10000; // 10 seconds timeout

/**
 * Send a message to Telegram chat with retry logic
 * @param {string} message - The message text to send
 * @param {Object} options - Additional options for the message
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<boolean>} Success status
 */
async function sendTelegramMessage(message, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Sending Telegram message (attempt ${attempt}/${retries}):`, message.substring(0, 100) + '...');
      
      // Use Telegraf's telegram.sendMessage method
      const result = await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });
      
      console.log('Telegram message sent successfully, message ID:', result.message_id);
      return true;
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (error.response) {
        console.error('Telegram API response error:', error.response.description);
        // If it's an API error (not network), don't retry
        if (error.response.error_code && error.response.error_code !== 429) {
          return false;
        }
      }
      
      // Retry for network errors or rate limiting
      if (attempt < retries) {
        const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('All retry attempts failed');
  return false;
}

/**
 * Format alert data into a Telegram message
 * @param {Object} alert - Alert object
 * @param {Object} data - Market data used for triggering
 * @returns {string} Formatted message
 */
function formatAlertMessage(alert, data) {
  const { currentPrice, currentVolume, rsi, emaData, marketData, triggeredTime } = data;
  
  // Format price and volume
  const formatPrice = (price) => price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : 'N/A';
  const formatVolume = (volume) => volume ? volume.toLocaleString('en-US') : 'N/A';
  const formatPercent = (percent) => percent ? `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%` : 'N/A';
  
  // Build message
  let message = `🚨 <b>CRYPTO ALERT TRIGGERED</b> 🚨\n\n`;
  
  // Basic alert info
  message += `📊 <b>Symbol:</b> ${alert.symbol}\n`;
  message += `💰 <b>Current Price:</b> ${formatPrice(currentPrice)}\n`;
  message += `📈 <b>Target:</b> ${alert.targetType === 'price' ? formatPrice(alert.targetValue) : formatPercent(alert.targetValue)}\n`;
  message += `🎯 <b>Direction:</b> ${alert.direction}\n\n`;
  
  // Alert conditions that were set
  message += `⚙️ <b>Alert Conditions Set:</b>\n`;
  if (alert.changePercentValue) {
    message += `   • Price Change: ${alert.changePercentValue}%${alert.changePercentTimeframe ? ` over ${alert.changePercentTimeframe}` : ''}\n`;
  }
  if (alert.rsiEnabled) {
    message += `   • RSI: ${alert.rsiCondition} ${alert.rsiLevel} (${alert.rsiTimeframe})\n`;
  }
  if (alert.emaEnabled) {
    message += `   • EMA: EMA${alert.emaFastPeriod} ${alert.emaCondition.replace(/_/g, ' ')} EMA${alert.emaSlowPeriod} (${alert.emaTimeframe})\n`;
  }
  if (alert.candleCondition && alert.candleCondition !== 'NONE') {
    message += `   • Candle: ${alert.candleCondition.replace(/_/g, ' ')} (${alert.candleTimeframe})\n`;
  }
  if (alert.minDailyVolume) {
    message += `   • Min Volume: ${formatVolume(alert.minDailyVolume)}\n`;
  }
  message += `\n`;
  
  // Market data
  if (marketData) {
    message += `📊 <b>Market Data:</b>\n`;
    message += `   • 24h Change: ${formatPercent(marketData.priceChangePercent24h)}\n`;
    message += `   • Volume: ${formatVolume(marketData.volume)}\n`;
    message += `   • Daily Volume: ${formatVolume(marketData.dailyVolume)}\n\n`;
  }
  
  // Technical indicators
  if (alert.rsiEnabled && rsi) {
    const rsiValue = rsi[alert.rsiTimeframe] || rsi['1HR'];
    message += `📈 <b>RSI (${alert.rsiTimeframe}):</b> ${rsiValue ? rsiValue.toFixed(2) : 'N/A'}\n`;
    message += `   • Condition: ${alert.rsiCondition} ${alert.rsiLevel}\n\n`;
  }
  
  if (alert.emaEnabled && emaData) {
    const emaTimeframeData = emaData[alert.emaTimeframe] || emaData['1HR'];
    message += `📊 <b>EMA (${alert.emaTimeframe}):</b>\n`;
    if (emaTimeframeData) {
      const fastEMA = emaTimeframeData[alert.emaFastPeriod];
      const slowEMA = emaTimeframeData[alert.emaSlowPeriod];
      message += `   • Fast EMA(${alert.emaFastPeriod}): ${formatPrice(fastEMA)}\n`;
      message += `   • Slow EMA(${alert.emaSlowPeriod}): ${formatPrice(slowEMA)}\n`;
      message += `   • Condition: ${alert.emaCondition}\n\n`;
    }
  }
  
  // Volume conditions
  if (alert.volumeEnabled || alert.volumeChangeRequired > 0) {
    message += `📊 <b>Volume Analysis:</b>\n`;
    message += `   • Current Volume: ${formatVolume(currentVolume)}\n`;
    if (alert.volumeChangeRequired > 0) {
      message += `   • Required Change: ${alert.volumeChangeRequired}%\n`;
    }
    if (alert.volumeEnabled) {
      message += `   • Spike Multiplier: ${alert.volumeSpikeMultiplier}x\n`;
    }
    message += `\n`;
  }
  
  // Alert metadata
  message += `⏰ <b>Alert Created:</b> ${alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'N/A'}\n`;
  message += `🔔 <b>Triggered At:</b> ${triggeredTime ? triggeredTime.toLocaleString() : new Date().toLocaleString()}\n`;
  
  // Footer
  message += `\n💡 <i>Binance Alerts Bot</i>`;
  
  return message;
}

/**
 * Send alert notification via Telegram
 * @param {Object} alert - Alert object
 * @param {Object} data - Market data used for triggering
 * @returns {Promise<boolean>} Success status
 */
async function sendAlertNotification(alert, data) {
  try {
    const message = formatAlertMessage(alert, data);
    const success = await sendTelegramMessage(message);
    
    if (success) {
      console.log(`Telegram alert sent for ${alert.symbol}`);
    } else {
      console.error(`Failed to send Telegram alert for ${alert.symbol}`);
    }
    
    return success;
  } catch (error) {
    console.error('Error in sendAlertNotification:', error);
    return false;
  }
}

/**
 * Test Telegram connection with retry logic
 * @returns {Promise<boolean>} Connection status
 */
async function testTelegramConnection() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Testing Telegram connection (attempt ${attempt}/3)...`);
      const botInfo = await bot.telegram.getMe();
      console.log('✅ Telegram bot connection successful:', botInfo);
      return true;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      if (error.response) {
        console.error('Telegram API error:', error.response.description);
      }
      
      if (attempt < 3) {
        const delay = attempt * 2000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

/**
 * Send a test message to verify setup
 * @returns {Promise<boolean>} Success status
 */
async function sendTestMessage() {
  const testMessage = `🤖 <b>Binance Alerts Bot Test</b>\n\n` +
                     `✅ Bot is connected and ready!\n` +
                     `📅 ${new Date().toLocaleString()}\n\n` +
                     `<i>Alert notifications will be sent to this chat.</i>`;
  
  return await sendTelegramMessage(testMessage);
}

module.exports = {
  sendTelegramMessage,
  sendAlertNotification,
  testTelegramConnection,
  sendTestMessage,
  formatAlertMessage
};
