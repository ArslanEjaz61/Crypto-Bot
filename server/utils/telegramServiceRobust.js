const { Telegraf } = require('telegraf');
const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7689697171:AAHtPknH6HQZMVYAnG9-jl2MWK1ytt31TRU';
const TELEGRAM_CHAT_ID = '7556026561';

// Multiple connection strategies
class TelegramService {
  constructor() {
    this.strategies = [
      this.createStandardBot.bind(this),
      this.createCustomAgentBot.bind(this),
      this.createFallbackBot.bind(this)
    ];
    this.currentBot = null;
    this.workingStrategy = null;
  }

  // Strategy 1: Standard Telegraf
  createStandardBot() {
    return new Telegraf(TELEGRAM_BOT_TOKEN);
  }

  // Strategy 2: Custom HTTPS agent with different settings
  createCustomAgentBot() {
    const agent = new https.Agent({
      keepAlive: false,
      maxSockets: 1,
      timeout: 30000,
      freeSocketTimeout: 4000,
      rejectUnauthorized: true
    });

    return new Telegraf(TELEGRAM_BOT_TOKEN, {
      telegram: {
        agent: agent,
        webhookReply: false
      }
    });
  }

  // Strategy 3: Fallback with minimal settings
  createFallbackBot() {
    const agent = new https.Agent({
      keepAlive: true,
      maxSockets: 5,
      maxFreeSockets: 2,
      timeout: 60000,
      freeSocketTimeout: 30000
    });

    return new Telegraf(TELEGRAM_BOT_TOKEN, {
      telegram: {
        agent: agent,
        apiRoot: 'https://api.telegram.org',
        attachmentAgent: agent
      }
    });
  }

  async findWorkingConnection() {
    console.log('🔍 Testing connection strategies...');

    for (let i = 0; i < this.strategies.length; i++) {
      try {
        console.log(`Testing strategy ${i + 1}/${this.strategies.length}...`);
        
        const bot = this.strategies[i]();
        
        // Test the connection
        const botInfo = await Promise.race([
          bot.telegram.getMe(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 15000)
          )
        ]);

        console.log(`✅ Strategy ${i + 1} successful!`, botInfo.username);
        this.currentBot = bot;
        this.workingStrategy = i + 1;
        return true;

      } catch (error) {
        console.log(`❌ Strategy ${i + 1} failed:`, error.message);
        continue;
      }
    }

    console.log('❌ All connection strategies failed');
    return false;
  }

  async sendMessage(message, options = {}) {
    // If no working bot, try to find one
    if (!this.currentBot) {
      const connected = await this.findWorkingConnection();
      if (!connected) {
        return { success: false, error: 'No working connection found' };
      }
    }

    // Try to send with current bot
    try {
      const result = await this.currentBot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });

      console.log('✅ Message sent successfully:', result.message_id);
      return { success: true, messageId: result.message_id };

    } catch (error) {
      console.log('❌ Send failed:', error.message);
      
      // Reset current bot and try to reconnect
      this.currentBot = null;
      this.workingStrategy = null;
      
      const reconnected = await this.findWorkingConnection();
      if (reconnected) {
        // Try once more with new connection
        try {
          const result = await this.currentBot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            ...options
          });

          console.log('✅ Message sent on retry:', result.message_id);
          return { success: true, messageId: result.message_id };
        } catch (retryError) {
          console.log('❌ Retry also failed:', retryError.message);
        }
      }

      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const telegramService = new TelegramService();

/**
 * Format alert data into a Telegram message
 */
function formatAlertMessage(alert, data) {
  const { currentPrice, currentVolume, rsi, emaData, marketData } = data;
  
  const formatPrice = (price) => price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : 'N/A';
  const formatVolume = (volume) => volume ? volume.toLocaleString('en-US') : 'N/A';
  const formatPercent = (percent) => percent ? `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%` : 'N/A';
  
  let message = `🚨 <b>CRYPTO ALERT TRIGGERED</b> 🚨\n\n`;
  message += `📊 <b>Symbol:</b> ${alert.symbol}\n`;
  message += `💰 <b>Current Price:</b> ${formatPrice(currentPrice)}\n`;
  message += `📈 <b>Target:</b> ${alert.targetType === 'price' ? formatPrice(alert.targetValue) : formatPercent(alert.targetValue)}\n`;
  message += `🎯 <b>Direction:</b> ${alert.direction}\n\n`;
  
  if (marketData) {
    message += `📊 <b>24h Change:</b> ${formatPercent(marketData.priceChangePercent24h)}\n`;
    message += `📊 <b>Volume:</b> ${formatVolume(marketData.volume)}\n\n`;
  }
  
  if (alert.rsiEnabled && rsi) {
    const rsiValue = rsi[alert.rsiTimeframe] || rsi['1HR'];
    message += `📈 <b>RSI:</b> ${rsiValue ? rsiValue.toFixed(2) : 'N/A'}\n`;
  }
  
  message += `⏰ <b>Triggered:</b> ${new Date().toLocaleString()}\n`;
  message += `\n💡 <i>Binance Alerts Bot</i>`;
  
  return message;
}

/**
 * Send alert notification via Telegram
 */
async function sendAlertNotification(alert, data) {
  try {
    const message = formatAlertMessage(alert, data);
    const result = await telegramService.sendMessage(message);
    
    if (result.success) {
      console.log(`Telegram alert sent for ${alert.symbol}`);
      return true;
    } else {
      console.error(`Failed to send Telegram alert for ${alert.symbol}:`, result.error);
      return false;
    }
  } catch (error) {
    console.error('Error in sendAlertNotification:', error);
    return false;
  }
}

/**
 * Send a simple message
 */
async function sendTelegramMessage(message, options = {}) {
  const result = await telegramService.sendMessage(message, options);
  return result.success;
}

/**
 * Test connection
 */
async function testTelegramConnection() {
  return await telegramService.findWorkingConnection();
}

/**
 * Send test message
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
