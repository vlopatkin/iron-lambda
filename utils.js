'use strict';

var packageJson = require('./package.json');
var program = require('commander');
var path = require('path');
var dotenv = require('dotenv');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn;

var Utils = function () {
  this.debugLog = false;
  return this;
};

Utils.prototype._isDebugLogAllowed = function (msg) {
  if (this.isDebugLogAllowed == undefined){
    try {
        var envFileName = path.resolve('.env');
        var env = this._isFileExists(envFileName) ? dotenv.parse(envFileName) : {};
        var allowDebugLog = env.IRON_LAMBDA_DEBUG_LOG;
        if (allowDebugLog === undefined) allowDebugLog = this.debugLog;
        if (allowDebugLog == 'true' || allowDebugLog == 'True' || allowDebugLog == '1' || allowDebugLog == true || allowDebugLog == 1){
          allowDebugLog = true;
        } else {
          allowDebugLog = false;
        }
    } catch (e) {
    } finally {
    }
  }

  return this.allowDebugLog;
}

Utils.prototype.debugLog = function (msg) {
  if (this._isDebugLogAllowed()) {
    console.log(msg);
  }
};

Utils.prototype.isFileExists = function (name) {
  try {
      return fs.statSync(name).isFile();
  } catch (e) {
      return false;
  } finally {
  }
};

Utils.prototype.runChild = function(cmd, args){
  //yep, it's not sync...
  this.runChildAsync(cmd, args);
}

Utils.prototype.runChildAsync = function(cmd, args, callback){
  if ((typeof cmd == 'string') && (args === undefined)){
    var p = cmd.split(/\s+/);
    cmd = p[0];
    if (p.length > 1){
      args = p.slice(1);
    }
  }
  if (typeof args == 'string')
  {
    args = args.split(/\s+/);
  }

  var fullCmd = [cmd];
  Array.prototype.push.apply(fullCmd, args);

  var options = {
    cwd: process.cwd(),
    env: process.env
  };
  this._debugLog({'cmd':cmd, 'args': args, 'options': options});

  var proc = spawn(cmd, args , options);

  proc.stdout.on('data', function(data){
    process.stdout.write(data);
  });
  proc.stderr.on('data', function(data){
    process.stderr.write(data);
  });
  proc.on('exit', function (code) {
    if (code != 0){
      process.exit(code);
    }
    if (callback != null){
      callback(null, "ok");
    }
  });
  proc.on('error', function( err ){ throw err; });
}

Utils.prototype.ensureFileExists = function (name) {
  if (!this.isFileExists(name)) {
    this.debugLog(name + ' is required');
  }
};

module.exports = new Utils();
