#!/usr/bin/env node

'use strict';

var packageJson = require('./package.json');
var program = require('commander');
var path = require('path');
var dotenv = require('dotenv');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn;

var IronLambda = function () {
  this.version = packageJson.version;
  this.debugLog = false;
  return this;
};

IronLambda.prototype.setup = function(){
  this._copyTemplateToWorkingDirIfNotExists(".env");
  this._copyTemplateToWorkingDirIfNotExists("deploy.env");
  this._copyTemplateToWorkingDirIfNotExists("package.json.template", "package.json");
  this._copyTemplateToWorkingDirIfNotExists("Dockerfile");
  this._copyTemplateToWorkingDirIfNotExists("lambda.js");
  //this._setupLocalPackage('iron-lambda');
  this._ignore('.env');
  this._ignore('deploy.env');
  this._ignore('iron.json');
  this._ignore('.git');
  this._runChild('npm install')
}

IronLambda.prototype.exec = function(){
  this._preparePayload();
  this._runChild('node', ['node_modules/iron-lambda/node_modules/.bin/node-lambda', 'run']);
}

IronLambda.prototype.run = function(){
  this._preparePayload();
  var vars = this._getExecVars();
  //TODO find FROM clause in Dockerfile instead of hardcode iron/node
  this._runChild(util.format('docker run --rm %s -v %s:/worker -w /worker iron/node node node_modules/.bin/iron-lambda exec', vars, process.cwd()));
}

IronLambda.prototype.runInImage = function(){
  this._preparePayload();

  var self = this;
  var imageName = this._getDockerImageName();
  var vars = this._getExecVars();
  var dir = process.cwd();
  self._runChildAsync(util.format('docker build -t %s %s', imageName, dir), undefined,  function() {
    self._runChildAsync(util.format('docker run --rm %s %s', vars, imageName), undefined);
  });
}

IronLambda.prototype.deploy = function(){
  var self = this;
  var imageName = this._getDockerImageName();
  var dir = process.cwd();
  var vars = this._getExecVars();
  self._runChildAsync(util.format('docker build -t %s %s', imageName, dir), undefined,  function() {
    self._runChildAsync(util.format('docker push %s', imageName), undefined,  function() {
        self._runChildAsync(util.format('iron register %s %s', vars, imageName), undefined);
      });
  });
}

IronLambda.prototype._getDockerImageName = function () {
  var deployEnvFileName = path.resolve('deploy.env');
  this._ensureFileExists(deployEnvFileName);
  var deployConfig = dotenv.parse(fs.readFileSync(deployEnvFileName)); // passing in a buffer

  var repoName = deployConfig.DOCKER_REPO_NAME;
  var version = deployConfig.DOCKER_IMAGE_VERSION;
  if (version === undefined){
    var pkgConfigFile = path.resolve('package.json');
    if (fs.existsSync(pkgConfigFile)){
      var pcfg = require(pkgConfigFile);
      version = pcfg.version;
    }
  }
  if (version == undefined){
    version = 'latest';
  }

  return util.format('%s:%s',repoName, version);
};

IronLambda.prototype._getExecVars = function () {
  var envFileName = path.resolve('.env')

  if (!this._isFileExists(envFileName)) return '';

  var execConfig = dotenv.parse(fs.readFileSync(envFileName)); // passing in a buffer
  var args = [];
  for(var varName in execConfig) {
    args.push(util.format('-e %s=%s',varName.toString(), execConfig[varName]));
  }
  return args.join(' ');
};

IronLambda.prototype._copyTemplateToWorkingDirIfNotExists = function(filename, destFilename){
  if (destFilename === undefined)
    destFilename = filename;
  var dst = path.resolve(destFilename);
  var src = path.resolve(__dirname, 'templates', filename);
  if (!fs.existsSync(dst)) {
    this._ensureFileExists(src);
    fs.writeFileSync(dst, fs.readFileSync(src));
    console.log(dst + ' file successfully created');
  }
}

IronLambda.prototype._ignore = function(filename){
  var dockerIgnore = path.resolve('.dockerignore');
  var content = '';
  if (this._isFileExists(dockerIgnore)){
    content = fs.readFileSync(dockerIgnore, 'utf-8');
  }

  var items = content.split('\n');
  if (!items.some(function (x){return x==filename})){
    items.push(filename);
    content = items.join('\n');
    fs.writeFileSync(dockerIgnore, content, 'utf-8');
    console.log(filename + ' added to ' + dockerIgnore);
  }
}

IronLambda.prototype._setupLocalPackage = function(pkgname, exact){
  if (exact){
    this._runChild('npm', ['install','--save', '--save-exact', pkgname]);
  }
  else{
    this._runChild('npm', ['install','--save', pkgname]);
  }
}

IronLambda.prototype._preparePayload = function(){
  if(process.env.PAYLOAD_FILE !== undefined){
    // node-lambda requires payload path relative to process.cwd()
    var path = require('path');
    var p = process.env.PAYLOAD_FILE;
    var wd = process.cwd();
    p = path.resolve(p);
    process.env.EVENT_FILE = path.relative(wd, p);
  }
}

IronLambda.prototype._runChild = function(cmd, args){
  this._runChildAsync(cmd, args);
}

IronLambda.prototype._runChildAsync = function(cmd, args, callback){
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

IronLambda.prototype._debugLog = function (msg) {
  try {
      var envFileName = path.resolve('.env');
      var env = this._isFileExists(envFileName) ? dotenv.parse(envFileName) : {};
      var allowDebugLog = env.IRON_LAMBDA_DEBUG_LOG;
      if (allowDebugLog === undefined) allowDebugLog = this.debugLog;
      if (allowDebugLog == 'true' || allowDebugLog == 'True' || allowDebugLog == '1' || allowDebugLog == true || allowDebugLog == 1){
        console.log(msg);
      }
  } catch (e) {
  } finally {
  }
};

IronLambda.prototype._isFileExists = function (name) {
  try {
      return fs.statSync(name).isFile();
  } catch (e) {
      return false;
  } finally {
  }
};

IronLambda.prototype._ensureFileExists = function (name) {
  if (!this._isFileExists(name)) {
    this._debugLog(name + ' is required');
  }
};


var lambda = new IronLambda();

program
  .version(lambda.version)
  .command('setup')
  .description('')
  .action(function (prg) {
    lambda.setup();
  });

program
  .version(lambda.version)
  .command('run')
  .description('runs lambda inside default docker image')
  .action(function (prg) {
    lambda.run();
  });

program
  .version(lambda.version)
  .command('run-in-docker')
  .description('builds docker image and runs it locally')
  .action(function (prg) {
    lambda.runInImage();
  });

program
  .version(lambda.version)
  .command('exec')
  .description('runs lambda as raw node.js function')
  .action(function (prg) {
    lambda.exec();
  });

program
  .version(lambda.version)
  .command('deploy')
  .description('')
  .action(function (prg) {
    lambda.deploy();
  });

program.parse(process.argv);
