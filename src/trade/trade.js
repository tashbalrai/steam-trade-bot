var
  eventEmitter  = require('events').EventEmitter,
  path  = require('path'),
  crypto  = require('crypto'),
  util  = require('util'),
  async = require('async'),
  sendError = require('./message.js').Error,
  sendSuccess = require('./message.js').Success,
  config = require('./../../config/config.json'),
  debug  = require('debug')('trade:trade');

function Trade(appId) {
  if (!isFinite(appId)) {
    throw new Error('Steam game app ID is required for jackpot creation.');
    return;
  }
  
  this._appId = appId;
  eventEmitter.call(this);
}

util.inherits(Trade, eventEmitter);
module.exports = Trade;

Trade.prototype.setBot = function (bot) {
  this._tm = bot.getTradeManager();
  this._community = bot.getCommunityManager();
  this._bot = bot;
  bot.on('tradeManagerShutDown', this.shutdown.bind(this));
  bot.on('tradeManagerReady', this.ready.bind(this));
  this.setupTradeNotifications();
};

Trade.prototype.shutdown = function () {
  this.shutdown = true;
};

Trade.prototype.ready = function () {
  this.shutdown = false;
};

Trade.prototype.setCacheHandler = function (handle) {
  if(typeof handle !== 'object') {
    throw new Error('Object is expected for cache handler.');
    return;
  }
  
  this._cache = handle;
};

Trade.prototype.setJackpotHandler = function (handle) {
  if (typeof handle !== 'object') {
    throw new Error('A jackpot handler is required.');
    return;
  }
  this._jackpot = handle;
};

Trade.prototype.isPause = function () {
  if (this._jackpot.isPause()) {
    this.emit('debug', 'Jackpot paused.');
    return true;
  } else {
    return false;
  }
};

Trade.prototype.createOfferFromJson = function (d) {
  if (this.isPause() === true) {
    return;
  }

  if (this.shutdown()) {
    this.emit('debug', '[create-offer] -> Trade shutdown.');
    return;
  }
  
  if ( typeof d !== 'object' 
      || !d.hasOwnProperty('c')
      || !d.hasOwnProperty('t') 
      || !d.hasOwnProperty('p') ) {
        
    this.emit('debug', '[create-offer] -> Data invalid, cannot send error');
    return;
  }
  
  var offer = this._tm.createOffer(d.p.sid);
  
  //Promise to load and filter the user inventory
  var p = new Promise((resolve, reject) => {
    offer.loadPartnerInventory(this._appId, 2, (err, inventory, currency) => {
      if (err) {
        this.emit('debug', err.message);
        this.emit('message', sendError('ec1002', {steamId: d.p.sid}));
        return;
      }
      
      var i, idx, count, userItems = [];
      
      for(i in d.i) {
        userItems[userItems.length] = i;
      }
      //Add all user items to the new offer.
      for(i=0, count=0; i<inventory.length; i+=1) {
        //console.log(inventory[i].market_hash_name);
        idx = userItems.indexOf(inventory[i].market_hash_name);
        if (idx !== -1) {
          console.log(inventory[i].id, inventory[i].market_hash_name);
          offer.addTheirItem({
            assetid: inventory[i].id,
            appid: this._appId,
            contextid: 2,
            amount: 1
          });
          count+=1;
          userItems.splice(idx, 1);
        }          
      }
      
      //check if all user items were present in inventory.
      if(Object.keys(d.i).length !== count) {
        reject('ec1003');
      } else {
        offer.data('rawData', d);
        offer.data('offerToken', Math.random().toString(16).replace('0.', ''));
        offer.data('offerId', Date.now().toString(16) + '#' + d.p.sid);
        resolve(offer);
      }
    });
  })
  .then((offer) => {
    //Everything seems to be good. Let's proceed for offer sending.
    var message;
    message = 'Bot: ' + config.project.name;
    message += ', ID: ' + offer.data('offerId');
    message += ', Security Token: ' + offer.data('offerToken');

    this.emit('debug', '[' + offer.data('offerId') + ' - ' + offer.data('offerToken') + '] -> Sending.');
    offer.send(message, d.t, (err, status) => {
      if (err) {
        this.emit('debug', '[' + offer.data('offerId') + ' - ' + offer.data('offerToken') + '] -> ' + err.message);
        this.emit('message', sendError('ec1004', {steamId: d.p.sid}));
        return;
      }
      
      this.emit('debug', '[' + offer.data('offerId') + ' - ' + offer.data('offerToken') + '] -> Sent.');
      
      this.emit('message', sendSuccess('sc1000', {
        offerId: offer.id, 
        status: status, 
        offerToken: offer.data('offerToken'),
        steamId: offer.partner.getSteamID64()
      }));
    });
  })
  .catch((errcode) => {
    offer = null;
    this.emit('message', sendError(errcode, {steamId: d.p.sid}));
    this.emit('debug', 'Error code: ' + errcode);
  })
  .catch((err) => {
    this.emit('debug', err.stack);
  });
};

Trade.prototype.getUserInventory = function (steamId) {
  return new Promise((resolve, reject) => {
    this._tm.loadUserInventory(steamId, 730, 2, true, (err, inv, cur) => {
      if (err !== null) {
        reject(err);
        return;
      }
      
      var inventory = [], i;
      for(i=0;i<inv.length; i+=1) {
        inventory[i] = {};
        inventory[i].market_hash_name = inv[i].market_hash_name;
        inventory[i].id = inventory[i].asset_id = inv[i].id;
      }
      
      resolve(inventory);
    });
  });  
};

//Add additional features.
require('./trade_notification.js');
