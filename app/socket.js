var moloko = require('moloko');
var Client = require('./models/client');
var messageTypes = require('config').messageTypes;
var async = require('async');
var config = require('config');
var _ = require('underscore');

var port = 5555;
var server = moloko.server({
    host: '127.0.0.1',
    port: port
});

var sockets = [];

// unresolved requests
var requests=[];

/* CLASSES */

function Registr() {
    this.requests = [];
}

Registr.prototype = {
    get: function() {

    },
    remove: function() {

    }
};

/* HELPERS
=============================================*/

function getSocketByTid(tid) {
    return _.findWhere(sockets, {tid: tid});
}

function storeSocket(socket) {
    if (sockets.indexOf(socket) === -1) {
        sockets.push(socket);
    }
}

function removeSocket(socket) {
    var index = sockets.indexOf(socket);
    index !== -1 && sockets.splice(index, 1);
}

function authSocket(socket, token, callback) {

    // временная заглушка
    return callback(null);


    if (!socket.tid) {
        console.error('[authSocket] error: socket.tid required');
        return callback(Error('socket.tid required'));
    }

    Client.getByTid(socket.tid, function(err, client) {
        if (err) {
            console.error('[authSocket] db find error: ', err);
            return callback(err);
        }

        client.token === token ? callback(null) : callback(Error('403. Auth error, bad token.'));
    });
}

function requestOpenOrder(data) {
    var socket = getSocketByTid(data.tid);
    
    if (!socket) {
        console.error('[SOCKET #requestOpenOrder] socket for subscriber is undefined');
        return;
    }

    server.send(socket, {
        type: config.messageTypes.ORDER_OPEN_REQ,
        reference: data.order.reference,
        data: {
            type: data.data.type,
            symbol: data.data.symbol,
            lots: data.data.lots,
            comment: data.data.comment
        }
    });
}

function requestCloseOrder(tid, data) {
    var socket = getSocketByTid(tid);

    if (!socket) {
        console.error('[SOCKET #requestCloseOrder] socket for subscriber is undefined');
        return;
    }

    server.send(socket, {
        type: config.messageTypes.ORDER_CLOSE_REQ,
        data: {
            ticket: data.data.ticket
        }
    });
}

/* MESSAGES HANDLERS
==============================================*/

function messageBindReq(socket, message) {

    authSocket(socket, message.data.token, function(err) {
        if (err) {
            server.send(socket, {
                type: messageTypes.BIND_CONF,
                code: 403
            });

            console.error('AUTH ERROR: terminal tid=%s auth error', message.data.tid, err);
            return;
        }

        socket.tid = message.data.tid;

        storeSocket(socket, message.data.tid);

        console.log('TERMINAL AUTH: terminal tid=%s successfully authorized', message.data.tid);

        server.send(socket, {
                type: messageTypes.BIND_CONF,
                code: 0
        });
    });
}


module.exports.start = function start() {
    server.on('listening', function() {
        console.log('Server is started listening on port', port);
    });

    server.on('connection', function() {
        console.log('New connection is accepted');
    });

    server.on('error', function(err) {
        console.log('Error occured during server socket creation: ', err);
    });

    server.on('close', function(socket) {
        console.log('Client is disconnected');
        removeSocket(socket);
    });


    server.on('message', function(socket, message) {

        if (message.type === messageTypes.BIND_REQ) {

            console.log('TERMINAL AUTH: terminal tid=%s try to auth', message.data.tid);

            messageBindReq(socket, message);
            return;
        }
        

        if (!socket.tid) {
            console.log('socket is not autentificated');
            return;
        }

        Client.getByTid(socket.tid, function(err, client) {

            if (err) {
                console.error('SOCKET ERROR: client is undefined');
                return;
            }

            switch(message.type) {

                case messageTypes.ORDERS_IND:

                if (client.type === 'provider') {
                    client.handleProviderTerminalMessage(message.data.open_orders, function(err, res) {
                        if (err) {
                            console.error('[SOCKET] handleProviderTerminalMessage error', err);
                            return;
                        }

                        if (res.length) {
                            
                            _.each(res, function(e) {
                                console.log('[SOCKET] new action "%s" from provider name=%s (id=%s)', e.action, client.name, client._id);
                                if (e.action === 'create') {
                                    requestOpenOrder(e);
                                }
                                else if (e.action === 'close') {
                                    requestCloseOrder(e.tid, e.data);
                                }
                                
                            });
                        }
                    });
                }
                
                break;

                case messageTypes.ORDER_OPEN_CONF:
                    client.confirmOrderCreation(message.reference);
                    console.log('ORDER_OPEN_CONF', message);
                break;

                case messageTypes.ORDER_CLOSE_CONF:
                    client.confirmOrderClosing(message.data.ticket);
                    console.log('ORDER_CLOSE_CONF', message);
                break;

                default:
                break;
            }
        });

        return;
    });
};


// exports for tests

module.exports.tests = {
    getSocketByTid: getSocketByTid,
    storeSocket: storeSocket,
    removeSocket: removeSocket,
    authSocket: authSocket,
    messageBindReq: messageBindReq,
    sockets: sockets
};



