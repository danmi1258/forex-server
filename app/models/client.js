var mongoose = require('mongoose');
var BaseSchema = require('./base');
var config = require('config');
var orderStates = config.orderStates;
var _ = require('underscore');
var Order = require('./order');
var async = require('async');


// !! not var. set is as global;
extend = require('mongoose-schema-extend');


/**
    @class Client
    @extends Default

    @property name {String}
 */
var Client = BaseSchema.extend({
    name: {
        type: String,
        required: true,
        unique: true
    },
    /* ids of a terminal-providers */
    subscriptions: Array,
    /* ids of an open orders in terminal.
        [{orderId, orderTid}, ... ],
        где:
            orderId - ссылка на ордер в БД
            orderTid - назначенный id для терминала.
        */
    openOrders: Array,
    /* the terminal access code */
    token: String,
    /* terminal id */
    tid: {
        type: Number,
        required: true,
        unique: true
    },
    /* terminal type in HEX: provider(0x01010) / consumer (0x1020) */
    type: {
        type: String,
        required: true
    }
});


/**
    Создать терминал
    ================
    Создает новый терминал.
    
    @example
        
        var values = {
            name: 'test terminal',
            type: 'provider',
            tid: '12345'
        }

        Client.crete(values, function(err, client) {
            // client will be an object instance of Client
        })

    @method create
    @static
    @async
    @param data {Object} see: class property
    @param callback {Function}
        @param {Error} callback.err
        @param {Object} callback.client
*/
Client.statics.create = function(data, callback) {

    var Terminal = this;

    if (!data.name || !data.tid || !data.type) {
        callback(new Error('argument data error'));
        return;
    }

    if (config.allowedTerminalTypes.indexOf(data.type) === -1) {
        callback(new Error('not allowed terminal type'));
        return;
    }

    new Terminal(data).save(function(err, res) {
        callback(err, res);
    });
};


Client.statics.getByTid = function(tid, callback) {
    this.findOne({tid: tid}, function(err, res) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, res);
    });
};



Client.methods.alreadySubscribed = function(provider) {
    return this.subscriptions.indexOf(provider._id) !== -1;
};


/**
    @method subscribe
    @description Пописаться
    =======================

    Метод подписывает один терминал на другой. Подписаться можно только на терминал с типом провайдер.
    
    @param provider {object} объект терминала провайдера.
    @return {object} - instance of Order
**/
Client.methods.subscribe = function(provider, callback) {
    var _err;

    if (provider.type != 'provider') {
        _err = new Error('[Client #subscribe] error: it is forbidden subscribe on the client with no provider type');
        callback(_err);
        return;
    }
    if (this.alreadySubscribed(provider)) {
        _err = new Error('[Client #subscribe] error: subscriptions already exist');
        callback(_err);
        return;
    }

    this.subscriptions.push(provider._id);
    this.save(function(err, client) {
        callback(err, client);
    });
};


/**
    @async
    @method unsubscribe
    @description Одписаться
    =======================

    Метод отписывает терминал потребитель от терминала провайдера.
    
    @param provider {object} объект терминала провайдера
    @param callback {function}
    @return {object} - instance of Client
**/
Client.methods.unsubscribe = function(provider, callback) {
    if (!this.alreadySubscribed(provider)) return callback(401);

    this.subscriptions.splice(this.subscriptions.indexOf(provider._id));
    this.save(callback);
};

/**
    @async
    @method changeToken
    @description Изменить токен
    ===========================
    Метод изменяет токен для текущего клиента. Токен может быть назначен только из таблицы существующих 
    токенов.
    Токен должен быть:
    
    * существующим
    * активным
    * свободным (не использованным)
    
    @param token {object}
    @param callback {function (err, token ) }
**/
Client.methods.changeToken = function(token, callback) {
    if (!!token.closed) return callback(401);

    this.token = token._id;
    this.save(callback);
};




/*  Получить все подписки.
    ---------------------
    Позволяет быстро получить все терминалы провайдеры (в виде АПИ объектов) на которые подписан текущий терминал.
    */
Client.methods.getSubscribtions = function(callback) {
    this.model('client').find({_id: {$in: this.subscriptions}}, callback);
};


/*  Получить всех подписчиков.
    ---------------------
    Позволяет быстро получить все терминалы консюмеры (в виде АПИ объектов) которые подписаны на данный терминал.
    */
Client.methods.getSubscribers = function(callback) {
    this.model('client').find({subscriptions: this._id}, callback);
};


/* юзер */
Client.methods.changeVolume = function() {};

/* юзер */
Client.methods.setPause = function() {};



