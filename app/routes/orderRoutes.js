import { Subscriber, Provider, Order, getModel } from '../models';
import { badRequest, DbError, routNotFound } from './httpErrors';
import logger from '../utils/logger';
import async from 'async';
import _ from 'underscore';

// var Subscriber = require('../models/subscriber');
// var Provider = require('../models/provider');
// var Order = require('../models/order');
// var Errors = require('./httpErrors');
// var badRequestError = Errors.badRequest;
// var async = require('async');
// var _ = require('underscore');



/* ########  GET METHODS ################################ */

export const GET = {
    orders(req, res, next) {
        let query = _.clone(req.query);
        const { client, id } = req.params;

        _.extend(query, {client: id});

        Order.find(query, {history: 0}, (err, q) => {
            if (err) {
                logger.error(err);
                return next(DbError());
            }

            res.json(q);
        })        
    },

    history(req, res, next) {
        Order.findById(req.params.id, {history: 1}, (err, hist) => {
            if (err) return next(err);
            res.json(hist);
        })
    }
};


/* ########  POST METHODS ################################ */

export const POST = {
    order (req, res, next) {
        let data = _.clone(req.body);
        const {client, id} = req.params;
        const Model = getModel(client);

        if (!Model) return next(routNotFound());
        
        async.waterfall([
            function (next) {
                Model.findById({_id: id}, next);
            },
            function (client, next) {
                client.openOrder(data, next);
            }
        ], (err, order) => {
            err ? next(err) : res.json(order);
        })
    }
};


/* ########  PUT METHODS ################################*/

export const PUT = {
    order(req, res, next) {
        Order.update({_id: req.params.id}, {$set: req.body}, next);
    }
};
