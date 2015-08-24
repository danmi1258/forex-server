var mongoose = require('mongoose');
var BaseSchema = require('./client');
var Order = require('./order');
var config = require('config');
var orderStates = config.orderStates;
var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var p$ = utils.print;
var lp$ = utils.logPrefix;
var logger = require('../utils/logger');
var Args = require('args-js');
require('mongoose-schema-extend');


/**
    @class Provider
    @extends Client
 */
var Subscriber = BaseSchema.extend({
    subscriptions: Array,
    // matched lots {providerId: lot}
    matchedLots: {type: Object, default: {}}
});
var Su = Subscriber.methods;


/**** P U B L I C K    M E T H O D S  ***************************/

Subscriber.statics.handleMasterOrderOpen = function(_provider, _masterOrder, _callback) {
    var lp = lp$('handleMasterOrderOpen');

    try {
        var args = new Args([
            {provider: Args.OBJECT | Args.Required},
            {masterOrder: Args.OBJECT | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return args._callback(err);
    }

    logger.info(lp, '***** Копирование ордеров для подписчиков ***** ');
    
    async.waterfall([
        function getSubscribers(next) {
            args.provider.getSubscribers(next);
        },
        function openOrderForEach(res, next) {
            if (!res.length) {
                logger.info(lp, 'Активные подписчики не найдены.');
                args.callback();
            }
            else {
                var proxy = function (subscriber, done) {
                    var orderValues = {
                        lots: subscriber._getMatchedLot(args.provider.id) || 0.02,
                        // lots: 0.02,
                        type: args.masterOrder.type,
                        symbol: args.masterOrder.symbol,
                        comment: 'master order clone',
                        masterOrderId: args.masterOrder._id.toString()
                    };

                    var options = {
                        confirm: true
                    };

                    Order.openOrder(subscriber, orderValues, options, done);
                };

                async.eachSeries(res, proxy, next);
            }
        }
    ], args.callback);
};


Subscriber.statics.handleMasterOrderClose = function(_provider, _masterOrder, _callback) {
    var lp = lp$('handleMasterOrderClose');
    var self = this;

    try {
        var args = new Args([
            {provider: Args.OBJECT | Args.Required},
            {masterOrder: Args.OBJECT | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return args._callback(err);
    }

    async.waterfall([
        function getRelatedOrders(next) {
            Order.find({masterOrderId: _masterOrder._id.toString()}, next);
        },
        function processToChangeStatus(res, next) {
            if (!res.length) {
                logger.warn(lp, 'Order %s has no related orders. Exit.', p$(_masterOrder));
                args.callback();
            }
            else {
                var proxy = function(order, done) {
                    self.model('subscriber').findById(order.client, function(err, client) {
                        if (err) {
                            logger.error(lp, 'db error. Exit.', err);
                            return args.callback();
                        }
                        Order.closeOrder(client, order, {confirm: true}, done);
                    });
                };

                async.eachSeries(res, proxy, next);
            }
        }
    ], args.callback);
};


/**** S E L F    M E T H O D S  *********************************/

Su.subscribe = function(providerId, callback) {
    var lp = lp$('subscribe');
    var self = this;

    try {
        var args = new Args([
            {providerId: Args.STRING | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        return callback(err);
    }

    if (this.subscriptions.indexOf(args.providerId) === -1) {
        this.subscriptions.push(providerId);
        this.save(callback);
    }
    else {
        callback(Error('subscriptions already exists'));
    }
};

Su.unsubscribe = function(providerId, callback) {
    var lp = lp$('subscribe');
    var self = this;

    try {
        var args = new Args([
            {providerId: Args.STRING | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        return callback(err);
    }

    var index = this.subscriptions.indexOf(args.providerId);
    if (index !== -1) {
        this.subscriptions.splice(index, 1);
        this.save(callback);
    }
    else {
        callback(new Error('Подписка не найдера'));
    }
};

Su.confirmOrderCreation = function(_ref, _ticket, _callback) {

    try {
        var args = new Args([
            {ref: Args.STRING | Args.Required},
            {ticket: Args.INT | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: function() {}}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return args._callback(err);
    }

    var lp = lp$('confirmOrderCreation');

    Order.findOne({reference: args.ref}, function(err, order) {
        if (err) {
            logger.error(lp, 'db error', err);
            return args.callback(null);
        }

        order.state = config.orderStates.CREATED;
        order.ticket = args.ticket;

        order.save(args.callback);
    });
};

Su.confirmOrderClosing = function(_ticket, _callback) {
    var lp = lp$('confirmOrderClosing');
    // logger.info(lp, 'begin order closing for client', p$(this), 'ticket=', _ticket);

    try {
        var args = new Args([
            {ticket: Args.INT | Args.Required},
            {callback: Args.FUNCTION | Args.Optional, _default: function() {}}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return args._callback(err);
    }

    Order.findOne({ticket: args.ticket}, function(err, res) {
        if (err) {
            logger.error(lp, 'db error. Exit', err);
            return args.callback(err);
        }

        if (!res) {
            logger.error(lp, `Ордер не найден: ${args.ticket}`);
            return args.callback(err);
        }

        res.state = config.orderStates.CLOSED;

        res.save(args.callback);
    });
};

Su._getMatchedLot = function(providerId) {
    return this.matchedLots[providerId] || null;
};

Su.setMatchedLots = function(providerId, lot, callback) {
    this.matchedLots[providerId] = lot;
    this.save(callback);
};


/**** E X P O R T S  ********************************************/

module.exports = mongoose.model('subscriber', Subscriber);
