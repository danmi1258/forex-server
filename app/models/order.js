var mongoose = require('mongoose');
var BaseSchema = require('./base');
var logger = require('../utils/logger');
var Args = require('args-js');
var config = require('config');
var _ = require('underscore');
// var Socket = require('../socket');
var socketProxy = require('../socketProxy');
var utils = require('../utils');
var p$ = utils.print;
var lp$ = utils.logPrefix;
var async = require('async');
var slack = require('../integrations/slack');
require('mongoose-schema-extend');


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
    masterOrderId: String
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
    logger.info(lp, 'begin create new order', p$(_client));

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
            {comment: Args.STRING | Args.Optional, _default: "comment"},
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

        /* post action on slack */
        slack.actions.createNewOrder(args.client, order);

        /* send ORDER_OPEN_REQ signal to the terminal */
        if (args.options.confirm) {
            logger.info(lp, 'send request to the terminal');
            var socket = socketProxy.getSocketByTid(args.client.tid);
            var socketServer = socketProxy.getServer();

            if (!socket) {
                logger.warn('terminal with tid=(%d) is offline', args.client.tid);
            }
            else {
                socketServer.send(socket, {
                    type: config.messageTypes.ORDER_OPEN_REQ,
                    reference: order.reference,
                    data: {
                        type: order.type,
                        symbol: order.symbol,
                        lots: order.lots,
                        comment: order.comment || "default comment"
                    }
                });
                logger.info(lp, 'The request is sent successfully');
            }
        }

        logger.info(lp, 'new order created', p$(order));
        args.callback(null, order);
    });
};

Order.statics.closeOrder = function(_client, _order, _options, _callback) {
    var lp = lp$('Order#openOrder');
    logger.info(lp, 'begin close order', p$(_client));
    
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

    args.order.state = args.options.confirm ? config.orderStates.CLOSING : config.orderStates.CLOSED;

    args.order.save(function(err, res) {
        if (err) {
            logger.error(lp, 'db error');
            return args.callback(err);
        }

        /* post action on slack */
        slack.actions.closeOrder(args.client, res);

        /* send ORDER_OPEN_REQ signal to the terminal */
        if (args.options.confirm) {
            logger.info(lp, 'send request on closing to the terminal');
            var socket = socketProxy.getSocketByTid(args.client.tid);
            var socketServer = socketProxy.getServer();

            if (!socket) {
                logger.warn('terminal with tid=(%d) is offline', args.client.tid);
            }
            else {
                socketServer.send(socket, {
                    type: config.messageTypes.ORDER_CLOSE_REQ,
                    data: {
                        ticket: args.order.ticket,
                        lots: args.order.lots
                    }
                });
                logger.info(lp, 'The request is sent successfully');
            }
        }

        logger.info(lp, 'order closed', p$(res));
        args.callback(null, res);
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
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
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
    ], function(err, res) {
        if (err) {
            logger.info(lp, 'Error save history to the order', err);
            args.callback();
        }
    });
};

/* EXPORTS
##################
*/
module.exports = mongoose.model('order', Order);
