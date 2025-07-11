module.exports = (app, config, shortCache, longCache) => {
  require('./explosion')(app, config, shortCache, longCache);
  require('./gainers')(app, config, shortCache, longCache);
  require('./listings')(app, config, shortCache, longCache);
  require('./analysis')(app, config, shortCache, longCache);
  require('./health')(app, config, shortCache, longCache);
  require('./info')(app, config, shortCache, longCache);
  require('./cache')(app, config, shortCache, longCache);
  require('./search')(app, config, shortCache, longCache);
  require('./compare')(app, config, shortCache, longCache);
  require('./alerts')(app, config, shortCache, longCache);
};
