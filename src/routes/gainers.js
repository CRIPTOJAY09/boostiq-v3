const axios = require('axios');

const POPULAR_TOKENS = new Set([
  'BTCUSDT','ETHUSDT','BNBUSDT','ADAUSDT','XRPUSDT','SOLUSDT','DOGEUSDT','MATICUSDT',
  'TRXUSDT','DOTUSDT','LTCUSDT','AVAXUSDT','SHIBUSDT','LINKUSDT','ATOMUSDT','BCHUSDT',
  'XLMUSDT','ETCUSDT','FILUSDT','APTUSDT'
]);

module.exports = (app, CONFIG, shortCache, longCache) => {
  app.get('/api/top-gainers', async (req, res) => {
    try {
      const { data } = await axios.get(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr`, {
        timeout: CONFIG.REQUEST_TIMEOUT
      });

      const result = data
        .filter(d =>
          d.symbol.endsWith('USDT') &&
          !POPULAR_TOKENS.has(d.symbol) &&
          parseFloat(d.volume) >= CONFIG.MIN_VOLUME_REGULAR
        )
        .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
        .slice(0, CONFIG.TOP_RESULTS)
        .map(t => ({
          symbol: t.symbol,
          price: parseFloat(t.lastPrice),
          priceChangePercent: parseFloat(t.priceChangePercent)
        }));

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Error al obtener top gainers' });
    }
  });
};
// gainers endpoint placeholder
