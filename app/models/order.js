require('mongoose-schema-extend');
var mongoose = require('mongoose');
var BaseSchema = require('./base');
var logger = require('../utils/logger');
var Args = require('args-js');
var config = require('config');
var _ = require('underscore');
var utils = require('../utils');
var async = require('async');
var slack = require('../integrations/slack');
var orderOpenReqHandler = require('../sockets/terminalSocket/handlers').orderOpenReqHandler;
var orderCloseReqHandler = require('../sockets/terminalSocket/handlers').orderCloseReqHandler;
let getSocketByTid = require('../sockets/terminalSocket/socket').getSocketByTid;
var p$ = utils.print;
var lp$ = utils.logPrefix;


/**
 * @class Order
 * @extends Default
 * @description
 */
var Order = BaseSchema.extend({
    // уникальный номер ордера в терминале
    ticket: Number,
    // ID of the native terminal (Client)
    client: {type: String, required: true},
    // type of order's direct: buy, sell
    type: {type: Number, required: true},
    // currency pare example: EUR/USD
    symbol: {type: String, required: true},
    // volume
    lots: {type: Number, required: true},
    // status: 11-opening, 12-opened, 21-closing, 22-closed
    state: {type: Number, default: 0},
    /* comment for terminal order */
    comment: {type: String, default: 'comment', required: true},
    /* History of the trading. Hash:
        {profit[number]}
    */
    history: Array,
    // has value then the order opened in the terminal(confirm open order)
    openedOn: Date,
    // has value then the order closed in the terminal (confirm close order)
    closedOn: Date,
    // self unic reference
    reference: String,
    // id of the master (generating) order
    masterOrderId: String,

});


/* Найти ордер по уникальному параметру orderTime.
==================================================
Если количество найденных ордеров не равно 1, то будет возвращена ошибка.

@orderTime {Date} - уникальный параметр для ордера
@return {order} - искомый объект ордера.
*/
Order.statics.getByTicket = function(_orderTicket, _callback) {

    var args = new Args([
        {ticket: Args.INT | Args.Required},
        {callback: Args.FUNCTION | Args.Optional, _default: Function}
    ], arguments);

    this.model('order').findOne({ticket: args.ticket}, function(err, res) {
        if(res === null) {
            err = Error('order not found');
        }
        args.callback(err, res);
    });
};

Order.statics.getByReference = function(ref, callback) {

    var args = new Args([
        {ref: Args.STRING | Args.Required},
        {callback: Args.FUNCTION | Args.Optional, _default: Function}
    ], arguments);

    this.model('order').findOne({reference: args.ref}, function(err, res) {
        if(res === null) {
            err = Error('order not found');
        }
        args.callback(err, res);
    });
};

/*
    Минимальные свойства сообщения __@values
        * type
        * symbol
        * lots
        * comment

*/
Order.statics.openOrder = function(_client, _values, _options, _callback) {
    var lp = lp$('Order#openOrder');
    // logger.info(lp, 'begin create new order', p$(_client));

    /* specify aruments */
    try {
        var args = new Args([
            {client: Args.OBJECT | Args.Required},
            {values: Args.OBJECT | Args.Required},
            {options: Args.OBJECT | Args.Optional, _default: {confirm: false}},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return _callback(err);
    }

    /* check values */
    try {
        Args([
            {type: Args.INT | Args.Required},
            {lots: Args.FLOAT | Args.Required},
            {symbol: Args.STRING | Args.Required},
            {comment: Args.STRING | Args.Optional, _default: "default comment"},
            {ticket: Args.INT | (args.client._title === 'provider' ? Args.Required : Args.Optional)},
            {masterOrderId: Args.STRING | (args.client._title === 'provider' ? Args.Optional : Args.Required)}
        ], [args.values]);
    }
    catch(err) {
        logger.error(err);
        return _callback(err);
    }

    /* set values */
    args.values = _.clone(args.values);
    args.values.ticket = args.values.ticket || null;
    args.values.client = args.client._id.toString();
    args.values.tid = args.client.tid;
    args.values.reference = utils.createUniqueKey();
    args.values.masterOrderId = args.client._title === 'subscriber' ? args.values.masterOrderId : null;
    args.values.state = args.options.confirm ? config.orderStates.CREATING : config.orderStates.CREATED;

    /* create new order */
    new this(args.values).save(function(err, order) {
        if (err) {
            logger.error(lp, 'db error');
            return args.callback(err);
        }

        /* не посылать приказ на открытие ордера на терминал, не требуется подтверждение */
        if (args.options.confirm) {
            orderOpenReqHandler(args.client.tid, order);
        }

        args.callback(null, order);
    });
};


Order.statics.closeOrder = function(_client, _order, _options, _callback) {
    var lp = lp$('Order#closeOrder');
    
    /* specify aruments */
    try {
        var args = new Args([
            {client: Args.OBJECT | Args.Required},
            {order: Args.OBJECT | Args.Required},
            {options: Args.OBJECT | Args.Optional, _default: {confirm: false}},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return _callback(err);
    }

    /* Check prop types for terminal. It protects terminal script fail */
    try {
        new Args([
            {type: Args.INT | Args.Required},
            {lots: Args.FLOAT | Args.Required}
        ], [args.order])
    } catch(err) {
        return logger.error(lp, 'arguments error', err);
    }

    /* проверка статуса ордера. не работает для подписчика, т.к. подписчик не сверяет ордера. */
    if (args.order.state === config.orderStates.CLOSED) {
        return args.callback(Error('Ошибка изменении статуса ордера. Ордер уже закрыт'));
    }

    /* статус */
    args.order.state = args.options.confirm ? config.orderStates.CLOSING : config.orderStates.CLOSED;

    args.order.save(function(err, order) {
        if (err) {
            logger.error(lp, 'db error', err);
            return args.callback(err);
        }

        /* не посылать приказ на закрытие ордера на терминал, если не требуется подтверждение */
        if (args.options.confirm) {
            orderCloseReqHandler(args.client.tid, order);
        }

        
        args.callback(err, order);
    });
};


Order.statics.saveHistory = function(_orderTicket, _data, _callback) {
    
    var self = this;
    var lp = lp$('Order#saveHistory');

    /* specify aruments */
    try {
        var args = new Args([
            {orderTicket: Args.INT | Args.Required},
            {data: Args.OBJECT | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: function() {}}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return _callback(err);
    }
    
    async.waterfall([
        function findOrder(next) {
            self.model('order').getByTicket(args.orderTicket, next);
        },
        function checkOnChange(order, next) {
            var len = order.history.length;
            
            if (!len || (len && order.history[len - 1].profit !== args.data.profit)) {
                next(null, order);
            }
            else {
                args.callback();
            }
        },
        function(order, next) {
            order.history.push(args.data);
            order.save(next);
        }
    ], args.callback);
};

/* EXPORTS
##################
*/
module.exports = mongoose.model('order', Order);
