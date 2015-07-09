var moloko = require('moloko');
var Client = require('../models/client');
var messageTypes = require('config').messageTypes;
var async = require('async');
var sockets = [];
// todo move to config
var port = 3010;
var _ = require('underscore');


var server = moloko.server({
    host: '192.168.40.21',
    port: port
});



/* HELPERS
=============================================*/

function getSocketByTid(tid) {
    return _.findWhere(sockets, {tid: tid});
}

function storeSocket(socket) {
    if (sockets.indexOf(socket)) {
        sockets.push(socket);
    }
}

function removeSocket(socket) {
    var index = sockets.indexOf(socket);
    index != -1 && sockets.splice(index, 1);
}



/* MESSAGES HANDLERS
==============================================*/

function messageBindReq(socket, message) {
    _authSocket(socket, message.data.token, function(err) {
        if (err) {
            server.send(socket, {
                type: messageTypes.BIND_CONF,
                code: 403
            });
            console.error('Socket auth error', err);
            return;
        }

        socket.tid = message.data.tid;

        _storeSocket(socket, message.data.tid);

        server.send(socket, {
                type: messageTypes.BIND_CONF,
                code: 0
        });
    });
}


/* Сформировать распоряжения на открытие новых ордеров и
    закрытие существующих в соответствии с полученной инф. в res ..  */
function messageOrderInd(client, message, callback) {

    var diff = null;

    function createOrder(values, done) {
        client.createOrder(values, done);
    }

    function closeOrder(order, done) {
        client.closeOrder(order.orderTime, done);
    }

    async.waterfall([
        function (next) {
            client.checkOnChange(message.data, next);
        },

        function(res, next) {
            diff = res;
            async.eachSeries(diff.newOrders, createOrder.bind(this), next);
        },

        function (next) {
            async.eachSeries(diff.closedOrders, closeOrder.bind(this), next);
        }

    ], callback);
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
            messageBindReq(socket, message);
            return;
        }
        

        if (!socket.tid) {
            console.log('socket is not autentificated');
            return;
        }

        async.waterfall([
            function(callback) {
                Client.getByTid(socket.tid, callback);
            },
            function(client, callback) {

                switch(message.type) {
                    case messageTypes.ORDERS_IND:
                        messageOrderInd(client, callback);
                        break;

                    case messageTypes.ORDER_OPEN_CONFIRM:
                        // message must have field data.orderTime

        //                 client.sendMessage({
        //     type: messageTypes.ORDER_OPEN_REQ,
        //     data: {
        //         type:   order.type,
        //         symbol: order.symbol,
        //         lots:   order.lots,
        //         comment: order._id
        //     }
        // });

                        if (message.code != 0) {
                            console.error('ORDER_OPEN_CONFIRM error ', message.code);
                            break;
                        };

                        client.confirmOrderCreation(message.data.ticket, callback);
                        break;


                    case messageTypes.ORDER_CLOSE_CONF:

        //                 self.sendMessage({
        //     type: messageTypes.ORDER_CLOSE_REQ,
        //     data: {ticket: order.ticket}
        // });

                        if (message.code != 0) {
                            console.error('ORDER_OPEN_CONFIRM error ', message.code);
                            break;
                        };
                        client.confirmOrderClosing(message.data.ticket, callback);
                        break;


                    default:
                        callback('Не найден обработчик сигнала или блядская ошибка типа ', message.code);

                }
            }

        ], function(err) {
            if (err) console.error(err);
        });
    });
}


var _authSocket = function(socket, token, callback) {

    // todo временно отключена
    return callback();


    Client.getByTid(socket.tid, function(err, client) {
        if (err) return console.error(err);
        client.token == token ? callback(null) : callback('403. Auth error, bad token.');
    });
};
