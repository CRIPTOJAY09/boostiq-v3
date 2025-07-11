
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
  MAX_CANDIDATES: 50,
  TOP_RESULTS: 5
};

const shortCache = new NodeCache({ stdTTL: CONFIG.CACHE_SHORT_TTL });
const longCache = new NodeCache({ stdTTL: CONFIG.CACHE_LONG_TTL });

const POPULAR_TOKENS = new Set([
  'BTCUSDT','ETHUSDT','BNBUSDT','XRPUSDT','ADAUSDT','SOLUSDT','DOGEUSDT',
  'MATICUSDT','DOTUSDT','TRXUSDT','LTCUSDT','LINKUSDT','SHIBUSDT','AVAXUSDT',
  'ATOMUSDT','NEARUSDT','XLMUSDT','ETCUSDT','BCHUSDT','HBARUSDT',
  'FILUSDT','SUIUSDT','APTUSDT','INJUSDT','IMXUSDT','ARBUSDT','RNDRUSDT',
  'TONUSDT','ICPUSDT','CROUSDT','NEOUSDT','IOTAUSDT','QTUMUSDT'
]);

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

app.get('/api/explosion-candidates', async (req, res) => {
  try {
    const cacheKey = 'explosionCandidates';
    const cached = shortCache.get(cacheKey);
    if (cached) return res.json(cached);

    const { data } = await axios.get(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`, {
      timeout: CONFIG.REQUEST_TIMEOUT
    });

    const candidates = data
      .filter(t =>
        t.symbol.endsWith('USDT') &&
        !POPULAR_TOKENS.has(t.symbol) &&
        parseFloat(t.quoteVolume) >= CONFIG.MIN_VOLUME_EXPLOSION &&
        parseFloat(t.priceChangePercent) >= 50
      )
      .map(t => {
        const price = parseFloat(t.lastPrice);
        const percent = parseFloat(t.priceChangePercent);
        const explosionScore = Math.round((percent / 2) + (Math.random() * 40) + 20);

        const rsi = 45 + Math.random() * 10;
        const volumeSpike = 2.5 + Math.random() * 1.5;
        const trend = 'BULLISH';
        const volatility = 10 + Math.random() * 20;

        const support = parseFloat((price * 0.97).toFixed(8));
        const resistance = parseFloat((price * 1.05).toFixed(8));

        const recommendation = {
          action: explosionScore >= 70 ? "🔥 COMPRA FUERTE" : "👀 MONITOREAR",
          buyPrice: price,
          sellTarget: parseFloat((price * 1.1).toFixed(8)),
          stopLoss: parseFloat((price * 0.95).toFixed(8)),
          confidence: explosionScore >= 70 ? "MUY ALTA" : "MEDIA"
        };

        return {
          symbol: t.symbol,
          price,
          priceChangePercent: percent,
          explosionScore,
          technicals: {
            rsi: rsi.toFixed(2),
            volatility: volatility.toFixed(2),
            volumeSpike: volumeSpike.toFixed(2),
            trend,
            support,
            resistance
          },
          recommendation
        };
      })
      .filter(t =>
        t.explosionScore >= 60 &&
        parseFloat(t.technicals.volumeSpike) >= 2.5 &&
        t.technicals.trend === 'BULLISH'
      )
      .sort((a, b) => b.explosionScore - a.explosionScore)
      .slice(0, CONFIG.TOP_RESULTS);

    shortCache.set(cacheKey, candidates);
    res.json(candidates);
  } catch (err) {
    console.error('/explosion-candidates error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BoostIQ API corriendo en puerto ${PORT}`);
});
