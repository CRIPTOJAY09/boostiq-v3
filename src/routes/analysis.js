// analyconst axios = require('axios');

module.exports = (app, CONFIG, shortCache, longCache) => {
  app.get('/api/analysis/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const { data } = await axios.get(`${CONFIG.BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`, {
        timeout: CONFIG.REQUEST_TIMEOUT
      });

      const price = parseFloat(data.lastPrice);
      const percent = parseFloat(data.priceChangePercent);

      const recommendation = {
        action: percent > 25 ? '🚀 EXPLOSIÓN INMINENTE'
              : percent > 15 ? '🔥 COMPRA FUERTE'
              : percent > 5  ? '👀 MONITOREAR'
              : '❌ EVITAR',
        buyPrice: price,
        sellTarget: parseFloat((price * 1.25).toFixed(8)),
        stopLoss: parseFloat((price * 0.95).toFixed(8)),
        confidence: percent > 25 ? 'EXTREMA'
                  : percent > 15 ? 'MUY ALTA'
                  : percent > 5  ? 'MEDIA'
                  : 'BAJA'
      };

      res.json({
        symbol,
        price,
        priceChangePercent: percent,
        explosionScore: Math.round(percent * 2.5),
        recommendation
      });
    } catch (err) {
      res.status(500).json({ error: 'Error en análisis individual' });
    }
  });
};
sis endpoint placeholder
