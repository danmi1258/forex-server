var mongoose = require('mongoose');
var BaseSchema = require('./base');
var config = require('config');
var orderStates = config.orderStates;
var _ = require('underscore');
var Order = require('./order');
var async = require('async');
var utils = require('../utils');
var logger = require('../utils/logger');


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


/**
    Получить клиент по свойству @tid
    ==================================
    Метод производит поиск по свойству __client.tid__.

    В случае если клиент не найден, вернет null

    @example

        // клиент с tid = 123 существует
        Client.getByTid(123, function(err, client) {
            // client = {tid: 123, ...}
        })

        // клиет с tid = 123 не существует
        Client.getByTid(123, function(err, client) {
            // err=null, client = null
        })

    
    @method getByTid
    @async
    @static
    @param tid {Number}
    @param callback {Function}
        @param {Error} callback.err
        @param {Client} callback.client
*/
Client.statics.getByTid = function(tid, callback) {
    this.findOne({tid: tid}, function(err, res) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, res);
    });
};



/**
    Проверить на существующую подписку
    ==================================

    Метод проверит существует ли подписка на заданный клиент-провайдер.

    В случае, если подписка на данного провайдера у текущего терминала уже есть, вернет true
    
    @method alreadySubscribed
    @param provider {Object} -клиент провайдер
    @return {Boolean} true | false

*/
Client.methods.alreadySubscribed = function(provider) {
    return this.subscriptions.indexOf(provider._id) !== -1;
};


/**
    Пописаться на провайдера
    ========================
    Метод производит подписку терминала типа _consumer_ на терминал типа _provider_. В любых
    других вариациях будет вызвана ошибка:

        '[Client #subscribe] error: it is forbidden subscribe on the client with no provider type'

    При попытке подписаться на провайдера, на которого уже есть подписка, будет также вызвана
    ошибка:

        '[Client #subscribe] error: subscriptions already exist'

    При удачной подписке у текущего объекта в свойстве __@subscriptions__ будет добавлен id
    клиента-провайдера.

    @example
        
        // consumer.type = consumer
        // provider.type = provider

        client.subscribe(provider, function(err, client) {
            assert(client.subscriptions.indexOf(provier._id) !== -1, true);
        })

        // повторная подписка приведет к ошибке
        client.subscribe(provider, function(err, client) {
            // err != null
        })

    @method subscribe
    @async
    @param provider {Object} объект терминала провайдера.
    @param callback {Function}
        @param {Error} callback.err
        @param {Object} callback.client -consumer
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
    Одписаться
    ==========
    Метод отписывает терминал потребитель от терминала провайдера.

    В случае если терминал не имеет подписки на передаваемый провайдер, будет возвращена ошибка:

        '[Client #unsubscribe] error: consumer has no subscription on this provider'


    @method unsubscribe
    @async
    @param provider {Client} объект терминала провайдера
    @param callback {Function}
        @param {Error} callback.err
        @param {Client} callback.res
**/
Client.methods.unsubscribe = function(provider, callback) {
    if (!this.alreadySubscribed(provider)) {
        callback(new Error('[Client #unsubscribe] error: consumer has no subscription on this provider'));
    }
    this.subscriptions.splice(this.subscriptions.indexOf(provider._id));
    this.save(function(err, client) {
        callback(err, client);
    });
};

/**
    Изменить токен
    ==============
    Метод изменяет токен для текущего клиента.
    Токен может быть назначен только из таблицы существующих токенов.
    Токен должен быть:
    
    * существующим
    * активным
    * свободным (не использованным)
    
    @async
    @method changeToken
    @param token {Token}
    @param callback {Function}
        @param {Error} callback.err
        @param {Client} callback.res -текущий объект клиента
**/
Client.methods.changeToken = function(token, callback) {
    if (!!token.closed) return callback(401);

    this.token = token._id;
    this.save(function(err, res) {
        callback(err, res);
    });
};




/** 
    Получить все подписки.
    ======================
    Позволяет быстро получить все __терминалы провайдеры__ (в виде АПИ объектов)
    на которые подписан текущий терминал.

    В случае, если ни один терминал не найден, вернет пустой массив.

    @example

        consumer.getSubscriptions(function(err, res) {
            // ... res = [clients.. ];
        })

    @method getSubscribtions
    @async
    @param callback {Function}
        @param {Error} callback.err
        @param {Array} callback.clients
    */
Client.methods.getSubscribtions = function(callback) {
    this.model('client').find({_id: {$in: this.subscriptions}}, callback);
};


