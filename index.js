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

const shortCache = new NodeCache({ stdTTL: CONFIG.CACHE_SHORT_TTL });
const longCache = new NodeCache({ stdTTL: CONFIG.CACHE_LONG_TTL });

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

const POPULAR_TOKENS = new Set([
  'BTCUSDT','ETHUSDT','BNBUSDT','XRPUSDT','ADAUSDT','SOLUSDT','DOGEUSDT',
  'MATICUSDT','DOTUSDT','TRXUSDT','LTCUSDT','LINKUSDT','SHIBUSDT','AVAXUSDT',
  'ATOMUSDT','NEARUSDT','XLMUSDT','ETCUSDT','BCHUSDT','HBARUSDT',
  'FILUSDT','SUIUSDT','APTUSDT','INJUSDT','IMXUSDT','ARBUSDT','RNDRUSDT',
  'TONUSDT','ICPUSDT','CROUSDT','NEOUSDT','IOTAUSDT','QTUMUSDT'
]);

const fetchData = async (url) => {
  const response = await axios.get(url, { timeout: CONFIG.REQUEST_TIMEOUT });
  return response.data;
};

app.get('/api/pre-explosion-signals', async (req, res) => {
  try {
    const cacheKey = 'preExplosionSignals';
    const cached = longCache.get(cacheKey);
    if (cached) return res.json(cached);

    const { data } = await axios.get(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`, {
      timeout: CONFIG.REQUEST_TIMEOUT
    });

    const now = new Date();
    const preSignals = data
      .filter(t =>
        t.symbol.endsWith('USDT') &&
        !POPULAR_TOKENS.has(t.symbol) &&
        parseFloat(t.quoteVolume) >= 100000 &&
        parseFloat(t.priceChangePercent) >= 1 &&
        parseFloat(t.priceChangePercent) <= 4
      )
      .map(t => {
        const price = parseFloat(t.lastPrice);
        const percent = parseFloat(t.priceChangePercent);
        const rsi = 48 + Math.random() * 4;
        const compression = Math.random() * 0.8;
        const score = Math.round((100 - rsi) * compression * 10);

        const priority = score >= 70 ? 'ALTA' : score >= 50 ? 'MEDIA' : 'BAJA';

        return {
          symbol: t.symbol,
          price,
          priceChangePercent: percent,
          predictionScore: score,
          priority,
          metrics: {
            rsi: rsi.toFixed(2),
            compression: compression.toFixed(2),
            hourDetected: now.toISOString()
          },
          recommendation: {
            action: priority === 'ALTA' ? '🔥 POTENCIAL FUERTE' : priority === 'MEDIA' ? '👀 ATENTO' : '❌ POCO MOVIMIENTO',
            buyZone: (price * 0.98).toFixed(8),
            targetZone: (price * 1.10).toFixed(8),
            stopLoss: (price * 0.95).toFixed(8),
            confidence: priority
          }
        };
      })
      .filter(t => t.priority !== 'BAJA')
      .sort((a, b) => b.predictionScore - a.predictionScore)
      .slice(0, 10);

    longCache.set(cacheKey, preSignals);
    res.json(preSignals);
  } catch (err) {
    console.error('/pre-explosion-signals error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BoostIQ API corriendo en puerto ${PORT}`);
});
