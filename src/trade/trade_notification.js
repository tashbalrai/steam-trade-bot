var
  util  = require('util'),
  async = require('async'),
  sendError = require('./message.js').Error,
  sendSuccess = require('./message.js').Success,
  config = require('./../../config/config.json'),
  Trade = require('./trade.js');

Trade.prototype.setupTradeNotifications = function () {
  this._tm.on('newOffer', this.newOffer.bind(this));
  this._tm.on('sentOfferChanged', this.sentOfferChanged.bind(this));
  this._tm.on('pollFailure', this.pollFailure.bind(this)); // can be used to notify user about steam down or makeing errors
  this._tm.on('pollSuccess', this.pollSuccess.bind(this));
  this._tm.on('pollData', this.pollData.bind(this));
};

Trade.prototype.newOffer = function (offer) {
  //New direct offer received.
};

Trade.prototype.sentOfferChanged = function (offer, oldState) {
  //No need to test here for glitched offer cases. steam-tradeoffer-manager is handling that.
  var stateName = this._bot.getStateName(offer.state);

  if (stateName !== false) {
    stateName = stateName.replace(/^([A-Z])/, (str, match, index) => { 
      return index === 0? match.toLowerCase(): match;
    });

    if (Trade.prototype[stateName] && typeof Trade.prototype[stateName] === 'function') {
      Trade.prototype[stateName].call(this, offer, oldState);
    } else {
      this.emit('debug', '[OfferState:' + stateName + '] -> No handler registered.');
    }
    
  } else {
    this.emit('debug', '[sentOfferChanged] -> No offer state found.')
  }  
  
};

Trade.prototype.pollFailure = function (err) {
  //Can be used to notify end user about steam troubles.
  this.emit('debug', '[PollFailed] -> ' + err.message);
};

Trade.prototype.pollSuccess = function () { };

Trade.prototype.pollData = function (data) {
  //new poll data is available.
};

Trade.prototype.invalid = function (offer, oldState) {
  //handler for invalid offer state.
};

Trade.prototype.accepted = function (offer, oldState) {
  this.getItems(offer, config.trade.manager.maxRetries, (err, items) => {
    if (err) {
      //This offer cannot be placed into the jackpot because new items are missing.
      this.emit('debug', '[' + offer.data('offerId') + offer.data('offerToken') + '] -> ' . err.message);
      //Inform user about this glitch.
      this.emit('message', sendError('ec1007', {
        offerId: offer.id, 
        steamId: offer.partner.getSteamID64()
      }));
      return;
    }
    
    //set new items
    offer.itemsToReceive = items;
    
    var j, rawData = offer.data('rawData');
    
    for(j=0; j<offer.itemsToReceive.length; j+=1) {
      offer.itemsToReceive[j].item_price = rawData.i[offer.itemsToReceive[j].market_hash_name];
    }
    
    offer.userProfile = {
      userName: rawData.p.un,
      steamId: rawData.p.sid,
      profileImage: rawData.p.img
    };
    
    //we have already associated item prices with our items; so we no longer require this data. free up the memory.
    delete this._tm.pollData.offerData[offer.id].rawData;

    //Send offer to jackpot.
    this._jackpot.enqueueOffer(offer);
  });
};

Trade.prototype.countered = function (offer, oldState) {
  offer.cancel(err => {
    if (err) {
      this.emit('debug', '[CounteredOffer] -> The cancellation of countered offer failed. [' + err.message + ']');
    }
    //TODO handle countered offer.
    this.emit('message', sendError('ec1006', {
        offerId: offer.id, 
        steamId: offer.partner.getSteamID64()
      }));
  });
};

Trade.prototype.getItems = function (offer, retries, cb) {
  if (typeof retries === 'function') {
    cb = retries;
    retries = 0;
  }
  
  if (retries <= 0) {
    return cb(new Error('[getItems ' + offer.data('offerId') + offer.data('offerToken') + '] -> Max retries reached for offer.'));
  }
  
  offer.getReceivedItems((err, items) => {
    
    if (err || items.length <= 0) {
      this.emit('debug', '[' + offer.data('offerId') + offer.data('offerToken') + '] -> Cannot receive items, let\'s make another try.');
      setTimeout(this.getItems.call(this, offer, retries - 1, cb), config.trade.manager.maxRetryDelay);
    } else {
      if (typeof cb === 'function') {
        cb(null, items);
      }      
    }
    
  });
};

Trade.prototype.declined = function (offer, oldState) { console.log('declined called.') };
Trade.prototype.canceled = function (offer, oldState) {};
Trade.prototype.invalidItems = function (offer, oldState) {};
Trade.prototype.canceledBySecondFactor = function (offer, oldState) {};
Trade.prototype.inEscrow = function (offer, oldState) {};