/**
    Получить всех подписчиков.
    ==========================


    Позволяет быстро получить все __терминалы консюмеры__ (в виде АПИ объектов)
    которые подписаны на данный терминал.

    @method getSubscribers
    @async
    @param callback {Function}
        @param {Error} callback.err
        @param {Array} callback.subscribers -clients
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

/**
    Создать запись о новом ордере
    ==============================
    
    Методы создает новую запись в таблице orders, привязывая его к текущему клиенту.

    Используйте этот метод, когда хотите инициировать создание нового ордера со стороны сервера.
    
    По умочанию метод создает новый ордер в статусе __CREATING (11)__.
    Для создания ордера в статусе __CREATED (12)__ необходимо передать в опциях параметр
    __@confirm__. При этом ордер также будет добавлен в свойство __@openOrders__ текущего
    клиента.

    Минимальные свойства сообщения __@values
        
        * type
        * symbol
        * lots
        * comment

    @async
    @method createOrder
    @param values {object} - plain terminal message. see above
    @param options {Object}
        @ property confirm {Boolean} - if true then order will be confirmed imediatly
    @param callback {function}
        @param {Error} callback.err
        @param {Order} callback.res
*/
Client.methods.createOrder = function(_values, _options, callback) {
    
    logger.debug('[Client #createOrder] start to create new order for client id=', this._id.toString(), 'name=', this.name);

    if (arguments.length === 2) {
        callback = arguments[1];
        _options = null;
    }

    
    var requiredParams = {
        type: 'number',
        symbol: 'string',
        lots: 'number'
    };

    var values = _.clone(_values);
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
        logger.warn('[#createOrder] argumets error. values.ticket does not specified');
    }

    values.state = orderStates.CREATING;
    values.client = this._id;
    values.reference = utils.createUniqueKey();

    async.waterfall([
        function createOrder(next) {
            new Order(values).save(next);
        },
        function updateOrderProp(order, num, next) {
            if (self.type === 'provider') {
                order.masterOrder = order._id;
                order.save(function(err, res) {
                    next(err, res);
                });
            }
            else if (values.masterOrder) {
                order.masterOrder = values.masterOrder;
                next(null, order);
            }
            else {
                logger.error();
                next(Error('[#createOrder] Arguments "values" error. The property "masterOrder" is expected. Client id=', self._id.toString(), ' type=', self.type, ' name=', self.name));
               // next(null, order);
            }
        },
        function confirmOrderCreation(order, next) {
            if (_options && _options.confirm) {
                self.confirmOrderCreation(order, next);
                return;
            }
            next(null, order);
        }
    ], function(err, res) {
        if (err) {
            logger.error('[Client #createOrder] error while order creating', err);
        }
        callback(err, res);
    });
    
};


/*  Подтвердить создание нового ордера
    ==================================
    Метод подтверждает открытие ордера в терминале.
    
    Используйте этот метод, когда надо подтвердить факт,
    действительно ли ордер был открыт в терминале.
    
    @Example

        client.confirmOrderCreation('12345', function(err, res) {
            // res={state: 12, ...}
            // client = {openOrders: [res._id, ...]}
        })

    @param reference {String} - уникальный референс ордера.
    @param callback {Function}
        @param {Error} callback.err
        @param {Order} callback.res
*/
Client.methods.confirmOrderCreation = function(reference, callback) {
    
    var self = this;

    async.waterfall([
        // get order
        function getOrder(next) {
            if (reference._id) {
                return next(null, reference);
            }

            Order.getByReference(reference, next);
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
    Закрыть ордер
    =============
    Метод закрывает ранее открытый ордер. По умолчанию статус ордера будет __CLOSING (21)__

    Для закрытия с подтверждением используейте опцию __confirm__.
    При этом ордер получит статус __CLOSED (22)__, а также id ордера будет удален из
    списка открытых ордеров __@openOrders__ текущего клиента.

    @method closeOrder
    @async
    @param orderTicket {Integer}
    @param options {Object}
        @param {Boolean} options.confirm - if true then closed order will be confirmed imediatly
    @param callback {Function}
        @param {Error} callback.err
        @param {Order} callback.res
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

            self.getOrderByTicket(orderTicket, function(err, order) {
                if (err) {
                    next(new Error('order not found error'));
                    return;
                }


                if (!order) {
                    next(new Error('[Client closeOrder] warning: Try to close order but it was not found. orderTicket='));
                    return;
                }

                next(null, order);
            });
        },
        function(order, next) {
            order.state = orderStates.CLOSING;
            order.save(next);
        },
        function(order, num, next) {
            if (_options && _options.confirm) {
                self.confirmOrderClosing(order, next);
            } else {
                next(null, order);
            }
        }
    ], callback);
};


