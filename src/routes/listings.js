const axios = require('axios');

module.exports = (app, CONFIG, shortCache, longCache, POPULAR_TOKENS) => {
  app.get('/api/new-listings', async (req, res) => {
    try {
      const listings = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
      const recent = listings.data.symbols
        .filter(s => s.symbol.endsWith('USDT') && !POPULAR_TOKENS.has(s.symbol))
        .slice(0, CONFIG.TOP_RESULTS)
        .map(t => ({ symbol: t.symbol }));
      res.json(recent);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener nuevos listados' });
    }
  });
};
