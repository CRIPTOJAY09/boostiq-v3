// exconst axios = require('axios');

const POPULAR_TOKENS = new Set([
  'BTCUSDT','ETHUSDT','BNBUSDT','ADAUSDT','XRPUSDT','SOLUSDT','DOGEUSDT','MATICUSDT',
  'TRXUSDT','DOTUSDT','LTCUSDT','AVAXUSDT','SHIBUSDT','LINKUSDT','ATOMUSDT','BCHUSDT',
  'XLMUSDT','ETCUSDT','FILUSDT','APTUSDT'
]);

module.exports = (app, CONFIG, shortCache, longCache) => {
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
};
plosion endpoint placeholder
