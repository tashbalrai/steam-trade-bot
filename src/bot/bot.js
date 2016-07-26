var
  EventEmitter    = require('events').EventEmitter,
  Steam           = require('steam'),
  SteamWebLogOn   = require('steam-weblogon'),
  GetSteamAPIKey  = require('steam-web-api-key'),
  SteamTotp       = require('steam-totp'),
  Util            = require('util'),
  Fs              = require('fs'),
  Crypto          = require('crypto'),
  Path            = require('path'),
  Config          = require('./../../config/config.json');

function Bot(accountName) {
  if (!accountName) {
    throw new Error("Bot account name is required.");
    return;
  }
  
  EventEmitter.call(this);
  this._client = new Steam.SteamClient();
  this._user = new Steam.SteamUser(this._client);
  this._web = new SteamWebLogOn(this._client, this._user);
  this._account = accountName.trim().toLowerCase();
  
  //restart the bot if disconnected from server or got logged off automatically.
  this._client.on('error', this.restartBot.bind(this));
  this._client.on('loggedOff', this.restartBot.bind(this));

}

Util.inherits(Bot, EventEmitter);
module.exports = Bot;

Bot.prototype.getClient = function () {
  return this._client;
};

Bot.prototype.getUser = function () {
  return this._user;
};

Bot.prototype.getWeb = function () {
  return this._web;
};

Bot.prototype.getBotDetails = function () {
  var profile = Path.resolve('../config/profiles/' + Config.bot[this._account].account_name + '.json');
  if (Fs.existsSync(profile)) {
    var _2fa = JSON.parse(Fs.readFileSync(profile, 'utf8'));
    this.shared_secret = _2fa.shared_secret;
    this.identity_secret = _2fa.identity_secret;
  } else {
    throw new Error('Bot profile file not found.');
    return;
  }
  
  var options = {
    account_name: Config.bot[this._account].account_name,
    password: Config.bot[this._account].password,
    two_factor_code: SteamTotp.generateAuthCode(_2fa.shared_secret)
  }
  
  return options;
};

Bot.prototype.logIn = function () {
  this.getClient().connect();
  this.getClient().on('connected', () => {
    this.getUser().logOn(this.getBotDetails());
  });
  
  this.getClient().on('logOnResponse', (logonResp) => {
    if (logonResp.eresult === Steam.EResult.OK) {
      //this._sc.emit('loggedOn', logonResp);
      this.emit('loggedIn', logonResp);
      this.getWeb().webLogOn((sessionID, newCookie) => {
        this._sessID = sessionID;
        this._wcookie = newCookie;
        GetSteamAPIKey({
          sessionID: sessionID,
          webCookie: newCookie
        }, (err, APIKey) => {
          this._APIKey = APIKey;
          this.setupTradeManager(sessionID, newCookie, APIKey);
        });
      });
    } else {
      this.emit('LoginFailed', logonResp);
    }
  });
};

Bot.prototype.restartBot = function (err) {
  if (!this._client.connected || !this._client.loggedOn) {
    this.getTradeManager().shutDownManager();
    this.emit('tradeManagerShutDown');
    setTimeout(this.logIn.bind(this), Config.bot[this._account].reconnect_interval * 1000);
  }
};

require('./trademanager.js');