/* МЕТОДЫ УПРАВЛЕНИЯ ОРДЕРАМИ
##################################
*/





/** @async
    @method createOrder
    @description Создать запись о новом ордере
    ==========================================
    
    Методы создает новую запись в таблице orders, привязывая его к текущему клиенту.

    Используйте этот метод, когда хотите инициировать создание нового ордера со стороны сервера.

    @param values {object} - данные для создания нового ордера
        @property type {Integer}
        @required
        @property symbol {String}
        @required
        @property lots {Double}
        @required
        @property comment {String}
        @required
        @property ticket {Integer}
    @param _options {Object}
        @ property confirm {Boolean} - if true then order will be confirmed imediatly
    @param callback {function}
    @return {err, object} err, order
**/
Client.methods.createOrder = function(_values, _options, callback) {
    
    if (arguments.length === 2) {
        callback = arguments[1];
        _options = null;
    }

    var values = _.clone(_values);
    
    var requiredParams = {
        type: 'number',
        symbol: 'string',
        lots: 'number',
        comment: 'string'
    };

    var keys = Object.keys(requiredParams);
    var self = this;

    // validate for required properties
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (values[key] === undefined || typeof values[key] !== requiredParams[key]) {
            callback(new Error('bad param @values'));
            return;
        }
    }

    // validate for the options complience
    if (_options && _options.confirm && !values.ticket) {
        console.log('warning! try to set order as confirmed but order.ticket does not specified... ');
    }

    values.state = orderStates.CREATING;
    values.client = this._id;
    
    async.waterfall([
        function (next) {
            new Order(values).save(next);
        },
        function(order, num, next) {
            if (_options && _options.confirm) {
                self.confirmOrderCreation(order, next);
                return;
            }
            next(null, order);
        }
    ], callback);
    
};


/*  Подтвердить создание нового ордера
    ==================================
    @descrpition
    Метод подтверждает открытие ордера в терминале.
    * Используйте этот метод, когда надо подтвердить факт, действительно ли ордер был открыт в терминале.
    
    @prop orderTicket {Date} - время создания ордера в терминалом. Аналог ID
    @return {object} - Order
*/
Client.methods.confirmOrderCreation = function(orderTicket, callback) {
    
    var self = this;

    async.waterfall([
        // get order
        function (next) {
            if (orderTicket._id) {
                next(null, orderTicket);
                return;
            }

            Order.getByTicket(orderTicket, next);
        },
        // modify order status & openTime
        function (order, next) {
            order.state = orderStates.CREATED;
            order.openedOn = new Date().getTime();
            order.save(next);
        },
        // add orderId to client @openOrders
        function (order, num, next) {
            self.openOrders.push(order._id);
            self.save(function(err) {
                next(err, order);
            });
        }
    ], callback);
};

/**
    @method closeOrder
    @param orderTicket {Integer}
    @param _options {Object}
        @property confirm {Boolean} - if true then order closing will be confirmed imediatly
    @param callback {Function} arg: err, order
*/
Client.methods.closeOrder = function(orderTicket, _options, callback) {

    if (arguments.length === 2) {
        callback = arguments[1];
        _options = null;
    }

    var self = this;

    async.waterfall([
        function(next) {
            if (orderTicket._id) {
                next(null, orderTicket);
                return;
            }

            Order.getByTicket(orderTicket, next);
        },
        function(order, next) {
            order.state = orderStates.CLOSING;
            order.save(next);
        },
        function(order, num, next) {
            if (_options.confirm) {
                self.confirmOrderClosing(order, next);
            } else {
                next(null, order);
            }
        }
    ], callback);

    Order.getByTicket(orderTicket, function(err, order) {
        if (err) {
            callback(err);
            return;
        }

        order.state = orderStates.CLOSING;
        order.save(callback);
    });
};


Client.methods.confirmOrderClosing = function(orderTicket, callback) {

    var self = this;

    async.waterfall([
        function(next) {
            if (orderTicket._id) {
                next(null, orderTicket);
                return;
            }

            Order.getByTicket(orderTicket, next);
        },
        function(order, next) {
            order.state = orderStates.CLOSED;
            order.closedOn = new Date().getTime();
            order.save(next);
        },
        function(order, num, next) {
            var index = self.openOrders(order._id);
            if (index !== -1) {
                self.splice(index, 1);
                self.save(function(err) {
                    next(err, order);
                });
            }
            else {
                console.log('WARNING!!! try to remove open order id from openOrder list, but it was not founded');
                next(null, order);
            }
        }
    ], callback);
};


