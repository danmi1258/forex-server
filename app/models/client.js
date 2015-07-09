var mongoose = require('mongoose');
var BaseSchema = require('./base');
var config = require('config');
var messageTypes = config.messageTypes;
var orderStates = config.orderStates;
var _ = require('underscore');
var Order = require('./order');


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

   if (!data.name || !data.tid || !data.type) return callback(new Error('data error'));
   if (config.allowedTerminalTypes.indexOf(data.type)== -1) return callback(new Error('not allowed terminal type'));

   var terminal = new Terminal(data);


   terminal.save(callback);
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
    Позволяет быстро получить все терминалы (в виде АПИ объектов) на которые подписан текущий терминал.
    */
Client.methods.getSubscribtions = function(callback) {
    this.model('client').find({subscriptions: {$in: this.subscriptions}}, callback);
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
    Также метод делает уведомление по сокету своему терминалу с приказом об открытии нового ордера.

    Используйте этот метод, когда хотите инициировать создание нового ордера со стороны сервера.

    @param values {object} - данные для создания нового ордера
        @param type {Integer}
        @required
        @param symbol {String}
        @required
        @param lots {Double}
        @required
        @param comment {String}
        @required
    @param callback {function}
    @return {err, object} err, order
**/
Client.methods.createOrder = function(values, callback) {
    
    var requiredParams = {
        type: 'number',
        symbol: 'number',
        lots: 'number',
        comment: 'string'
    };

    var keys = Object.keys(requiredParams);

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        if (!values[key] || typeof values[key] != requiredParams[key]) {
            callback(new Error('bad params'));
            return;
        }
    };
    

    values.status = orderStates.CREATING;
    values.client = this._id;
    
    new Order(values).save(callback);
};


/*  Подтвердить создание нового ордера
    ==================================
    @descrpition
    Метод подтверждает открытие ордера в терминале.
    * Используйте этот метод, когда надо подтвердить факт, действительно ли ордер был открыт в терминале.
    
    @prop orderTicket {Date} - время создания ордера в терминалом. Аналог ID
    @return {object} - объект ордера как модель Order
*/
Client.methods.confirmOrderCreation = function(orderTicket, callback) {
    Order.getByTicket(orderTicket, function(err, order) {
        if (err) return callback(err);
        
        order.status = orderStates.CREATED;
        order.openedOn = new Date().getTime();
        order.save(callback);
    })
};

Client.methods.closeOrder = function(orderTicket, callback) {
    var self = this;

    Order.getByTicket(orderTicket, function(err, order) {
        if (err) return callback(err);

        

        order.status = orderTime.CLOSING;
        order.save(callback);
    })
};


Client.method.confirmOrderClosing = function(orderTicket) {
    Order.getByTicket(orderTicket, function(err, order) {
        if (err) {
            callback(err);
            return;
        }

        order.status = orderStates.CLOSED;
        order.closedOn = new Date().getTime();
        order.save(callback);
    });
};


/*  Получает список открытых ордеров.
    ==================================
    @return {Array} - список открытых ордеров в виде объектов модели Order

*/
Client.methods.getOpenOrders = function(callback) {
    this.find({ client: this._id, _id: {$in: this.openOrders }}, function(err, res) {
        if (err) callback(err); return;
        callback(null, res);
    })
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
    
    хэш сообщения от терминала orderList 
    ------------------------------------

        orderList = [{
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
    this.getOpenOrders(function(err, orders) {
        if (err) callback(err); return;

        var ordersTIDs = _.pluck(orders, 'tid');
        var ordersListTIDs = _.pluck(orderList, 'tid');
        var newOrders = [], closedOrders = [];

        // список ордеров, которые были созданы с момента последнего обращения
        if (ordersTIDs.length){
            newOrders = _.filter(orderList, function(e) {
                return ordersTIDs.indexOf(e.tid) == -1;
            })    
        }

        // список ордеров, которые были закрыты с момента последнего обращения
        if (ordersListTIDs) {
            var closedOrders = _.filter(orders, function(e) {
                return ordersListTIDs.indexOf(e.tid) == -1; 
            })    
        }

        callback(null, {newOrders: newOrders, closedOrders: closedOrders});
    })
};


module.exports = mongoose.model('client', Client);