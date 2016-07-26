const
  CSGO_APP_ID = 730;
var
  Bot = require('./bot/bot.js'),
  Storage = require('./storage/storage.js').Storage,
  Jackpot = require('./jackpot/jackpot.js'),
  Trade = require('./trade/trade.js'),
  SteamID = require('steam-tradeoffer-manager').SteamID;

Storage.init('redis');

var
  bot = new Bot('mainbot'),
  jackpot = new Jackpot(CSGO_APP_ID),
  redis = Storage.getHandler('redis'),
  trade = new Trade(CSGO_APP_ID);

  
redis.on('ready', () => {
  jackpot.setCacheHandler(redis);
  jackpot.init();
  bot.setCacheHandler(redis);
  bot.logIn();
});

bot.on('debug', data => {console.log(data)});

bot.on('loggedIn', response => {console.log('Logged in...')});
bot.on('tradeManagerReady', () => {
  console.log('Trade manager ready.');
  trade.on('message', (d) => console.log(d));
  trade.on('debug', (d) => console.log(d));
  trade.setBot(bot);
  trade.setJackpotHandler(jackpot);
  trade.setCacheHandler(redis);
});

bot.on('confirmationPollingStarted', () => {
  console.log('Confirmation polling started');
  // trade.createOfferFromJson({
    // p: {sid: '76561198063560612', un: 'Dummy User', img: 'userimage.png'},
    // i: {'FAMAS | Survivor Z (Factory New)':0.543,
    // 'Operation Breakout Weapon Case':1.024},
    // t: 'ZmihIjR6',
    // c: ''
  // });
  trade.getUserInventory(new SteamID('76561198063560612')).then(inventory => {
    console.log(inventory);
  }).catch(err => {
    console.error(err);
  });
});


// FAMAS | Survivor Z (Factory New)
// Operation Breakout Weapon Case
// Operation Breakout Weapon Case
// Operation Breakout Weapon Case
// Operation Breakout Weapon Case
// Operation Breakout Weapon Case
// UMP-45 | Grand Prix (Field-Tested)
// UMP-45 | Carbon Fiber (Factory New)
// StatTrak™ Negev | Man-o'-war (Minimal Wear)
// Tec-9 | Bamboo Forest (Minimal Wear)

