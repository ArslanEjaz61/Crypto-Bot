const express = require('express');
const router = express.Router();
const { 
  sendTestMessage, 
  testTelegramConnection, 
  sendTelegramMessage 
} = require('../utils/telegramService');

// Test Telegram connection
router.get('/test-connection', async (req, res) => {
  try {
    console.log('Testing Telegram bot connection...');
    const isConnected = await testTelegramConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'Telegram bot connection successful'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to connect to Telegram bot'
      });
    }
  } catch (error) {
    console.error('Error testing Telegram connection:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing Telegram connection',
      error: error.message
    });
  }
});

// Send test message
router.post('/test-message', async (req, res) => {
  try {
    console.log('Sending test message to Telegram...');
    const success = await sendTestMessage();
    
    if (success) {
      res.json({
        success: true,
        message: 'Test message sent successfully to Telegram'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test message to Telegram'
      });
    }
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test message',
      error: error.message
    });
  }
});

// Send custom message
router.post('/send-message', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }
    
    console.log('Sending custom message to Telegram...');
    const success = await sendTelegramMessage(message);
    
    if (success) {
      res.json({
        success: true,
        message: 'Message sent successfully to Telegram'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send message to Telegram'
      });
    }
  } catch (error) {
    console.error('Error sending custom message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
});

module.exports = router;
