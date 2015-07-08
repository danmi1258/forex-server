var moloko = require('moloko');
var Client = require('../models/client');
var messageTypes = require('config').messageTypes;
var async = require('async');
var port = 3010

var server = moloko.server({
    host: '192.168.40.21',
    port: port
});

module.exports.server = server;

function start() {
    server.on('listening', function() {
        console.log('Server is started listening on port', port);
    });

    server.on('connection', function(socket) {
        console.log('New connection is accepted');
        console.log('socket', socket);
        //socket.interval = setInterval(function() {
        //	var data = { message: 'Test Message: ' + Date.now() }
        //	console.log('Send message to client:', data);
        //	server.send(socket, data);
        //}, 2000);

    });

    server.on('error', function(err) {
        console.log('Error occured during server socket creation: ', err);
    });


    server.on('close', function(socket) {
        console.log('Client is disconnected');
        delete sockets[socket.tid];
        //clearInterval(socket.interval);
    });


    server.on('message', function(socket, message) {

        if (message.type == messageTypes.BIND_REQ) {
            _authSocket(socket, message.data.token, function(err) {
                if (err) {
                    server.send(socket, {
                        type: messageTypes.BIND_CONF,
                        code: 403
                    });
                    console.error('Socket auth error');
                    return;
                }

                server.send(socket, {
                        type: messageTypes.BIND_CONF,
                        code: 0
                });

                socket.tid = message.data.tid;
                _storeSocket(socket);
            })
        }

        
        /* Обработка сообщений от авторизованных клиентов
        В потоке определим клиента, сделавшего запрос, далее установим свитчи
        на типы сообщений.
        В зависимости от типа будем соответствующе реагировать.
        */
        async.waterfall([
            function(callback) {
                _getClientByTid(socket.tid, callback);
            },
            function(client, callback) {

                switch(message.type) {

                    case messageTypes.ORDERS_IND:
                        openOrdersMessageHandler(client, callback);

                        break;

                    case messageTypes.ORDER_OPEN_CONFIRM:
                        // message must have field data.orderTime
                        if (message.code != 0) {
                            console.error('ORDER_OPEN_CONFIRM error ', message.code);
                            break;
                        };

                        client.confirmOrderCreation(message.data.ticket, callback);
                        break;


                    case messageTypes.ORDER_CLOSE_CONF:
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



var sockets = {};

var _newOrderHandler = function(order, callback) {

};

var _getClientByTid = function(tid, callback) {

    Client.findOne({tid: tid}, function(err, client) {
        if (err) console.error(err);
        callback(null, client);
    });
};


var _authSocket = function(socket, token, callback) {

    Client.getByTid(socket.tid, function(err, client) {
        if (err) return console.error(err);
        client.token == token ? callback(null) : callback('403. Auth error, bad token.');
    })
};

var _storeSocket = function(socket, tid) {
    Client.find({tid: tid}, function(err, client) {
        if (err) console.error(err);
        socket.terminalId = client._id;
    });

    sockets[tid] = socket;

    // test tid provider 313976131
};



module.exports.getSocket = function(tid) {
    return sockets.tid;
};

function openOrdersMessageHandler(client, callback) {
    
    client.checkOnChange(message.data, function(err, res) {
        if (err) callback(err);

        /* Сформировать распоряжения на открытие новых ордеров и
        закрытие существующих в соответствии с полученной инф. в res ..  */
        async.waterfall([

            function(next) {
                if (!res.newOrders.length) return callback(null);
                
                var handler = function(order, callback) {
                    // todo сформировать здесь values (ордер) для терминала. Учесть изменение объема сделки.
                    client.createOrder(values, callback);
                };

                async.eachSeries(res.newOrders, handler, next);
            },

            function (next) {
                if (!res.closedOrders.length) return next(null);

                var handler = function(order, callback) {
                    client.closeOrder(order.orderTime, callback);
                };

                async.eachSeries(res.closedOrders, handler, next);
            }

        ], callback)
    });
};

module.exports = {
    start: start,
    _authSocket: _authSocket
};