var
  Fs  = require('fs'),
  Path  = require('path');
  
exports.Storage = {
  instance: {},
  init: function (driver) {
    driver = driver.trim().toLowerCase();
    
    if (this.instance[driver]) {
      return this.instance[driver];
    }
    
    var driverPath = Path.resolve(__dirname + '/storage_' + driver + '.js');
    if (Fs.existsSync(driverPath)) {
      var Driver  = require(driverPath);
      this.instance[driver] = new Driver();
      return this.instance[driver];
    } else {
      throw new Error("Storage driver \"" + driver + "\" was not found.");
    }
  },
  getHandler: function (driver) {
    driver = driver.trim().toLowerCase();
    
    if (this.instance[driver]) {
      return this.instance[driver];
    } else {
      this.init(driver);
    }
  }
}
