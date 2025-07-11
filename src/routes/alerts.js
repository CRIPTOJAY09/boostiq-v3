const axios = require('axios');

module.exports = (app, CONFIG, shortCache, longCache, POPULAR_TOKENS) => {
  app.get('/api/alerts', async (req, res) => {
    try {
      const { data } = await axios.get(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`, {
        timeout: CONFIG.REQUEST_TIMEOUT
      });

      const alerts = data
        .filter(t =>
          t.symbol.endsWith('USDT') &&
          !POPULAR_TOKENS.has(t.symbol) &&
          parseFloat(t.quoteVolume) >= CONFIG.MIN_VOLUME_EXPLOSION &&
          parseFloat(t.priceChangePercent) >= 30
        )
        .map(t => ({
          symbol: t.symbol,
          price: parseFloat(t.lastPrice),
          percent: parseFloat(t.priceChangePercent),
        }));

      res.json(alerts);
    } catch (err) {
      res.status(500).json({ error: 'Error al generar alertas' });
    }
  });
};
// alerts endpoint placeholder
