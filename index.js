
// BoostIQ API v3 - Versión Unificada

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Config
const CONFIG = {
  BINANCE_API_KEY: process.env.BINANCE_API_KEY,
  BINANCE_BASE_URL: 'https://api.binance.com/api/v3',
  CACHE_SHORT_TTL: 120,
  CACHE_LONG_TTL: 1800,
  REQUEST_TIMEOUT: 8000,
  MIN_VOLUME_EXPLOSION: 200000,
  MIN_VOLUME_REGULAR: 50000,
  MIN_GAIN_EXPLOSION: 8,
  MIN_GAIN_REGULAR: 3,
  MAX_CANDIDATES: 50,
  TOP_RESULTS: 5
};

// Cache
const shortCache = new NodeCache({ stdTTL: CONFIG.CACHE_SHORT_TTL });
const longCache = new NodeCache({ stdTTL: CONFIG.CACHE_LONG_TTL });

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Rate limit
app.use('/api/', rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded' }
}));

// Helper
const getBinanceHeaders = () => ({
  'X-MBX-APIKEY': CONFIG.BINANCE_API_KEY,
  'Content-Type': 'application/json'
});

const fetchBinanceData = async (endpoint, params = {}) => {
  const cacheKey = `binance_${endpoint}_${JSON.stringify(params)}`;
  const cached = shortCache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${CONFIG.BINANCE_BASE_URL}/${endpoint}`, {
      headers: getBinanceHeaders(),
      params,
      timeout: CONFIG.REQUEST_TIMEOUT
    });
    shortCache.set(cacheKey, response.data, 60);
    return response.data;
  } catch (err) {
    console.error('Binance fetch error:', err.message);
    throw new Error('Binance API error');
  }
};

// Endpoint simple de prueba
app.get('/', (req, res) => {
  res.send('✅ BoostIQ API funcionando correctamente');
});

// Endpoint real
app.get('/api/explosion-candidates', async (req, res) => {
  try {
    const tickers = await fetchBinanceData('ticker/24hr');
    const usdtPairs = tickers.filter(t =>
      t.symbol.endsWith('USDT') &&
      parseFloat(t.priceChangePercent) > CONFIG.MIN_GAIN_EXPLOSION &&
      parseFloat(t.quoteVolume) > CONFIG.MIN_VOLUME_EXPLOSION &&
      parseInt(t.count) > 1000
    ).slice(0, CONFIG.TOP_RESULTS);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: usdtPairs.map(t => ({
        symbol: t.symbol,
        price: t.lastPrice,
        priceChangePercent: t.priceChangePercent,
        volume24h: t.quoteVolume,
        trades24h: t.count
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 BoostIQ API corriendo en puerto ${PORT}`);
});
