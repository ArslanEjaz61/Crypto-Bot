# Binance Alerts System

A real-time cryptocurrency monitoring and alert system built with MERN stack (MongoDB, Express, React, Node.js). This application allows traders to track cryptocurrency prices, set custom alerts based on price conditions, and analyze market trends through RSI indicators.

## Features

- **Price Alerts**: Create alerts for specific price targets or percentage changes
- **Multiple Alert Types**: Support for price going up, down, or either way
- **Smart Alert Triggering**: Alerts trigger based on price conditions, not time schedules
- **Email Notifications**: Receive email notifications when alerts trigger
- **Advanced RSI Analysis**: Calculate and display Relative Strength Index for cryptocurrencies with multiple timeframe support
- **Interactive RSI Interface**: 
  - Search functionality with autocomplete for coins
  - Batch loading with pagination (load 20 coins at a time)
  - Visual categorization (overbought/oversold/neutral)
  - Custom timeframe selection (1m, 5m, 15m, 1h, 4h, 1d, 1w)
- **Favorites**: Mark pairs as favorites for easy access
- **Filtering & Sorting**: Filter by market, favorites, volume, and more
- **Real-time Updates**: Socket.io integration for real-time data updates
- **Performance Optimizations**: Caching, memoization, and lazy loading for improved responsiveness

## Technology Stack

- **Frontend**: React with Material UI
- **Backend**: Node.js and Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.io
- **API Integration**: Binance REST and WebSocket APIs
- **Email Notifications**: Nodemailer
- **Scheduled Tasks**: node-cron

## Setup & Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Git

### Installation Steps

1. **Clone the repository**

```bash
git clone [repository-url]
cd binance-alerts
```

2. **Install server dependencies**

```bash
npm install
```

3. **Install client dependencies**

```bash
cd client
npm install
cd ..
```

4. **Configure environment variables**

Create or modify the `.env` file in the root directory with the following variables:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/binance-alerts
EMAIL_SERVICE=gmail
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
NODE_ENV=development
```

Note: For Gmail, you'll need to generate an App Password in your Google account settings.

5. **Run the application**

Development mode (with hot reloading for both client and server):

```bash
npm run dev
```

Server only:

```bash
npm run server
```

Client only:

```bash
npm run client
```

Production build:

```bash
cd client
npm run build
cd ..
npm start
```

## Usage

1. **Create Alerts**: Navigate to the "Create Alert" tab to set up new price alerts with custom conditions
2. **Manage Alerts**: View and manage your alerts in the "Alerts List" tab
3. **Analyze RSI**: Use the "RSI Analysis" tab to:
   - Calculate RSI values for cryptocurrencies
   - Search for specific coins using the autocomplete search feature
   - View results for different timeframes
   - Sort by RSI values (highest/lowest)
   - Load more results in batches using the "Load More" button

## API Endpoints

### Alerts

- `GET /api/alerts` - Get all alerts
- `POST /api/alerts` - Create a new alert
- `GET /api/alerts/:id` - Get alert by ID
- `PUT /api/alerts/:id` - Update an alert
- `DELETE /api/alerts/:id` - Delete an alert

### Crypto

- `GET /api/crypto` - Get all crypto pairs
- `GET /api/crypto/:symbol` - Get crypto by symbol
- `PUT /api/crypto/:symbol/favorite` - Toggle favorite status
- `GET /api/crypto/:symbol/rsi` - Calculate RSI for a specific pair

## Scheduled Tasks

The application runs the following scheduled tasks:

- Updates crypto data every minute
- Checks for alerts that match price conditions every minute
- Sends email notifications for triggered alerts
- Implements cooldown periods to prevent repeated alert triggering

## License

[MIT](LICENSE)
