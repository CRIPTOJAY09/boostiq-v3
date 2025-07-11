
const axios = require('axios');

// Lista de tokens populares para excluir
const POPULAR_TOKENS = new Set([
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT',
  'DOGEUSDT', 'SOLUSDT', 'MATICUSDT', 'TRXUSDT', 'DOTUSDT',
  'LTCUSDT', 'AVAXUSDT', 'SHIBUSDT', 'LINKUSDT', 'ATOMUSDT',
  'BCHUSDT', 'XLMUSDT', 'ETCUSDT', 'FILUSDT', 'APTUSDT'
]);

module.exports = (app, CONFIG, shortCache, longCache) => {
  const fetchData = async (url) => {
    const response = await axios.get(url, { timeout: CONFIG.REQUEST_TIMEOUT });
    return response.data;
  };

  // Endpoint: Top Gainers
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

  // Endpoint: New Listings
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

  // Endpoint: Análisis Individual
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
};
