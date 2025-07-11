const setupTopGainers = require('./gainers');
const setupNewListings = require('./listings');
const setupAnalysis = require('./analysis');
const setupExplosions = require('./explosion');
const setupAlerts = require('./alerts'); // Omitir si no lo estás usando

module.exports = (app, CONFIG, shortCache, longCache) => {
  setupTopGainers(app, CONFIG, shortCache, longCache);
  setupNewListings(app, CONFIG, shortCache, longCache);
  setupAnalysis(app, CONFIG, shortCache, longCache);
  setupExplosions(app, CONFIG, shortCache, longCache);
  setupAlerts(app, CONFIG, shortCache, longCache); // Omitir si no aplica
};
