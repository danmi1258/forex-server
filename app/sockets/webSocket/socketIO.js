var config = require('config');
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');


module.exports = function(server, sessionStore) {
    var io = require('socket.io')(server);

    io.set('authorization', passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: config.get('session').key,
        secret: config.get('session').secret,
        store: sessionStore,
        success: onAuthorizeSuccess,
        fail: onAuthorizeFail,
    }));

    function onAuthorizeSuccess(data, accept){
        console.log('successful connection to socket.io');
        accept(null, true);
    }

    function onAuthorizeFail(data, message, error, accept){
        if(error)
        throw new Error(message);
        console.log('failed connection to socket.io:', message);

        // We use this callback to log all of our failed connections.
        accept(null, false);
    }

    require('./socketEmitter')(io);
};
