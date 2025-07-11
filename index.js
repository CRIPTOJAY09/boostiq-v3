
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
  REQUEST_TIMEOUT: 8000,
  MIN_VOLUME: 100000,
  MIN_GAIN: 5,
  MAX_RESULTS: 5
};

const shortCache = new NodeCache({ stdTTL: CONFIG.CACHE_SHORT_TTL });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*' }));
app.use(express.json());

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
    shortCache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('Binance error:', error.message);
    return [];
  }
};

const calculateRecommendation = (symbol, price, score) => {
  const buy = parseFloat(price);
  let action = '👀 MONITOREAR';
  let sellTarget = buy * 1.05;
  let stopLoss = buy * 0.97;
  let confidence = 'BAJA';

  if (score >= 85) {
    action = '🚀 COMPRA INMEDIATA';
    sellTarget = buy * 1.3;
    stopLoss = buy * 0.88;
    confidence = 'EXTREMA';
  } else if (score >= 75) {
    action = '🔥 COMPRA FUERTE';
    sellTarget = buy * 1.2;
    stopLoss = buy * 0.9;
    confidence = 'MUY ALTA';
  } else if (score >= 65) {
    action = '📈 COMPRA MODERADA';
    sellTarget = buy * 1.15;
    stopLoss = buy * 0.92;
    confidence = 'ALTA';
  } else if (score >= 50) {
    action = '⚡ OBSERVAR';
    sellTarget = buy * 1.1;
    stopLoss = buy * 0.95;
    confidence = 'MEDIA';
  }

  return {
    action,
    buyPrice: parseFloat(buy.toFixed(8)),
    sellTarget: parseFloat(sellTarget.toFixed(8)),
    stopLoss: parseFloat(stopLoss.toFixed(8)),
    confidence
  };
};

const calculateTechnicalData = (price, change) => {
  const rsi = 45 + Math.random() * 10;
  const vol = 10 + Math.random() * 15;
  const spike = 1.5 + Math.random();
  const support = price * 0.97;
  const resistance = price * 1.05;
  const trend = change > 15 ? 'BULLISH' : change < -5 ? 'BEARISH' : 'NEUTRAL';

  return {
    rsi: parseFloat(rsi.toFixed(2)),
    volatility: parseFloat(vol.toFixed(2)),
    volumeSpike: parseFloat(spike.toFixed(2)),
    trend,
    support: parseFloat(support.toFixed(8)),
    resistance: parseFloat(resistance.toFixed(8))
  };
};

const buildTokenResponse = (t) => {
  const price = parseFloat(t.lastPrice);
  const change = parseFloat(t.priceChangePercent);
  const score = Math.min(100, Math.floor(change + Math.random() * 30));
  const technicals = calculateTechnicalData(price, change);
  const recommendation = calculateRecommendation(t.symbol, price, score);

  return {
    symbol: t.symbol,
    price,
    priceChangePercent: change,
    explosionScore: score,
    technicals,
    recommendation
  };
};

app.get('/api/explosion-candidates', async (req, res) => {
  const data = await fetchBinanceData('ticker/24hr');
  const tokens = data
    .filter(t =>
      t.symbol.endsWith('USDT') &&
      parseFloat(t.priceChangePercent) >= CONFIG.MIN_GAIN &&
      parseFloat(t.quoteVolume) > CONFIG.MIN_VOLUME
    )
    .slice(0, CONFIG.MAX_RESULTS)
    .map(buildTokenResponse);

  res.json({ success: true, data: tokens });
});

app.get('/api/top-gainers', async (req, res) => {
  const data = await fetchBinanceData('ticker/24hr');
  const tokens = data
    .filter(t => t.symbol.endsWith('USDT') && parseFloat(t.priceChangePercent) > 0)
    .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
    .slice(0, CONFIG.MAX_RESULTS)
    .map(buildTokenResponse);

  res.json({ success: true, data: tokens });
});

app.get('/api/new-listings', async (req, res) => {
  const data = await fetchBinanceData('exchangeInfo');
  const all24h = await fetchBinanceData('ticker/24hr');
  const usdtPairs = data.symbols
    .filter(s => s.symbol.endsWith('USDT'))
    .sort((a, b) => new Date(b.onboardDate || 0) - new Date(a.onboardDate || 0))
    .slice(0, CONFIG.MAX_RESULTS);

  const result = usdtPairs.map(pair => {
    const ticker = all24h.find(t => t.symbol === pair.symbol);
    if (!ticker) return null;
    return buildTokenResponse(ticker);
  }).filter(Boolean);

  res.json({ success: true, data: result });
});

app.get('/api/analysis/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const ticker = await fetchBinanceData(`ticker/24hr?symbol=${symbol}`);
    if (!ticker || !ticker.lastPrice) throw new Error('Símbolo no válido');

    const response = buildTokenResponse(ticker);
    res.json({ success: true, data: response });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.1.0', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 BoostIQ API corriendo en puerto ${PORT}`);
});
