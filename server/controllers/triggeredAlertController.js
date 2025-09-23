const TriggeredAlert = require("../models/TriggeredAlert");
const Alert = require("../models/alertModel");

// Get all triggered alerts for dashboard
const getTriggeredAlerts = async (req, res) => {
  try {
    const { userEmail, symbol, limit = 50, page = 1 } = req.query;

    const query = {};
    if (userEmail) query.userEmail = userEmail;
    if (symbol) query.symbol = symbol.toUpperCase();

    const skip = (page - 1) * limit;

    const triggeredAlerts = await TriggeredAlert.find(query)
      .sort({ triggeredAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("originalAlertId");

    const total = await TriggeredAlert.countDocuments(query);

    res.json({
      triggeredAlerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching triggered alerts:", error);
    res.status(500).json({ error: "Failed to fetch triggered alerts" });
  }
};

// Get triggered alerts by symbol with detailed history
const getTriggeredAlertsBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 10 } = req.query;

    const triggeredAlerts = await TriggeredAlert.getBySymbol(
      symbol,
      parseInt(limit)
    );

    // Group by date for better visualization
    const groupedByDate = triggeredAlerts.reduce((acc, alert) => {
      const date = alert.triggeredAt.toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(alert);
      return acc;
    }, {});

    res.json({
      symbol: symbol.toUpperCase(),
      totalTriggers: triggeredAlerts.length,
      history: groupedByDate,
      rawHistory: triggeredAlerts,
    });
  } catch (error) {
    console.error("Error fetching triggered alerts by symbol:", error);
    res.status(500).json({ error: "Failed to fetch symbol trigger history" });
  }
};

// Get triggered alerts summary for dashboard
const getTriggeredAlertsSummary = async (req, res) => {
  try {
    const { userEmail } = req.query;

    const query = userEmail ? { userEmail } : {};

    // Get summary statistics
    const [totalTriggers, todayTriggers, weekTriggers, symbolStats] =
      await Promise.all([
        TriggeredAlert.countDocuments(query),
        TriggeredAlert.countDocuments({
          ...query,
          triggeredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        TriggeredAlert.countDocuments({
          ...query,
          triggeredAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        TriggeredAlert.aggregate([
          { $match: query },
          { $group: { _id: "$symbol", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
      ]);

    res.json({
      summary: {
        total: totalTriggers,
        today: todayTriggers,
        thisWeek: weekTriggers,
      },
      topSymbols: symbolStats,
    });
  } catch (error) {
    console.error("Error fetching triggered alerts summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

// Create a triggered alert (called when alert condition is met)
const createTriggeredAlert = async (
  alertId,
  conditionMet,
  marketData,
  notificationDetails
) => {
  try {
    console.log(`🔍 createTriggeredAlert called for alertId: ${alertId}`);
    console.log("conditionMet:", JSON.stringify(conditionMet, null, 2));
    console.log("marketData:", JSON.stringify(marketData, null, 2));
    console.log(
      "notificationDetails:",
      JSON.stringify(notificationDetails, null, 2)
    );

    const alert = await Alert.findById(alertId);
    if (!alert) {
      console.error(`❌ Alert not found for ID: ${alertId}`);
      throw new Error("Original alert not found");
    }

    console.log(`✅ Found original alert: ${alert.symbol}`);

    const triggeredAlert = new TriggeredAlert({
      originalAlertId: alertId,
      symbol: alert.symbol,
      conditionMet: conditionMet.type,
      conditionDetails: {
        targetValue: conditionMet.targetValue,
        actualValue: conditionMet.actualValue,
        timeframe: conditionMet.timeframe,
        indicator: conditionMet.indicator,
        description: conditionMet.description,
      },
      marketData: {
        price: marketData.price,
        volume: marketData.volume,
        priceChange24h: marketData.priceChange24h,
        priceChangePercent24h: marketData.priceChangePercent24h,
        rsi: marketData.rsi,
        ema: marketData.ema,
      },
      notifications: notificationDetails.map((notification) => ({
        type: notification.type,
        recipient: notification.recipient,
        sentAt: notification.sentAt || new Date(),
        status: notification.status || "SENT",
        messageId: notification.messageId,
        errorMessage: notification.errorMessage,
      })),
      alertConfig: {
        direction: alert.direction,
        targetType: alert.targetType,
        targetValue: alert.targetValue,
        trackingMode: alert.trackingMode,
        intervalMinutes: alert.intervalMinutes,
        comment: alert.comment,
      },
      userEmail: alert.email,
    });

    console.log(`💾 Saving triggered alert to database...`);
    const savedAlert = await triggeredAlert.save();
    console.log(
      `✅ Triggered alert saved successfully with ID: ${savedAlert._id}`
    );
    console.log(
      `📊 Triggered alert created for ${alert.symbol}: ${conditionMet.description}`
    );

    // Verify it was saved by querying it back
    const verification = await TriggeredAlert.findById(savedAlert._id);
    if (verification) {
      console.log(`✅ Verification: Triggered alert exists in database`);
    } else {
      console.error(
        `❌ Verification failed: Triggered alert not found in database`
      );
    }

    return savedAlert;
  } catch (error) {
    console.error("Error creating triggered alert:", error);
    throw error;
  }
};

// Update notification status
const updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { notificationId, status, errorMessage } = req.body;

    const triggeredAlert = await TriggeredAlert.findById(id);
    if (!triggeredAlert) {
      return res.status(404).json({ error: "Triggered alert not found" });
    }

    const notification = triggeredAlert.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    notification.status = status;
    if (errorMessage) notification.errorMessage = errorMessage;

    await triggeredAlert.save();

    res.json({ message: "Notification status updated", triggeredAlert });
  } catch (error) {
    console.error("Error updating notification status:", error);
    res.status(500).json({ error: "Failed to update notification status" });
  }
};

// Acknowledge triggered alert
const acknowledgeTriggeredAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const triggeredAlert = await TriggeredAlert.findByIdAndUpdate(
      id,
      { status: "ACKNOWLEDGED" },
      { new: true }
    );

    if (!triggeredAlert) {
      return res.status(404).json({ error: "Triggered alert not found" });
    }

    res.json({ message: "Alert acknowledged", triggeredAlert });
  } catch (error) {
    console.error("Error acknowledging triggered alert:", error);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
};

module.exports = {
  getTriggeredAlerts,
  getTriggeredAlertsBySymbol,
  getTriggeredAlertsSummary,
  createTriggeredAlert,
  updateNotificationStatus,
  acknowledgeTriggeredAlert,
};
