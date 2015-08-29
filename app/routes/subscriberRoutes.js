var Subscriber = require('../models/subscriber');
var Provider = require('../models/provider');
var Order = require('../models/order');
var Errors = require('./httpErrors');
var badRequestError = Errors.badRequest;
var notFoundError = Errors.notFoundError;
var async = require('async');
var _ = require('underscore');




/* ########  GET METHODS ################################*/

module.exports.GET = {
    subscribers: function(req, res, next) {
        Subscriber.find({}, function(err, providers) {
            if (err) {
                return next(badRequestError(err.message));
            }
            res.json(providers);
        });
    },

    subscriber: function(req, res, next) {
        Subscriber.findById(req.params.id, function(err, client) {
            if (err) {
                return next(badRequestError(err.message));
            }
            res.json(client);
        });
    },

    subscriptions: function(req, res, next) {
        async.waterfall([
            function (next) {
                Subscriber.findById(req.params.id, next);
            },
            function(res, next) {
                Provider.find({_id: {$in: res.subscriptions}}, next);
            }
        ], function(err, result) {
            if (err) return next(err);
            res.json(result);
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
    subscriber: function(req, res, next) {
        var values = req.body;

        new Subscriber(values).save(function(err, client) {
            if (err) {
                return next(badRequestError(err.message));
            }

            res.json(client);
        });
    },

    subscribe: function(req, res, done) {
        async.waterfall([
            function (next) {
                Subscriber.findById(req.params.id, next);
            },
            function(e, next) {
                e.subscribe(req.body.providerId, next);
            },
            function(e) {
                res.json(e);
            }
        ], done);
    },

    unsubscribe: function(req, res, done) {
        async.waterfall([
            function (next) {
                Subscriber.findById(req.params.id, next);
            },
            function(e, next) {
                e.unsubscribe(req.body.providerId, next);
            },
            function(e) {
                res.json(e);
            }
        ], done);
    }
};

module.exports.PUT = {
    subscriber(req, res, next) {
        async.waterfall([
            function(next) {
                Subscriber.findById(req.params.id, next);
            },
            function(subscriber, next) {
                if (!res) return next(notFoundError('entity not found'));
                _.extend(subscriber, req.body);
                subscriber.save(next);
            }
        ], (err, subscriber) => {
            return err ? next(err) : res.json(subscriber);
        })
    }
}