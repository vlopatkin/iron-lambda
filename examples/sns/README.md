Amazon SNS can be used as a mediator to bypass events from other Amazon Web Services to iron-lambda ([Amazon Simple Storage Service (S3)](http://docs.aws.amazon.com/AmazonS3/latest/dev/ways-to-add-notification-config-to-bucket.html) for example)

To use Amazon SNS as event source to you lambda function you should the following steps:

1. Upload your lambda function with [`iron-lambda deploy`](../../README.md)
2. On existing SNS topic Create New Subsription with the parameters:
   * Protocol: HTTPS
   * Endpoint: The webhook url for the lambda function (the url is located in _Webhook URL_ field on _Code_ page of the worker created for your lambda function)
3. Request the confirmation of the new subscription. The confirmation is sent to your lambda function. You should be interested in _SubscribeURL_ in the payload. The payload can be viewed on on _Tasks_ page of the worker.
4. Confirm subscription by either following the _SubscribeURL_ or entring this URL on _Confirm subscription_ dialog in AWS Management Console.
5. From this point every message published to topic will be sent to the lambda function in `Message` property of `event` parameter. Optionally, you could parse the message to json (see [example](./lambda.js)).

**Note**: For security reason it's desured to validate the incoming message signature. More information can be obtained [here](http://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.verify.signature.html)
