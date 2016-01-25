#!/usr/bin/env node

'use strict';

var packageJson = require('./package.json');
var program = require('commander');
var path = require('path');
var dotenv = require('dotenv');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn;
var utils = require('./utils');

var IronLambda = function () {
  this.version = packageJson.version;
  this.args = require('./lambdaArgs');
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
  utils.runChild('npm install')
}

IronLambda.prototype.exec = function(){
  this._preparePayload();
  var commands = [
    'node_modules/iron-lambda/node_modules/.bin/node-lambda',
    'node_modules/iron-lambda/node_modules/node-lambda/bin/node-lambda',
    'node_modules/.bin/node-lambda',
    'node_modules/node-lambda/bin/node-lambda',
  ];

  for (var i = 0; i < commands.length; i++) {
    var cmd = commands[i];
    if (utils.isFileExists(cmd)){
      utils.runChild('node', [cmd, 'run']);
      return;
    }
  }

  throw new Error('node-lambda binary not found');
}

IronLambda.prototype.run = function(){
  this._preparePayload();
  var vars = this.args.execVars;
  //TODO find FROM clause in Dockerfile instead of hardcode iron/node
  utils.runChild(util.format('docker run --rm %s -v %s:/worker -w /worker iron/node node node_modules/.bin/iron-lambda exec', vars, process.cwd()));
}

IronLambda.prototype.runInImage = function(){
  this._preparePayload();

  var self = this;
  var imageName = this.args.dockerImageName;
  var vars = this.args.execVars;
  var dir = process.cwd();
  utils.runChildAsync(util.format('docker build -t %s %s', imageName, dir), undefined,  function() {
    utils.runChildAsync(util.format('docker run --rm %s %s', vars, imageName), undefined);
  });
}

IronLambda.prototype.deploy = function(){
  var self = this;
  var imageName = this.args.dockerImageName;
  var dir = process.cwd();
  var vars = this.args.execVars;
  utils.runChildAsync(util.format('docker build -t %s %s', imageName, dir), undefined,  function() {
    utils.runChildAsync(util.format('docker push %s', imageName), undefined,  function() {
      utils.runChildAsync(util.format('iron register %s %s', vars, imageName), undefined);
    });
  });
}

IronLambda.prototype.subscribeToSns = function(){
  var adapter = require('SnsAdapter');
  this.deploy(); //is it good to have subscribe command with deploy implied?

  adapter.subscribe();
}

IronLambda.prototype._copyTemplateToWorkingDirIfNotExists = function(filename, destFilename){
  if (destFilename === undefined)
    destFilename = filename;
  var dst = path.resolve(destFilename);
  var src = path.resolve(__dirname, 'templates', filename);
  if (!fs.existsSync(dst)) {
    utils.ensureFileExists(src);
    fs.writeFileSync(dst, fs.readFileSync(src));
    console.log(dst + ' file successfully created');
  }
}

IronLambda.prototype._ignore = function(filename){
  var dockerIgnore = path.resolve('.dockerignore');
  var content = '';
  if (utils.isFileExists(dockerIgnore)){
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
    utils.runChild('npm', ['install','--save', '--save-exact', pkgname]);
  }
  else{
    utils.runChild('npm', ['install','--save', pkgname]);
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

var lambda = new IronLambda();

program
  .version(lambda.version);

program
  .command('setup')
  .description('')
  .action(function (prg) {
    lambda.setup();
  });

program
  .command('run')
  .description('runs lambda inside default docker image')
  .action(function (prg) {
    lambda.run();
  });

program
  .command('run-in-docker')
  .description('builds docker image and runs it locally')
  .action(function (prg) {
    lambda.runInImage();
  });

program
  .command('exec')
  .description('runs lambda as raw node.js function')
  .action(function (prg) {
    lambda.exec();
  });

program
  .command('deploy')
  .description('')
  .action(function (prg) {
    lambda.deploy();
  });

program.parse(process.argv);

var sns = require('./snsSubscribtion');
sns.subscribe();
//var codeId = require('./lambdaArgs').getCodeId();
//console.log('codeId', codeId);
