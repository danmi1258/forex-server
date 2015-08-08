/* implementaion for web clients */
// var io = require('socket.io');

// io.on('connection', function (socketIO) {
//     console.log('!!!!!!!!!!, client is connected');
//     socketIO.emit('news', { hello: 'world' });
//     socketIO.on('my other event', function (data) {
//         console.log(data);
//     });
//     socketIO.on('disconnect', function () {
//         console.log('user disconnected');
//     });
// });
var express = require('express');
var config = require('config');
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser')

module.exports = function(server, sessionStore) {
    var io = require('socket.io')(server);

    io.set('authorization', passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: config.get('session').key,       // the name of the cookie where express/connect stores its session_id
        secret: config.get('session').secret,    // the session_secret to parse the cookie
        store: sessionStore,        // we NEED to use a sessionstore. no memorystore please
        success: onAuthorizeSuccess,  // *optional* callback on success - read more below
        fail: onAuthorizeFail,     // *optional* callback on fail/error - read more below
    }));
};

function onAuthorizeSuccess(a, b) {
    console.log(a, b);
}

function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  accept(null, false);

  // OR

  // If you use socket.io@1.X the callback looks different
  // If you don't want to accept the connection
  if(error)
    accept(new Error(message));
  // this error will be sent to the user as a special error-package
  // see: http://socket.io/docs/client-api/#socket > error-object
}