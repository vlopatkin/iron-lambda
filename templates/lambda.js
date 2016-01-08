exports.handler = function(event, context) {
    console.log( "event", event );
    console.log( "env", process.env );
    context.done();
};
