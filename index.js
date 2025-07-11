const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
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

// 🚀 Importar endpoints
require('./routes')(app, CONFIG, shortCache, longCache);

// 🚀 Servidor activo
app.listen(PORT, () => {
  console.log(`🚀 BoostIQ API corriendo en puerto ${PORT}`);
});
