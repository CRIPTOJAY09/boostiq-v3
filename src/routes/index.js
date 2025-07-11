const setupTopGainers = require('./topGainers');
const setupNewListings = require('./newListings');
const setupAnalysis = require('./analysis');
const setupExplosions = require('./explosionCandidates');

module.exports = (app, CONFIG, shortCache, longCache) => {
  setupTopGainers(app, CONFIG, shortCache, longCache);
  setupNewListings(app, CONFIG, shortCache, longCache);
  setupAnalysis(app, CONFIG, shortCache, longCache);
  setupExplosions(app, CONFIG, shortCache, longCache);
};
