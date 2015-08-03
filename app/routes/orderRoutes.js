var Subscriber = require('../models/subscriber');
var Provider = require('../models/provider');
var Order = require('../models/order');
var Errors = require('./httpErrors');
var badRequestError = Errors.badRequest;
var async = require('async');
var _ = require('underscore');




/* ########  GET METHODS ################################*/

module.exports.GET = {

};


/* ########  POST METHODS ################################*/

module.exports.POST = {

};


/* ########  PUT METHODS ################################*/

module.exports.PUT = {
    order: function(req, res, next) {
        Order.update({_id: req.params.id}, {$set: req.body}, next);
    }
};
