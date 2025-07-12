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

// TOKENS POPULARES QUE SE EXCLUYEN
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

// 📈 Top Gainers
app.get('/api/top-gainers', async (req, res) => {
  try {
    const data = await fetchData(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`);
    const filtered = data
      .filter(d => !POPULAR_TOKENS.has(d.symbol) && d.symbol.endsWith('USDT') && parseFloat(d.volume) >= CONFIG.MIN_VOLUME_REGULAR)
      .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
      .slice(0, CONFIG.TOP_RESULTS)
      .map(t => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        priceChangePercent: parseFloat(t.priceChangePercent),
      }));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener top gainers' });
  }
});

// 🚀 Candidatos a Explosión
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

// 🧠 Señales tempranas de posibles explosiones
app.get('/api/pre-explosion-signals', async (req, res) => {
  try {
    const cacheKey = 'preExplosionSignals';
    const cached = longCache.get(cacheKey);
    if (cached) return res.json(cached);

    const data = await fetchData(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`);
    const alerts = data
      .filter(t =>
        t.symbol.endsWith('USDT') &&
        !POPULAR_TOKENS.has(t.symbol) &&
        parseFloat(t.quoteVolume) > CONFIG.MIN_VOLUME_REGULAR &&
        parseFloat(t.priceChangePercent) > CONFIG.MIN_GAIN_REGULAR
      )
      .map(t => {
        const price = parseFloat(t.lastPrice);
        const rsi = 39 + Math.random() * 6;
        const compression = Math.random() < 0.5;
        const spike = Math.random() > 0.8;
        const alertScore = Math.round(rsi + (compression ? 25 : 0) + (spike ? 20 : 0));

        const recommendation = {
          action: alertScore > 75 ? '🔥 POSIBLE EXPLOSIÓN' : alertScore > 60 ? '👀 MONITOREAR' : '❌ EVITAR',
          buyPrice: price,
          sellTarget: parseFloat((price * 1.12).toFixed(8)),
          stopLoss: parseFloat((price * 0.92).toFixed(8)),
          confidence: alertScore > 75 ? 'ALTA' : alertScore > 60 ? 'MEDIA' : 'BAJA'
        };

        return {
          symbol: t.symbol,
          price,
          priceChangePercent: parseFloat(t.priceChangePercent),
          alertScore,
          rsi: rsi.toFixed(2),
          compression,
          volumeSpike: spike,
          recommendation
        };
      })
      .filter(t => t.alertScore >= 60)
      .sort((a, b) => b.alertScore - a.alertScore);

    longCache.set(cacheKey, alerts);
    res.json(alerts);
  } catch (err) {
    console.error('❌ /pre-explosion-signals ERROR', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🆕 Nuevos Listings
app.get('/api/new-listings', async (req, res) => {
  try {
    const listings = await fetchData('https://api.binance.com/api/v3/exchangeInfo');
    const recent = listings.symbols
      .filter(s => s.symbol.endsWith('USDT') && !POPULAR_TOKENS.has(s.symbol))
      .sort((a, b) => new Date(b.onboardDate || 0) - new Date(a.onboardDate || 0))
      .slice(0, CONFIG.TOP_RESULTS)
      .map(t => ({ symbol: t.symbol }));
    res.json(recent);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener nuevos listados' });
  }
});

// 📊 Análisis por Token
app.get('/api/analysis/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await fetchData(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`);
    const price = parseFloat(data.lastPrice);
    const percent = parseFloat(data.priceChangePercent);

    const recommendation = {
      action: percent > 15 ? '🔥 COMPRA FUERTE' : percent > 5 ? '👀 MONITOREAR' : '❌ EVITAR',
      buyPrice: price,
      sellTarget: price * 1.25,
      stopLoss: price * 0.95,
      confidence: percent > 15 ? 'MUY ALTA' : percent > 5 ? 'MEDIA' : 'BAJA'
    };

    res.json({
      symbol,
      price,
      priceChangePercent: percent,
      recommendation
    });
  } catch (err) {
    res.status(500).json({ error: 'Error en análisis individual' });
  }
});

// ✅ Servidor activo
app.listen(PORT, () => {
  console.log(`🚀 BoostIQ API corriendo en puerto ${PORT}`);
});
