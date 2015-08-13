var moloko = require('moloko');
var messageTypes = require('config').messageTypes;
var async = require('async');
var config = require('config');
var _ = require('underscore');
var logger = require('./utils/logger');
var socketProxy = require('./socketProxy');
var dbMethods = require('./models/methods');
var Order = require('./models/order');
var server = moloko.server({
    host: config.get('moloko').host,
    port: config.get('moloko').port
});

socketProxy.setServer(server);
socketProxy.setSocketGetter(getSocketByTid.bind(this));

var sockets = [];

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
        logger.error('[authSocket] Argunets error. Property "socket.tid" required');
        return callback(Error('socket.tid required'));
    }

    dbMethods.getClientByTid(socket.tid, function(err, client) {
        if (err) {
            logger.error('[authSocket] client with tid=%d not found: ', socket.tid, err);
            return callback(err);
        }

        client.token === token ? callback(null) : callback(Error('403. Auth error, bad token.'));
    });
}

function requestOpenOrder(data) {
    var socket = getSocketByTid(data.tid);

    if (!socket) {
        logger.error('[#requestOpenOrder] socket not found. [tid=%s]', data.tid);
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

/* Запрос на закрытие ордера. */
function requestCloseOrder(tid, data) {
    logger.info('[requestCloseOrder] is started');
    var socket = getSocketByTid(tid);

    if (!socket) {
        logger.error('[#requestCloseOrder] socket not found. [tid=%s]', tid);
        return;
    }

    logger.debug('Send signal from terminal. [type=%d, ticket=%d]', config.messageTypes.ORDER_CLOSE_REQ, data.data.ticket);

    server.send(socket, {
        type: config.messageTypes.ORDER_CLOSE_REQ,
        data: {
            ticket: data.data.ticket
        }
    });

    logger.info('[requestCloseOrder] completed successfully');
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

        logger.info('TERMINAL AUTH: terminal "%d" successfully authorized.', message.data.tid);

        server.send(socket, {
            type: messageTypes.BIND_CONF,
            code: 0
        });
    });
}


module.exports.start = function start() {
    server.on('listening', function() {
        logger.info('Moloko socket start to listening on port', config.get('moloko').port);
    });

    server.on('connection', function() {
        logger.info('New connection is accepted');
    });

    server.on('error', function(err) {
        logger.error('on error server event', err);
    });

    server.on('close', function(socket) {
        logger.info('socket with tid=%s is disconected', socket.tid);
        removeSocket(socket);
    });


    /*
     message hash:
     type: {Integer} operation code
     data: {
     open_orders: {Array} see below ArrayObject
     }

     ArrayObject: {
     lots {Float} - lots amount
     open_price {Float}
     open_time {Integer} - time in unix format
     profit {}
     swap {}
     symbol {String}
     take_profit {Float} current profit
     ticket {Integer} unique order ticket number
     type {}
     }

     */
    server.on('message', function(socket, message) {

        if (message.type === messageTypes.BIND_REQ) {

            logger.info('TERMINAL AUTH: terminal tid=%s try to auth', message.data.tid);

            messageBindReq(socket, message);
            return;
        }

        if (!socket.tid) {
            console.log('socket is not autentificated');
            return;
        }

        dbMethods.getClientByTid(socket.tid, function(err, client) {

            if (err) {
                logger.error('SOCKET ERROR: client for terminal %s not found', socket.tid);
                return;
            }

            switch(message.type) {
                case messageTypes.ORDERS_IND:

                    if (!message.data.open_orders.length) {
                        return;
                    }

                    /* map message for history data */
                    var datas = message.data.open_orders.map(function(e) {
                        return {
                            lots: e.lots,
                            profit: e.profit,
                            swap: e.swap,
                            time: new Date().getTime(),
                            ticket: e.ticket
                        };
                    });

                    /* save history */
                    datas.forEach(function(e) {
                        Order.saveHistory(e.ticket, e);
                    });

                    /* check on new|old order for provider only */
                    if (client._title === 'provider') {
                        client.checkOnChanges(message.data.open_orders, function(_err, res) {
                            if (_err) {
                                logger.error(err);
                            }
                            else {
                                res.newOrders ? async.eachSeries(res.newOrders, client.openOrder.bind(client)) : 0;
                                res.closedOrders ? async.eachSeries(res.closedOrders, client.closeOrder.bind(client)) :  0;
                            }
                        });
                    }
                    break;

                case messageTypes.ORDER_OPEN_CONF:
                    logger.info('ORDER_OPEN_CONF for client [id=%s, name=%s] requested', client._id.toString(), client.name);
                    logger.debug(message);
                    client.confirmOrderCreation(message.reference, message.data.ticket);
                    break;

                case messageTypes.ORDER_CLOSE_CONF:
                    logger.info('ORDER_CLOSE_CONF for client [id=%s, name=%s] requested', client._id.toString(), client.name);
                    logger.debug(message);
                    client.confirmOrderClosing(message.data.ticket);
                    break;

                default:
                    break;
            }
        });
    });
};

module.exports.getServer = function() {
    return server;
};

module.exports.getSocketByTid = getSocketByTid;

module.exports.tests = {
    getSocketByTid: getSocketByTid,
    storeSocket: storeSocket,
    removeSocket: removeSocket,
    authSocket: authSocket,
    messageBindReq: messageBindReq,
    sockets: sockets
};



