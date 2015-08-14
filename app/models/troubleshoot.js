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
require('mongoose-schema-extend');

/**
 * @class Troubleshoot
 * @extends Default
 * @description
 */
var Troubleshoot = BaseSchema.extend({
    // уникальный номер ордера в терминале
    ticket: {type: Number, required: true},
    action: {type: String, required: true},
    errorCode: {type: Number, required: true},
    reason: String,
    message: String,
    orderId: String,
    resolved: {type: String, default: false},
    callCount: {type: Number, default: 0}
});

module.exports.reasons = {
    terminallOffline: 'TERMINAL_OFFLINE',
    serverError: 'SERVER_ERROR'
};

module.exports.errorCodes = {
    openingOrderError: {
        code: 21,
        handler: null,
        description: 'Error to creating new order on subscriber terminal in status [opening (11)]',
    },
    changeOpenOrderStatusError: {
        code: 22,
        handler: null,
        description: 'Error to changing order status on [opened (12)]'
    },
    closingOrderError: {
        code: 23,
        handler: null,
        description: 'Error to closing order on subscriber terminal in status [closing (21)]',
    },
    changeCloseOrderStatusError: {
        code: 24,
        handler: null,
        description: 'Error to change order status on [closed (22)]'
    },
};



/* EXPORTS
##################
*/
module.exports = mongoose.model('troubleshoot', Troubleshoot);