/**
    Получить список ордеров.
    ========================
    
    Получает список всех ордеров, закрепленных за данным ордером.

    Возможна фильтрация по статусу (состоянию) ордера. Статусы передаются в опциях в виде массива.
    Если статусы не переданы, вернет список всех ордеров.
    

    @example

        client.getOrders({states: [11,12]}, function(err, res) {
            //... res will be all arders with statuses opening (11), opened (12);
        })
    
    @method getOrders
    @param [_options] {object}
        @param {Array} _options.states -список статусов для фильтрации
    @param callback {function}
        @param {Error} callback.err
        @param {Array} callback.orders
*/
Client.methods.getOrders = function(_options, callback) {
    var options = arguments.length === 2 ? arguments[0] : {};
    callback = Array.prototype.slice.call(arguments).pop();
    callback = _.isFunction(callback) ? callback : Function;

    var query = {
        client: this._id
    };

    if (options.states && _.isArray(options.states)) {
        query.states = {$in: options.states};
    }

    this.model('client').find(query, callback);
};


Client.methods.getOrderByTicket = function(ticket, _options, callback) {
    var options = arguments.length === 3 ? arguments[1] : {};
    callback = Array.prototype.slice.call(arguments).pop();
    callback = _.isFunction(callback) ? callback : Function;

    Order.findOne({client: this._id, ticket: ticket}, function(err, res) {
        if(err) {
            callback(err);
            return;
        }

        callback(null, res);
    });
};


/*  Проверка на наличине открытых ордеров
    -------------------------------------
*/
Client.methods.hasOpenOrders = function() {
    return !!this.openOrders.length;
};


/**  @async
    @method checkOnChange
    @description Сверить ордера
    ===========================

    Метод получает список открытых позиций и сравнивает с уже открытыми.
    Возвращает информацию с отличиями.
    
    хэш сообщения от терминала orderList (message.data)
    ------------------------------------

    orderList = [{
        symbol: String,
        type: Number (Int),
        lots: Number (double)
        open-time: Number (Int timestamp linux)
        open-price: Number (Double)
        swap: Number (Double)
        profit: Number (Int)
        take-profit: Number (Int)
    }]

    res: возвращаемые данные
    ------------------------

    @property newOrders {Array} - список новых ордеров в виде объектов типа Order _[order, ...]_
    @property closedOrders* {Array} - список закрытых ордеров в виде объектов типа Order _[order, ...]_
    

    @param orderList {object} see description orderList
    @param callback {function (err, res) } see res
**/
Client.methods.checkOnChange = function(orderList, callback) {
 
    //  запрос списка открытых ордеров, принадлежащих данному клиенту.
    this.getOrders({states: [config.orderStates.CREATED]}, function(err, orders) {
        if (err) {
            callback(err);
            return;
        }

        var ordersTIDs = _.pluck(orders, 'tid');
        var ordersListTIDs = _.pluck(orderList, 'tid');
        var newOrders = [], closedOrders = [];

        // список ордеров, которые были созданы с момента последнего обращения
        if (ordersTIDs.length){
            newOrders = _.filter(orderList, function(e) {
                return ordersTIDs.indexOf(e.tid) === -1;
            });
        }

        // список ордеров, которые были закрыты с момента последнего обращения
        if (ordersListTIDs) {
            closedOrders = _.filter(orders, function(e) {
                return ordersListTIDs.indexOf(e.tid) === -1;
            });
        }

        callback(null, {newOrders: newOrders, closedOrders: closedOrders});
    });
};


/* 1.a проверит новые и закрытые ордера
    2. откроет новые для провайдера
    3. закроет закрытые для провайдера
    4. возьмет всех подписчиков
    5. откроет не подтвержденные ордера для подписчиков
    6. закроет не подтвержденные ордера для подписчиков
    7. вернет данные в формате:
        [{
            subscriber: {Client},
            tid: Client.tid,
            action: create|close,
            data: {
                ticket: action create ? null: Order.ticket
                type
                symbol
                lots
                comment
            }
        }]

    1.b если нет ордеров
        1. добавит инфу в историю */
Client.methods.handleProviderTerminalMessage = function(message, callback) {

    var self = this;
    var res = [];
    var changes = null;

    async.waterfall([
        function (next) {
            self.addToOrderHistory(message, next.bind(this, null));
        },
        function (next) {
            next = arguments[arguments.length - 1];
            self.checkOnChange(message, next);
        },
        function (_res, next) {
            changes = _res;

            if (!changes.newOrders.length && !changes.closedOrders.length) {
                callback(null, res);
                return;
            }

            self._handleProviderNewOrders(changes.newOrders, next);
        },
        function (_res, next) {
            res.concate(_res);
            self._handeProviderClosedOrder(changes.closedOrders, next);
        },
        function (_res, next) {
            res.concate(_res);
            next(null, res);
        }
    ], callback);
};


