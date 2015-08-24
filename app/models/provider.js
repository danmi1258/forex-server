var mongoose = require('mongoose');
var BaseSchema = require('./client');
var Subscriber = require('./subscriber');
var config = require('config');
var orderStates = config.orderStates;
var _ = require('underscore');
var async = require('async');
var utils = require('../utils');
var p$ = utils.print;
var lp$ = utils.logPrefix;
var logger = require('../utils/logger');
var Args = require('args-js');
var Order = require('./order');
var slack = require('../integrations/slack');
require('mongoose-schema-extend');


/**
    @class Provider
    @extends Client
 */
var Provider = BaseSchema.extend({});

var Pr = Provider.methods;


/* Public methods
#################*/

Provider.methods.checkOnChanges = function(tData, callback) {

    /* specify aruments */
    try {
        var args = new Args([
            {tData: Args.ARRAY | Args.Required},
            {options: Args.OBJECT | Args.Optional},
            {callback: Args.FUNCTION | Args.Optional, _default: Function}
        ], arguments);
    }
    catch(err) {
        logger.error(err);
        return callback(err);
    }


    //  запрос списка открытых ордеров, принадлежащих данному клиенту.
    Order.find({client: this._id.toString(), state: config.orderStates.CREATED}, function(err, orders) {

        if (err) {
            callback('db error', err);
            return;
        }

        var orderTickets = _.pluck(orders, 'ticket') || [];
        var ordersListTickets = _.pluck(args.tData, 'ticket');
        var newOrders = [], closedOrders = [];
        
        // список ордеров, которые были созданы с момента последнего обращения
        if (ordersListTickets.length){
            newOrders = _.filter(args.tData, function(e) {
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



/* Self methods
##################*/

Pr.openOrder = function(values, callback) {
    var self = this;
    var lp = lp$('provider#openOrder');

    logger.info('Терминал открыл ордер', p$(this));
    slack.actions.createNewOrder(this, values.ticket);

    Order.openOrder(self, values, {confirm: false}, function(err, order) {
        if (err) return callback(err)
        
        /* запустить процесс копирования ордеров */            
        Subscriber.handleMasterOrderOpen(self, order);

        callback(err, order);
    });
};


Pr.closeOrder = function(order, callback) {
    var self = this;
    var lp = lp$('provider#closeOrder');

    logger.info('Терминал закрыл ордер', p$(this));
    slack.actions.closeOrder(this, order.ticket);

    /* запустить процесс закрытия связанных оредров*/
    Subscriber.handleMasterOrderClose(self, order, Function);

    /* закрыть мастер ордер в БД */
    Order.closeOrder(self, order, {confirm: false}, callback);
};


Pr.getSubscribers = function(callback) {
    Subscriber.find({subscriptions: this._id.toString()}, callback);
};


module.exports = mongoose.model('provider', Provider);
