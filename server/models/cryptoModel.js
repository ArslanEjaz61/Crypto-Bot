const mongoose = require('mongoose');

const cryptoSchema = mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    priceChangePercent24h: {
      type: Number,
      default: 0,
    },
    volume24h: {
      type: Number,
      default: 0,
    },
    highPrice24h: {
      type: Number,
      default: 0,
    },
    lowPrice24h: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    historical: [
      {
        timestamp: Date,
        price: Number,
        volume24h: Number,
      },
    ],
    rsi: {
      type: Number,
      default: null,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Crypto = mongoose.model('Crypto', cryptoSchema);

module.exports = Crypto;
