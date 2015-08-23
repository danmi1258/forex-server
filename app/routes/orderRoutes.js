import { Subscriber, Provider, Order } from '../models';
import { badRequest, DbError } from './httpErrors';
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
    }
};


/* ########  POST METHODS ################################ */

export const POST = {

};


/* ########  PUT METHODS ################################*/

export const PUT = {
    order(req, res, next) {
        Order.update({_id: req.params.id}, {$set: req.body}, next);
    }
};
