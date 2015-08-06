var BaseSchema = require('./base');
var mongoose = require('mongoose');
var logger = require('../utils/logger');
var Args = require('args-js');
var config = require('config');
var _ = require('underscore');
var utils = require('../utils');
var p$ = utils.print;
var lp$ = utils.logPrefix;
require('mongoose-schema-extend');

/**
 * @class User
 * @extends Default
 * @description
 */
var User = BaseSchema.extend({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true, unique: true}
});


module.exports = mongoose.model('user', User);
