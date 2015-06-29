var mongoose = require('mongoose');
var BaseSchema = require('./base');
extend = require('mongoose-schema-extend');

/**
 * @class Order
 * @extends Default
 */
var Token = BaseSchema.extend({
});


module.exports = mongoose.model('order', Token);