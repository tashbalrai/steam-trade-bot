var
  EventEmitter      = require('events').EventEmitter,
  Util              = require('util'),
  Fs                = require('fs'),
  Crypto            = require('crypto'),
  Path              = require('path'),
  Config            = require('./../../config/config.json'),
  Bot               = require('./bot.js'),
  TradeOfferManager = require('steam-tradeoffer-manager');

Bot.prototype.setupTradeManager = function (sessionId, Cookies, APIKey) {
  var options = Config.trade.manager;
  options.steam = this._client;
  
  this._manager = new TradeOfferManager(options);
  this._manager.setCookies(Cookies, err => {
    if (err != null) {
      this.emit('error', this.handleError.bind(this));
      return;
    }
    this.emit('tradeManagerReady');
    this.loadPollData();
    this._manager.on('pollData', this.savePollData.bind(this));
    this.setupConfirmations();
  });
};

Bot.prototype.getManagerResource = function (resource) {
  if (TradeOfferManager.hasOwnProperty(resource) && typeof TradeOfferManager[resource] === 'object') {
    return TradeOfferManager[resource];
  } else {
    return false;
  }
};

Bot.prototype.getStateName = function (state) {
  var stateName = TradeOfferManager.getStateName(state);
  if (typeof stateName === 'string') {
    return stateName;
  } else {
    return false;
  }
};

Bot.prototype.getTradeManager = function () {
  if (this._manager) {
    return this._manager;
  } else {
    return false;
  }
};

Bot.prototype.shutDownManager = function () {
  if (this.getCommunityManager()) {
    this.getCommunityManager().stopConfirmationChecker();
    this.getTradeManager().shutdown();
  } else {
    this.emit('debug', 'Unable to get trade manager.');
  }
};

Bot.prototype.getCommunityManager = function () {
  if (this.getTradeManager()) {
    return this.getTradeManager()._community;
  } else {
    this.emit('debug', 'Unable to get trade manager.');
    return false;
  }
};

Bot.prototype.setupConfirmations = function () {
  if(this.getCommunityManager()) {
    this.getCommunityManager()
        .startConfirmationChecker(Config.trade.manager.confirmationPollInterval, this.identity_secret);
    this.emit('confirmationPollingStarted');
  } else {
    this.emit('debug', 'Unable to get community manager to setup confirmation polling.');
  }
};

Bot.prototype.setCacheHandler = function (handle) {
  if(typeof handle !== 'object') {
    throw new Error('Object is expected for cache handler.');
    return;
  }
  
  this._cache = handle;
};

Bot.prototype.loadPollData = function () {
  if (typeof this._cache !== 'object') {
    this.emit('debug', '[loadPollData] -> no cache handler setup.');
    this.loadPollDataFile();
    return;
  }
  
  this._cache.get(Config.trade.manager.pollDataKey, (err, data) => {
    if (err) {
      this.emit('debug', '[loadPollData] -> ' + err.stack);
      return;
    }
    
    if (data) {
      this.getTradeManager().pollData = data;
    } 
  });
};

Bot.prototype.loadPollDataFile = function () {
  var dataFile = './../data/' + Config.trade.manager.pollDataKey, data;
  if (Fs.existsSync(dataFile)) {
    try {
      var data = JSON.parse(Fs.readFileSync(dataFile, 'utf8'));
      this.getTradeManager().pollData = data;
    } catch (e) {
      this.emit('debug', '[loadPollDataFile] -> ' + e);
    }
  }
};

Bot.prototype.savePollData = function (newData) {
  if (typeof this._cache !== 'object') {
    this.emit('debug', '[savePollData] -> no cache handler setup.');
    this.savePollDataFile(newData);
    return;
  }
  
  this._cache.save(Config.trade.manager.pollDataKey, newData, (err, status) => {
    if (err) {
      this.emit('debug', '[savePollData] -> ' + err.stack);
      return;
    }
  });
};

Bot.prototype.savePollDataFile = function (newData) {
  var dataFile = './../data/' + Config.trade.manager.pollDataKey;

  try {
    Fs.writeFileSync(dataFile, JSON.stringify(newData), 'utf8');
  } catch (e) {
    this.emit('debug', '[savePollDataFile] -> ' + e);
  }
};