/*  Подтвердить закрытие существующего ордера
    =========================================
    Метод подтверждает закрытие ордера в терминале.
    
    @Example

        client.confirmOrderClosing(12345, function(err, res) {
            // res={state: 12, state: 21, ...}
            // assert(client.openOrders.indexOf(res._id) === -1, true)
        })

    @param orderTicket {Number} - номер тикета. Аналог ID
    @param callback {Function}
        @param {Error} callback.err
        @param {Order} callback.res
*/
Client.methods.confirmOrderClosing = function(orderTicket, callback) {

    var self = this;

    async.waterfall([
        // get order
        function(next) {
            if (orderTicket._id) {
                next(null, orderTicket);
                return;
            }

            self.getOrderByTicket(orderTicket, next);
        },
        // update order
        function(order, next) {
            order.state = orderStates.CLOSED;
            order.closedOn = new Date().getTime();
            order.save(next);
        },
        // remove order id from the list of opent orders
        function(order, num, next) {
            var index = self.openOrders.indexOf(order._id);

            if (index !== -1) {
                self.openOrders.splice(index, 1);
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
        query.state = {$in: options.states};
    }

    Order.find(query, callback);
};


/**
    Найти ордер по тикету
    =====================
    Найдет ордер по его тикету.
    
    В случае, если ордер не найден, будет возвращен результат null
    
    @method getOrderByTicket
    @async
    @param ticket {Integer}
    @param callback {Functiom}
        @param {Error} callback.err
        @param {Order} callback.res
*/
Client.methods.getOrderByTicket = function(ticket, callback) {
    Order.findOne({client: this._id.toString(), ticket: ticket}, function(err, res) {
        if (res === null) {
            logger.warn('[#getOrderByTicket] order with ticket=', ticket, ' not fund');
        }
        callback(err, res);
    });
};

Client.methods.getOrderByMasterOrderId = function(masterOrderId, callback) {
    Order.findOne({client: this._id.toString(), masterOrder: masterOrderId.toString()}, function(err, res) {
        if (res === null) {
            logger.warn('[#getOrderByMasterOrderId] order with masterOrderId=', masterOrderId, 'not fund');
        }

        callback(err, res);
    });
};

/*  Проверить на наличие новых ордеров
    ==================================

    @method hasOpenOrders
    @return {Array} - ids of the open orders
*/
Client.methods.hasOpenOrders = function() {
    return !!this.openOrders.length;
};


/**
    Проверить на обновления
    =======================

    Метод получает список открытых позиций и сравнивает с уже открытыми ордерами.
    Возвращает информацию с отличиями.

    Если отличий нет, будут возвращены пустые массивы.
    
    В опциях можно передать параметр __states__, список статусов ордеров, которые будут
    задействованы в сравнении.

    
    Хэш сообщения от терминала orderList (message.data)
    ---------------------------------------------------

        orderList = [{
            symbol: String
            type: Integer
            lots: Double
            open-time: Number (Int timestamp linux)
            open-price: Number (Double)
            swap: Number Double
            profit: Double
            take-profit: Double
        }]

    res: возвращаемые данные
    ------------------------
    
        newOrders = [{
            ticket: Integer
            symbol: String
            type: Integer
            lots: Double
            open-time: Number (Int timestamp linux)
            open-price: Number (Double)
            swap: Number Double
            profit: Double
            take-profit: Double
        }, ...]

        closedOrders = [{instance of Order}, ...]

    @example
        
        // Ордер в статусе __OPENED__ попадет в список closedOrders
        
        var order1 = {
            ticket: 123,
            state: 12,
            ...
        }

        // orderList не имеет в списке объекта с ticket=123

        client.checkOnChange({ticket: 123, ...}, function(err, res) {
            res.closedOrders = [{order(with ticket=123)}, ...]
        })

        // Ордер в статусе __OPENING не попадет всписок closedOrders
        
        var order1 = {
            ticket: 123,
            state: 11,
            ...
        }

        // orderList не имеет в списке объекта с ticket=123

        client.checkOnChange({ticket: 123, ...}, function(err, res) {
            // assert(res.closedOrder.indexOf(order(with ticket=123)) === -1, true]
        })


    @async
    @method checkOnChange
    @param orderList {Object} native terminal message
    @param options {Object}
        @param states {Array} options.states. List of the order states will be included in result.
        @default states = [12]
    @param callback {Function}
        @param {Error} callback.err
        @param {Object} callback.res _see above_
            @param {Array} callback.res.newOrders
            @param {Array} callback.res.closedOrders
*/
Client.methods.checkOnChange = function(orderList, options, callback) {

    var self = this;

    if (arguments.length === 2) {
        callback = arguments[1];
        options = {
            states: [config.orderStates.CREATED]
        };
    }

    if (!_.isArray(orderList)) {
        throw new Error('[Client #checkOnChange] wrong argument error:  orderList must be an array');
    }

    //  запрос списка открытых ордеров, принадлежащих данному клиенту.
    this.getOrders({states: options.states}, function(err, orders) {

        if (err) {
            callback(err);
            return;
        }

        logger.debug('[Client #checkOnChange] get orders for client id=', self._id.toString(), 'orders length = ', orders.length);

        var orderTickets = _.pluck(orders, 'ticket') || [];
        var ordersListTickets = _.pluck(orderList, 'ticket');
        var newOrders = [], closedOrders = [];
        
        // список ордеров, которые были созданы с момента последнего обращения
        if (ordersListTickets.length){
            newOrders = _.filter(orderList, function(e) {
                return orderTickets.indexOf(e.ticket) === -1;
            });
        }

        // список ордеров, которые были закрыты с момента последнего обращения
        if (ordersListTickets) {
            closedOrders = _.filter(orders, function(e) {
                return ordersListTickets.indexOf(e.ticket) === -1;
            });
        }

        callback(null, {newOrders: newOrders, closedOrders: closedOrders});
    });
};


/**
    Обработать сообщение от провайдера
    ==================================

    Методы проводит следующую логику:

    * проверит новые и закрытые ордера
    * добавит в историю провайдера текущее сообщение от терминала
    * вызовет метод __#_handleProviderNewOrders__ для новых ордеров
    * вызовет метод __#_handleProviderClosedOrders__ для закрытых ордеров
    * вернет расширенные данные с информацией обо всех событиях

    Формат возвращаемых данных
    --------------------------
        
        res = [{
            subscriber: Client,
            order: Order
            tid: subscriber.tid,
            action: "create|close",
            data: {
                ticket: action == "create" ? null: Order.ticket
                type Integer
                symbol String
                lots Double
                comment String
            }
        }]
    
    @method handleProviderTerminalMessage
    @async
    @param openOrders {Object} property from native terminal message type: 10
    @param callback {Function}
        @param {Error} callback.err
        @param {Object} callback.res expanded response. see above
*/
Client.methods.handleProviderTerminalMessage = function(openOrders, callback) {

    var self = this;
    var res = [];
    var changes = null;

    async.waterfall([
        function checkOnChange(next) {
            self.checkOnChange(openOrders, {states: [11,12]}, next);
        },

        // store changes. open new orders for self if exists
        function openNewOrderSelf(_res, next) {
            changes = _res;

            if (!changes.newOrders.length && !changes.closedOrders.length) {
                callback(null, res);
                return;
            }

            function openOrder(order, done) {
                self.createOrder(order, {confirm: true}, done);
            }

            async.eachSeries(changes.newOrders, openOrder, next);
        },
        // close closed orders for self if exists
        function closeOrderSelf(next) {

            function closeOrder(order, done) {
                self.closeOrder(order, {confirm: true}, done);
            }

            async.eachSeries(changes.closedOrders, closeOrder, next);
        },
        // open new orders for subscribers. make result hash
        function openOrdersForSubscriber(next) {
            self._handleProviderNewOrders(changes.newOrders, next);
        },
        // close orders for subscribers. make result hash
        function closeOrdersForSubscribers(_res, next) {
            res = _.union(res, _res);
            self._handleProviderClosedOrders(changes.closedOrders, next);
        },
        // union results
        function unionResults(_res, next) {
            res = _.union(res, _res);
            next(null, res);
        }
    ], function(err, res) {
        callback(err, res);
    });
};


/**
    Обработать закрытые ордера
    ==========================
    
    Входящий параметр __orders__ - это массив ордеров на закрытие.
    
    Данный массив можно получить от провайдера, вызвав метод provider.checkOnChange(...).
    При этом мы получим в ответе два результирующих массива:

        res=[newOrders:[...], closedOrders: [...]];

    Массив __[closedOrders]__ состоит из списка ордеров провайдера на закрытие. Каждый
    ордер имеет уникальный параметр ticket, с помщью которого мы можем выбрать у каждого
    подписчика ордер с аналогичным параметром и закрыть его используя метод
    __#closeOrder(orderTicket, ...)__ , а также включить его в ответ текущего метода.
    
    Т.е. для того чтобы закрыть схожие ордера у подписчиков, в данный метод достаточно
    пробросить объекты с единственным полем: __ticket__, а не целые ордера, и этого
    будет также достаточно для успешного завершения работы метода.

    Для каждого подписчика закроет указанные ордера. При этом ордер будет удален из списка
    открытых ордеров __client.openedOrders__

    Формат возвращаемых данных:
    ---------------------------
        
        res = [{
            subscriber: Client,
            order: Order,
            tid: subscriber.tid,
            action: "close",
            data: {
                ticket Integer
            }
        }]

    @method _handleProviderClosedOrders
    @async
    @param orders {Array} list of the orders (instance of Order) to close
    @param callback {Function}
        @param {Error} callback.err
        @param {Array} callback.res see above
*/
Client.methods._handleProviderClosedOrders = function(orders, callback) {
    var self = this;
    var res = [];

    if (!_.isArray(orders)) {
        throw new Error('[Client #_handleProviderClosedOrders] argument type error: "orders" must be an array');
    }

    function _handleEachOrderClose(client, providerOrder, done) {

        async.waterfall([
            function getOrder(next) {
                client.getOrderByMasterOrderId(providerOrder._id, next);
            },
            function closeOrder(order, next) {
                client.closeOrder(order.ticket, next);
            },
            function makeHash(order, next) {
                res.push({
                    subscriber: client,
                    order: order,
                    tid: client.tid,
                    action: 'close',
                    data: {
                        ticket: order.ticket
                    }
                });
                next();
            }
        ], done);
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
    ], function(err) {
        callback(err, res);
    });
};


/**
    Открыть ордер с аналитикой
    ==========================
    Метод получает данные от терминала и анализирует их. При положительном решении
    открывает новый ордер.

    В данном методе необходимо инкапсулировать все логические функции (order open middlware)
    которые принимают решение для открытия нового ордера.

    Формат возвращаемых данных
    --------------------------

    res = {
        order: {Order},
        data: {
            ticket Integer,
            type Integer
            symbol String
            lots Double
            comment String
        }
    }

    @method createOrderAnalitic
    @async
    @param data {Object} plain terminal message.
    @param callback {Function}
        @param {Error} callback.err
        @param {Object} expanded response
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
    data.lots = 0.01;

    this.createOrder(data, function(_err, order) {
        if (err) {
            console.error('[Client #createOrderAnalitic]:', _err);
            callback(_err);
            return;
        }

        data.comment = 'comment';


        var res = {
            order: order,
            data: data
        };

        callback(null, res);
    });
};


/**
    Обработка списка новых ордеров
    ==============================
    Для каждого подписчика вызывает метод __#createOrderAnalitic__ для каждого ордера
    из списка полученных ордеров на открытие.

    В данном методе список полученных ордеров на открытие - нативные сообщения от терминала,
    а не оредра из БД.

    Формат возвращаемых данных:
    ---------------------------

        res = [{
                subscriber: Client,
                tid: subscriber.tid,
                order: Order,
                action: "create",
                data: {
                    ticket: null
                    type Ineger
                    symbol String
                    lots Double
                    comment String
                }
            }]

    @method _handleProviderNewOrders
    @async
    @param orders {Array} open orders from terminal message
    @param callback {Function}
        @param {Error} callback.err
        @param {res} expanded response. See above
*/
Client.methods._handleProviderNewOrders = function(orders, callback) {

    var self = this;
    var res = [];

    function _handleEachOrder(client, order, done) {
        client.createOrderAnalitic(order, function(err, _data) {
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

    function _handleEachSubscriber(client, done) {
        async.eachSeries(orders, _handleEachOrder.bind(this, client), done);
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

            async.eachSeries(subscribers, _handleEachSubscriber.bind(this), next);
        }
    ], function(err) {
        callback(err, res);
    });
};


/* Обрабатывает данные о текущих ордерах в терминале */
Client.methods.handleConsumerTerminalMessage = function(message, callback) {

};


/**
    Добавить историю сделки
    =======================
    Метод получает данные терминала в исходном виде и добавляет их в историю указанного 
    ордера __Order.history__.

    Если данные не изменились с последнего раза, добавления в историю не произойдет.
    
    @method addToOrderHistory
    @async
    @param ticket {Number} terminal's order ticket
    @param tOrder {Object} plain terminal object
    @param callback {Function}
        @param {Error} callback.err
        @param {Order} callback.res updated order (instance of Order)
*/
Client.methods.addToOrderHistory = function(ticket, tOrder, callback) {
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
                profit: tOrder.profit,
                takeProfit: tOrder.take_profit,
                swap: tOrder.swap,
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
