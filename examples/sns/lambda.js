exports.handler = function(event, context) {
//structure of SNS event see here: http://docs.aws.amazon.com/sns/latest/dg/json-formats.html#http-notification-json
    console.log("event.Type", event.Type);

    if (event.Type == 'Notification') {
      var message = JSON.parse(event.Message);

      console.log( "message",  message);

      context.done();
    }
    else if (event.Type == 'SubscriptionConfirmation'){
      console.log( "confimation URL",  event.SubscribeURL);

      context.done();
    }
    else if (event.Type == 'UnsubscribeConfirmation'){

      context.done();
    }
    else {
      console.log("unknown event.Type", event.Type);

      context.fail();
    }
};
