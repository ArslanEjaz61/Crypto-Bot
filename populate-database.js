/**
 * 🔧 POPULATE DATABASE
 *
 * Quick script to populate database with Binance pairs
 * Run this once if market panel shows no pairs
 */

const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const Crypto = require("./server/models/cryptoModel");

async function populateDatabase() {
  try {
    console.log("🔗 Connecting to MongoDB...");

    const mongoURI =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/alerts";
    await mongoose.connect(mongoURI);

    console.log("✅ Connected to MongoDB");

    // Check if database already has data
    const existingCount = await Crypto.countDocuments();
    console.log(`📊 Current database has ${existingCount} pairs`);

    if (existingCount > 0) {
      console.log("✅ Database already populated!");
      const proceed = process.argv.includes("--force");
      if (!proceed) {
        console.log("Use --force to repopulate");
        process.exit(0);
      }
    }

    console.log("📡 Fetching data from Binance...");

    // Fetch from Binance
    const [priceResponse, statsResponse, exchangeInfoResponse] =
      await Promise.all([
        axios.get("https://api.binance.com/api/v3/ticker/price"),
        axios.get("https://api.binance.com/api/v3/ticker/24hr"),
        axios.get("https://api.binance.com/api/v3/exchangeInfo"),
      ]);

    console.log("✅ Data fetched from Binance");

    // Create price map
    const priceMap = {};
    priceResponse.data.forEach((item) => {
      priceMap[item.symbol] = parseFloat(item.price);
    });

    // Create stats map
    const statsMap = {};
    statsResponse.data.forEach((item) => {
      const quoteVolume = parseFloat(item.quoteVolume);
      const baseVolume = parseFloat(item.volume);
      const weightedAvgPrice = parseFloat(item.weightedAvgPrice);

      statsMap[item.symbol] = {
        volume24h: quoteVolume || baseVolume * weightedAvgPrice,
        priceChangePercent24h: parseFloat(item.priceChangePercent),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
        openPrice: parseFloat(item.openPrice),
      };
    });

    // Filter USDT pairs
    const usdtPairs = exchangeInfoResponse.data.symbols.filter((symbol) => {
      return (
        symbol.quoteAsset === "USDT" &&
        symbol.status === "TRADING" &&
        symbol.isSpotTradingAllowed === true
      );
    });

    console.log(`📊 Found ${usdtPairs.length} USDT trading pairs`);

    // Prepare bulk operations
    const bulkOps = [];

    for (const symbol of usdtPairs) {
      const price = priceMap[symbol.symbol] || 0;
      const stats = statsMap[symbol.symbol] || {};

      bulkOps.push({
        updateOne: {
          filter: { symbol: symbol.symbol },
          update: {
            $set: {
              symbol: symbol.symbol,
              name: symbol.baseAsset,
              price: price,
              volume24h: stats.volume24h || 0,
              priceChangePercent24h: stats.priceChangePercent24h || 0,
              highPrice: stats.highPrice || price,
              lowPrice: stats.lowPrice || price,
              openPrice: stats.openPrice || price,
              baseAsset: symbol.baseAsset,
              quoteAsset: symbol.quoteAsset,
              status: symbol.status,
              isSpotTradingAllowed: symbol.isSpotTradingAllowed,
              isFavorite: false,
              lastUpdated: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    console.log("💾 Saving to database...");

    // Execute bulk operations
    const result = await Crypto.bulkWrite(bulkOps);

    console.log("\n✅ Database populated successfully!");
    console.log(`📊 Total pairs: ${usdtPairs.length}`);
    console.log(`✅ Inserted: ${result.upsertedCount}`);
    console.log(`✅ Updated: ${result.modifiedCount}`);

    // Verify
    const finalCount = await Crypto.countDocuments({ quoteAsset: "USDT" });
    console.log(`✅ Final USDT pairs in database: ${finalCount}`);

    console.log("\n🎉 Done! Market panel should now show all pairs.");
    console.log("💡 Start system with: npm run start:fast");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run
console.log("🚀 Starting database population...\n");
populateDatabase();
