var Provider = require('../models/provider');
var Order = require('../models/order');
var Errors = require('./httpErrors');
var badRequestError = Errors.badRequest;
var async = require('async');
var _ = require('underscore');




/* ########  GET METHODS ################################*/

module.exports.GET = {
    providers: function(req, res, next) {
        Provider.find({}, function(err, providers) {
            if (err) {
                return next(badRequestError(err.message));
            }
            res.json(providers);
        });
    },

    provider: function(req, res, next) {
        Provider.findById(req.params.id, function(err, client) {
            if (err) {
                return next(badRequestError(err.message));
            }
            res.json(client);
        });
    },

    subscribers: function(req, res, next) {
        Provider.findById(req.params.id, function(err, provider) {
            if (err) {
                return next(badRequestError(err.message));
            }

            provider.getSubscribers(function(err, subscribers) {
                if (err) {
                    return next(badRequestError(err.message));
                }

                res.json(subscribers);
            });
        });
    },

    orders: function(req, res, next) {
        var match = {
            client: req.params.id
        };

        if (req.query.state) {
            match.state = req.query.state;
        }

        Order.find(match, function(err, orders) {
            if (err) {
                return next(badRequestError(err.message));
            }
            res.json(orders);
        });
    }
};



/* ########  POST METHODS ################################*/


module.exports.POST = {
    provider: function(req, res, next) {
        var values = req.body;

        new Provider(values).save(function(err, client) {
            if (err) {
                return next(badRequestError(err.message));
            }

            res.json(client);
        });
    },

    openOrder: function(req, res, done) {

        async.waterfall([
            function(next) {
                Provider.findById(req.params.id, next);
            },
            function(client, next) {
                client.openOrder(req.body, next);
            }
        ], function(err, order) {
            if (err) {
                return done(badRequestError(err.message));
            }

            res.json(order);
        });
    }
};
