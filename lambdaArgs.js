'use strict';

var packageJson = require('./package.json');
var program = require('commander');
var path = require('path');
var dotenv = require('dotenv');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn;
var utils = require('./utils');
var http = require('http');

var LambdaArgs = function () {
  this.version = packageJson.version;
  this.ironConfig = this._getIronConfig();
  this.execVars = this._getExecVars();
  this.dockerImageName = this._getDockerImageName();
  this.projectId = this._getProjectId();

  return this;
};

LambdaArgs.prototype._getExecVars = function () {
  var envFileName = path.resolve('.env')

  if (!utils.isFileExists(envFileName)) return '';

  var execConfig = dotenv.parse(fs.readFileSync(envFileName)); // passing in a buffer
  var args = [];
  for(var varName in execConfig) {
    args.push(util.format('-e %s=%s',varName.toString(), execConfig[varName]));
  }
  return args.join(' ');
};


LambdaArgs.prototype._getDockerImageName = function () {
  var deployEnvFileName = path.resolve('deploy.env');
  utils.ensureFileExists(deployEnvFileName);
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

LambdaArgs.prototype._getIronConfig = function(){
  var configFile = path.resolve('iron.json');
  if (fs.existsSync(configFile)) {
    return require(configFile);
  }
  return undefined;
}

LambdaArgs.prototype._getProjectId = function(){
  if (this.ironConfig !== undefined)
  {
    if (this.ironConfig.project_id !== undefined){
      return this.ironConfig.project_id;
    }
  }
  throw new Error('project_id not found');
}

LambdaArgs.prototype.getCodeId = function(){
  var code = this._getCode();
  if (code !== undefined){
    return code.id;
  }

  return undefined;
}

LambdaArgs.prototype.getCodeName = function(){
  var code = this._getCode();
  if (code !== undefined){
    return code.name;
  }

  return undefined;
}

LambdaArgs.prototype._getCode = function(){
  var imageName = this.dockerImageName;
  if (imageName == undefined)
    return undefined;

  var workerApi = new require('./ironApi').Worker(this.ironConfig);
  var codes = workerApi.getCodes();

  for (var index = 0, len = codes.length; index < len; ++index) {
    var code = codes[index];
//    console.log(code);
    if (code.image == imageName)
      return code;
  }

  return undefined;
}


module.exports = new LambdaArgs();
