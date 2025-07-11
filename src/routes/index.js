
const axios = require('axios');

const POPULAR_TOKENS = new Set([
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
  'DOGEUSDT', 'SOLUSDT', 'MATICUSDT', 'TRXUSDT', 'DOTUSDT',
  'LTCUSDT', 'AVAXUSDT', 'SHIBUSDT', 'LINKUSDT', 'ATOMUSDT',
  'BCHUSDT', 'XLMUSDT', 'ETCUSDT', 'FILUSDT', 'APTUSDT'
]);

module.exports = (app, CONFIG, shortCache, longCache) => {
  const fetchData = async (url) => {
    try {
      const res = await axios.get(url, { timeout: CONFIG.REQUEST_TIMEOUT });
      return res.data;
    } catch (error) {
      console.error(`❌ Error fetching ${url}:`, error.message);
      return null;
    }
  };

  // Endpoint: Top Gainers
  app.get('/api/top-gainers', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const data = await fetchData(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`);
    if (!data) return res.status(500).json({ error: 'No se pudo obtener top gainers' });

    const filtered = data
      .filter(d => !POPULAR_TOKENS.has(d.symbol) && d.symbol.endsWith('USDT') && parseFloat(d.volume) >= CONFIG.MIN_VOLUME_REGULAR)
      .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
      .slice(0, CONFIG.TOP_RESULTS)
      .map(t => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        priceChangePercent: parseFloat(t.priceChangePercent)
      }));

    return res.status(200).json(filtered);
  });

  // Endpoint: Nuevos Listados
  app.get('/api/new-listings', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const data = await fetchData('https://api.binance.com/api/v3/exchangeInfo');
    if (!data || !data.symbols) return res.status(500).json({ error: 'No se pudo obtener nuevos listados' });

    const recent = data.symbols
      .filter(s => s.symbol.endsWith('USDT') && !POPULAR_TOKENS.has(s.symbol))
      .sort((a, b) => (b.onboardDate || 0) - (a.onboardDate || 0))
      .slice(0, CONFIG.TOP_RESULTS)
      .map(t => ({ symbol: t.symbol }));

    return res.status(200).json(recent);
  });

  // Endpoint: Análisis Individual
  app.get('/api/analysis/:symbol', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const symbol = req.params.symbol.toUpperCase();
    const data = await fetchData(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`);
    if (!data || data.code) return res.status(404).json({ error: 'Token no encontrado' });

    const price = parseFloat(data.lastPrice);
    const percent = parseFloat(data.priceChangePercent);

    const recommendation = {
      action: percent > 15 ? '🔥 COMPRA FUERTE' : percent > 5 ? '👀 MONITOREAR' : '❌ EVITAR',
      buyPrice: price,
      sellTarget: parseFloat((price * 1.25).toFixed(6)),
      stopLoss: parseFloat((price * 0.95).toFixed(6)),
      confidence: percent > 15 ? 'MUY ALTA' : percent > 5 ? 'MEDIA' : 'BAJA'
    };

    return res.status(200).json({
      symbol,
      price,
      priceChangePercent: percent,
      recommendation
    });
  });
};