/* Получает список закрытых ордеров Order, берет всех подписчиков и и для каждого
создает распоряжение на новый ордер.
Возвращает данные в виде:

[{
            subscriber: {Client},
            order: {order},
            tid: Client.tid,
            action: create,
            data: {
                ticket: null
                type
                symbol
                lots
                comment
            }
        }]

*/
Client.methods._handleProviderClosedOrders = function(orders, callback) {
    var self = this;
    var res = [];

    function _handleEachOrderClose(client, order, done) {
        client.closeOrder(order.ticket, function(err, _order) {
            if (err) {
                console.error('[Client #_handleProviderClosedOrders] order not found error');
                done();
                return;
            }

            var _res = {
                subscriber: client,
                order: _order,
                tid: client.tid,
                action: 'close',
                data: {
                    ticket: order.ticket
                }
            };

            res.push(_res);
            done(null, res);
        });
    }

    function _handleEachSubscriber(client, done) {
        async.eachSeries(orders, _handleEachOrderClose.bind(this, client), done);
    }

    async.waterfall([
        function (next) {
            self.getSubscribers(next);
        },
        function (subscribers, next) {
            if (!subscribers.length) {
                callback(null, res);
                return;
            }

            async.eachSeries(subscribers, _handleEachSubscriber.bind(this), next);
        }
    ], callback);
};


/**
data see:  #handleProviderTerminalMessage arg message or data

анализирует состояние запроса, в зависимости от решения открывает сделку

@method: createOrderAnalitic
@param data {Object} plain terminal message
@param callback {Function}
Возвращает инфу в виде:
{
    order: {Order},
    data: {
        ticket: null,
        type
        symbol
        lots
        comment
    }
}
*/
Client.methods.createOrderAnalitic = function(data, callback) {

    if (this.type === 'provider') {
        var err = '[Client #createOrderAnalitic] protected. Try to create order for provider.';
        console.error(new Error(err));
        callback(err);
        return;
    }
     // todo сделать вычисление лота на основе данных клиента.
    data.ticket = null;
    data.lots = 1;

    this.createOrder(data, function(_err, order) {
        if (err) {
            console.error('[Client #createOrderAnalitic]:', _err);
            callback(_err);
            return;
        }

        var res = {
            order: order,
            data: data
        };

        callback(null, res);
    });
};


/** 
Получает дату от терминала. Получает всех подписчиков и для каждого подписчика
вызывает метод #createOrderAnalitic
Ответ в виде:

[{
    subscriber: {Client},
    tid: client.tid,
    order: {Order},
    action: "create",
    data: {
        ticket: null
        type
        symbol
        lots
        comment
    }
}]
    @method _handleProviderNewOrders
    @param data {Object} plain terminal message
*/
Client.methods._handleProviderNewOrders = function(data, callback) {

    var self = this;
    var res = [];

    function _handleEach(client, done) {
        client.createOrderAnalitic(data, function(err, _data) {
            if (err) {
                console.log('[Client #_handleProviderNewOrders] ', err);
                done(null);
                return;
            }
            
            _data.subscriber = client;
            _data.tid = client.tid;
            _data.action = 'create';

            res.push(_data);
            done(null, res);
        });
    }

    async.waterfall([
        // query subscribers
        function (next) {
            self.getSubscribers(next);
        },
        function (subscribers, next) {
            if (!subscribers.length) {
                next(null, []);
                return;
            }

            async.eachSeries(subscribers, _handleEach.bind(this), next);
        }
    ], function(err) {
        callback(err, res);
    });
};


/* Обрабатывает данные о текущих ордерах в терминале */
Client.methods.handleConsumerTerminalMessage = function(message, callback) {

};


/* Добавляет в историю торговли данные о сделке */
Client.methods.addToOrderHistory = function(ticket, message, callback) {
    var self = this;

    async.waterfall([
        function (next) {
            self.getOrderByTicket(ticket, next);
        },
        function (order, next) {
            if (!order) {
                var _err = new Error('[Client #addHistory] error: requested order was not found');
                console.error(_err);
                next(_err);
                return;
            }

            var values = {
                profit: message.profit,
                takeProfit: message.take_profit,
                swap: message.swap,
                time: new Date().getTime()
            };

            order.history.push(values);

            order.save(function(err, _order) {
                if (err) {
                    next(err);
                    return;
                }

                next(null, _order);
            });
        }
    ], callback);
};


module.exports = mongoose.model('client', Client);
