const { Telegraf } = require('telegraf');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7689697171:AAHtPknH6HQZMVYAnG9-jl2MWK1ytt31TRU';
const TELEGRAM_CHAT_ID = '7556026561';

// Initialize Telegraf bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function testTelegrafConnection() {
  console.log('🚀 Testing Telegram with Telegraf library...');
  
  try {
    // Test bot connection
    console.log('Testing bot connection...');
    const botInfo = await bot.telegram.getMe();
    console.log('✅ Bot connection successful!');
    console.log('Bot info:', JSON.stringify(botInfo, null, 2));
    
    // Send test message
    console.log('\nSending test message...');
    const testMessage = `🤖 <b>Test Message by devxyasir</b>\n\n` +
                       `✅ Bot is working with Telegraf!\n` +
                       `📅 ${new Date().toLocaleString()}\n\n` +
                       `<i>This message was sent using the Telegraf library. now all alerts will be sent using Telegraf library</i>`;
    
    const result = await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, testMessage, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    
    console.log('✅ Test message sent successfully!');
    console.log('Message ID:', result.message_id);
    console.log('Chat ID:', result.chat.id);
    
    return true;
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('API error details:', error.response.description);
    }
    return false;
  }
}

async function main() {
  const success = await testTelegrafConnection();
  
  if (success) {
    console.log('\n🎉 Telegraf integration successful! The bot is ready to use.');
  } else {
    console.log('\n💥 Telegraf integration failed. Please check the error details above.');
  }
  
  console.log('\n✨ Test completed!');
}

main().catch(console.error);
