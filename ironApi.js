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
var deasync = require('deasync');
var Client = require('node-rest-client').Client;


var IronWorkerApi = function (ironConfig) {
  this.version = packageJson.version;
  this.ironConfig = ironConfig;
  this._initialized = false;

  return this;
};

IronWorkerApi.prototype._init = function(){
  if (this._initialized) return;

  var self = this;
  var client = new Client();
  var prefix =this._getUrlPrefix();

//  console.log(prefix);
//  console.log(this.ironConfig);

  client.registerMethod("listCodes", prefix + "/projects/${projectId}/codes", "GET");

  // TODO add error handling in _syncClient interface
  this._asyncClient = client;
  this._syncClient = {
    methods:{
      listCodes : function(args){
        var done = false;
        var data_ = null;
        self._asyncClient.methods.listCodes(args, function(data, response){
            done = true;
            data_ = data;
        });
        deasync.loopWhile(function(){return !done;});
        return data_;
      }
    }
  }

  this._initialized = true;
}


IronWorkerApi.prototype.getCodes = function(){
  this._init();

  var page = 0;
  var result = [];
  var retrived = 1;
//?oauth=${token}&page=${page}&per_page=100
  while (retrived > 0) {
    var args = {
      path: { projectId: this.ironConfig.project_id, },
      parameters: {
          oauth : this.ironConfig.token,
          page : page,
          per_page : 100,
        },
    };
    var apiResult = this._syncClient.methods.listCodes(args);
    if (apiResult !== undefined) {
      var codes = apiResult.codes;
      if (codes !== undefined) {
        retrived = codes.length;
        result = result.concat(codes);
      }
      else {
        break;
      }
    }
    page++;
  }

  return result;
}

IronWorkerApi.prototype.buildUrl = function(resource, args){
  var prefix = this._getUrlPrefix();
  var url = prefix + resource;

  var parsePathParameters = function(url,pathArgs){
    var result = url;
    if (!pathArgs) return url;

    for (var placeholder in pathArgs){
      var regex = new RegExp("\\$\\{" + placeholder + "\\}","i");
      result = result.replace(regex, pathArgs[placeholder]);

    }
    return result;
  };
  var encodeQueryFromArgs = function(args){
    var result="?", counter = 1;
    // create enconded URL from args
    for (var key in args) {
      var keyValue = "";
      if ( args[key] instanceof Array )  {
        /*
         * We are dealing with an array in the query string  ?key=Value0&key=Value1
         * That a REST application translates into key=[Value0, Value1]
         */
        for ( var ii=0, sizeArray = args[key].length; ii < sizeArray; ii++ ) {
          result = result.concat((counter > 1 ? "&": "") + key + "=" + encodeURIComponent(args[key][ii]));
          counter++;
        }
      } else { //No array, just a single &key=value
         keyValue = key + "=" + encodeURIComponent(args[key]);
         result = result.concat((counter > 1 ? "&":"") + keyValue);
      }

      counter++;
    }

    return result;
  };

  if (args.parameters !== undefined){
    url += encodeQueryFromArgs(args.parameters);
  }
  if (args.path != undefined){
    url = parsePathParameters(url, args.path);
  }

  return url;
}

IronWorkerApi.prototype._getUrlPrefix = function(){
  var options  = this._getHttpOptions();
  var apiVersion = this._getApiVersion();

  return util.format('%s://%s:%s/%s',options.protocol, options.hostname, options.port, apiVersion)
}

IronWorkerApi.prototype._getHttpOptions = function(){
  var options = {
    protocol: 'https',
    hostname: 'worker-aws-us-east-1.iron.io',
    port: 443,
  };
  if (this.ironConfig.scheme !== undefined){
    options.protocol = this.ironConfig.scheme;
  }
  if (this.ironConfig.host !== undefined){
    options.hostname = this.ironConfig.host;
  }
  if (this.ironConfig.port !== undefined){
    options.port = this.ironConfig.port;
  }

  return options;
}

IronWorkerApi.prototype._getApiVersion = function(){
  var apiVersion = 2;

  if (this.ironConfig.api_version !== undefined){
    apiVersion = this.ironConfig.api_version;
  }

  return apiVersion;
}
module.exports = {
  Worker:function(config) { return new IronWorkerApi(config);}
};
