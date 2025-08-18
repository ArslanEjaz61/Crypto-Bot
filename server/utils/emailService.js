const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send an alert email
 * @param {string} to - Recipient email
 * @param {object} alert - Alert data
 * @param {object} cryptoData - Crypto data including current price
 * @returns {Promise} - Email sending result
 */
const sendAlertEmail = async (to, alert, cryptoData) => {
  try {
    const transporter = createTransporter();
    
    // Format numbers for better readability
    const formatNumber = (num) => {
      if (num >= 1) {
        return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
      } else {
        return num.toString();
      }
    };
    
    // Format percentage
    const formatPercent = (num) => {
      return `${(num * 100).toFixed(2)}%`;
    };
    
    // Calculate price change percentage
    const priceChangePercent = ((cryptoData.price - alert.currentPrice) / alert.currentPrice) * 100;
    
    // Determine if price went up or down
    const priceDirection = priceChangePercent >= 0 ? 'up' : 'down';
    
    // Create email subject based on alert type
    let subject = `Binance Alert: ${alert.symbol} `;
    
    if (alert.targetType === 'price') {
      subject += `hit target price of ${formatNumber(alert.targetValue)}`;
    } else {
      subject += `moved ${formatPercent(Math.abs(alert.targetValue))} ${priceDirection === 'up' ? 'upward' : 'downward'}`;
    }
    
    // Create email content
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #262e33; color: #ffffff;">
        <h1 style="color: #3875d7;">Binance Price Alert</h1>
        <div style="background-color: #1c252b; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin-top: 0;">${alert.symbol} Alert Triggered</h2>
          <p style="font-size: 16px;">
            <strong>Current Price:</strong> ${formatNumber(cryptoData.price)} USDT
          </p>
          <p style="font-size: 16px;">
            <strong>Price Change:</strong> 
            <span style="color: ${priceDirection === 'up' ? '#9acd32' : '#ff4500'};">
              ${priceDirection === 'up' ? '+' : ''}${formatPercent(priceChangePercent)}
            </span>
          </p>
          ${alert.comment ? `<p><strong>Comment:</strong> ${alert.comment}</p>` : ''}
        </div>
        <div style="background-color: #1c252b; padding: 15px; border-radius: 5px;">
          <h3 style="color: #3875d7; margin-top: 0;">Alert Details</h3>
          <p><strong>Symbol:</strong> ${alert.symbol}</p>
          <p><strong>Direction:</strong> ${
            alert.direction === '>' ? 'Price going up' : 
            alert.direction === '<' ? 'Price going down' : 'Price moving either way'
          }</p>
          <p><strong>Alert Type:</strong> ${
            alert.targetType === 'price' ? `Target price of ${formatNumber(alert.targetValue)}` :
            `${formatPercent(alert.targetValue)} change from ${formatNumber(alert.currentPrice)}`
          }</p>
          <p><strong>Created:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #8c8c8c;">
          <p>This is an automated alert from your Binance Alerts system.</p>
        </div>
      </div>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: `"Binance Alerts" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      html,
    });
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendAlertEmail };
