var moloko = require('moloko');
var Client = require('./models/client');
var messageTypes = require('config').messageTypes;
var async = require('async');
var sockets = [];
// todo move to config
var port = 5555;
var _ = require('underscore');


var server = moloko.server({
    host: '127.0.0.1',
    port: port
});



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
        callback(Error('socket.tid required'));
        return;
    }

    Client.getByTid(socket.tid, function(err, client) {
        if (err) {
            console.error('[authSocket] db find error: ', err);
            callback(err);
            return;
        }

        client.token === token ? callback(null) : callback(Error('403. Auth error, bad token.'));
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
            console.error('Socket auth error', err);
            return;
        }

        socket.tid = message.data.tid;

        storeSocket(socket, message.data.tid);

        server.send(socket, {
                type: messageTypes.BIND_CONF,
                code: 0
        });
    });
}


/* Сформировать распоряжения на открытие новых ордеров и
    закрытие существующих в соответствии с полученной инф. в res ..  */

function handlerMessageForProvider(client, message, callback) {

    var changedOrderInfo, subscribers;

    function createOrderDecorator(_clients, options, values, done) {
        if (_.isObject(_clients)) {
            _clients = [_clients];
        };

        function createOrder(client, next) {
            if (client.type === 'provider') {
                // создать ордер с confirm = true
            }

            if (client.type === 'consumer') {
                // создать ордер с confirm == false
                // после послать сигнал на терминал.

            }
        }

        async.eachSeries(_clients, createOrder, done);
    }


    function closeOrderDecorator(_clients, options, values, done) {

        // !!!!!!! refactor as createOrderDecorator
        _client.createOrder(values, options, done);
    }



    async.series([
        // получить различия
        function (next) {
            client.checkOnChange(message.data, function(err, res) {
                if (err) {
                    return next(err);
                }

                if (!res.newOrders.length && !res.closedOrders.length) {
                    // breack series with OK
                    return next('ok');
                }

                changedOrderInfo = res;
            });
        },

        // Создать открытые ордера для провайдера
        function (next) {
            if (!res.newOrders.length) {
                return next();
            }

            var options = {confirm: true};
            async.eachSeries(changedOrderInfo.newOrders, createOrderDecorator.bind(this, client, options), next);
        },

        // создать закрытые ордера для провайдера
        function (next) {
            if (!res.closedOrders.length) {
                return next();
            }

            var options = {confirm: true};
            async.eachSeries(changedOrderInfo.closedOrders, createOrderDecorator.bind(this, client, options), next);

        },
        // получить всех подписчиков
        function (next) {
            Client.getSubscribers(function (err, res) {
                if (err) {
                    return next(err);
                }

                subscribers = res;
                if (!subscribers.length) {
                    return next('ok');
                }

                next();
            });
        },
        
        // обработать открытые ордера для подписчиков
        function (next) {
            async.eachSeries(subscribers, createOrderDecorator.bind(this, ), next);
        },

        // обработать закрытые ордера для подписчиков
        function (next) {

        }
    ], function(err) {
        if (!err || err === 'ok') {
            return callback();
        }

        return callback(err);
    });
}

function handlerMessageForConsumer() {

}


function messageOrderInd(client, message, callback) {

    var diff = null;

    function createOrder(values, done) {
        client.createOrder(values, done);
    }

    function closeOrder(order, done) {
        client.closeOrder(order.orderTime, done);
    }

    if (client.type === 'provider') {

    }

    if (client.type === 'consumer') {

    }



    async.waterfall([
        function (next) {
            client.checkOnChange(message.data, next);
        },

        function(res, next) {
            diff = res;
            console.log('>>', diff);
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

        console.log(123123, message.type);

        if (message.type === messageTypes.BIND_REQ) {
            messageBindReq(socket, message);
            return;
        }
        

        if (!socket.tid) {
            console.log('socket is not autentificated');
            return;
        }

        switch(message.type) {

            case messageTypes.ORDERS_IND:
            console.log('new message received', message);
            break;

            case messageTypes.ORDER_OPEN_REQ:
            break;

            case messageTypes.ORDER_CLOSE_REQ:
            break;

            default:
            break;
        }

        return;

        // async.waterfall([
        //     function(callback) {
        //         Client.getByTid(socket.tid, callback);
        //     },
        //     function(client, callback) {

        //         switch(message.type) {
        //             case messageTypes.ORDERS_IND:
        //                 messageOrderInd(client, callback);
        //                 break;

        //             case messageTypes.ORDER_OPEN_CONFIRM:
        //                 // message must have field data.orderTime

        // //                 client.sendMessage({
        // //     type: messageTypes.ORDER_OPEN_REQ,
        // //     data: {
        // //         type:   order.type,
        // //         symbol: order.symbol,
        // //         lots:   order.lots,
        // //         comment: order._id
        // //     }
        // // });

        //                 if (message.code != 0) {
        //                     console.error('ORDER_OPEN_CONFIRM error ', message.code);
        //                     break;
        //                 };

        //                 client.confirmOrderCreation(message.data.ticket, callback);
        //                 break;


        //             case messageTypes.ORDER_CLOSE_CONF:

        // //                 self.sendMessage({
        // //     type: messageTypes.ORDER_CLOSE_REQ,
        // //     data: {ticket: order.ticket}
        // // });

        //                 if (message.code != 0) {
        //                     console.error('ORDER_OPEN_CONFIRM error ', message.code);
        //                     break;
        //                 };
        //                 client.confirmOrderClosing(message.data.ticket, callback);
        //                 break;


        //             default:
        //                 callback('Не найден обработчик сигнала или блядская ошибка типа ', message.code);

        //         }
        //     }

        // ], function(err) {
        //     if (err) console.error(err);
        // });
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



