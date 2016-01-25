'use strict';

var packageJson = require('./package.json');
var program = require('commander');
var path = require('path');
var dotenv = require('dotenv');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn;

var deasync = require('deasync');

var SnsAdapter = function () {
  this.version = packageJson.version;
  this.debugLog = false;
  this.args = require('./lambdaArgs');
  this.api = new require('./ironApi').Worker(this.args.ironConfig);
  return this;
};

SnsAdapter.prototype.subscribe = function(){
  var webhookArgs = {
    path:{
      projectId:this.args.projectId,
    },
    parameters:{
      oauth: this.args.ironConfig.token,
      code_name : this.args.getCodeName(),
    },
  };

  var webhookUrl = this.api.buildUrl('/projects/${projectId}/tasks/webhook', webhookArgs);

//demoarn
  var arn = 'demo-arn';
  var AWS = require('aws-sdk');
  var sns = new AWS.SNS();
  var params = {
    Protocol: 'https', /* required */
    TopicArn: arn, /* required */
    Endpoint: webhookUrl
  };
  var subscribe = sns.subscribe;
  subscribe(params, function(err, data){
    console.log(err);
      console.log(data);
  });

//   var AWS = require('aws-sdk');
// //    AWS.config.loadFromPath('./config.json');
//   AWS.config.update({region: 'us-west-2'});
//   var dynamodb = new AWS.DynamoDB();
//
//   var item = {
//     id : {S:new Date().toString()},
//     data: {S:JSON.stringify('event')},
//   }
//
//   console.log('writing item = ' + JSON.stringify(item));
//
//   dynamodb.putItem({TableName: 'test-lambda-storage', Item: item}, function(err, data){
//       if (err) {
//         context.fail(err); // an error occurred
//       } else {
//         context.done(data); // successful response
//       }
//   });

  // aws_sdk
  // http://sns.us-west-2.amazonaws.com/
  //  &Action=Subscribe
  //  &Endpoint=arn%3Aaws%3Asqs%3Aus-west-2%3A123456789012%3AMyQueue
  //  &Version=2010-03-31
  //  &Protocol=sqs
  //  &TopicArn=arn%3Aaws%3Asns%3Aus-west-2%3A123456789012%3AMyTopic


  //getting web_hook url

}

module.exports = new SnsAdapter();
