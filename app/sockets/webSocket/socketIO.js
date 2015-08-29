import config from 'config';
import cookieParser from 'cookie-parser';
import passportSocketIo from 'passport.socketio';
import Emitter from './socketEmitter';


export default function(server, sessionStore) {
    let io = require('socket.io')(server);

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

    Emitter(io);
};
