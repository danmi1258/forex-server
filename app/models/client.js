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
 * @class Client
 * @extends Default
 */
var Client = BaseSchema.extend({
    /* - */
    name: String,
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
    tid: Number,
    /* terminal type in HEX: provider(0x01010) / consumer (0x1020) */
    type: String
});


/* create new terminal */
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
    })
};



Client.methods.alreadySubscribed = function(provider) {
    return this.subscriptions.indexOf(provider._id) != -1;
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
    if (provider.type != 'provider') return callback(401);
    if (this.alreadySubscribed(provider)) return callback(401);

    this.subscriptions.push(provider._id);
    this.save(callback);
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
Client.method.getSubscribers = function(callback) {
    this.model('client').find({subscriptions: {$contains: this._id}}, callback);
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
        @prop type {Integer}
        @required
        @prop symbol {String}
        @required
        @prop lots {Double}
        @required
        @prop comment {String}
        @required
        @prop ticket {Integer}
    @param _options {Object}
        @ prop confirm {Boolean} - if true then order will be confirmed imediatly
    @param callback {function}
    @return {err, object} err, order
**/
Client.methods.createOrder = function(values, _options, callback) {
    
    if (arguments.length === 2) {
        callback = arguments[1];
        _options = null;
    }

    
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
        console.log('warning! try to set order as confirmed but order.ticket do not specified... ');
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
        @prop confirm {Boolean} - if true then order closing will be confirmed imediatly
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


Client.method.confirmOrderClosing = function(orderTicket, callback) {

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


/*  Получает список ордеров.
    ========================
    
    Возможна фильтрация по статусу (состоянию) ордера. Статусы передаются в массиве.
    Если статусы не переданы, вернет список всех ордеров.

    @param _options {Object}
        @param {Array} - _options.states. For query by status.
    @return {Array} - список открытых ордеров в виде объектов модели Order

*/
Client.methods.getOrders = function(_options, callback) {
    var options = arguments.length === 2 ? arguments[0] : {};
    callback = Array.prototype.slice.call(arguments).pop();
    callback = _.isFunction(callback) ? callback : Function;

    var query = {
        client: this._id,
        _id: {$in: this.openOrders }
    };

    if (options.states && _.isArray(options.states)) {
        query.states = {$in: options.states};
    }

    this.model('client').find({_id: {$in: this.openOrders }}, function(err, res) {

        callback(err, res);
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


        orederOpenTime,
        orderSymbol,
        orderType,
        orderProfit,
        tid,
        client
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


module.exports = mongoose.model('client', Client);
