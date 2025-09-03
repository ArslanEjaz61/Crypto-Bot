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
 * @param {object} technicalData - Technical analysis data (RSI, EMA, Candle)
 * @returns {Promise} - Email sending result
 */
const sendAlertEmail = async (to, alert, cryptoData, technicalData = {}) => {
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
    
    // Calculate price change percentage - Fix the calculation to use proper timeframe-based comparison
    let priceChangePercent = 0;
    let basePrice = alert.currentPrice;
    
    // If this is a timeframe-based alert, use historical price for accurate calculation
    if (alert.changePercentTimeframe && alert.changePercentValue > 0) {
      // Use the price from when alert was created or historical price based on timeframe
      basePrice = alert.basePrice || alert.currentPrice;
      priceChangePercent = ((cryptoData.price - basePrice) / basePrice) * 100;
    } else {
      // For other alert types, use the original price set when alert was created
      priceChangePercent = ((cryptoData.price - alert.currentPrice) / alert.currentPrice) * 100;
    }
    
    // Determine if price went up or down
    const priceDirection = priceChangePercent >= 0 ? 'up' : 'down';
    
    // Create email subject based on alert type and conditions
    let subject = `Binance Alert: ${alert.symbol} `;
    
    if (alert.candleCondition !== 'NONE') {
      subject += `candle condition met (${alert.candleCondition}) `;
    }
    if (alert.rsiEnabled) {
      subject += `RSI condition met `;
    }
    if (alert.emaEnabled) {
      subject += `EMA condition met `;
    }
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
          
          ${alert.candleCondition !== 'NONE' ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #2d3748; border-radius: 4px;">
            <h4 style="color: #3875d7; margin: 0 0 8px 0;">Candle Analysis</h4>
            <p><strong>Timeframe:</strong> ${alert.candleTimeframe}</p>
            <p><strong>Pattern:</strong> ${alert.candleCondition.replace(/_/g, ' ')}</p>
            ${technicalData.candle && technicalData.candle[alert.candleTimeframe] ? `
            <p><strong>OHLC:</strong> 
              O: ${formatNumber(technicalData.candle[alert.candleTimeframe].open)}, 
              H: ${formatNumber(technicalData.candle[alert.candleTimeframe].high)}, 
              L: ${formatNumber(technicalData.candle[alert.candleTimeframe].low)}, 
              C: ${formatNumber(technicalData.candle[alert.candleTimeframe].close)}
            </p>
            ` : ''}
          </div>
          ` : ''}
          
          ${alert.rsiEnabled ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #2d3748; border-radius: 4px;">
            <h4 style="color: #3875d7; margin: 0 0 8px 0;">RSI Analysis</h4>
            <p><strong>Timeframe:</strong> ${alert.rsiTimeframe}</p>
            <p><strong>Condition:</strong> ${alert.rsiCondition} ${alert.rsiLevel}</p>
            ${technicalData.rsi && technicalData.rsi[alert.rsiTimeframe] ? `
            <p><strong>Current RSI:</strong> ${technicalData.rsi[alert.rsiTimeframe].toFixed(2)}</p>
            ` : ''}
          </div>
          ` : ''}
          
          ${alert.emaEnabled ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #2d3748; border-radius: 4px;">
            <h4 style="color: #3875d7; margin: 0 0 8px 0;">EMA Analysis</h4>
            <p><strong>Timeframe:</strong> ${alert.emaTimeframe}</p>
            <p><strong>Fast EMA (${alert.emaFastPeriod}):</strong> ${technicalData.ema && technicalData.ema[alert.emaTimeframe] ? formatNumber(technicalData.ema[alert.emaTimeframe][alert.emaFastPeriod]) : 'N/A'}</p>
            <p><strong>Slow EMA (${alert.emaSlowPeriod}):</strong> ${technicalData.ema && technicalData.ema[alert.emaTimeframe] ? formatNumber(technicalData.ema[alert.emaTimeframe][alert.emaSlowPeriod]) : 'N/A'}</p>
            <p><strong>Condition:</strong> ${alert.emaCondition.replace(/_/g, ' ')}</p>
          </div>
          ` : ''}
          
          <p style="margin-top: 15px;"><strong>Created:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #8c8c8c;">
          <p>This is an automated alert from your Binance Alerts system.</p>
        </div>
      </div>
    `;
    
    // Send email
    console.log(`Sending email alert to ${to} for ${alert.symbol}`);
    const info = await transporter.sendMail({
      from: `"Binance Alerts" <${process.env.EMAIL_USERNAME}>`,
      to,
      subject,
      html,
    });
    
    console.log(`Email sent successfully to ${to}:`, info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = { sendAlertEmail };
