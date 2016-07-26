var
  Redis = require('redis'),
  EventEmitter = require('events'),
  Config  = require('./../../config/config.json'),
  Util  = require('util'),
  debug   = require('debug')('storage:redis');

function StorageRedis() {
  this._handler = Redis.createClient(Config.storage.redis);
  this.prefix = Config.storage.redis.prefix;
  EventEmitter.call(this);
  
  this._handler.on('error', err => {
    debug(err.message);
    this.emit('error', err);
  });
  
  this._handler.on('ready', () => {
    debug('Redis storage client is now ready.');
    this.emit('ready');
  });
  
  return this;
}

Util.inherits(StorageRedis, EventEmitter);

module.exports = StorageRedis;

StorageRedis.prototype.save = function (key, val, cb) {
  if(!key) throw new Error('Key is require for saving.');
  
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  
  this._handler.set(key, val, (err, result) => {
    if (err) {
      (typeof cb === 'function') && cb(err, null);
      return;
    }
    (typeof cb === 'function') && cb(null, result);
  });
};

StorageRedis.prototype.get = function (key, cb) {
  if(!key) throw new Error('Key is require for getting value.');

  this._handler.get(key, (err, val) => {
    if (err) {
      (typeof cb === 'function') && cb(err, null);
      return;
    }

    try {
      val = JSON.parse(val);
    } catch (e) {
      this._handler.emit('debug', 'StorageRedis::get value string is not json string.');
    }
    
    (typeof cb === 'function') && cb(null, val);
  });
};

StorageRedis.prototype.push = function (list, key, cb) {
  if (!list) {
    if (typeof cb === 'function') {
      cb(new Error('List is not set.'), null);
    }
  }
  
  if (!key) {
    if (typeof cb === 'function') {
      cb(new Error('Key is not set.'), null);
    }
  }
  
  this._handler.rpush(list, key, cb);
};

StorageRedis.prototype.pop = function (list, cb) {
  if (!list) {
    if (typeof cb === 'function') {
      cb(new Error('List is not set.'), null);
    }
  }
    
  this._handler.lpop(list, cb);
};