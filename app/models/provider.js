var mongoose = require('mongoose');
var BaseSchema = require('./client');
var Order = require('./order');
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
require('mongoose-schema-extend');


/**
    @class Provider
    @extends Client
 */
var Provider = BaseSchema.extend({});

var Pr = Provider.methods;


/* Public methods
#################*/

Provider.statics.checkOnChanges = function(tData, callback) {

};



/* Self methods
##################*/

Pr.openOrder = function(values, callback) {
    var self = this;
    var lp = lp$('provider#openOrder');

    logger.info(lp, 'begin create new order.', p$(this));

    Order.openOrder(self, values, {confirm: false}, function(err, order) {
        Subscriber.handleMasterOrderOpen(self, order, Function);

        err ? logger.error(lp, 'complete with error', err) :
              logger.info(lp, 'complete successfully', p$(order));

        callback(err, order);
    });
};

Pr.closeOrder = function(order, callback) {
    var self = this;
    var lp = lp$('provider#closeOrder');

    logger.info(lp, 'begin close order', p$(this));

    Order.closeOrder(self, order, {confirm: false}, function(err, _order) {
        Subscriber.handleMasterOrderClose(self, order, Function);

        err ? logger.error(lp, 'complete with error', err) :
              logger.info(lp, 'complete successfully', p$(order));

        callback(err, order);
    });
};

Pr.getSubscribers = function(callback) {
    Subscriber.find({subscriptions: this._id.toString()}, callback);
};

module.exports = mongoose.model('provider', Provider);
